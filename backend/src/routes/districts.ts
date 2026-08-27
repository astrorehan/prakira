/**
 * Data kecamatan, tren kota, dan deret korelasi iklim.
 *
 * Setiap respons membawa `meta.stale`: benar bila prediksi yang terkirim
 * berasal dari cache karena layanan ML sedang tidak bisa dihubungi. UI wajib
 * menampilkannya — dashboard yang diam-diam menyajikan angka basi lebih
 * berbahaya daripada dashboard yang mengaku sedang basi.
 */
import { Router } from "express";
import {
  getClimateSeries,
  getDistricts,
  getTrend,
} from "../services/districts.js";
import {
  latestStoredPredictionMonth,
  refreshPredictions,
} from "../services/predictions.js";
import { regenerateActions } from "../services/actions.js";
import { availableDiseases, reportingPeriod } from "../services/period.js";
import { asyncRoute, HttpError } from "../middleware/error.js";

export const districtsRouter = Router();

/** Menolak penyakit yang tidak punya data — daripada mengembalikan 16 baris kosong. */
async function assertDisease(disease: string): Promise<string> {
  const known = await availableDiseases();
  const match = known.find((d) => d.toUpperCase() === disease.toUpperCase());
  if (!match) {
    throw new HttpError(
      404,
      `Penyakit '${disease}' belum punya data di sistem. Tersedia: ${known.join(", ") || "belum ada"}.`,
    );
  }
  return match;
}

/* Prediksi tidak ditarik ulang pada tiap permintaan: satu bulan prediksi cukup
   dihitung sekali. Yang memicu penarikan adalah tidak adanya prediksi untuk
   bulan itu, atau permintaan eksplisit `?refresh=1`. */
async function ensurePredictions(
  disease: string,
  force: boolean,
): Promise<{ stale: boolean; error?: string }> {
  const period = await reportingPeriod(disease);
  const stored = await latestStoredPredictionMonth(disease);
  const needsRefresh = force || stored !== period.predictionMonth;

  if (!needsRefresh) return { stale: false };

  const outcome = await refreshPredictions(disease);
  if (outcome.refreshed > 0) {
    await regenerateActions([disease]);
    return { stale: false };
  }

  return { stale: true, error: outcome.error };
}

districtsRouter.get(
  "/districts",
  asyncRoute(async (req, res) => {
    const disease = await assertDisease(
      typeof req.query.disease === "string" ? req.query.disease : "DBD",
    );
    const status = await ensurePredictions(disease, req.query.refresh === "1");

    res.json({
      meta: { disease, ...(await reportingPeriod(disease)), ...status },
      data: await getDistricts(disease),
    });
  }),
);

districtsRouter.get(
  "/trend",
  asyncRoute(async (req, res) => {
    const disease = await assertDisease(
      typeof req.query.disease === "string" ? req.query.disease : "DBD",
    );
    const months = Number(req.query.months ?? 12);
    const status = await ensurePredictions(disease, false);

    res.json({
      meta: { disease, ...(await reportingPeriod(disease)), ...status },
      data: await getTrend(disease, Number.isFinite(months) ? months : 12),
    });
  }),
);

/**
 * Seluruh penyakit sekaligus.
 *
 * Permukaan publik (halaman depan, portal warga, halaman layanan) selalu
 * butuh kelas risiko terburuk sebuah kecamatan lintas penyakit. Memanggil
 * `/api/districts` sekali per penyakit membuat tiap halaman itu menembakkan
 * dua sampai empat permintaan yang mendarat pada urutan berbeda, dan selama
 * beberapa ratus milidetik kota tampak lebih aman daripada kenyataannya.
 */
districtsRouter.get(
  "/districts/all",
  asyncRoute(async (req, res) => {
    const diseases = await availableDiseases();
    const force = req.query.refresh === "1";
    const stale: string[] = [];
    const data: Record<string, Awaited<ReturnType<typeof getDistricts>>> = {};

    for (const disease of diseases) {
      const status = await ensurePredictions(disease, force);
      if (status.stale) stale.push(disease);
      data[disease] = await getDistricts(disease);
    }

    res.json({
      meta: {
        ...(await reportingPeriod()),
        diseases,
        stale: stale.length > 0,
        staleDiseases: stale,
      },
      data,
    });
  }),
);

districtsRouter.get(
  "/climate",
  asyncRoute(async (req, res) => {
    const months = Number(req.query.months ?? 24);
    res.json({
      meta: {
        ...(await reportingPeriod()),
        diseases: await availableDiseases(),
      },
      data: await getClimateSeries(Number.isFinite(months) ? months : 24),
    });
  }),
);
