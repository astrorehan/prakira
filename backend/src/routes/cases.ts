/**
 * Rute entri kasus resmi oleh nakes (Puskesmas / Dinas / Admin).
 *
 * Sesuai kesepakatan alur PKR-NAKES-01:
 * - Warga hanya melaporkan kondisi lingkungan.
 * - Nakes (Puskesmas/Dinas/Admin) menginput data kasus resmi terkonfirmasi.
 * - Kasus disimpan/di-upsert ke tabel `observasi` dengan label source = 'manual'.
 * - Setiap entri tercatat secara transparan di `audit_log`.
 */
import { Router } from "express";
import { all, one, run, transaction } from "../db/index.js";
import { parseCsv, parseCsvHeader, toNumber } from "../db/csv.js";
import { startIngestJob, finishIngestJob } from "../db/seed.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { logAudit } from "../services/audit.js";

export const casesRouter = Router();

const VALID_DISEASES = ["DBD", "ISPA", "LEPTOSPIROSIS", "DIARE"];
const REQUIRED_COLUMNS = ["kecamatan_nama", "month_start", "cases"];
const OPTIONAL_COLUMNS = ["rainfall_mm", "temp_mean_c", "humidity_pct"];

/**
 * Normalisasi format bulan/tanggal ke YYYY-MM-01.
 * Menerima "2026-03", "2026-03-15", dsb.
 */
function normalizeMonthStart(input: string): string {
  if (!input || typeof input !== "string") {
    throw new HttpError(400, "Periode bulan / tanggal wajib diisi.");
  }
  const trimmed = input.trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{1,2})?$/.exec(trimmed);
  if (!match) {
    throw new HttpError(
      400,
      `Format tanggal '${input}' tidak valid. Gunakan format YYYY-MM atau YYYY-MM-DD.`,
    );
  }
  return `${match[1]}-${match[2]}-01`;
}

/**
 * POST /api/cases/manual
 * Input data kasus resmi secara manual oleh Nakes (Puskesmas / Dinas / Admin).
 */
