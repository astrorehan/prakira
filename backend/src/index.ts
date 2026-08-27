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
import { seedDatabase } from "./db/seed.js";
import { purgeExpiredSessions } from "./services/auth.js";
import { attachSession } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";

import { metaRouter } from "./routes/meta.js";
import { districtsRouter } from "./routes/districts.js";
import { actionsRouter } from "./routes/actions.js";
import { reportsRouter } from "./routes/reports.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { modelRouter } from "./routes/model.js";
import { availableDiseases } from "./services/period.js";
import { refreshPredictions } from "./services/predictions.js";
import { refreshBacktest } from "./services/backtest.js";
import { regenerateActions } from "./services/actions.js";

const app = express();

app.disable("x-powered-by");
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

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    seeded: isSeeded(),
    diseases: availableDiseases(),
    mlServiceUrl: env.mlServiceUrl,
  });
});

app.use("/api/meta", metaRouter);
app.use("/api", districtsRouter);
app.use("/api/actions", actionsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/model", modelRouter);

app.use(notFound);
app.use(errorHandler);

/** Menyiapkan database lalu, bila layanan ML hidup, mengisi cache prediksi. */
async function bootstrap(): Promise<void> {
  await db();

  if (!(await isSeeded())) {
    const result = await seedDatabase();
    console.log(
      `[gateway] Seed awal: ${result.kecamatan} kecamatan, ${result.observasi} observasi, ` +
        `penyakit ${result.diseases.join(", ") || "—"}.`,
    );
  }

  await purgeExpiredSessions();

  const diseases = await availableDiseases();
  const warmed: string[] = [];
  const failed: string[] = [];

  for (const disease of diseases) {
    const outcome = await refreshPredictions(disease);
    if (outcome.refreshed > 0) {
      warmed.push(disease);
      await refreshBacktest(disease);
    } else {
      failed.push(disease);
    }
  }

  if (warmed.length > 0) await regenerateActions(warmed);

  if (failed.length > 0) {
    /* Bukan kegagalan fatal: gateway tetap melayani observasi historis, dan
       endpoint prediksi menandai responsnya `stale`. */
    console.warn(
      `[gateway] Prediksi belum tersedia untuk ${failed.join(", ")} — layanan ML di ${env.mlServiceUrl} tidak terjangkau.`,
    );
  }
}

bootstrap()
  .catch((error) => {
    console.error("[gateway] Gagal menyiapkan database:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`[gateway] PRAKIRA API siap di http://localhost:${env.port}`);
    });
  });
