/**
 * Transparansi model (PRD §5.7).
 *
 * Halaman `/analitik` dulu membaca lima baris `BACKTEST_METRICS` bernama
 * "LSTM Time-Series Deep Learning" dengan R² 0,932 — model yang tidak pernah
 * dilatih, pada penyakit yang tidak punya dataset. Yang dikirim di sini hanya
 * hasil `/backtest` dari model yang benar-benar ada berkas `.pkl`-nya, dengan
 * angkanya apa adanya termasuk saat R²-nya rendah.
 */
import { Router } from "express";
import { all } from "../db/index.js";
import {
  getBacktest,
  listBacktests,
  refreshBacktest,
} from "../services/backtest.js";
import {
  availableDiseases,
  monthLabel,
  reportingPeriod,
} from "../services/period.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { mlExplain, mlHealth, mlSimulate } from "../services/ml.js";

export const modelRouter = Router();

/** Batasan yang wajib tampil di UI, bukan hanya di proposal (PRD §7). */
const LIMITATIONS = [
  "Keluaran sistem adalah estimasi risiko statistik untuk pendukung keputusan — bukan diagnosis dan bukan kepastian.",
  "Akurasi bergantung pada kelengkapan data historis; kecamatan dengan data sedikit punya ketidakpastian lebih besar.",
  "Korelasi cuaca–penyakit bukan kausalitas tunggal; kepadatan penduduk dan sanitasi turut berperan.",
  "Laporan warga rentan bias pelaporan — wilayah dengan warga lebih aktif dapat tampak lebih berisiko.",
  "Interpolasi cuaca dari stasiun terbatas ke tingkat kecamatan menurunkan presisi.",
];

/**
 * Catatan keunggulan waktu untuk halaman Mesin Waktu.
 *
 * Angkanya tidak dikarang dan tidak diasumsikan: model memakai `cases_lag1`,
 * jadi prakiraan bulan M baru bisa dihitung setelah rekap bulan M−1 masuk, dan
 * rekap bulan M sendiri baru terbit setelah bulan M berakhir. Selisih keduanya
 * persis satu siklus pelaporan — panjang bulan yang diprakirakan. Berapa lama
 * rekap resmi tertunda setelah bulan berakhir tidak perlu diasumsikan karena
 * penundaan itu berlaku sama pada kedua sisi dan saling meniadakan.
 */
const LEAD_TIME_NOTE = [
  "Prakiraan bulan M dihitung begitu rekap kasus bulan M−1 masuk, karena fitur model memuat kasus bulan sebelumnya (cases_lag1..3).",
  "Rekap resmi bulan M sendiri baru tersedia setelah bulan M berakhir.",
  "Selisihnya satu siklus pelaporan — sepanjang bulan yang diprakirakan. Penundaan penerbitan rekap tidak ikut dihitung karena berlaku sama pada kedua sisi.",
  "Keunggulan waktu hanya berguna bila peringatannya benar. Karena itu angka di sebelahnya adalah sensitivitas dan alarm palsu apa adanya, bukan hanya yang tepat.",
];

/**
 * Peta `ml_id` → `id` kecamatan.
 *
 * Layanan ML memberi kunci cakupan dalam kode BPS bertitik (`33.74.01`);
 * seluruh sisa sistem — peta, register, prediksi — memakai `KEC_SMG_01`.
 * Selama kedua bentuk itu tidak pernah dipertemukan, konsumen yang mencari
 * cakupan sebuah kecamatan selalu tidak menemukannya, dan enam belas kecamatan
 * berdata lengkap terbaca sebagai "tidak memadai". Kolom `ml_id` memang ada di
 * skema untuk ini; yang kurang hanya penerjemahannya di batas keluar.
 */
async function kecamatanIdByMlId(): Promise<Map<string, string>> {
  const rows = await all<{ id: string; ml_id: string }>(
    "SELECT id, ml_id FROM kecamatan",
  );
  return new Map(rows.map((r) => [r.ml_id, r.id]));
}

