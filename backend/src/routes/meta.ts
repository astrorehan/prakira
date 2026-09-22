/**
 * Metadata yang dulu jadi konstanta di frontend: periode pelaporan, daftar
 * penyakit, batas wilayah. Semuanya sekarang berasal dari isi database, jadi
 * menambah satu penyakit ke dataset cukup untuk memunculkannya di seluruh UI.
 */
import { Router } from "express";
import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { env } from "../env.js";
import { all } from "../db/index.js";
import { addMonths, monthLabel, reportingPeriod } from "../services/period.js";
import { listKecamatan } from "../services/districts.js";
import { recentAudit } from "../services/audit.js";
import { asyncRoute } from "../middleware/error.js";
import { mlHealth } from "../services/ml.js";

export const metaRouter = Router();

type DiseaseMeta = {
  disease: string;
  months: number;
  kecamatan: number;
  latest: string;
};

const DISEASE_META_TTL_MS = 15_000;
let diseasesMetaCache: { expiresAt: number; value: DiseaseMeta[] } | null = null;
let diseasesMetaInFlight: Promise<DiseaseMeta[]> | null = null;

function diseaseMeta(): Promise<DiseaseMeta[]> {
  if (diseasesMetaCache && diseasesMetaCache.expiresAt > Date.now()) {
    return Promise.resolve(diseasesMetaCache.value);
  }
  diseasesMetaCache = null;
  if (diseasesMetaInFlight) return diseasesMetaInFlight;

  const task = all<DiseaseMeta>(
    `SELECT disease,
          COUNT(DISTINCT month_start)  AS months,
          COUNT(DISTINCT kecamatan_id) AS kecamatan,
          MAX(month_start)             AS latest
       FROM observasi
      GROUP BY disease
      ORDER BY disease`,
  ).then((value) => {
    diseasesMetaCache = {
      expiresAt: Date.now() + DISEASE_META_TTL_MS,
      value,
    };
    return value;
  });
  diseasesMetaInFlight = task;
  task.finally(() => {
    if (diseasesMetaInFlight === task) diseasesMetaInFlight = null;
  }).catch(() => {
    /* Pemanggil menerima error dari task; finally tidak boleh membuat
       unhandled rejection tambahan. */
  });
  return task;
}

metaRouter.get(
  "/period",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease : undefined;
    const period = await reportingPeriod(disease);

    /* "Hari ini" menurut sistem adalah hari terakhir bulan observasi terakhir.
     Konsol tidak boleh memakai jam peramban sebagai acuan tenggat: data
     berhenti di satu bulan tertentu, dan hitungan mundur yang mengacu ke
     kalender nyata akan menyatakan seluruh instruksi terlambat. */
    const systemToday = period.latestObserved
      ? new Date(Date.parse(addMonths(period.latestObserved, 1)) - 86_400_000)
          .toISOString()
          .slice(0, 10)
      : null;

    res.json({ ...period, systemToday });
  }),
);

metaRouter.get(
  "/diseases",
  asyncRoute(async (_req, res) => {
    const rows = await diseaseMeta();

    res.json(
      rows.map((row) => ({
        disease: row.disease,
        months: row.months,
        kecamatan: row.kecamatan,
        latestObserved: row.latest,
        latestObservedLabel: monthLabel(row.latest),
      })),
    );
  }),
);

metaRouter.get(
  "/kecamatan",
  asyncRoute(async (_req, res) => {
    const rows = await listKecamatan();
    res.json(
      rows.map((k) => ({
        id: k.id,
        nama: k.nama,
        kode_bps: k.kode_bps,
        populasi: k.populasi,
        luas_km2: k.luas_km2,
        koordinat: [k.lat, k.lon],
      })),
    );
  }),
);

/** GeoJSON batas kecamatan — dilayani gateway supaya peta punya satu sumber. */
let geojsonText: string | null = null;
let geojsonGzip: Buffer | null = null;

metaRouter.get("/geojson", (req, res) => {
  if (!fs.existsSync(env.geojsonFile)) {
    res
      .status(503)
      .json({ error: "Berkas GeoJSON batas kecamatan tidak tersedia." });
    return;
  }

  if (geojsonText === null) {
    geojsonText = fs.readFileSync(env.geojsonFile, "utf8");
  }

  res.type("application/geo+json");
  res.set("Cache-Control", "public, max-age=3600");

  /* GeoJSON ini sekitar 2,8 MB mentah. Peramban dan Next sudah mendukung gzip;
     menyimpan hasil kompresi di memori menghindari membaca dan mengompresi
     berkas berulang kali saat beberapa peta dibuka dalam satu demo. */
  if (/\bgzip\b/i.test(req.header("accept-encoding") ?? "")) {
    if (geojsonGzip === null) {
      geojsonGzip = gzipSync(Buffer.from(geojsonText));
    }
    res.set("Content-Encoding", "gzip");
    res.set("Vary", "Accept-Encoding");
    res.send(geojsonGzip);
    return;
  }

  res.send(geojsonText);
});

/**
 * Denyut sistem untuk halaman layanan publik.
 *
 * Hanya jenis peristiwa, peran pelakunya, dan waktunya. Nama, surel, dan
 * rincian keputusan tidak ikut: halaman ini bisa dibaca siapa saja, dan jejak
 * audit lengkap memuat identitas petugas serta isi laporan warga.
 */
metaRouter.get(
  "/activity",
  asyncRoute(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 8) || 8, 30);
    const rows = await recentAudit(limit);
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        ts: row.ts,
        role: row.role,
        action: row.action,
        status: row.status,
      })),
    });
  }),
);

metaRouter.get(
  "/ml-status",
  asyncRoute(async (_req, res) => {
    try {
      res.json({ reachable: true, ...(await mlHealth()) });
    } catch (error) {
      res.json({
        reachable: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }),
);
