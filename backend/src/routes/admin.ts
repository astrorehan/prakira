/**
 * Administrasi data: impor CSV kasus, status ingest, jejak audit, retraining.
 *
 * Halaman admin sebelumnya menampilkan "status sinkronisasi BMKG" berisi empat
 * stasiun aktif dan latensi 184 ms — angka yang tidak berasal dari pekerjaan
 * apa pun. Yang dilaporkan di sini adalah baris `ingest_job` sungguhan: kapan
 * ingest terakhir berjalan, berapa lama, berapa baris masuk, dan berhasil atau
 * tidak. Kalau belum pernah ada ingest, jawabannya kosong.
 */
import { Router } from "express";
import { all, one, run, transaction } from "../db/index.js";
import { parseCsv, parseCsvHeader, toNumber } from "../db/csv.js";
import { recentAudit, logAudit } from "../services/audit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  clearSimulation,
  countSimulation,
  injectSurge,
  listSimulationDistricts,
} from "../services/demo.js";
import { detectEscalations } from "../services/escalation.js";
import { REPORT_KINDS, type ReportKind } from "../services/reports.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { finishIngestJob, startIngestJob } from "../db/seed.js";
import { CitizenSignalTooThinError, mlRetrain } from "../services/ml.js";
import { refreshBacktest } from "../services/backtest.js";
import { refreshPredictions } from "../services/predictions.js";
import { regenerateActions } from "../services/actions.js";
import { availableDiseases, monthLabel } from "../services/period.js";
import { citizenSignal } from "../services/reports.js";
import { listKecamatan } from "../services/districts.js";

export const adminRouter = Router();

const REQUIRED_COLUMNS = ["kecamatan_nama", "month_start", "cases"];
const OPTIONAL_COLUMNS = ["rainfall_mm", "temp_mean_c", "humidity_pct"];

adminRouter.get(
  "/sync-status",
  asyncRoute(async (_req, res) => {
    const job = await one<{
      id: number;
      source: string;
      started_at: string;
      finished_at: string | null;
      status: string;
      rows: number;
      latency_ms: number | null;
      detail: string;
    }>("SELECT * FROM ingest_job ORDER BY id DESC LIMIT 1");

    const coverage = await all<{
      disease: string;
      months: number;
      rows: number;
      latest: string;
    }>(
      `SELECT disease,
            COUNT(DISTINCT month_start) AS months,
            COUNT(*)                    AS rows,
            MAX(month_start)            AS latest
       FROM observasi GROUP BY disease ORDER BY disease`,
    );

    res.json({
      lastJob: job
        ? {
            source: job.source,
            startedAt: job.started_at,
            finishedAt: job.finished_at,
            status: job.status,
            rows: job.rows,
            latencyMs: job.latency_ms,
            detail: job.detail,
          }
        : null,
      /* Variabel iklim yang benar-benar ada kolomnya di dataset. Daftar ini dulu
       memuat "Radiasi Matahari" dan "Kecepatan Angin" yang tidak pernah
       tersimpan di mana pun. */
      climateVariables: [
        "Curah hujan (mm)",
        "Suhu rata-rata (°C)",
        "Kelembaban relatif (%)",
      ],
      coverage: coverage.map((c) => ({
        ...c,
        latestLabel: monthLabel(c.latest),
      })),
    });
  }),
);

/* Jejak audit lengkap memuat surel petugas dan isi keputusan verifikasi, jadi
   ia butuh sesi. Versi publiknya ada di `/api/meta/activity`. */
adminRouter.get(
  "/audit",
  requireAuth,
  asyncRoute(async (req, res) => {
    const limit = Number(req.query.limit ?? 25);
    res.json({
      data: await recentAudit(
        Number.isFinite(limit) ? Math.min(limit, 200) : 25,
      ),
    });
  }),
);

adminRouter.get(
  "/citizen-signal",
  requireAuth,
  asyncRoute(async (_req, res) => {
    res.json({ data: await citizenSignal() });
  }),
);

