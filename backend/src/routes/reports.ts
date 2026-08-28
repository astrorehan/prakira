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
  getTriggerSummaryByDistrict,
  listReports,
  reviewReport,
  summarizeQueue,
  type ReportKind,
  type ReportRow,
} from "../services/reports.js";
import { listKecamatan } from "../services/districts.js";
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

/** Tanpa `device_hash`: sidik jari perangkat tidak pernah keluar dari server. */
function publicView(row: ReportRow) {
  return {
    id: row.id,
    kind: row.kind,
    kecamatan: row.kecamatan,
    kelurahan: row.kelurahan,
    occurredAt: row.occurred_at,
    description: row.description,
    submittedAt: row.submitted_at,
    photo: row.photo,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewer: row.reviewer,
    reviewNote: row.review_note,
  };
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

reportsRouter.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const kecamatan =
      typeof req.query.kecamatan === "string" ? req.query.kecamatan : undefined;
    const rows = await listReports({ kecamatan });
    res.json({
      meta: await summarizeQueue(),
      data: rows.map(publicView),
    });
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
