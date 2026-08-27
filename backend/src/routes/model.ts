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
import {
  getBacktest,
  listBacktests,
  refreshBacktest,
} from "../services/backtest.js";
import { availableDiseases } from "../services/period.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { mlHealth } from "../services/ml.js";

export const modelRouter = Router();

/** Batasan yang wajib tampil di UI, bukan hanya di proposal (PRD §7). */
const LIMITATIONS = [
  "Keluaran sistem adalah estimasi risiko statistik untuk pendukung keputusan — bukan diagnosis dan bukan kepastian.",
  "Akurasi bergantung pada kelengkapan data historis; kecamatan dengan data sedikit punya ketidakpastian lebih besar.",
  "Korelasi cuaca–penyakit bukan kausalitas tunggal; kepadatan penduduk dan sanitasi turut berperan.",
  "Laporan warga rentan bias pelaporan — wilayah dengan warga lebih aktif dapat tampak lebih berisiko.",
  "Interpolasi cuaca dari stasiun terbatas ke tingkat kecamatan menurunkan presisi.",
];

function serialize(row: NonNullable<Awaited<ReturnType<typeof getBacktest>>>) {
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
    coverage_per_kecamatan: JSON.parse(row.coverage_per_kecamatan),
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

    res.json({
      meta: {
        limitations: LIMITATIONS,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        stale: rows.length === 0 && Object.keys(errors).length > 0,
      },
      data: rows.map(serialize),
    });
  }),
);

modelRouter.get(
  "/info",
  asyncRoute(async (_req, res) => {
    const backtests = (await listBacktests()).map(serialize);

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
    res.json({ data: JSON.parse(row.coverage_per_kecamatan) });
  }),
);
