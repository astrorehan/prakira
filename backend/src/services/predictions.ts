/**
 * Prediksi: mengambil dari layanan ML, menyimpannya, lalu membacanya kembali.
 *
 * Aturan yang tidak boleh dilanggar berkas ini: bila layanan ML tidak pernah
 * berhasil dihubungi dan tidak ada prediksi tersimpan, kecamatan dikembalikan
 * dengan `risk_class: null` dan `data_coverage: "insufficient"`. Itu keadaan
 * jujur yang diminta PRD §7-H2 — bukan "risiko rendah", bukan angka tebakan.
 */
import { all, one, transaction } from "../db/index.js";
import { MlUnavailableError, mlPredictBatch, type MlPrediction } from "./ml.js";
import {
  forecastMonthOf,
  forecastMonths,
  latestObservedMonth,
} from "./period.js";
import { logAudit } from "./audit.js";

export type StoredPrediction = {
  kecamatan_id: string;
  disease: string;
  month_start: string;
  predicted_cases: number;
  lower_bound: number;
  upper_bound: number;
  risk_score: number;
  risk_class: "rendah" | "sedang" | "tinggi" | null;
  data_coverage: "high" | "medium" | "low" | "insufficient";
  drivers: string;
  model_version: string;
  generated_at: string;
};

export type RefreshOutcome = {
  disease: string;
  month: string | null;
  refreshed: number;
  /** Baris yang angkanya berbeda dari snapshot sebelumnya. */
  changed: number;
  source: "ml-service" | "cache";
  error?: string;
};

/* Satu proses gateway bisa menerima beberapa permintaan bersamaan ketika
   dashboard dibuka. Tanpa single-flight, masing-masing permintaan akan
   memanggil layanan ML untuk batch yang sama dan semuanya mencoba menulis
   snapshot yang sama. Selain lambat, pola itu membuat cold start Render
   dikali jumlah widget di halaman. */
const refreshInFlight = new Map<string, Promise<RefreshOutcome>>();

/** Bulan prakiraan aktif sebuah penyakit: ujung jalur prakiraannya. */
export async function predictionMonthFor(
  disease: string,
): Promise<string | null> {
  const latest = await latestObservedMonth(disease);
  return forecastMonthOf(latest);
}

/** Seluruh bulan yang diprakirakan, dari sesudah observasi terakhir sampai horizon. */
export async function predictionMonthsFor(
  disease: string,
): Promise<string[]> {
  const latest = await latestObservedMonth(disease);
  return forecastMonths(latest);
}

/**
 * Menarik prediksi terbaru dari layanan ML dan menyimpannya.
 * Tidak melempar: kegagalan dilaporkan lewat nilai balik supaya permintaan
 * dashboard tetap bisa dilayani dari cache.
 */
export async function refreshPredictions(
  disease: string,
): Promise<RefreshOutcome> {
  const key = disease.toUpperCase();
  const running = refreshInFlight.get(key);
  if (running) return running;

  const task = refreshPredictionsOnce(key);
  refreshInFlight.set(key, task);
  task.then(
    () => {
      if (refreshInFlight.get(key) === task) refreshInFlight.delete(key);
    },
    () => {
      if (refreshInFlight.get(key) === task) refreshInFlight.delete(key);
    },
  );
  return task;
}

/**
 * Menarik seluruh jalur prakiraan, bukan satu bulan saja.
 *
 * Observasi berhenti di Desember sementara kalender sudah September, jadi
 * prakiraan bulan depan hanya masuk akal bila bulan-bulan di antaranya ikut
 * dihitung — dan bulan-bulan itu memang berguna: grafik tren menggambarnya
 * sebagai garis proyeksi. Bulan dihitung berurutan supaya layanan ML bisa
 * memakai kembali rantai yang sudah disusunnya untuk bulan sebelumnya.
 *
 * Bulan yang gagal tidak membatalkan bulan yang sudah tersimpan; yang
 * dilaporkan adalah bulan aktif beserta sebab kegagalan pertamanya.
 */
