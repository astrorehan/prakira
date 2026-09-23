/**
 * Penjaga token `/api/internal/refresh`.
 *
 * Endpoint ini membangunkan layanan ML dan menulis ulang seluruh tabel
 * prediksi, jadi yang diuji adalah bahwa ia tertutup: tanpa `CRON_SECRET`
 * ia mati, dan dengan token yang salah ia menolak sebelum menyentuh apa pun.
 */
import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.CRON_SECRET = "rahasia-uji";

const { env } = await import("../src/env.js");
const { internalRouter } = await import("../src/routes/internal.js");
const { errorHandler } = await import("../src/middleware/error.js");

const app = express();
app.use("/api/internal", internalRouter);
app.use(errorHandler);

async function post(authorization?: string): Promise<number> {
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/internal/refresh`, {
      method: "POST",
      headers: authorization ? { authorization } : {},
    });
    return response.status;
  } finally {
    server.close();
  }
}

test("tanpa token ditolak", async () => {
  assert.equal(await post(), 401);
});

test("token salah ditolak, termasuk yang panjangnya sama", async () => {
  assert.equal(await post("Bearer salah"), 401);
  assert.equal(await post("Bearer rahasia-ujX"), 401);
});

test("tanpa CRON_SECRET endpoint mati, bukan terbuka", async () => {
  const mutable = env as { cronSecret: string };
  const saved = mutable.cronSecret;
  mutable.cronSecret = "";
  try {
    assert.equal(await post("Bearer "), 503);
  } finally {
    mutable.cronSecret = saved;
  }
});
