/**
 * Data kecamatan, tren kota, dan deret korelasi iklim.
 *
 * Setiap respons membawa `meta.stale`: benar bila prediksi yang terkirim
 * berasal dari cache karena layanan ML sedang tidak bisa dihubungi. UI wajib
 * menampilkannya — dashboard yang diam-diam menyajikan angka basi lebih
 * berbahaya daripada dashboard yang mengaku sedang basi.
 */
import { Router, type Request } from "express";
import {
  getClimateSeries,
  getDistricts,
  getTrend,
  invalidateDistrictViewCache,
} from "../services/districts.js";
import {
  hasCompletePredictions,
  refreshPredictions,
} from "../services/predictions.js";
import { regenerateActions } from "../services/actions.js";
import {
  getPriority,
  METHOD_NOTE,
  MISSING_FACTORS,
  type PriorityWeighting,
} from "../services/priority.js";
import { availableDiseases, reportingPeriod } from "../services/period.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { requireRole } from "../middleware/auth.js";

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

/* Permintaan halaman tidak pernah memanggil layanan ML. Prakiraan diisi oleh
   penyegaran terjadwal (`/api/internal/refresh`, tiap dua jam) dan pemanasan
   saat gateway menyala; di sini tabel `prediksi` hanya dibaca. Bila bulan
   aktif belum lengkap, respons mengaku basi dan data tersimpan terakhir yang
   dipakai — pengunjung tidak ikut menunggu layanan ML bangun.

   Satu-satunya jalan pintas: admin boleh memaksa `?refresh=1`. */
async function ensurePredictions(
  disease: string,
  force: boolean,
  knownDiseases?: string[],
): Promise<{ stale: boolean; error?: string }> {
  if (force) {
    const outcome = await refreshPredictions(disease);
    /* `refreshed > 0` saja tidak cukup: jalur prakiraan bisa tersimpan sampai
       bulan kelima lalu gagal, dan bulan aktif yang ditampilkan halaman tetap
       kosong. Selama ada sebab kegagalan, halaman harus mengaku basi. */
    if (outcome.refreshed > 0 && !outcome.error) {
      invalidateDistrictViewCache(disease);
      await regenerateActions([disease]);
      return { stale: false };
    }
    return { stale: true, error: outcome.error };
  }

  const period = await reportingPeriod(disease, knownDiseases);
  const complete = period.predictionMonth
    ? await hasCompletePredictions(disease, period.predictionMonth)
    : false;
  return complete
    ? { stale: false }
    : {
        stale: true,
        error: "Prakiraan bulan aktif belum dihitung; penyegaran terjadwal berikutnya akan mengisinya.",
      };
}

/** `?refresh=1` hanya dihormati untuk admin; pengunjung lain membaca cache. */
function wantsRefresh(req: Request): boolean {
  return req.query.refresh === "1" && req.session?.role === "admin";
}

districtsRouter.get(
  "/districts",
  asyncRoute(async (req, res) => {
    const disease = await assertDisease(
      typeof req.query.disease === "string" ? req.query.disease : "DBD",
    );
    const force = wantsRefresh(req);
    const status = await ensurePredictions(disease, force);
    const [period, data] = await Promise.all([
      reportingPeriod(disease),
      getDistricts(disease, {
        bypassCache: force,
      }),
    ]);

    res.json({
      meta: { disease, ...period, ...status },
      data,
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
    const [period, data] = await Promise.all([
      reportingPeriod(disease),
      getTrend(disease, Number.isFinite(months) ? months : 12),
    ]);

    res.json({
      meta: { disease, ...period, ...status },
      data,
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
    const force = wantsRefresh(req);
    const results = await Promise.all(
      diseases.map(async (disease) => {
        const status = await ensurePredictions(disease, force, diseases);
        return {
          disease,
          status,
          rows: await getDistricts(disease),
        };
      }),
    );
    const stale = results
      .filter((result) => result.status.stale)
      .map((result) => result.disease);
    const data = Object.fromEntries(
      results.map((result) => [result.disease, result.rows]),
    ) as Record<string, Awaited<ReturnType<typeof getDistricts>>>;

    res.json({
      meta: {
        ...(await reportingPeriod(undefined, diseases)),
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
      data: await getClimateSeries(Number.isFinite(months) ? months : 60),
    });
  }),
);

/**
 * Prioritas terdampak — peringkat risiko dikalikan orang yang menanggungnya.
 *
 * Rute terpisah, bukan kolom tambahan di `/districts`: perhitungannya butuh
 * seluruh 16 kecamatan sekaligus untuk menormalkan indeks dan menyusun dua
 * peringkat, sedangkan `/districts` dipakai permukaan yang hanya perlu satu
 * kecamatan. Memaksakan keduanya jadi satu respons membuat setiap pemanggil
 * membayar hitungan yang tidak dipakainya. Matriks ini adalah alat kerja
 * konsol admin/dinas, bukan lagi data yang disajikan ke halaman publik.
 */
districtsRouter.get(
  "/districts/priority",
  requireRole("admin", "dinas"),
  asyncRoute(async (req, res) => {
    const disease = await assertDisease(
      typeof req.query.disease === "string" ? req.query.disease : "DBD",
    );
    const weighting: PriorityWeighting =
      req.query.bobot === "kepadatan" ? "kepadatan" : "populasi";

    const status = await ensurePredictions(disease, false);
    const { rows, summary } = await getPriority(disease, weighting);

    res.json({
      meta: {
        disease,
        ...(await reportingPeriod(disease)),
        ...status,
        weighting,
        method: METHOD_NOTE,
        /* Faktor kerentanan yang tidak ada datanya ikut dikirim. Indeks yang
           diam soal apa yang tidak diukurnya mengundang pembacaan bahwa ia
           sudah mengukur semuanya. */
        missingFactors: MISSING_FACTORS,
      },
      data: { rows, summary },
    });
  }),
);
