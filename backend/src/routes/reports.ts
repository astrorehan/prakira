/**
 * Laporan warga: kirim tanpa akun, lacak lewat kode, verifikasi dengan sesi.
 *
 * Yang publik hanya dua: mengirim laporan, dan mencari satu laporan dengan
 * kode lacaknya. Daftar antrean butuh sesi — isinya deskripsi dan foto yang
 * dikirim warga dan tidak boleh dapat dijelajahi siapa pun (PRD §8, privasi).
 */
import { Router, type Request } from "express";
import {
  REPORT_KINDS,
  checkRateLimit,
  createReport,
  deviceHash,
  findReport,
  findReportPhoto,
  getTriggerSummaryByDistrict,
  listReports,
  listRelatedReports,
  recordForwarding,
  decideForwardProposal,
  reviewReport,
  riskContextFor,
  riskKey,
  summarizeQueue,
  toVerifiedSignal,
  toPublicView as publicView,
  ForwardStateError,
  ReportAlreadyReviewedError,
  ReportHandlingModeRequiredError,
  InvalidReportHandlingModeError,
  REPORT_HANDLING_MODES,
  type ReportKind,
  type ReportHandlingMode,
  type ReportRow,
  type ReportStatus,
} from "../services/reports.js";
import { reportEvents } from "../services/events.js";
import {
  findEnvironmentTicketByReportId,
  listEnvironmentTicketsByReportIds,
} from "../services/tickets.js";
import { listKecamatan } from "../services/districts.js";
import {
  DEFAULT_RULES,
  detectEscalations,
} from "../services/escalation.js";
import { requireRole, sessionScope } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import {
  sendReportEmail,
  ReportEmailConfigError,
  ReportEmailDeliveryError,
} from "../services/report-email.js";

export const reportsRouter = Router();

/* Keputusan atas laporan warga adalah keputusan tenaga kesehatan. Admin
   mengelola sistem, bukan memeriksa laporan. */
const REVIEW_ROLES = ["dinas", "puskesmas"];
/* Penyampaian ke DLH/DPU adalah surat-menyurat antardinas: satu pintu, Dinkes.
   Puskesmas menandai laporan "perlu diteruskan"; Dinkes yang mengirimnya. */
const FORWARD_ROLES = ["dinas"];

/* Akun puskesmas hanya melihat laporan wilayahnya. Laporan di luar wilayah
   dijawab 404, sama seperti laporan yang tidak ada. */
reportsRouter.param("id", (req, _res, next, id: string) => {
  const scope = sessionScope(req);
  if (!scope) return next();
  findReport(id)
    .then((row) => {
      if (row && row.kecamatan !== scope) {
        next(new HttpError(404, "Laporan tidak ditemukan."));
      } else {
        next();
      }
    })
    .catch(next);
});

/** Foto dikirim sebagai data URL yang sudah dikecilkan klien. Batas keras
 *  supaya satu unggahan tidak membengkakkan database. */
const MAX_PHOTO_CHARS = 400_000;

/**
 * Bentuk data URL yang boleh disimpan.
 *
 * Nilai ini berakhir di atribut `src` sebuah `<img>` pada antrean verifikasi.
 * Menerima string apa pun berarti menyimpan `src` yang isinya ditentukan
 * pengirim laporan; membatasinya ke tiga tipe raster yang memang dihasilkan
 * `lib/photo.ts` menutup seluruh kelas itu tanpa menambah apa pun ke alur yang
 * sah. SVG sengaja tidak masuk daftar: ia dokumen, bukan raster.
 */
const PHOTO_DATA_URL =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/* Kotak batas Kota Semarang, sedikit dilonggarkan. Titik di luarnya bukan
   lokasi kejadian yang bisa ditangani petugas kota. */
const SEMARANG_BOUNDS = { minLat: -7.2, maxLat: -6.9, minLon: 110.2, maxLon: 110.6 };