function remapCoverage(
  raw: Record<string, string>,
  idByMlId: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    /* Kunci yang tidak dikenali tetap dibawa apa adanya: menghapusnya berarti
       menghilangkan kecamatan dari tabel cakupan tanpa jejak. */
    out[idByMlId.get(key) ?? key] = value;
  }
  return out;
}

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof getBacktest>>>,
  idByMlId: Map<string, string>,
) {
  return {
    disease: row.disease,
    model_version: row.model_version,
    algorithm: row.algorithm,
    trained_at: row.trained_at,
    train_period: row.train_period,
    test_period: row.test_period,
    mae: row.mae,
    rmse: row.rmse,
    r2: row.r2,
    class_accuracy_pct: row.class_accuracy_pct,
    sample_size: row.sample_size,
    monthly_results: JSON.parse(row.monthly_results),
    coverage_per_kecamatan: remapCoverage(
      JSON.parse(row.coverage_per_kecamatan),
      idByMlId,
    ),
    /* Kolomnya boleh kosong: baris backtest yang tersimpan sebelum layanan ML
       mengirim `top_features` tetap harus bisa dibaca tanpa melempar. */
    top_features: row.top_features ? JSON.parse(row.top_features) : [],
    /* Pembanding naif dan kalibrasi rentang. Dikirim apa adanya, termasuk saat
       modelnya kalah dari pembanding: menyembunyikannya jauh lebih berisiko
       daripada menyatakannya, karena pertanyaan tentang baseline pasti datang
       dan halaman yang sudah menjawabnya lebih kuat (PRD §7-H5). */
    baselines: row.baselines ? JSON.parse(row.baselines) : null,
    conformal: row.conformal ? JSON.parse(row.conformal) : null,
    fetched_at: row.fetched_at,
  };
}

modelRouter.get(
  "/backtest",
  asyncRoute(async (req, res) => {
    const requested =
      typeof req.query.disease === "string" ? req.query.disease : undefined;
    const diseases = requested ? [requested] : await availableDiseases();
    const errors: Record<string, string> = {};

    for (const disease of diseases) {
      if ((await getBacktest(disease)) && req.query.refresh !== "1") continue;
      const outcome = await refreshBacktest(disease);
      if (!outcome.ok && outcome.error)
        errors[disease.toUpperCase()] = outcome.error;
    }

    const rows = requested
      ? [await getBacktest(requested)].filter(
          (r): r is NonNullable<typeof r> => r !== null,
        )
      : await listBacktests();

    const idByMlId = await kecamatanIdByMlId();

    res.json({
      meta: {
        limitations: LIMITATIONS,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        stale: rows.length === 0 && Object.keys(errors).length > 0,
      },
      data: rows.map((row) => serialize(row, idByMlId)),
    });
  }),
);

modelRouter.get(
  "/info",
  asyncRoute(async (_req, res) => {
    const idByMlId = await kecamatanIdByMlId();
    const backtests = (await listBacktests()).map((row) =>
      serialize(row, idByMlId),
    );

    let health = null;
    let reachable = false;
    try {
      health = await mlHealth();
      reachable = true;
    } catch {
      reachable = false;
    }

    res.json({
      meta: { limitations: LIMITATIONS, mlReachable: reachable },
      data: { models: health?.models_loaded ?? null, backtests },
    });
  }),
);

modelRouter.get("/limitations", (_req, res) => {
  res.json({ data: LIMITATIONS });
});

modelRouter.get(
  "/coverage",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease : "";
    const row = await getBacktest(disease);
    if (!row) {
      throw new HttpError(
        404,
        `Belum ada hasil backtest tersimpan untuk '${disease}'. Jalankan ml-services lalu segarkan.`,
      );
    }
    res.json({
      data: remapCoverage(
        JSON.parse(row.coverage_per_kecamatan),
        await kecamatanIdByMlId(),
      ),
    });
  }),
);

/* ── Mesin Waktu (PRD §5.7, turunan) ─────────────────────────────────────────
 *
 * `monthly_results` menjawab "seberapa dekat totalnya"; rute ini menjawab
 * pertanyaan yang sebenarnya ditanyakan orang dinas: "bulan itu, di kecamatan
 * saya, apakah sistem ini sudah mengatakannya lebih dulu?" Jawabannya disusun
 * dari periode uji — data yang tidak pernah dilihat model saat dilatih — dan
 * dikirim lengkap dengan yang meleset serta yang teriak tanpa sebab.
 */

type Verdict = "tertandai" | "terlewat" | "alarm_palsu" | "sepadan" | "meleset";

type StoredDistrictResult = {
  month_start: string;
  kecamatan_id: string;
  actual: number;
  predicted: number;
  risk_score_actual: number;
  risk_score_predicted: number;
  risk_class_actual: string | null;
  risk_class_predicted: string | null;
};

type Tally = Record<Verdict, number>;

function emptyTally(): Tally {
  return { tertandai: 0, terlewat: 0, alarm_palsu: 0, sepadan: 0, meleset: 0 };
}

