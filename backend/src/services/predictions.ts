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
import { addMonths, latestObservedMonth } from "./period.js";
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
  source: "ml-service" | "cache";
  error?: string;
};

/** Bulan yang diprediksi untuk sebuah penyakit: satu bulan setelah data terakhir. */
export async function predictionMonthFor(
  disease: string,
): Promise<string | null> {
  const latest = await latestObservedMonth(disease);
  return latest ? addMonths(latest, 1) : null;
}

/**
 * Menarik prediksi terbaru dari layanan ML dan menyimpannya.
 * Tidak melempar: kegagalan dilaporkan lewat nilai balik supaya permintaan
 * dashboard tetap bisa dilayani dari cache.
 */
export async function refreshPredictions(
  disease: string,
): Promise<RefreshOutcome> {
  const month = await predictionMonthFor(disease);
  if (!month) {
    return {
      disease,
      month: null,
      refreshed: 0,
      source: "cache",
      error: "Belum ada data observasi.",
    };
  }

  try {
    const predictions = await mlPredictBatch(disease, month);
    const stored = await storePredictions(disease, month, predictions);
    return { disease, month, refreshed: stored, source: "ml-service" };
  } catch (error) {
    const message =
      error instanceof MlUnavailableError ? error.message : String(error);
    return { disease, month, refreshed: 0, source: "cache", error: message };
  }
}

async function storePredictions(
  disease: string,
  month: string,
  predictions: MlPrediction[],
): Promise<number> {
  const kecamatanRows = await all<{ id: string; ml_id: string }>(
    "SELECT id, ml_id FROM kecamatan",
  );
  const mlIdToId = new Map(kecamatanRows.map((r) => [r.ml_id, r.id]));

  const generatedAt = new Date().toISOString();
  let count = 0;
  let modelVersion = "unknown";

  /* Satu transaksi untuk seluruh batch: dashboard tidak boleh sempat membaca
     separuh kota memakai model baru dan separuhnya model lama. */
  await transaction(async (tx) => {
    for (const prediction of predictions) {
      const kecamatanId = mlIdToId.get(prediction.kecamatan_id);
      if (!kecamatanId) continue;

      await tx.run(
        `INSERT INTO prediksi
           (kecamatan_id, disease, month_start, predicted_cases, lower_bound, upper_bound,
            risk_score, risk_class, data_coverage, drivers, model_version, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        kecamatanId,
        disease.toUpperCase(),
        month,
        Math.max(0, Math.round(prediction.predicted_cases)),
        Math.max(0, Math.round(prediction.lower_bound)),
        Math.max(0, Math.round(prediction.upper_bound)),
        Math.round(prediction.risk_score),
        prediction.data_coverage === "insufficient"
          ? null
          : prediction.risk_class,
        prediction.data_coverage,
        JSON.stringify(prediction.drivers ?? []),
        prediction.model_version,
        generatedAt,
      );
      modelVersion = prediction.model_version;
      count += 1;
    }
  });

  if (count > 0) {
    await logAudit({
      actor: "ML Service",
      role: "AI Service",
      action: `Inferensi ${disease.toUpperCase()} ${month}`,
      details: `${count} kecamatan diprediksi dengan model ${modelVersion}.`,
      status: "success",
    });
  }

  return count;
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