/** Titik perangkat, dibulatkan ke 5 desimal (±1 m) — presisi lebih dari itu hanya derau. */
function parseLocation(
  raw: unknown,
  errors: string[],
): { latitude: number; longitude: number; accuracyM: number | null } | null {
  if (raw === undefined || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const lat = value.latitude;
  const lon = value.longitude;
  const accuracy = value.accuracyM;
  if (
    typeof lat !== "number" || typeof lon !== "number" ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < SEMARANG_BOUNDS.minLat || lat > SEMARANG_BOUNDS.maxLat ||
    lon < SEMARANG_BOUNDS.minLon || lon > SEMARANG_BOUNDS.maxLon
  ) {
    errors.push("Titik lokasi di luar Kota Semarang.");
    return null;
  }
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return {
    latitude: round(lat),
    longitude: round(lon),
    accuracyM:
      typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
        ? Math.min(Math.round(accuracy), 100_000)
        : null,
  };
}

/**
 * Keterangan EXIF yang dibaca klien sebelum fotonya digambar ulang. Hanya
 * dua bidang yang diterima, dengan bentuk yang ketat: teks ini tampil di
 * antrean petugas. Nilai yang tidak dikenali dibuang, bukan menolak laporan:
 * warga tidak bisa memperbaiki EXIF ponselnya.
 */
function parsePhotoMeta(raw: unknown): { device: string | null; takenAt: string | null } {
  if (raw === undefined || raw === null) return { device: null, takenAt: null };
  const value = raw as Record<string, unknown>;
  let device: string | null = null;
  let takenAt: string | null = null;
  if (typeof value.device === "string") {
    device = value.device.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || null;
  }
  if (typeof value.takenAt === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2})?$/.test(value.takenAt)) {
      takenAt = value.takenAt;
    }
  }
  return { device, takenAt };
}

function hashOf(req: Request): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const agent = req.get("user-agent") ?? "unknown";
  return deviceHash(ip, agent);
}

reportsRouter.get(
  "/rate-limit",
  asyncRoute(async (req, res) => {
    res.json(await checkRateLimit(hashOf(req)));
  }),
);

reportsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const errors: string[] = [];

    if (!REPORT_KINDS.includes(body.kind))
      errors.push("Jenis laporan tidak dikenal.");

    const districts = (await listKecamatan()).map((k) => k.nama);
    if (
      typeof body.kecamatan !== "string" ||
      !districts.includes(body.kecamatan)
    ) {
      errors.push(
        "Kecamatan harus salah satu dari 16 kecamatan Kota Semarang.",
      );
    }
    if (
      typeof body.occurredAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.occurredAt)
    ) {
      errors.push("Tanggal kejadian harus berformat YYYY-MM-DD.");
    }
    if (
      typeof body.description !== "string" ||
      body.description.trim().length < 10
    ) {
      errors.push(
        "Deskripsi minimal 10 karakter agar petugas bisa menelusuri.",
      );
    }
    if (typeof body.photo === "string") {
      if (body.photo.length > MAX_PHOTO_CHARS) {
        errors.push("Foto terlalu besar. Kecilkan gambar lalu coba lagi.");
      } else if (!PHOTO_DATA_URL.test(body.photo)) {
        errors.push("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
      }
    }

    /* Patokan dan RT/RW opsional tetapi dibatasi panjangnya: keduanya tampil
       apa adanya di antrean petugas. */
    for (const [field, label] of [
      ["landmark", "Patokan lokasi"],
      ["rtRw", "RT/RW"],
    ] as const) {
      const value = body[field];
      if (value !== undefined && typeof value !== "string") {
        errors.push(`${label} tidak valid.`);
      } else if (typeof value === "string" && value.trim().length > 160) {
        errors.push(`${label} terlalu panjang.`);
      }
    }
    if (
      body.relatedReportId !== undefined &&
      typeof body.relatedReportId !== "string"
    ) {
      errors.push("Kode laporan terkait tidak valid.");
    }
    const location = parseLocation(body.location, errors);
    const photoMeta = parsePhotoMeta(body.photoMeta);

    if (errors.length > 0) throw new HttpError(400, errors.join(" "));

    const hash = hashOf(req);
    const limit = await checkRateLimit(hash);
    if (limit.blocked) {
      res.status(429).json({
        error: `Batas ${limit.max} laporan per ${limit.windowHours} jam sudah tercapai untuk perangkat ini.`,
        rateLimit: limit,
      });
      return;
    }

    const report = await createReport(
      {
        kind: body.kind as ReportKind,
        kecamatan: body.kecamatan,
        kelurahan:
          typeof body.kelurahan === "string" ? body.kelurahan : undefined,
        occurredAt: body.occurredAt,
        description: body.description,
        photo: typeof body.photo === "string" ? body.photo : undefined,
        landmark: typeof body.landmark === "string" ? body.landmark : undefined,
        rtRw: typeof body.rtRw === "string" ? body.rtRw : undefined,
        relatedReportId:
          typeof body.relatedReportId === "string"
            ? body.relatedReportId
            : undefined,
        location: location ?? undefined,
        photoDevice: photoMeta.device ?? undefined,
        photoTakenAt: photoMeta.takenAt ?? undefined,
      },
      hash,
    );

    res
      .status(201)
      .json({
        data: publicView(report),
        rateLimit: await checkRateLimit(hash),
      });
  }),
);

