/**
 * Backtest: menyalin evaluasi model dari layanan ML ke database.
 *
 * Akurasi kelas dihitung di sini, bukan di layanan ML, karena hanya di sini
 * hasil per bulan tersimpan berdampingan. Angka yang jelek tetap disimpan dan
 * tetap ditampilkan — PRD §7-H5 memperlakukan itu sebagai persyaratan, bukan
 * pilihan editorial.
 */
import { all, one, run } from "../db/index.js";
import { MlUnavailableError, mlBacktest, type MlBacktestMonth } from "./ml.js";
import { logAudit } from "./audit.js";

export type BacktestRow = {
  disease: string;
  model_version: string;
  algorithm: string | null;
  trained_at: string | null;
  train_period: string | null;
  test_period: string | null;
  mae: number;
  rmse: number;
  r2: number;
  class_accuracy_pct: number | null;
  sample_size: number | null;
  monthly_results: string;
  /** JSON rincian per bulan x kecamatan. Kosong pada baris lama. */
  district_results: string | null;
  coverage_per_kecamatan: string;
  top_features: string | null;
  /** JSON pembanding naif + putusan singkatnya. Kosong pada baris lama. */
  baselines: string | null;
  /** JSON kalibrasi rentang beserta cakupan empirisnya. Kosong pada baris lama. */
  conformal: string | null;
  fetched_at: string;
};

export async function refreshBacktest(
  disease: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await mlBacktest(disease);
    const months = result.monthly_results ?? [];

    await run(
      `INSERT INTO model_backtest
         (disease, model_version, algorithm, trained_at, train_period, test_period,
          mae, rmse, r2, class_accuracy_pct, sample_size, monthly_results,
          district_results, coverage_per_kecamatan, top_features,
          baselines, conformal, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (disease) DO UPDATE SET
         model_version = excluded.model_version,
         algorithm = excluded.algorithm,
         trained_at = excluded.trained_at,
         train_period = excluded.train_period,
         test_period = excluded.test_period,
         mae = excluded.mae, rmse = excluded.rmse, r2 = excluded.r2,
         class_accuracy_pct = excluded.class_accuracy_pct,
         sample_size = excluded.sample_size,
         monthly_results = excluded.monthly_results,
         district_results = excluded.district_results,
         coverage_per_kecamatan = excluded.coverage_per_kecamatan,
         top_features = excluded.top_features,
         baselines = excluded.baselines,
         conformal = excluded.conformal,
         fetched_at = excluded.fetched_at`,
      disease.toUpperCase(),
      result.model_version,
      result.algorithm ?? null,
      result.trained_at ?? null,
      result.train_period,
      result.test_period,
      result.metrics.mae,
      result.metrics.rmse,
      result.metrics.r2,
      classAccuracy(months),
      months.length,
      JSON.stringify(months),
      JSON.stringify(result.district_results ?? []),
      JSON.stringify(result.coverage_per_kecamatan ?? {}),
      JSON.stringify(result.top_features ?? []),
      JSON.stringify({
        baselines: result.baselines ?? {},
        summary: result.baseline_summary ?? null,
      }),
      result.conformal ? JSON.stringify(result.conformal) : null,
      new Date().toISOString(),
    );

    await logAudit({
      actor: "ML Service",
      role: "AI Service",
      action: `Backtest ${disease.toUpperCase()}`,
      details: `MAE ${result.metrics.mae}, RMSE ${result.metrics.rmse}, R² ${result.metrics.r2} (${months.length} bulan uji).`,
      status: "success",
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof MlUnavailableError ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Akurasi klasifikasi kelas risiko: berapa persen bulan uji yang kelas
 * prediksinya sama dengan kelas aktualnya. `null` bila layanan ML tidak
 * mengirim kelas — lebih baik kosong daripada 0% yang terbaca sebagai gagal.
 */
function classAccuracy(months: MlBacktestMonth[]): number | null {
  const comparable = months.filter(
    (m) => m.risk_class_actual !== null && m.risk_class_predicted !== null,
  );
  if (comparable.length === 0) return null;
  const hits = comparable.filter(
    (m) => m.risk_class_actual === m.risk_class_predicted,
  ).length;
  return Number(((hits / comparable.length) * 100).toFixed(1));
}

export function listBacktests(): Promise<BacktestRow[]> {
  return all<BacktestRow>("SELECT * FROM model_backtest ORDER BY disease");
}

export function getBacktest(disease: string): Promise<BacktestRow | null> {
  return one<BacktestRow>(
    "SELECT * FROM model_backtest WHERE disease = ?",
    disease.toUpperCase(),
  );
}
