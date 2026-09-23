/**
 * Penyegaran prakiraan seluruh penyakit dalam satu langkah.
 *
 * Dipakai tiga pemicu: pemanasan saat gateway menyala, tombol refresh admin,
 * dan penyegaran terjadwal (`/api/internal/refresh`). Halaman dashboard tidak
 * lagi memanggil layanan ML sendiri — ia hanya membaca tabel `prediksi` yang
 * diisi dari sini.
 */
import { one } from "../db/index.js";
import { refreshBacktest } from "./backtest.js";
import { invalidateDistrictViewCache } from "./districts.js";
import { availableDiseases } from "./period.js";
import { refreshPredictions, type RefreshOutcome } from "./predictions.js";
import { regenerateActions } from "./actions.js";

export type DiseaseRefresh = {
  disease: string;
  prediction: RefreshOutcome;
  /** `null` bila backtest dilewati karena tidak ada yang berubah. */
  backtest: { ok: boolean; error?: string } | null;
};

async function hasBacktest(disease: string): Promise<boolean> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM model_backtest WHERE disease = ?",
    disease.toUpperCase(),
  );
  return Number(row?.n ?? 0) > 0;
}

/**
 * `forceBacktest`: tanpa itu, backtest hanya ditarik ulang bila angka
 * prakiraan berubah atau belum pernah ada. Backtest bergantung pada model,
 * bukan pada jam — menghitungnya ulang tiap dua jam hanya membangunkan
 * layanan ML untuk hasil yang sama.
 */
export async function refreshAllPredictions(
  options: { forceBacktest?: boolean } = {},
): Promise<DiseaseRefresh[]> {
  const diseases = await availableDiseases();
  const results: DiseaseRefresh[] = [];

  for (const disease of diseases) {
    const prediction = await refreshPredictions(disease);
    const runBacktest =
      prediction.refreshed > 0 &&
      (options.forceBacktest ||
        prediction.changed > 0 ||
        !(await hasBacktest(disease)));
    const backtest = runBacktest ? await refreshBacktest(disease) : null;
    if (prediction.changed > 0) invalidateDistrictViewCache(disease);
    results.push({ disease, prediction, backtest });
  }

  const refreshed = results
    .filter((r) => r.prediction.refreshed > 0)
    .map((r) => r.disease);
  if (refreshed.length > 0) await regenerateActions(refreshed);

  return results;
}

/** Berhasil bila setiap penyakit mendapat jalur prakiraan lengkap. */
export function refreshSucceeded(results: DiseaseRefresh[]): boolean {
  return results.every(
    (r) =>
      r.prediction.refreshed > 0 &&
      !r.prediction.error &&
      (r.backtest === null || r.backtest.ok),
  );
}