async function refreshPredictionsOnce(
  disease: string,
): Promise<RefreshOutcome> {
  const months = await predictionMonthsFor(disease);
  const active = months[months.length - 1] ?? null;
  if (!active) {
    return {
      disease,
      month: null,
      refreshed: 0,
      changed: 0,
      source: "cache",
      error: "Belum ada data observasi.",
    };
  }

  let refreshed = 0;
  let changed = 0;
  let failure: string | undefined;
  let modelVersion = "unknown";
  const done: string[] = [];

  for (const month of months) {
    try {
      const predictions = await mlPredictBatch(disease, month);
      const stored = await storePredictions(disease, month, predictions);
      refreshed += stored.stored;
      changed += stored.changed;
      modelVersion = predictions[0]?.model_version ?? modelVersion;
      done.push(month);
    } catch (error) {
      failure =
        error instanceof MlUnavailableError ? error.message : String(error);
      break;
    }
  }

  /* Satu catatan untuk satu jalur, bukan satu per bulan: sepuluh baris
     "Inferensi DBD 2026-0x" mengubur jejak audit yang lain tanpa menambah
     satu pun keterangan baru. Jalur yang angkanya sama persis dengan snapshot
     sebelumnya tidak dicatat sama sekali: penyegaran terjadwal berjalan tiap
     dua jam dan hampir selalu menghasilkan angka yang sama. */
  if (done.length > 0 && changed > 0) {
    await logAudit({
      actor: "ML Service",
      role: "AI Service",
      action: `Inferensi ${disease.toUpperCase()} ${done[0].slice(0, 7)}..${done[done.length - 1].slice(0, 7)}`,
      details:
        `${done.length} bulan prakiraan (${refreshed} baris kecamatan) ` +
        `dihitung dengan model ${modelVersion}.`,
      status: "success",
    });
  }

  return {
    disease,
    month: active,
    refreshed,
    changed,
    source: refreshed > 0 ? "ml-service" : "cache",
    error: failure,
  };
}

async function storePredictions(
  disease: string,
  month: string,
  predictions: MlPrediction[],
): Promise<{ stored: number; changed: number }> {
  const kecamatanRows = await all<{ id: string; ml_id: string }>(
    "SELECT id, ml_id FROM kecamatan",
  );
  const mlIdToId = new Map(kecamatanRows.map((r) => [r.ml_id, r.id]));

  const incomingIds = new Set(predictions.map((prediction) => prediction.kecamatan_id));
  const unknownIds = predictions.filter(
    (prediction) => !mlIdToId.has(prediction.kecamatan_id),
  );
  if (
    predictions.length !== kecamatanRows.length ||
    incomingIds.size !== kecamatanRows.length ||
    unknownIds.length > 0
  ) {
    throw new Error(
      `Layanan ML mengembalikan batch tidak lengkap: ${predictions.length} hasil ` +
        `untuk ${kecamatanRows.length} kecamatan yang terdaftar.`,
    );
  }

  const generatedAt = new Date().toISOString();
  const previous = await readPredictions(disease, month);
  const rows = predictions.map((prediction) => ({
    kecamatanId: mlIdToId.get(prediction.kecamatan_id)!,
    predictedCases: Math.max(0, Math.round(prediction.predicted_cases)),
    lowerBound: Math.max(0, Math.round(prediction.lower_bound)),
    upperBound: Math.max(0, Math.round(prediction.upper_bound)),
    riskScore: Math.round(prediction.risk_score),
    riskClass:
      prediction.data_coverage === "insufficient" ? null : prediction.risk_class,
    dataCoverage: prediction.data_coverage,
    drivers: JSON.stringify(prediction.drivers ?? []),
    modelVersion: prediction.model_version,
  }));
  const changed = rows.filter((row) => {
    const old = previous.get(row.kecamatanId);
    return (
      !old ||
      Number(old.predicted_cases) !== row.predictedCases ||
      Number(old.lower_bound) !== row.lowerBound ||
      Number(old.upper_bound) !== row.upperBound ||
      Number(old.risk_score) !== row.riskScore ||
      old.risk_class !== row.riskClass ||
      old.data_coverage !== row.dataCoverage ||
      old.drivers !== row.drivers ||
      old.model_version !== row.modelVersion
    );
  }).length;

  /* Satu transaksi dan satu INSERT untuk seluruh batch: dashboard tidak boleh
     sempat membaca separuh kota memakai model baru dan separuhnya model lama.
     Satu INSERT juga menghindari 16 perjalanan bolak-balik ke Supabase. */
  await transaction(async (tx) => {
    const values = predictions
      .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    const params = rows.flatMap((row) => [
      row.kecamatanId,
      disease.toUpperCase(),
      month,
      row.predictedCases,
      row.lowerBound,
      row.upperBound,
      row.riskScore,
      row.riskClass,
      row.dataCoverage,
      row.drivers,
      row.modelVersion,
      generatedAt,
    ]);

    await tx.run(
      `INSERT INTO prediksi
         (kecamatan_id, disease, month_start, predicted_cases, lower_bound, upper_bound,
          risk_score, risk_class, data_coverage, drivers, model_version, generated_at)
       VALUES ${values}
       ON CONFLICT (kecamatan_id, disease, month_start) DO UPDATE SET
         predicted_cases = excluded.predicted_cases,
         lower_bound     = excluded.lower_bound,
         upper_bound     = excluded.upper_bound,
         risk_score      = excluded.risk_score,
         risk_class      = excluded.risk_class,
         data_coverage   = excluded.data_coverage,
         drivers         = excluded.drivers,
         model_version   = excluded.model_version,
         generated_at    = excluded.generated_at`,
      ...params,
    );
  });

  return { stored: predictions.length, changed };
}

