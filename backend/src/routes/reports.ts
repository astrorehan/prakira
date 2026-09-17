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
  reviewReport,
  summarizeQueue,
  toPublicView as publicView,
  type ReportKind,
} from "../services/reports.js";
import { listKecamatan } from "../services/districts.js";
import {
  DEFAULT_RULES,
  detectEscalations,
} from "../services/escalation.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";

export const reportsRouter = Router();

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
    res.json({ data: publicView(report) });
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
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        kecamatan: r.kecamatan,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
      }));

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

/* Batas atas jumlah baris yang dikirim sekaligus. Tanpa foto satu baris hanya
   beberapa ratus bita, jadi angka ini longgar — gunanya menjaga respons tetap
   berhingga saat tabelnya tumbuh, bukan memaksa petugas membalik halaman. */
const MAX_QUEUE_ROWS = 500;

reportsRouter.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const kecamatan =
      typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined;
    const rows = await listReports({ kecamatan });
    const page = rows.slice(0, MAX_QUEUE_ROWS);
    const summary = await summarizeQueue();

    res.json({
      meta: {
        ...summary,
        shown: page.length,
        /* Dipotong dengan mengatakannya. Antrean yang diam-diam kehilangan
           baris adalah antrean yang membuat petugas mengira pekerjaannya
           sudah habis. */
        truncated: rows.length > page.length,
      },
      data: page.map(publicView),
    });
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
  requireAuth,
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
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    if (body.status !== "terverifikasi" && body.status !== "ditolak") {
      throw new HttpError(
        400,
        "Keputusan harus 'terverifikasi' atau 'ditolak'.",
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

    const updated = await reviewReport(
      req.params.id,
      {
        status: body.status,
        note: typeof body.note === "string" ? body.note : undefined,
      },
      req.session!.label,
      req.session!.role,
    );

    if (!updated) throw new HttpError(404, "Laporan tidak ditemukan.");
    res.json({ meta: await summarizeQueue(), data: publicView(updated) });
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
  requireAuth,
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
      data: escalations,
    });
  }),
);