/**
 * Menilai satu pasangan bulan × kecamatan.
 *
 * Kelas "tinggi" diperlakukan istimewa karena itulah kelas yang menerbitkan
 * tindakan (lihat `services/actions.ts`): terlewat berarti tidak ada instruksi
 * yang terbit, alarm palsu berarti sumber daya bergerak untuk lonjakan yang
 * tidak datang. Keduanya kesalahan, dan keduanya dihitung terpisah.
 */
function verdictOf(actual: string | null, predicted: string | null): Verdict {
  const actualHigh = actual === "tinggi";
  const predictedHigh = predicted === "tinggi";
  if (actualHigh && predictedHigh) return "tertandai";
  if (actualHigh) return "terlewat";
  if (predictedHigh) return "alarm_palsu";
  return actual === predicted ? "sepadan" : "meleset";
}

function percent(part: number, whole: number): number | null {
  return whole === 0 ? null : Number(((part / whole) * 100).toFixed(1));
}

/** Panjang bulan `YYYY-MM-01` dalam hari — inilah keunggulan waktunya. */
function daysInMonth(monthStart: string): number {
  const [year, month] = monthStart.split("-").map(Number);
  if (!year || !month) return 30;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

modelRouter.get(
  "/rewind",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease.trim() : "";
    if (!disease) {
      throw new HttpError(400, "Sertakan parameter ?disease= pada permintaan.");
    }

    let row = await getBacktest(disease);
    if (!row || req.query.refresh === "1") {
      await refreshBacktest(disease);
      row = await getBacktest(disease);
    }
    if (!row) {
      throw new HttpError(
        404,
        `Belum ada hasil backtest tersimpan untuk '${disease}'. Jalankan ml-services lalu segarkan.`,
      );
    }

    const parseCells = (raw: string | null): StoredDistrictResult[] =>
      raw ? (JSON.parse(raw) as StoredDistrictResult[]) : [];

    let stored = parseCells(row.district_results);

    /* Baris backtest yang tersimpan sebelum layanan ML mengirim rincian per
       kecamatan tetap sah untuk halaman /model, tapi tidak memuat apa pun yang
       bisa diputar ulang di sini. Tarik ulang sekali — biasanya layanan ML
       memang sudah hidup dan hanya barisnya yang usang — baru menyerah. */
    if (stored.length === 0) {
      await refreshBacktest(row.disease);
      const refreshed = await getBacktest(row.disease);
      if (refreshed) {
        row = refreshed;
        stored = parseCells(refreshed.district_results);
      }
    }

    if (stored.length === 0) {
      throw new HttpError(
        409,
        `Hasil backtest ${row.disease} belum memuat rincian per kecamatan. Jalankan layanan ML lalu muat ulang halaman ini.`,
      );
    }

    const kecamatan = await all<{
      id: string;
      ml_id: string;
      nama: string;
      kode_bps: string;
      populasi: number;
    }>("SELECT id, ml_id, nama, kode_bps, populasi FROM kecamatan ORDER BY id");
    const byMlId = new Map(kecamatan.map((k) => [k.ml_id, k]));

    const overall = emptyTally();
    const months = new Map<
      string,
      { actual: number; predicted: number; tally: Tally; evaluated: number }
    >();
    const perDistrict = new Map<
      string,
      { tally: Tally; absError: number; evaluated: number }
    >();
    let absErrorSum = 0;

    const cells = stored.map((cell) => {
      const kec = byMlId.get(cell.kecamatan_id);
      const verdict = verdictOf(
        cell.risk_class_actual,
        cell.risk_class_predicted,
      );
      const absError = Math.abs(cell.actual - cell.predicted);

      overall[verdict] += 1;
      absErrorSum += absError;

      const month = months.get(cell.month_start) ?? {
        actual: 0,
        predicted: 0,
        tally: emptyTally(),
        evaluated: 0,
      };
      month.actual += cell.actual;
      month.predicted += cell.predicted;
      month.tally[verdict] += 1;
      month.evaluated += 1;
      months.set(cell.month_start, month);

      /* Kecamatan yang tidak dikenali tetap dihitung dengan kunci mentahnya —
         menyembunyikannya berarti membuang baris uji tanpa jejak. */
      const key = kec?.id ?? cell.kecamatan_id;
      const district = perDistrict.get(key) ?? {
        tally: emptyTally(),
        absError: 0,
        evaluated: 0,
      };
      district.tally[verdict] += 1;
      district.absError += absError;
      district.evaluated += 1;
      perDistrict.set(key, district);

      return {
        month_start: cell.month_start,
        kecamatan_id: key,
        nama: kec?.nama ?? cell.kecamatan_id,
        actual: cell.actual,
        predicted: cell.predicted,
        risk_score_actual: cell.risk_score_actual,
        risk_score_predicted: cell.risk_score_predicted,
        risk_class_actual: cell.risk_class_actual,
        risk_class_predicted: cell.risk_class_predicted,
        verdict,
      };
    });

    const monthList = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month_start, value]) => ({
        month_start,
        label: monthLabel(month_start),
        lead_time_days: daysInMonth(month_start),
        actual: value.actual,
        predicted: value.predicted,
        evaluated: value.evaluated,
        tally: value.tally,
      }));

    const districtList = kecamatan
      .map((k) => {
        const entry = perDistrict.get(k.id);
        return {
          id: k.id,
          nama: k.nama,
          kode_bps: k.kode_bps,
          populasi: k.populasi,
          evaluated: entry?.evaluated ?? 0,
          tally: entry?.tally ?? emptyTally(),
          mae:
            entry && entry.evaluated > 0
              ? Number((entry.absError / entry.evaluated).toFixed(2))
              : null,
        };
      })
      .filter((d) => d.evaluated > 0);

    const surges = overall.tertandai + overall.terlewat;
    const alarms = overall.tertandai + overall.alarm_palsu;
    const evaluated = cells.length;

    /* Rata-rata panjang bulan uji: itulah jarak antara prakiraan tersedia dan
       rekap bulan yang sama terbit. Lihat LEAD_TIME_NOTE. */
    const leadTimeDays =
      monthList.length === 0
        ? null
        : Math.round(
            monthList.reduce((sum, m) => sum + m.lead_time_days, 0) /
              monthList.length,
          );

    res.json({
      meta: {
        disease: row.disease,
        model_version: row.model_version,
        algorithm: row.algorithm,
        trained_at: row.trained_at,
        train_period: row.train_period,
        test_period: row.test_period,
        fetched_at: row.fetched_at,
        leadTimeNote: LEAD_TIME_NOTE,
        limitations: LIMITATIONS,
      },
      data: {
        months: monthList,
        districts: districtList,
        cells,
        summary: {
          evaluated,
          monthsCount: monthList.length,
          districtsCount: districtList.length,
          leadTimeDays,
          tally: overall,
          surges,
          alarms,
          /* Sensitivitas: dari seluruh bulan-kecamatan yang benar-benar
             berkelas tinggi, berapa persen sudah ditandai lebih dulu. */
          sensitivityPct: percent(overall.tertandai, surges),
          /* Presisi: dari seluruh peringatan kelas tinggi yang terbit, berapa
             persen memang terjadi. */
          precisionPct: percent(overall.tertandai, alarms),
          classAccuracyPct: percent(
            overall.tertandai + overall.sepadan,
            evaluated,
          ),
          mae:
            evaluated === 0
              ? null
              : Number((absErrorSum / evaluated).toFixed(2)),
        },
      },
    });
  }),
);

