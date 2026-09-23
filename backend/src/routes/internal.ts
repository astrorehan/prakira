/**
 * Endpoint mesin-ke-mesin, bukan untuk peramban.
 *
 * `POST /api/internal/refresh` dipanggil GitHub Actions tiap dua jam
 * (`.github/workflows/refresh-predictions.yml`). Setiap penyegaran prakiraan
 * terjadi di sini, sehingga pengunjung dashboard tidak pernah menunggu layanan
 * ML bangun — mereka hanya membaca tabel `prediksi`.
 *
 * Dijaga token bersama, bukan sesi: pemanggilnya tidak punya akun. Tanpa
 * `CRON_SECRET` endpoint menjawab 503 alih-alih terbuka untuk siapa saja.
 */
import crypto from "node:crypto";
import { Router } from "express";
import { env } from "../env.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import {
  refreshAllPredictions,
  refreshSucceeded,
} from "../services/refresh.js";

export const internalRouter = Router();

function tokenMatches(header: string | undefined): boolean {
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(env.cronSecret);
  return (
    given.length === expected.length && crypto.timingSafeEqual(given, expected)
  );
}

internalRouter.post(
  "/refresh",
  asyncRoute(async (req, res) => {
    if (!env.cronSecret) {
      throw new HttpError(503, "Penyegaran terjadwal belum dikonfigurasi (CRON_SECRET kosong).");
    }
    if (!tokenMatches(req.header("authorization"))) {
      throw new HttpError(401, "Token penyegaran tidak valid.");
    }

    const started = Date.now();
    const results = await refreshAllPredictions();
    const ok = refreshSucceeded(results);

    console.log(
      `[gateway] Penyegaran terjadwal ${ok ? "selesai" : "sebagian gagal"} dalam ` +
        `${Math.round((Date.now() - started) / 1000)} dtk: ` +
        results
          .map(
            (r) =>
              `${r.disease} ${r.prediction.refreshed} baris, ${r.prediction.changed} berubah` +
              (r.prediction.error ? ` (${r.prediction.error})` : ""),
          )
          .join("; "),
    );

    /* 502 saat ada penyakit yang gagal supaya alur GitHub Actions merah dan
       tim mendapat notifikasi, sama seperti alur keepalive. */
    res.status(ok ? 200 : 502).json({
      ok,
      durationMs: Date.now() - started,
      data: results.map((r) => ({
        disease: r.disease,
        month: r.prediction.month,
        refreshed: r.prediction.refreshed,
        changed: r.prediction.changed,
        error: r.prediction.error ?? null,
        backtest: r.backtest,
      })),
    });
  }),
);