/**
 * Impor CSV kasus.
 *
 * `dryRun` mengembalikan hasil validasi dan 10 baris pertama tanpa menulis
 * apa pun — itu langkah "preview" yang diminta PRD §5.8, dan ia harus memakai
 * pengurai yang sama dengan impor sungguhannya, bukan pengurai terpisah di
 * peramban yang bisa berbeda pendapat.
 */
adminRouter.post(
  "/import",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const csv = typeof body.csv === "string" ? body.csv : "";
    const disease =
      typeof body.disease === "string" ? body.disease.toUpperCase() : "";
    const dryRun = body.dryRun !== false;

    if (!csv.trim()) throw new HttpError(400, "Isi berkas CSV kosong.");
    if (!disease)
      throw new HttpError(400, "Penyakit wajib dipilih sebelum impor.");

    const header = parseCsvHeader(csv);
    const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missing.length > 0) {
      throw new HttpError(
        400,
        `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Kolom terbaca: ${header.join(", ") || "(kosong)"}.`,
      );
    }

    const kecamatanRows = await all<{ id: string; nama: string }>(
      "SELECT id, nama FROM kecamatan",
    );
    const namaToId = new Map(
      kecamatanRows.map((r) => [r.nama.toLowerCase(), r.id]),
    );

    const rows = parseCsv(csv);
    const valid: {
      kecamatanId: string;
      nama: string;
      month: string;
      cases: number;
      rainfall: number | null;
      temp: number | null;
      humidity: number | null;
    }[] = [];
    const problems: { line: number; message: string }[] = [];

    rows.forEach((row, index) => {
      const line = index + 2; // +1 header, +1 basis-1
      const kecamatanId = namaToId.get(
        (row.kecamatan_nama ?? "").toLowerCase(),
      );
      if (!kecamatanId) {
        problems.push({
          line,
          message: `Kecamatan '${row.kecamatan_nama}' tidak dikenal.`,
        });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.month_start ?? "")) {
        problems.push({
          line,
          message: `month_start '${row.month_start}' bukan format YYYY-MM-DD.`,
        });
        return;
      }
      const cases = toNumber(row.cases);
      if (cases === null || cases < 0) {
        problems.push({
          line,
          message: `cases '${row.cases}' bukan bilangan tak negatif.`,
        });
        return;
      }

      valid.push({
        kecamatanId,
        nama: row.kecamatan_nama,
        month: `${row.month_start.slice(0, 7)}-01`,
        cases: Math.round(cases),
        rainfall: toNumber(row.rainfall_mm),
        temp: toNumber(row.temp_mean_c),
        humidity: toNumber(row.humidity_pct),
      });
    });

    const preview = valid.slice(0, 10);

    if (dryRun) {
      res.json({
        dryRun: true,
        disease,
        columns: {
          required: REQUIRED_COLUMNS,
          optional: OPTIONAL_COLUMNS,
          found: header,
        },
        totalRows: rows.length,
        validRows: valid.length,
        problems,
        preview,
      });
      return;
    }

    if (valid.length === 0) {
      throw new HttpError(
        400,
        "Tidak ada baris yang lolos validasi. Impor dibatalkan.",
      );
    }

    const jobId = await startIngestJob(`impor-csv-${disease.toLowerCase()}`);
    const startedAt = Date.now();
    const recordedAt = new Date().toISOString();

    try {
      /* Seluruh berkas masuk dalam satu transaksi: impor yang gagal di tengah
         tidak boleh meninggalkan separuh bulan tertulis dan separuhnya tidak —
         angka kota akan salah tanpa ada yang tahu sejak baris mana. */
      await transaction(async (tx) => {
        for (const row of valid) {
          await tx.run(
            `INSERT INTO observasi
               (kecamatan_id, disease, month_start, cases, rainfall_mm, temp_mean_c,
                humidity_pct, source, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'import', ?)
             ON CONFLICT (kecamatan_id, disease, month_start) DO UPDATE SET
               cases = excluded.cases,
               rainfall_mm = COALESCE(excluded.rainfall_mm, observasi.rainfall_mm),
               temp_mean_c = COALESCE(excluded.temp_mean_c, observasi.temp_mean_c),
               humidity_pct = COALESCE(excluded.humidity_pct, observasi.humidity_pct),
               source = 'import',
               recorded_at = excluded.recorded_at`,
            row.kecamatanId,
            disease,
            row.month,
            row.cases,
            row.rainfall,
            row.temp,
            row.humidity,
            recordedAt,
          );
        }
      });
    } catch (error) {
      await finishIngestJob(jobId, {
        status: "failed",
        rows: 0,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    await finishIngestJob(jobId, {
      status: "success",
      rows: valid.length,
      latencyMs: Date.now() - startedAt,
      detail: `Impor ${disease}: ${valid.length} baris diterima, ${problems.length} baris ditolak.`,
    });

    await logAudit({
      actor: req.session!.label,
      role: req.session!.role,
      action: `Impor CSV kasus ${disease}`,
      details: `${valid.length} baris masuk, ${problems.length} ditolak.`,
      status: problems.length > 0 ? "warning" : "success",
    });

    res.json({ dryRun: false, disease, imported: valid.length, problems });
  }),
);

