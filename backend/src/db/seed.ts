/**
 * Seeding dari dataset nyata.
 *
 * Sumbernya berkas yang sama yang dipakai melatih model di `ml-services`:
 * batas wilayah dari GeoJSON BPS, populasi & luas dari `kecamatan_semarang.csv`,
 * kasus & iklim bulanan dari `dataset_clean/merged_monthly_*.csv`. Tidak ada
 * angka yang dikarang di berkas ini — kalau sebuah kolom tidak ada di dataset,
 * kolomnya dibiarkan kosong dan lapisan di atasnya harus jujur soal itu.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../env.js";
import { all, closeDb, one, run, transaction, type Tx } from "./index.js";
import { parseCsv, toNumber } from "./csv.js";
import { hashPassword } from "../services/password.js";

type GeoFeature = {
  properties: { id: string; nama: string; kode_bps: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type SeedResult = {
  kecamatan: number;
  observasi: number;
  diseases: string[];
  latestMonth: string | null;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Menyisipkan banyak baris dalam sedikit pernyataan.
 *
 * Dengan SQLite lokal, 1.152 `INSERT` satu per satu praktis gratis. Dengan
 * Supabase setiap pernyataan adalah satu perjalanan bolak-balik lintas
 * jaringan, dan seeding yang sama akan memakan menit. Baris dikelompokkan
 * menjadi satu `INSERT ... VALUES (...), (...), ...` per potongan.
 *
 * `chunkSize` dijaga agar jumlah parameter tetap di bawah batas 65.535
 * parameter per pernyataan milik protokol Postgres.
 */
async function insertMany(
  tx: Tx,
  head: string,
  tail: string,
  columns: number,
  rows: unknown[][],
): Promise<number> {
  if (rows.length === 0) return 0;
  const chunkSize = Math.max(1, Math.floor(60000 / columns));
  const placeholder = `(${Array.from({ length: columns }, () => "?").join(", ")})`;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map(() => placeholder).join(", ");
    await tx.run(`${head} VALUES ${values} ${tail}`, ...chunk.flat());
  }
  return rows.length;
}

/* ── Geometri ────────────────────────────────────────────────────────────── */

/** Sentroid poligon (rumus shoelace). Bukan rata-rata titik: rata-rata titik
 *  bergeser ke sisi yang simpulnya paling rapat, dan pin peta jadi meleset. */
function ringCentroid(ring: number[][]): {
  lon: number;
  lat: number;
  area: number;
} {
  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }

  if (twiceArea === 0) {
    const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return { lon, lat, area: 0 };
  }

  const factor = 1 / (3 * twiceArea);
  return { lon: x * factor, lat: y * factor, area: Math.abs(twiceArea / 2) };
}

function featureCentroid(feature: GeoFeature): { lat: number; lon: number } {
  const rings: number[][][] =
    feature.geometry.type === "Polygon"
      ? [(feature.geometry.coordinates as number[][][])[0]]
      : (feature.geometry.coordinates as number[][][][]).map((poly) => poly[0]);

  /* MultiPolygon: pulau terbesar mewakili kecamatannya. */
  const best = rings
    .map(ringCentroid)
    .reduce((a, b) => (b.area > a.area ? b : a));

  return { lat: best.lat, lon: best.lon };
}

/* ── Seed ────────────────────────────────────────────────────────────────── */