casesRouter.post(
  "/manual",
  requireAuth,
  requireRole("puskesmas", "dinas", "admin"),
  asyncRoute(async (req, res) => {
    const {
      kecamatan_id,
      disease,
      month_start,
      date,
      cases,
      rainfall_mm,
      temp_mean_c,
      humidity_pct,
    } = req.body ?? {};

    // 1. Validasi Kecamatan
    if (!kecamatan_id || typeof kecamatan_id !== "string") {
      throw new HttpError(400, "Kecamatan wajib dipilih.");
    }
    const cleanKecamatan = kecamatan_id.trim();
    const resolvedKecamatan = await one<{ id: string; nama: string }>(
      "SELECT id, nama FROM kecamatan WHERE id = ? OR LOWER(nama) = LOWER(?)",
      cleanKecamatan,
      cleanKecamatan,
    );
    if (!resolvedKecamatan) {
      throw new HttpError(
        404,
        `Kecamatan '${cleanKecamatan}' tidak ditemukan dalam 16 kecamatan Kota Semarang.`,
      );
    }

    // 2. Validasi Penyakit
    if (!disease || typeof disease !== "string") {
      throw new HttpError(400, "Jenis penyakit wajib diisi.");
    }
    const normDisease = disease.trim().toUpperCase();
    if (!VALID_DISEASES.includes(normDisease)) {
      throw new HttpError(
        400,
        `Penyakit '${disease}' tidak valid. Pilihan yang didukung: ${VALID_DISEASES.join(", ")}.`,
      );
    }

    // 3. Validasi Periode Bulan / Tanggal
    const rawPeriod = month_start || date;
    const normMonth = normalizeMonthStart(rawPeriod);

    // 4. Validasi Jumlah Kasus
    const parsedCases = Number(cases);
    if (isNaN(parsedCases) || !Number.isInteger(parsedCases) || parsedCases < 0) {
      throw new HttpError(
        400,
        "Jumlah kasus harus berupa bilangan bulat positif atau nol (>= 0).",
      );
    }

    // 5. Parameter Iklim Opsional
    const parsedRainfall =
      rainfall_mm !== undefined && rainfall_mm !== null && rainfall_mm !== ""
        ? Number(rainfall_mm)
        : null;
    const parsedTemp =
      temp_mean_c !== undefined && temp_mean_c !== null && temp_mean_c !== ""
        ? Number(temp_mean_c)
        : null;
    const parsedHumidity =
      humidity_pct !== undefined && humidity_pct !== null && humidity_pct !== ""
        ? Number(humidity_pct)
        : null;

    const recordedAt = new Date().toISOString();

    // 6. Upsert ke tabel observasi
    await run(
      `INSERT INTO observasi
         (kecamatan_id, disease, month_start, cases, rainfall_mm, temp_mean_c, humidity_pct, source, recorded_at)
       VALUES
         (?, ?, ?, ?, ?, ?, ?, 'manual', ?)
       ON CONFLICT (kecamatan_id, disease, month_start) DO UPDATE SET
         cases = excluded.cases,
         rainfall_mm = COALESCE(excluded.rainfall_mm, observasi.rainfall_mm),
         temp_mean_c = COALESCE(excluded.temp_mean_c, observasi.temp_mean_c),
         humidity_pct = COALESCE(excluded.humidity_pct, observasi.humidity_pct),
         source = 'manual',
         recorded_at = excluded.recorded_at`,
      resolvedKecamatan.id,
      normDisease,
      normMonth,
      parsedCases,
      parsedRainfall,
      parsedTemp,
      parsedHumidity,
      recordedAt,
    );

    // 7. Audit Log
    await logAudit({
      actor: req.session!.label,
      role: req.session!.role,
      action: `Entri manual kasus ${normDisease}`,
      details: `${resolvedKecamatan.nama} (${normMonth}): ${parsedCases} kasus resmi.`,
      status: "success",
    });

    res.status(201).json({
      status: "success",
      message: `Berhasil mencatat ${parsedCases} kasus ${normDisease} di ${resolvedKecamatan.nama} untuk periode ${normMonth}.`,
      data: {
        kecamatan_id: resolvedKecamatan.id,
        kecamatan_nama: resolvedKecamatan.nama,
        disease: normDisease,
        month_start: normMonth,
        cases: parsedCases,
        rainfall_mm: parsedRainfall,
        temp_mean_c: parsedTemp,
        humidity_pct: parsedHumidity,
        source: "manual",
        recorded_at: recordedAt,
      },
    });
  }),
);

/**
 * GET /api/cases/recent
 * Menampilkan daftar entri manual terbaru untuk keperluan monitoring petugas / nakes.
 */
casesRouter.get(
  "/recent",
  requireAuth,
  requireRole("puskesmas", "dinas", "admin"),
  asyncRoute(async (_req, res) => {
    const rows = await all<{
      kecamatan_id: string;
      kecamatan_nama: string;
      disease: string;
      month_start: string;
      cases: number;
      rainfall_mm: number | null;
      temp_mean_c: number | null;
      humidity_pct: number | null;
      source: string;
      recorded_at: string;
    }>(
      `SELECT o.kecamatan_id, k.nama AS kecamatan_nama, o.disease, o.month_start,
              o.cases, o.rainfall_mm, o.temp_mean_c, o.humidity_pct, o.source, o.recorded_at
         FROM observasi o
         JOIN kecamatan k ON o.kecamatan_id = k.id
        WHERE o.source = 'manual'
        ORDER BY o.recorded_at DESC
        LIMIT 20`,
    );
    res.json({ data: rows });
  }),
);

/**
 * POST /api/cases/import
 * Impor rekapitulasi data kasus dari berkas CSV oleh Nakes (Puskesmas / Dinas / Admin).
 */
casesRouter.post(
  "/import",
  requireAuth,
  requireRole("puskesmas", "dinas", "admin"),
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