reportsRouter.get(
  "/track/:code",
  asyncRoute(async (req, res) => {
    const report = await findReport(req.params.code);
    if (!report) throw new HttpError(404, "Kode lacak tidak ditemukan.");
    const ticket = await findEnvironmentTicketByReportId(report.id);
    res.json({ data: publicView(report, ticket) });
  }),
);

/**
 * Sinyal publik: laporan terverifikasi, tanpa isinya.
 *
 * Portal warga menampilkan "sudah diverifikasi di kecamatan Anda" sebagai
 * alasan orang mau repot melapor. Yang boleh keluar dari sini hanya jenis,
 * kecamatan, dan waktu — bukan deskripsi, kelurahan, atau foto. Ketiganya
 * ditulis warga dan hanya boleh dibaca verifikator (PRD section 8, privasi).
 */
reportsRouter.get(
  "/verified",
  asyncRoute(async (req, res) => {
    const kecamatan =
      typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined;
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);

    const verified = await listReports({ kecamatan, status: "terverifikasi" });
    const rows = verified
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
      .slice(0, limit)
      .map(toVerifiedSignal);

    res.json({ data: rows });
  }),
);

/**
 * Ringkasan pemicu lingkungan & sinyal warga terverifikasi per kecamatan.
 * Publik — mengembalikan metrik agregasi tanpa data PII, foto, atau deskripsi.
 */
reportsRouter.get(
  "/triggers",
  asyncRoute(async (req, res) => {
    const kecamatan =
      typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined;
    const summary = await getTriggerSummaryByDistrict(kecamatan);
    res.json({ data: summary });
  }),
);

/**
 * Aliran event Server-Sent Events (SSE) laporan warga real-time.
 *
 * Mengirim notifikasi seketika saat laporan masuk (`report:created`),
 * saat laporan diverifikasi/ditolak (`report:reviewed`), dan saat
 * laporan diteruskan (`report:forwarded`).
 *
 * Untuk staf kesehatan (Dinkes & Puskesmas), rincian lokasi presisi
 * disertakan agar peta dapat memplot titik laporan secara live.
 * Untuk publik, data disanitasi menjadi sinyal tanpa PII.
 */