/* ── "Kenapa angka ini?" & simulator cuaca ───────────────────────────────── */

/**
 * Catatan yang wajib menempel pada halaman penjelasan.
 *
 * Kontribusi fitur adalah tempat paling mudah untuk terpeleset dari "model
 * memakai variabel ini" menjadi "variabel ini menyebabkan kasus". Layanan ML
 * sudah mengirim catatan metodenya sendiri; yang ditambahkan di sini adalah
 * batas yang berlaku di tingkat produk, bukan di tingkat algoritma.
 */
const EXPLAIN_NOTE = [
  "Yang diterangkan adalah keputusan model, bukan rantai penularan. Dua hal itu bisa searah, tapi tidak otomatis sama.",
  "Kontribusi diukur terhadap bulan yang lazim di kecamatan itu sendiri. Kecamatan yang biasanya tinggi tidak akan tampak 'berkontribusi besar' hanya karena angkanya besar.",
  "Iklim Semarang pada dataset ini berasal dari stasiun terbatas yang diinterpolasi ke tingkat kecamatan, jadi perbedaan hujan antar-kecamatan lebih kecil daripada kenyataannya.",
];

/** Pemetaan dua arah antara id aplikasi (`KEC_SMG_01`) dan id ML (`33.74.01`). */
async function kecamatanKeys(): Promise<{
  mlIdById: Map<string, string>;
  byMlId: Map<string, { id: string; nama: string }>;
}> {
  const rows = await all<{ id: string; ml_id: string; nama: string }>(
    "SELECT id, ml_id, nama FROM kecamatan",
  );
  return {
    mlIdById: new Map(rows.map((r) => [r.id, r.ml_id])),
    byMlId: new Map(rows.map((r) => [r.ml_id, { id: r.id, nama: r.nama }])),
  };
}

