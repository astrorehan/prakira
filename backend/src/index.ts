/**
 * PRAKIRA API Gateway.
 *
 * Peran gateway (PRD §6): auth, CRUD, rate-limit, dan menjadi satu-satunya
 * pintu data untuk frontend. Prediksi tetap dihitung layanan ML terpisah —
 * gateway hanya menyimpan hasilnya supaya dashboard tidak ikut mati saat
 * layanan ML sedang dilatih ulang.
 */
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./env.js";
import { db, isSeeded } from "./db/index.js";
import { datasetNeedsRefresh, seedDatabase } from "./db/seed.js";
import { purgeExpiredSessions } from "./services/auth.js";
import { attachSession } from "./middleware/auth.js";
import { asyncRoute, errorHandler, notFound } from "./middleware/error.js";

import { metaRouter } from "./routes/meta.js";
import { districtsRouter } from "./routes/districts.js";
import { actionsRouter } from "./routes/actions.js";
import { reportsRouter } from "./routes/reports.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { casesRouter } from "./routes/cases.js";
import { modelRouter } from "./routes/model.js";
import { availableDiseases } from "./services/period.js";
import { refreshAllPredictions } from "./services/refresh.js";
import { internalRouter } from "./routes/internal.js";
import { backfillEnvironmentTickets } from "./services/tickets.js";

const app = express();

app.disable("x-powered-by");
/* Tanpa ini `req.ip` di Render berisi alamat proksi Render, sama untuk setiap
   pengunjung — dan setiap pembatas laju per-alamat di gateway ini menjadi satu
   ember bersama. Lihat `trustProxy` di `env.ts` untuk alasan angkanya bukan
   `true`. */
app.set("trust proxy", env.trustProxy);
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
/* Batas 8 MB: satu laporan warga dengan foto ter-encode base64 adalah muatan
   terbesar yang sah di API ini. */
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());
app.use(attachSession);

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    res.json({
      status: "ok",
      seeded: await isSeeded(),
      diseases: await availableDiseases(),
      mlServiceUrl: env.mlServiceUrl,
    });
  }),
);

app.use("/api/meta", metaRouter);
app.use("/api", districtsRouter);
app.use("/api/actions", actionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/cases", casesRouter);
app.use("/api/model", modelRouter);
app.use("/api/internal", internalRouter);

app.use(notFound);
app.use(errorHandler);

/** Menyiapkan database lalu, bila layanan ML hidup, memanaskan cache prediksi. */
async function warmupPredictions(): Promise<void> {
  const results = await refreshAllPredictions({ forceBacktest: true });
  const failed = results
    .filter((r) => r.prediction.refreshed === 0)
    .map((r) => r.disease);

  if (failed.length > 0) {
    /* Bukan kegagalan fatal: gateway tetap melayani observasi historis, dan
       endpoint prediksi menandai responsnya `stale`. */
    console.warn(
      `[gateway] Prediksi belum tersedia untuk ${failed.join(", ")} — layanan ML di ${env.mlServiceUrl} tidak terjangkau.`,
    );
  }
}

async function startServer(): Promise<void> {
  try {
    await db();

    if (!(await isSeeded())) {
      const result = await seedDatabase();
      console.log(
        `[gateway] Seed awal: ${result.kecamatan} kecamatan, ${result.observasi} observasi, ` +
          `penyakit ${result.diseases.join(", ") || "—"}.`,
      );
    } else if (await datasetNeedsRefresh()) {
      const result = await seedDatabase({ force: true });
      console.log(
        `[gateway] Sinkronisasi dataset: ${result.observasi} observasi, ` +
          `bulan terakhir ${result.latestMonth ?? "—"}.`,
      );
    }

    const backfilledTickets = await backfillEnvironmentTickets();
    if (backfilledTickets > 0) {
      console.log(
        `[gateway] Tindak lanjut lingkungan: ${backfilledTickets} tiket lama dibuat.`,
      );
    }

    await purgeExpiredSessions();

    app.listen(env.port, "0.0.0.0", () => {
      console.log(`[gateway] PRAKIRA API siap di http://localhost:${env.port}`);
      warmupPredictions().catch((error) => {
        console.warn("[gateway] Gagal memanaskan cache prediksi:", error);
      });
    });
  } catch (error) {
    console.error("[gateway] Gagal menyiapkan database:", error);
    process.exit(1);
  }
}

startServer();