/** Menarik ulang prediksi + backtest untuk semua penyakit yang punya data. */
adminRouter.post(
  "/refresh",
  requireAuth,
  asyncRoute(async (req, res) => {
    const diseases = await availableDiseases();
    const results = [];

    for (const disease of diseases) {
      const prediction = await refreshPredictions(disease);
      const backtest = await refreshBacktest(disease);
      results.push({ disease, prediction, backtest });
    }

    await regenerateActions(diseases);

    await logAudit({
      actor: req.session!.label,
      role: req.session!.role,
      action: "Segarkan prediksi & backtest",
      details: results
        .map(
          (r) =>
            `${r.disease}: ${r.prediction.refreshed} kecamatan${r.backtest.ok ? "" : " (backtest gagal)"}`,
        )
        .join("; "),
      status: results.every((r) => r.prediction.refreshed > 0 && r.backtest.ok)
        ? "success"
        : "warning",
    });

    res.json({ data: results });
  }),
);

/** Retraining — hanya peran admin/dinas. Berjalan sinkron dan bisa memakan menit. */
adminRouter.post(
  "/retrain",
  requireRole("admin", "dinas"),
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.body?.disease === "string" ? req.body.disease : "";
    const includeCitizen = req.body?.includeCitizen === true;

    const known = await availableDiseases();
    if (!known.some((d) => d.toUpperCase() === disease.toUpperCase())) {
      throw new HttpError(400, `Penyakit '${disease}' tidak tersedia.`);
    }

    try {
      /* Laporan warga hanya keluar dari gateway dalam bentuk agregat per
         kecamatan per bulan — tanpa identitas, deskripsi, maupun foto (PRD §8).
         Layanan ML tidak menyimpan laporan warga dan tidak boleh. */
      const signal = includeCitizen ? await citizenSignal() : undefined;
      const result = await mlRetrain(disease, includeCitizen, signal);
      await refreshPredictions(disease);
      await refreshBacktest(disease);
      await regenerateActions([disease]);

      await logAudit({
        actor: req.session!.label,
        role: req.session!.role,
        action: `Retrain model ${disease.toUpperCase()}`,
        details: `Versi ${result.previous_version ?? "—"} -> ${result.new_version}, MAE ${result.metrics.mae}. ${result.improved ? "Membaik." : "Tidak membaik."}`,
        status: result.improved ? "success" : "warning",
      });

      res.json({ data: result });
    } catch (error) {
      await logAudit({
        actor: req.session!.label,
        role: req.session!.role,
        action: `Retrain model ${disease.toUpperCase()}`,
        details: error instanceof Error ? error.message : String(error),
        status: "warning",
      });
      /* Sinyal warga yang belum menutupi periode latih bukan kerusakan; ia
         keadaan yang bisa berubah begitu verifikasi berjalan cukup lama.
         Alasannya diteruskan berikut angkanya supaya petugas tahu apa yang
         masih kurang, alih-alih menerima 503 yang menyesatkan. */
      if (error instanceof CitizenSignalTooThinError) {
        throw new HttpError(409, error.detail.message, { ...error.detail });
      }
      throw new HttpError(
        503,
        "Layanan ML tidak dapat dihubungi untuk retraining. Jalankan ml-services lalu ulangi.",
      );
    }
  }),
);