modelRouter.get(
  "/explain",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease.trim() : "";
    const kecamatanId =
      typeof req.query.kecamatan_id === "string"
        ? req.query.kecamatan_id.trim()
        : "";

    if (!disease || !kecamatanId) {
      throw new HttpError(
        400,
        "Sertakan parameter ?disease= dan ?kecamatan_id= pada permintaan.",
      );
    }

    const { mlIdById, byMlId } = await kecamatanKeys();
    /* Menerima kedua bentuk id: konsol memakai `KEC_SMG_01`, sedangkan
       pemanggil yang berangkat dari hasil ML memegang `33.74.01`. */
    const mlId = mlIdById.get(kecamatanId) ?? kecamatanId;
    const known = byMlId.get(mlId);
    if (!known) {
      throw new HttpError(404, `Kecamatan '${kecamatanId}' tidak dikenal.`);
    }

    const period = await reportingPeriod(disease);
    if (!period.predictionMonth) {
      throw new HttpError(
        409,
        `Belum ada bulan prediksi untuk '${disease}'. Impor data observasi lebih dulu.`,
      );
    }

    let payload;
    try {
      payload = await mlExplain(disease, mlId, period.predictionMonth);
    } catch (error) {
      /* Tidak ada cadangan tersimpan untuk penjelasan, dan itu disengaja:
         kontribusi fitur menerangkan prakiraan yang berlaku sekarang. Menyajikan
         penjelasan basi untuk angka baru lebih menyesatkan daripada kosong. */
      throw new HttpError(
        503,
        error instanceof Error
          ? error.message
          : "Layanan ML tidak dapat dihubungi.",
      );
    }

    res.json({
      meta: {
        disease: payload.disease,
        kecamatan_id: known.id,
        kecamatan_nama: known.nama,
        month: payload.month,
        monthLabel: monthLabel(payload.month),
        method: payload.method,
        notes: [...payload.notes, ...EXPLAIN_NOTE],
      },
      data: {
        data_coverage: payload.data_coverage,
        baseline_cases: payload.baseline_cases,
        baseline_rounded: payload.baseline_rounded,
        reference_scope: payload.reference_scope,
        reference_months: payload.reference_months,
        total_movement: payload.total_movement,
        families: payload.families,
        global_importance: payload.global_importance,
      },
    });
  }),
);

function numberParam(raw: unknown, fallback = 0): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

modelRouter.post(
  "/simulate",
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const disease =
      typeof body.disease === "string" ? body.disease.trim() : "";
    if (!disease) {
      throw new HttpError(400, "Sertakan `disease` pada badan permintaan.");
    }

    const period = await reportingPeriod(disease);
    if (!period.predictionMonth) {
      throw new HttpError(
        409,
        `Belum ada bulan prediksi untuk '${disease}'. Impor data observasi lebih dulu.`,
      );
    }

    let payload;
    try {
      payload = await mlSimulate({
        disease,
        month: period.predictionMonth,
        rainfallPct: numberParam(body.rainfall_pct),
        tempDeltaC: numberParam(body.temp_delta_c),
        humidityDeltaPct: numberParam(body.humidity_delta_pct),
      });
    } catch (error) {
      throw new HttpError(
        503,
        error instanceof Error
          ? error.message
          : "Layanan ML tidak dapat dihubungi.",
      );
    }

    const { byMlId } = await kecamatanKeys();
    const districts = payload.districts.map((d) => {
      const known = byMlId.get(d.kecamatan_id);
      return {
        ...d,
        /* Id aplikasi dikembalikan supaya peta dan tabel di frontend bisa
           mencocokkannya tanpa tahu bentuk kode ML sama sekali. */
        id: known?.id ?? d.kecamatan_id,
        nama: known?.nama ?? d.kecamatan_nama,
      };
    });

    res.json({
      meta: {
        disease: payload.disease,
        month: payload.month,
        monthLabel: monthLabel(payload.month),
        adjustment: payload.adjustment,
        notes: payload.notes,
        limitations: LIMITATIONS,
      },
      data: {
        districts,
        summary: payload.summary,
      },
    });
  }),
);