export async function readPredictions(
  disease: string,
  month: string,
): Promise<Map<string, StoredPrediction>> {
  const rows = await all<StoredPrediction>(
    "SELECT * FROM prediksi WHERE disease = ? AND month_start = ?",
    disease.toUpperCase(),
    month,
  );
  return new Map(rows.map((r) => [r.kecamatan_id, r]));
}

/** Bulan prediksi terakhir yang benar-benar tersimpan untuk sebuah penyakit. */
export async function latestStoredPredictionMonth(
  disease: string,
): Promise<string | null> {
  const row = await one<{ m: string | null }>(
    "SELECT MAX(month_start) AS m FROM prediksi WHERE disease = ?",
    disease.toUpperCase(),
  );
  return row?.m ?? null;
}

/**
 * Snapshot hanya dianggap siap bila seluruh kecamatan terwakili. Mengecek
 * bulan terakhir saja tidak cukup: batch parsial sebelumnya bisa membuat
 * gateway berhenti mencoba ulang dan dashboard menyajikan campuran kosong.
 */
export async function hasCompletePredictions(
  disease: string,
  month: string,
): Promise<boolean> {
  const row = await one<{ stored: number; expected: number }>(
    `SELECT
       (SELECT COUNT(*) FROM prediksi WHERE disease = ? AND month_start = ?) AS stored,
       (SELECT COUNT(*) FROM kecamatan) AS expected`,
    disease.toUpperCase(),
    month,
  );
  return Number(row?.stored ?? 0) === Number(row?.expected ?? 0) && Number(row?.expected ?? 0) > 0;
}

/** Bulan snapshot lengkap terbaru untuk fallback saat ML sedang tidur. */
export async function latestCompletePredictionMonth(
  disease: string,
): Promise<string | null> {
  const row = await one<{ month_start: string | null }>(
    `SELECT month_start
       FROM prediksi
      WHERE disease = ?
      GROUP BY month_start
      HAVING COUNT(*) = (SELECT COUNT(*) FROM kecamatan)
      ORDER BY month_start DESC
      LIMIT 1`,
    disease.toUpperCase(),
  );
  return row?.month_start ?? null;
}

export function parseDrivers(
  json: string,
): { feature: string; value: number; percentile: number }[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