reportsRouter.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const isStaff =
    req.session?.role === "dinas" ||
    req.session?.role === "puskesmas" ||
    req.session?.role === "admin";
  const scope = sessionScope(req);

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      connected: true,
      role: req.session?.role ?? "public",
      scope: scope ?? null,
      time: new Date().toISOString(),
    })}\n\n`,
  );

  const heartbeat = setInterval(() => {
    res.write(":keepalive\n\n");
  }, 25_000);

  const onCreated = async (row: ReportRow) => {
    try {
      if (isStaff) {
        const risk = await riskContextFor([row]);
        const payload = {
          ...publicView(row, null, risk.get(riskKey(row)), "staff"),
          forMyDistrict: scope ? row.kecamatan.toLowerCase() === scope.toLowerCase() : true,
        };
        res.write(`event: report:created\ndata: ${JSON.stringify(payload)}\n\n`);
      }
      // Publik tidak menerima laporan masuk mentah yang belum terverifikasi
    } catch {
      // Ignored
    }
  };

  const onReviewed = async (row: ReportRow) => {
    try {
      if (isStaff) {
        const ticket = await findEnvironmentTicketByReportId(row.id);
        const risk = await riskContextFor([row]);
        const payload = {
          ...publicView(row, ticket, risk.get(riskKey(row)), "staff"),
          forMyDistrict: scope ? row.kecamatan.toLowerCase() === scope.toLowerCase() : true,
        };
        res.write(`event: report:reviewed\ndata: ${JSON.stringify(payload)}\n\n`);
      } else if (row.status === "terverifikasi") {
        // Publik hanya menerima sinyal yang telah terverifikasi sah (tanpa PII dan tanpa koordinat presisi)
        const payload = publicView(row, null, null, "public");
        res.write(`event: report:reviewed\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    } catch {
      // Ignored
    }
  };

  const onForwarded = async (row: ReportRow) => {
    if (!isStaff) return;
    try {
      const risk = await riskContextFor([row]);
      const payload = {
        ...publicView(row, null, risk.get(riskKey(row)), "staff"),
        forMyDistrict: scope ? row.kecamatan.toLowerCase() === scope.toLowerCase() : true,
      };
      res.write(`event: report:forwarded\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // Ignored
    }
  };

  reportEvents.on("report:created", onCreated);
  reportEvents.on("report:reviewed", onReviewed);
  reportEvents.on("report:forwarded", onForwarded);

  req.on("close", () => {
    clearInterval(heartbeat);
    reportEvents.off("report:created", onCreated);
    reportEvents.off("report:reviewed", onReviewed);
    reportEvents.off("report:forwarded", onForwarded);
  });
});

/**
 * Titik data laporan warga untuk visualisasi peta di Dinkes & Puskesmas.
 *
 * Mengembalikan laporan masuk (`menunggu`), laporan terverifikasi (`terverifikasi`),
 * dan koordinat titik lokasi presisi bila tersedia dari pelapor.
 * Mengurutkan dari yang terbaru (descending) dan mengecualikan laporan yang ditolak.
 */
reportsRouter.get(
  "/map",
  asyncRoute(async (req, res) => {
    const isStaff =
      req.session?.role === "dinas" ||
      req.session?.role === "puskesmas" ||
      req.session?.role === "admin";
    const requestedKec =
      typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined;
    const requestedStatus =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const role = req.session?.role;
    const scope = sessionScope(req);

    let rows: ReportRow[];
    if (role === "puskesmas") {
      const kec = scope ?? requestedKec;
      rows = await listReports({
        kecamatan: kec,
        excludeRejected: true,
        order: "desc",
      });
      // Di Puskesmas: MAP hanya menampilkan laporan yang masuk dan belum diverifikasi (belum dikirim ke dinkes)
      rows = rows.filter((r) => r.status === "menunggu" || r.status === "perlu_informasi");
    } else if (role === "dinas" || role === "admin") {
      rows = await listReports({
        kecamatan: requestedKec,
        status: "terverifikasi",
        excludeRejected: true,
        order: "desc",
      });
      // Di Dinkes: MAP menampilkan laporan yang masuk dan terverifikasi oleh puskesmas (yang sudah dikirim ke dinkes) namun belum ditangani
      rows = rows.filter((r) => {
        if (r.status !== "terverifikasi") return false;
        // Sudah ditangani (misal sudah diteruskan ke instansi terkait)
        if (r.forward_state === "diteruskan") return false;
        // Laporan mandiri warga yang selesai di tingkat puskesmas dan tidak dikirim ke dinkes
        if (r.handling_mode === "mandiri_warga" && !r.forward_state) return false;
        return true;
      });
    } else {
      // Publik hanya melihat sinyal terverifikasi
      rows = await listReports({
        kecamatan: requestedKec,
        status: "terverifikasi",
        excludeRejected: true,
        order: "desc",
      });
    }

    const limit = Math.min(Number(req.query.limit ?? 250) || 250, 500);
    const sliced = rows.slice(0, limit);
    const risk = isStaff ? await riskContextFor(sliced) : new Map();

    const data = sliced.map((row) => ({
      ...publicView(row, null, risk.get(riskKey(row)), isStaff ? "staff" : "public"),
      forMyDistrict: scope ? row.kecamatan.toLowerCase() === scope.toLowerCase() : true,
    }));

    res.json({
      meta: {
        total: rows.length,
        menunggu: rows.filter((r) => r.status === "menunggu").length,
        terverifikasi: rows.filter((r) => r.status === "terverifikasi").length,
        perluInformasi: rows.filter((r) => r.status === "perlu_informasi").length,
        shown: data.length,
      },
      data,
    });
  }),
);

/* Batas atas jumlah baris yang dikirim sekaligus. Tanpa foto satu baris hanya
   beberapa ratus bita, jadi angka ini longgar — gunanya menjaga respons tetap
   berhingga saat tabelnya tumbuh, bukan memaksa petugas membalik halaman. */
const MAX_QUEUE_ROWS = 500;

reportsRouter.get(
  "/",
  requireRole(...REVIEW_ROLES),
  asyncRoute(async (req, res) => {
    const scope = sessionScope(req);
    const kecamatan =
      scope ?? (typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined);
    const rows = await listReports({ kecamatan });
    const page = rows.slice(0, MAX_QUEUE_ROWS);
    const summary = await summarizeQueue(scope);
    const tickets = await listEnvironmentTicketsByReportIds(page.map((row) => row.id));
    const ticketByReport = new Map(tickets.map((ticket) => [ticket.report_id, ticket]));
    const risk = await riskContextFor(page);

    res.json({
      meta: {
        ...summary,
        shown: page.length,
        /* Dipotong dengan mengatakannya. Antrean yang diam-diam kehilangan
           baris adalah antrean yang membuat petugas mengira pekerjaannya
           sudah habis. */
        truncated: rows.length > page.length,
      },
      data: page.map((row) =>
        publicView(row, ticketByReport.get(row.id), risk.get(riskKey(row)), "staff"),
      ),
    });
  }),
);

/**
 * Mengirim ringkasan laporan ke inbox internal pengelola (F10, audit §7.E).
 *
 * Nama instansi tetap dicatat sebagai tujuan tindak lanjut yang disarankan.
 * Email ini tidak dikirim langsung ke DLH/DPU dan bukan bukti bahwa instansi
 * tersebut sudah menerima laporan.
 */
reportsRouter.post(
  "/:id/send-email",
  requireRole(...FORWARD_ROLES),
  asyncRoute(async (req, res) => {
    let sent;
    try {
      sent = await sendReportEmail(
        req.params.id,
        req.session!.label,
        req.session!.role,
      );
    } catch (error) {
      if (error instanceof ForwardStateError) throw new HttpError(409, error.message);
      if (error instanceof ReportEmailConfigError) throw new HttpError(503, error.message);
      if (error instanceof ReportEmailDeliveryError) throw new HttpError(502, error.message);
      throw error;
    }
    if (!sent) throw new HttpError(404, "Laporan tidak ditemukan.");
    const risk = await riskContextFor([sent.row]);
    res.json({
      meta: await summarizeQueue(sessionScope(req)),
      data: publicView(sent.row, null, risk.get(riskKey(sent.row)), "staff"),
      recipient: sent.recipient,
    });
  }),
);

/**
 * Dinkes menyetujui atau menolak usulan penerusan dari puskesmas. Hanya
 * setelah disetujui laporan masuk antrean penerusan dan drafnya tersedia.
 */
reportsRouter.post(
  "/:id/forward-proposal",
  requireRole(...FORWARD_ROLES),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    if (typeof body.approve !== "boolean") {
      throw new HttpError(400, "Sebutkan keputusan dengan nilai 'approve' true atau false.");
    }
    if (body.note !== undefined && typeof body.note !== "string") {
      throw new HttpError(400, "Kolom 'note' tidak valid.");
    }

    let updated;
    try {
      updated = await decideForwardProposal(
        req.params.id,
        { approve: body.approve, note: body.note },
        req.session!.label,
        req.session!.role,
      );
    } catch (error) {
      if (error instanceof ForwardStateError) throw new HttpError(409, error.message);
      throw error;
    }

    if (!updated) throw new HttpError(404, "Laporan tidak ditemukan.");
    const risk = await riskContextFor([updated]);
    res.json({
      meta: await summarizeQueue(sessionScope(req)),
      data: publicView(updated, null, risk.get(riskKey(updated)), "staff"),
    });
  }),
);

reportsRouter.post(
  "/:id/forward",
  requireRole(...FORWARD_ROLES),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    if (typeof body.delivered !== "boolean") {
      throw new HttpError(
        400,
        "Sebutkan apakah penyampaian berhasil dengan nilai 'delivered' true atau false.",
      );
    }
    for (const field of ["target", "channel", "reference", "note"]) {
      if (body[field] !== undefined && typeof body[field] !== "string") {
        throw new HttpError(400, `Kolom '${field}' tidak valid.`);
      }
    }

    let updated;
    try {
      updated = await recordForwarding(
        req.params.id,
        {
          delivered: body.delivered,
          target: body.target,
          channel: body.channel,
          reference: body.reference,
          note: body.note,
        },
        req.session!.label,
        req.session!.role,
      );
    } catch (error) {
      if (error instanceof ForwardStateError) {
        throw new HttpError(409, error.message);
      }
      throw error;
    }

    if (!updated) throw new HttpError(404, "Laporan tidak ditemukan.");
    const risk = await riskContextFor([updated]);
    res.json({
      meta: await summarizeQueue(sessionScope(req)),
      data: publicView(updated, null, risk.get(riskKey(updated)), "staff"),
    });
  }),
);

/**
 * Laporan lain pada kejadian yang sama. Dipakai untuk menautkan duplikat tanpa
 * menghapus jejak pelapor mana pun: setiap pelapor tetap memegang kodenya.
 */
reportsRouter.get(
  "/:id/related",
  requireRole(...REVIEW_ROLES),
  asyncRoute(async (req, res) => {
    const rows = await listRelatedReports(req.params.id);
    res.json({ data: rows.map((row) => publicView(row, null, null, "staff")) });
  }),
);

/**
 * Foto satu laporan, diambil saat petugas benar-benar melihatnya.
 *
 * Terdaftar setelah `/track/:code` dan kerabatnya supaya tidak menaungi rute
 * dua segmen yang lain.
 */
reportsRouter.get(
  "/:id/photo",
  requireRole(...REVIEW_ROLES),
  asyncRoute(async (req, res) => {
    const photo = await findReportPhoto(req.params.id);
    if (!photo) throw new HttpError(404, "Laporan ini tidak melampirkan foto.");
    /* Tetap data URL, bukan bita mentah: nilainya langsung bisa dipasang ke
       `src` sebuah `<img>`, dan pengambilannya lewat pembungkus `request()`
       yang sudah membawa cookie sesi. Selisih ukurannya (base64 menambah
       sepertiga) tidak berarti untuk satu gambar yang diminta sekali. */
    res.json({ data: photo });
  }),
);

reportsRouter.patch(
  "/:id/review",
  requireRole(...REVIEW_ROLES),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    if (
      body.status !== "terverifikasi" &&
      body.status !== "ditolak" &&
      body.status !== "perlu_informasi"
    ) {
      throw new HttpError(
        400,
        "Keputusan harus 'terverifikasi', 'perlu_informasi', atau 'ditolak'.",
      );
    }
    /* Meminta kelengkapan tanpa menyebut apa yang kurang membuat warga
       mengulang dari awal — persis yang hendak dihindari F11. */
    if (
      body.status === "perlu_informasi" &&
      (typeof body.infoRequest !== "string" || body.infoRequest.trim() === "")
    ) {
      throw new HttpError(
        400,
        "Sebutkan informasi apa yang perlu dilengkapi pelapor.",
      );
    }
    if (
      body.handlingMode !== undefined &&
      (typeof body.handlingMode !== "string" ||
        !REPORT_HANDLING_MODES.includes(body.handlingMode as ReportHandlingMode))
    ) {
      throw new HttpError(
        400,
        "Pilihan tindak lanjut harus 'mandiri_warga' atau 'dlh'.",
      );
    }
    /* §5.4 menuntut alasan saat ditolak — pelapor berhak tahu apa yang kurang. */
    if (
      body.status === "ditolak" &&
      (typeof body.note !== "string" || body.note.trim() === "")
    ) {
      throw new HttpError(
        400,
        "Penolakan wajib menyertakan alasan yang bisa dibaca pelapor.",
      );
    }

    let updated;
    try {
      updated = await reviewReport(
        req.params.id,
        {
          status: body.status,
          note: typeof body.note === "string" ? body.note : undefined,
          infoRequest:
            typeof body.infoRequest === "string" ? body.infoRequest : undefined,
          handlingMode:
            typeof body.handlingMode === "string"
              ? (body.handlingMode as ReportHandlingMode)
              : undefined,
        },
        req.session!.label,
        req.session!.role,
      );
    } catch (error) {
      if (error instanceof ReportAlreadyReviewedError) {
        throw new HttpError(409, error.message);
      }
      if (
        error instanceof ReportHandlingModeRequiredError ||
        error instanceof InvalidReportHandlingModeError
      ) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }

    if (!updated) throw new HttpError(404, "Laporan tidak ditemukan.");
    const ticket = await findEnvironmentTicketByReportId(updated.id);
    const risk = await riskContextFor([updated]);
    res.json({
      meta: await summarizeQueue(sessionScope(req)),
      data: publicView(updated, ticket, risk.get(riskKey(updated)), "staff"),
    });
  }),
);

/**
 * Eskalasi "perlu perhatian" (S4).
 *
 * Butuh sesi. Isinya bukan deskripsi laporan — hanya nama kecamatan dan
 * hitungan — tapi pola pengaduan per wilayah tetap informasi operasional
 * dinas, bukan informasi publik. Yang publik adalah kelas risiko di
 * `/api/districts`, dan itu berasal dari data resmi, bukan dari aduan.
 */
reportsRouter.get(
  "/escalations",
  requireRole(...REVIEW_ROLES),
  asyncRoute(async (req, res) => {
    const num = (key: string): number | undefined => {
      const raw = req.query[key];
      if (typeof raw !== "string") return undefined;
      const value = Number(raw);
      return Number.isFinite(value) ? value : undefined;
    };

    const { rules, escalations, scanned } = await detectEscalations({
      windowDays: num("windowDays"),
      minReports: num("minReports"),
      minSameKind: num("minSameKind"),
      maxWaitHours: num("maxWaitHours"),
    });

    res.json({
      meta: {
        rules,
        defaults: DEFAULT_RULES,
        scanned,
        /* Aturan ditulis di sini, bukan hanya di kode: halaman verifikasi
           menampilkannya persis begini supaya petugas tahu kenapa sebuah
           kecamatan naik — dan bisa membantahnya. */
        explanation: [
          `Jendela pengamatan ${rules.windowDays} hari terakhir. Laporan yang sudah ditolak verifikator tidak dihitung sama sekali.`,
          `Ambang volume: ${rules.minReports} laporan dari satu kecamatan.`,
          `Ambang pemusatan: ${rules.minSameKind} laporan berjenis sama dari satu kecamatan.`,
          `Ambang antrean tertahan: laporan menunggu lebih dari ${rules.maxWaitHours} jam.`,
          "Eskalasi menandai wilayah untuk dilihat manusia. Ia tidak menerbitkan tindakan dan tidak mengubah kelas risiko model.",
        ],
      },
      data: (() => {
        const scope = sessionScope(req);
        return scope ? escalations.filter((e) => e.kecamatan === scope) : escalations;
      })(),
    });
  }),
);