/** Menghapus sesi kedaluwarsa dan menutup pekerjaan ingest yang menggantung. */
adminRouter.post(
  "/maintenance",
  requireRole("admin", "dinas"),
  asyncRoute(async (_req, res) => {
    await run(
      "DELETE FROM sessions WHERE expires_at < ?",
      new Date().toISOString(),
    );
    await run(
      "UPDATE ingest_job SET status = 'failed', detail = 'Proses terputus.' WHERE status = 'running' AND finished_at IS NULL",
    );
    res.status(204).end();
  }),
);

/* ── Peragaan lonjakan laporan ───────────────────────────────────────────── */

/**
 * Menyuntikkan laporan bertanda `[SIMULASI]` untuk memperagakan eskalasi S4.
 *
 * Peran dibatasi admin/dinas — sama seperti retraining — karena keduanya
 * menulis ke data bersama yang dilihat semua petugas. Baris yang disisipkan
 * ditandai di kolom `device_hash` dan bisa dicabut utuh lewat `DELETE` di
 * bawah. Lihat `services/demo.ts` untuk pagar selengkapnya.
 */
adminRouter.post(
  "/demo/surge",
  requireRole("admin", "dinas"),
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const kecamatan =
      typeof body.kecamatan === "string" ? body.kecamatan.trim() : "";
    if (!kecamatan) {
      throw new HttpError(400, "Sertakan `kecamatan` pada badan permintaan.");
    }

    const known = await listKecamatan();
    if (!known.some((k) => k.nama === kecamatan)) {
      throw new HttpError(
        400,
        `Kecamatan '${kecamatan}' tidak dikenal. Pakai nama persis seperti di daftar wilayah.`,
      );
    }

    const kind = typeof body.kind === "string" ? body.kind : "genangan";
    if (!REPORT_KINDS.includes(kind as ReportKind)) {
      throw new HttpError(
        400,
        `Jenis laporan '${kind}' tidak dikenal. Pilihan: ${REPORT_KINDS.join(", ")}.`,
      );
    }

    const count = Number(body.count ?? 8);

    const before = await detectEscalations();
    const result = await injectSurge(
      {
        kecamatan,
        kind: kind as ReportKind,
        count: Number.isFinite(count) ? count : 8,
        spreadDays: Number(body.spreadDays ?? 6),
      },
      req.session!.label,
      req.session!.role,
    );
    const after = await detectEscalations();

    /* Sebelum dan sesudah dikirim bersama supaya UI bisa menunjukkan
       perubahannya sebagai perubahan, bukan sebagai keadaan yang tiba-tiba
       sudah begitu. Inti peragaan ini justru pada selisihnya. */
    res.status(201).json({
      meta: {
        simulasi: true,
        totalSimulasi: await countSimulation(),
        rules: after.rules,
      },
      data: {
        ...result,
        eskalasiSebelum: before.escalations,
        eskalasiSesudah: after.escalations,
        baru: after.escalations.filter(
          (e) => !before.escalations.some((b) => b.kecamatan === e.kecamatan),
        ),
      },
    });
  }),
);

/** Status laporan simulasi yang sedang tertanam. */
adminRouter.get(
  "/demo/surge",
  requireRole("admin", "dinas"),
  asyncRoute(async (_req, res) => {
    res.json({
      meta: { totalSimulasi: await countSimulation() },
      data: await listSimulationDistricts(),
    });
  }),
);

/** Mencabut seluruh laporan simulasi. Tidak menyentuh laporan warga. */
adminRouter.delete(
  "/demo/surge",
  requireRole("admin", "dinas"),
  asyncRoute(async (req, res) => {
    const removed = await clearSimulation(
      req.session!.label,
      req.session!.role,
    );
    res.json({ meta: { removed }, data: await detectEscalations() });
  }),
);
