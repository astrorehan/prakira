/**
 * Rute entri kasus resmi oleh nakes (Puskesmas / Dinas / Admin).
 *
 * Sesuai kesepakatan alur PKR-NAKES-01:
 * - Warga hanya melaporkan kondisi lingkungan.
 * - Nakes (Puskesmas/Dinas/Admin) menginput data kasus resmi terkonfirmasi.
 * - Kasus disimpan/di-upsert ke tabel `observasi` dengan label source = 'manual'.
 * - Setiap entri tercatat secara transparan di `audit_log`.
 */
import { Router, type Request } from "express";
import { all, one, run, transaction } from "../db/index.js";
import { parseCsv, parseCsvHeader, toNumber } from "../db/csv.js";
import { startIngestJob, finishIngestJob } from "../db/seed.js";
import { requireAuth, requireRole, sessionScopeId } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { logAudit } from "../services/audit.js";
import {
  RecapReasonRequiredError,
  districtRecapStatus,
  findRecapEntry,
  listRecapRevisions,
  markRecapChecked,
  periodReadiness,
  saveRecap,
} from "../services/recap.js";

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
/** Akun puskesmas hanya menulis dan membaca rekap wilayahnya sendiri. */
function assertOwnKecamatan(req: Request, kecamatanId: string): void {
  const scope = sessionScopeId(req);
  if (scope && scope !== kecamatanId) {
    throw new HttpError(403, "Kecamatan ini di luar wilayah akun Anda.");
  }
}

casesRouter.post(
  "/manual",
  requireAuth,
  requireRole("puskesmas", "dinas"),
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
    assertOwnKecamatan(req, resolvedKecamatan.id);

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

    /* 6. Simpan sebagai total rekap kecamatan.
       Satu baris observasi adalah total kecamatan untuk satu penyakit pada
       satu bulan; menyimpan ulang berarti mengganti total itu, bukan
       menambahkan kontribusi faskes. Karena itu koreksi yang mengubah angka
       menuntut alasan, dan jawabannya menyebut nilai lama dan nilai baru. */
    let result;
    try {
      result = await saveRecap(
        {
          kecamatanId: resolvedKecamatan.id,
          kecamatanNama: resolvedKecamatan.nama,
          disease: normDisease,
          month: normMonth,
          cases: parsedCases,
          rainfall: parsedRainfall,
          temp: parsedTemp,
          humidity: parsedHumidity,
          reason: typeof req.body?.reason === "string" ? req.body.reason : null,
        },
        req.session!.label,
        req.session!.role,
      );
    } catch (error) {
      if (error instanceof RecapReasonRequiredError) {
        throw new HttpError(409, error.message);
      }
      throw error;
    }

    res.status(201).json({
      status: "success",
      message: result.replaced
        ? `Total rekap ${normDisease} untuk ${resolvedKecamatan.nama} pada ${normMonth} diperbarui dari ${result.previousCases} menjadi ${parsedCases}.`
        : `Total rekap ${normDisease} untuk ${resolvedKecamatan.nama} pada ${normMonth} ditetapkan ${parsedCases}.`,
      data: {
        kecamatan_id: resolvedKecamatan.id,
        kecamatan_nama: resolvedKecamatan.nama,
        disease: normDisease,
        month_start: normMonth,
        cases: parsedCases,
        previous_cases: result.previousCases,
        replaced: result.replaced,
        rainfall_mm: parsedRainfall,
        temp_mean_c: parsedTemp,
        humidity_pct: parsedHumidity,
        source: "manual",
        recorded_at: result.entry?.recorded_at ?? new Date().toISOString(),
        recorded_by: result.entry?.recorded_by ?? req.session!.label,
      },
    });
  }),
);

/**
 * GET /api/cases/entry
 * Rekap yang sudah tersimpan untuk satu kecamatan-penyakit-periode, beserta
 * riwayat koreksinya. Dipanggil sebelum menyimpan supaya operator melihat
 * nilai yang akan ia ganti, bukan mengetahuinya setelah tergantikan.
 */
casesRouter.get(
  "/entry",
  requireAuth,
  requireRole("puskesmas", "dinas"),
  asyncRoute(async (req, res) => {
    const kecamatanId = String(req.query.kecamatan_id ?? "").trim();
    const disease = String(req.query.disease ?? "").trim().toUpperCase();
    const rawMonth = String(req.query.month_start ?? "").trim();
    if (!kecamatanId || !disease || !rawMonth) {
      throw new HttpError(
        400,
        "Kecamatan, penyakit, dan periode wajib disertakan.",
      );
    }
    assertOwnKecamatan(req, kecamatanId);
    const month = normalizeMonthStart(rawMonth);
    const entry = await findRecapEntry(kecamatanId, disease, month);
    res.json({
      data: {
        entry,
        revisions: entry
          ? await listRecapRevisions(kecamatanId, disease, month)
          : [],
      },
    });
  }),
);

/**
 * POST /api/cases/entry/checked
 * Menandai rekap satu kecamatan sudah diperiksa pemiliknya. Kejadian ini
 * berbeda dari penyimpanan: tersimpan berarti angkanya masuk, diperiksa
 * berarti ada orang yang membenarkannya untuk periode itu.
 */