export async function seedDatabase(
  options: { force?: boolean } = {},
): Promise<SeedResult> {
  const startedAt = new Date();
  const jobId = await startIngestJob("dataset-lokal", startedAt);

  try {
    const result = await transaction(async (tx) => {
      const kecamatanCount = await seedKecamatan(tx);
      const observasi = options.force
        ? await reseedObservasi(tx)
        : await seedObservasiIfEmpty(tx);
      await seedAdminUser(tx);
      return { kecamatanCount, observasi };
    });

    const latest = await one<{ m: string }>(
      "SELECT MAX(month_start) AS m FROM observasi",
    );
    const diseaseRows = await all<{ disease: string }>(
      "SELECT DISTINCT disease FROM observasi ORDER BY disease",
    );
    const diseases = diseaseRows.map((r) => r.disease);

    await finishIngestJob(jobId, {
      status: "success",
      rows: result.observasi,
      latencyMs: Date.now() - startedAt.getTime(),
      detail: `${result.kecamatanCount} kecamatan, ${result.observasi} observasi bulanan (${diseases.join(", ") || "—"}).`,
    });

    return {
      kecamatan: result.kecamatanCount,
      observasi: result.observasi,
      diseases,
      latestMonth: latest?.m ?? null,
    };
  } catch (error) {
    await finishIngestJob(jobId, {
      status: "failed",
      rows: 0,
      latencyMs: Date.now() - startedAt.getTime(),
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function seedKecamatan(tx: Tx): Promise<number> {
  const geo = JSON.parse(fs.readFileSync(env.geojsonFile, "utf8")) as {
    features: GeoFeature[];
  };

  const wilayahPath = path.join(
    env.datasetRoot,
    "dataset_raw",
    "wilayah",
    "kecamatan_semarang.csv",
  );
  const wilayah = parseCsv(fs.readFileSync(wilayahPath, "utf8"));

  const byName = new Map(wilayah.map((r) => [normalize(r.kecamatan_nama), r]));

  const values: unknown[][] = [];
  const unmatched: string[] = [];

  for (const feature of geo.features) {
    const meta = byName.get(normalize(feature.properties.nama));
    if (!meta) {
      unmatched.push(feature.properties.nama);
      continue;
    }
    const { lat, lon } = featureCentroid(feature);
    values.push([
      feature.properties.id,
      meta.kecamatan_id,
      feature.properties.nama,
      feature.properties.kode_bps,
      Number(meta.population),
      Number(meta.area_km2),
      lat,
      lon,
    ]);
  }

  if (unmatched.length > 0) {
    /* Kecamatan yang ada di peta tapi tidak di tabel wilayah akan muncul
       sebagai lubang di dashboard. Lebih baik gagal saat seeding. */
    throw new Error(
      `Kecamatan di GeoJSON tanpa padanan di kecamatan_semarang.csv: ${unmatched.join(", ")}`,
    );
  }

  return insertMany(
    tx,
    "INSERT INTO kecamatan (id, ml_id, nama, kode_bps, populasi, luas_km2, lat, lon)",
    `ON CONFLICT (id) DO UPDATE SET
       ml_id = excluded.ml_id, nama = excluded.nama, kode_bps = excluded.kode_bps,
       populasi = excluded.populasi, luas_km2 = excluded.luas_km2,
       lat = excluded.lat, lon = excluded.lon`,
    8,
    values,
  );
}

const MERGED_FILES: Record<string, string> = {
  DBD: "merged_monthly_dbd.csv",
  ISPA: "merged_monthly_ispa.csv",
};

async function seedObservasiIfEmpty(tx: Tx): Promise<number> {
  const existing = await tx.one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM observasi",
  );
  if ((existing?.n ?? 0) > 0) return existing?.n ?? 0;
  return reseedObservasi(tx);
}

async function reseedObservasi(tx: Tx): Promise<number> {
  /* Hanya baris berlabel 'dataset' yang dibuang: data hasil unggahan admin
     adalah masukan manusia dan tidak boleh hilang karena seeding diulang. */
  await tx.run("DELETE FROM observasi WHERE source = 'dataset'");

  const kecamatanRows = await tx.all<{ id: string; ml_id: string }>(
    "SELECT id, ml_id FROM kecamatan",
  );
  const mlIdToId = new Map(kecamatanRows.map((r) => [r.ml_id, r.id]));

  const recordedAt = new Date().toISOString();
  const values: unknown[][] = [];

  for (const [disease, filename] of Object.entries(MERGED_FILES)) {
    const file = path.join(env.datasetRoot, "dataset_clean", filename);
    if (!fs.existsSync(file)) continue;

    for (const row of parseCsv(fs.readFileSync(file, "utf8"))) {
      const kecamatanId = mlIdToId.get(row.kecamatan_id);
      if (!kecamatanId) continue;

      const cases = toNumber(row.cases);
      if (cases === null) continue;

      values.push([
        kecamatanId,
        disease,
        row.month_start,
        Math.round(cases),
        toNumber(row.rainfall_mm),
        toNumber(row.temp_mean_c),
        toNumber(row.humidity_pct),
        recordedAt,
      ]);
    }
  }

  return insertMany(
    tx,
    `INSERT INTO observasi
       (kecamatan_id, disease, month_start, cases, rainfall_mm, temp_mean_c,
        humidity_pct, recorded_at, source)`,
    "ON CONFLICT (kecamatan_id, disease, month_start) DO NOTHING",
    9,
    /* `source` ikut sebagai parameter, bukan literal di dalam SQL: dengan
       penyisipan massal setiap baris butuh jumlah placeholder yang sama. */
    values.map((row) => [...row, "dataset"]),
  );
}

async function seedAdminUser(tx: Tx): Promise<void> {
  const existing = await tx.one<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    env.seedAdminEmail,
  );
  if (existing) return;

  const { hash, salt } = hashPassword(env.seedAdminPassword);
  await tx.run(
    `INSERT INTO users (id, email, password_hash, salt, role, label, home, created_at)
     VALUES (?, ?, ?, ?, 'dinas', ?, '/dashboard', ?)`,
    crypto.randomUUID(),
    env.seedAdminEmail,
    hash,
    salt,
    env.seedAdminLabel,
    new Date().toISOString(),
  );
}

/* ── Riwayat ingest ──────────────────────────────────────────────────────── */

export async function startIngestJob(
  source: string,
  startedAt = new Date(),
): Promise<number> {
  /* `RETURNING` menggantikan `last_insert_rowid()` milik SQLite. Selain
     portabel, ia juga benar di bawah kolam koneksi: `last_insert_rowid()`
     bergantung pada koneksi yang sama dan bisa membaca sisipan proses lain. */
  const row = await one<{ id: number }>(
    `INSERT INTO ingest_job (source, started_at, status)
     VALUES (?, ?, 'running') RETURNING id`,
    source,
    startedAt.toISOString(),
  );
  return row?.id ?? 0;
}

export async function finishIngestJob(
  id: number,
  data: {
    status: "success" | "failed";
    rows: number;
    latencyMs: number;
    detail: string;
  },
): Promise<void> {
  await run(
    `UPDATE ingest_job
        SET finished_at = ?, status = ?, rows = ?, latency_ms = ?, detail = ?
      WHERE id = ?`,
    new Date().toISOString(),
    data.status,
    data.rows,
    data.latencyMs,
    data.detail,
    id,
  );
}

/* Dijalankan langsung: `npm run seed`. */
const invokedDirectly = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("db/seed.ts");
if (invokedDirectly) {
  const result = await seedDatabase({ force: true });
  console.log(
    `Seed selesai — ${result.kecamatan} kecamatan, ${result.observasi} observasi, ` +
      `penyakit: ${result.diseases.join(", ") || "—"}, bulan terakhir: ${result.latestMonth ?? "—"}`,
  );
  /* Skrip sekali-jalan: tanpa ini kolam koneksi menahan proses tetap hidup. */
  await closeDb();
}