casesRouter.post(
  "/entry/checked",
  requireAuth,
  requireRole("puskesmas", "dinas"),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const kecamatanId = String(body.kecamatan_id ?? "").trim();
    const disease = String(body.disease ?? "").trim().toUpperCase();
    if (!kecamatanId || !disease) {
      throw new HttpError(400, "Kecamatan dan penyakit wajib disertakan.");
    }
    assertOwnKecamatan(req, kecamatanId);
    const month = normalizeMonthStart(String(body.month_start ?? ""));
    const entry = await markRecapChecked(
      kecamatanId,
      disease,
      month,
      req.session!.label,
      req.session!.role,
    );
    if (!entry) {
      throw new HttpError(
        404,
        "Belum ada rekap tersimpan untuk kecamatan dan periode itu.",
      );
    }
    res.json({ data: entry });
  }),
);

/**
 * GET /api/cases/readiness
 * Jawaban tunggal yang diminta audit F18: periode apa yang lengkap, prakiraan
 * apa yang sah dibaca, dan siapa yang harus mengerjakan kekurangannya.
 */
casesRouter.get(
  "/readiness",
  requireAuth,
  requireRole("puskesmas", "dinas"),
  asyncRoute(async (req, res) => {
    const disease = String(req.query.disease ?? "DBD").trim().toUpperCase();
    if (!VALID_DISEASES.includes(disease)) {
      throw new HttpError(400, `Penyakit '${disease}' tidak valid.`);
    }
    const rawMonth =
      typeof req.query.month_start === "string" && req.query.month_start
        ? normalizeMonthStart(req.query.month_start)
        : undefined;

    const readiness = await periodReadiness(disease, rawMonth);
    res.json({
      data: {
        ...readiness,
        districts: readiness.month
          ? await districtRecapStatus(disease, readiness.month)
          : [],
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
  requireRole("puskesmas", "dinas"),
  asyncRoute(async (req, res) => {
    const scope = sessionScopeId(req);
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
        WHERE o.source = 'manual'${scope ? " AND o.kecamatan_id = ?" : ""}
        ORDER BY o.recorded_at DESC
        LIMIT 20`,
      ...(scope ? [scope] : []),
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
  requireRole("puskesmas", "dinas"),
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
      previousCases: number | null;
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
      const scope = sessionScopeId(req);
      if (scope && kecamatanId !== scope) {
        problems.push({
          line,
          message: `Kecamatan '${row.kecamatan_nama}' di luar wilayah akun Anda.`,
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
        previousCases: null,
        rainfall: toNumber(row.rainfall_mm),
        temp: toNumber(row.temp_mean_c),
        humidity: toNumber(row.humidity_pct),
      });
    });

    /* Nilai yang akan tergantikan dibaca sebelum apa pun ditulis: pratinjau
       yang hanya menghitung "baris valid" tidak memberi tahu operator bahwa
       sebagian di antaranya mengganti total yang sudah ada. */
    const existingRows = await all<{
      kecamatan_id: string;
      month_start: string;
      cases: number;
    }>(
      `SELECT kecamatan_id, month_start, cases FROM observasi
        WHERE disease = ? AND month_start = ANY(?::text[])`,
      disease,
      Array.from(new Set(valid.map((row) => row.month))),
    );
    const existingByKey = new Map(
      existingRows.map((row) => [`${row.kecamatan_id}|${row.month_start}`, row.cases]),
    );
    for (const row of valid) {
      row.previousCases =
        existingByKey.get(`${row.kecamatanId}|${row.month}`) ?? null;
    }

    const replacements = valid.filter(
      (row) => row.previousCases !== null && row.previousCases !== row.cases,
    );
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
        newRows: valid.filter((row) => row.previousCases === null).length,
        replacedRows: replacements.length,
        replacements: replacements.slice(0, 10).map((row) => ({
          nama: row.nama,
          month: row.month,
          previousCases: row.previousCases,
          cases: row.cases,
        })),
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
                humidity_pct, source, recorded_at, recorded_by, recap_state)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'import', ?, ?, 'tersimpan')
             ON CONFLICT (kecamatan_id, disease, month_start) DO UPDATE SET
               cases = excluded.cases,
               rainfall_mm = COALESCE(excluded.rainfall_mm, observasi.rainfall_mm),
               temp_mean_c = COALESCE(excluded.temp_mean_c, observasi.temp_mean_c),
               humidity_pct = COALESCE(excluded.humidity_pct, observasi.humidity_pct),
               source = 'import',
               recorded_at = excluded.recorded_at,
               recorded_by = excluded.recorded_by,
               recap_state = 'tersimpan'`,
            row.kecamatanId,
            disease,
            row.month,
            row.cases,
            row.rainfall,
            row.temp,
            row.humidity,
            recordedAt,
            req.session!.label,
          );

          /* Impor mengganti total kecamatan sama seperti entri manual, jadi
             perubahan angkanya masuk riwayat koreksi yang sama. */
          if (row.previousCases !== row.cases) {
            await tx.run(
              `INSERT INTO observasi_revisi
                 (kecamatan_id, disease, month_start, previous_cases, new_cases,
                  reason, actor, role, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              row.kecamatanId,
              disease,
              row.month,
              row.previousCases,
              row.cases,
              "Impor CSV rekap periode.",
              req.session!.label,
              req.session!.role,
              recordedAt,
            );
          }
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

    res.json({
      dryRun: false,
      disease,
      imported: valid.length,
      replaced: replacements.length,
      problems,
      readiness: await periodReadiness(disease),
    });
  }),
);

