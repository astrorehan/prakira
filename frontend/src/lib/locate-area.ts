"use client";

/**
 * Kecamatan dan kelurahan untuk satu titik — dihitung sepenuhnya di peramban.
 *
 * Formulir laporan warga memakai ini untuk mengisi bidang tempat dari lokasi
 * perangkat. Pencocokannya tetap lokal supaya nama wilayah langsung terisi
 * tanpa menunggu server; titiknya sendiri ikut terkirim bersama laporan dan
 * hanya terlihat petugas, untuk menemukan lokasi kejadian di lapangan.
 *
 * Pencarian sentroid terdekat (`nearestKecamatan`) cukup untuk menyarankan
 * kecamatan di halaman depan, tetapi di perbatasan ia bisa memilih tetangga.
 * Laporan yang masuk ke kecamatan keliru mendorong ambang volume di tempat
 * yang salah, jadi di sini titiknya diuji terhadap poligon kelurahan BPS.
 */

import type { KecamatanRef } from "@/lib/kecamatan";

type Ring = number[][];

type Area = {
  district: string;
  village: string;
  /** Satu entri per poligon; tiap poligon adalah cincin luar lalu lubangnya. */
  polygons: Ring[][];
  bbox: [minLon: number, minLat: number, maxLon: number, maxLat: number];
};

type RawFeature = {
  properties: { district: string; village: string };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] };
};

/* ~300 KB setelah gzip: diambil hanya saat tombol lokasi ditekan, bukan saat
   halaman dibuka, dan cukup sekali per sesi. */
const SOURCE = "/data/semarang-raw.geojson";

let cache: Promise<Area[]> | null = null;

function loadAreas(): Promise<Area[]> {
  if (!cache) {
    cache = fetch(SOURCE)
      .then((res) => {
        if (!res.ok) throw new Error(`Batas wilayah gagal dimuat (${res.status}).`);
        return res.json() as Promise<{ features: RawFeature[] }>;
      })
      .then(({ features }) => features.map(toArea))
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

function toArea({ properties, geometry }: RawFeature): Area {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const polygon of polygons) {
    for (const [lon, lat] of polygon[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return {
    district: properties.district,
    village: properties.village,
    polygons,
    bbox: [minLon, minLat, maxLon, maxLat],
  };
}

/** Uji sinar genap-ganjil; lubang otomatis terhitung sebagai "di luar". */
function inPolygon(polygon: Ring[], lon: number, lat: number): boolean {
  let inside = false;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/* Berkas BPS menulis "Gajah Mungkur" dan "Gunung Pati"; direktori gateway
   menulis "Gajahmungkur" dan "Gunungpati". Spasi dan huruf besar diabaikan
   saat mencocokkan, lalu nama yang dikembalikan selalu versi direktori —
   itu yang divalidasi backend. */
const normalize = (name: string) => name.toLowerCase().replace(/\s+/g, "");

export type LocatedArea = { kecamatan: string; kelurahan: string };

/** `null` bila titiknya di luar semua kelurahan Kota Semarang. */
export async function locateArea(
  directory: KecamatanRef[],
  lat: number,
  lon: number,
): Promise<LocatedArea | null> {
  const areas = await loadAreas();
  const hit = areas.find(
    ({ bbox: [minLon, minLat, maxLon, maxLat], polygons }) =>
      lon >= minLon &&
      lon <= maxLon &&
      lat >= minLat &&
      lat <= maxLat &&
      polygons.some((polygon) => inPolygon(polygon, lon, lat)),
  );
  if (!hit) return null;

  const key = normalize(hit.district);
  const kecamatan = directory.find((k) => normalize(k.nama) === key)?.nama;
  return kecamatan ? { kecamatan, kelurahan: hit.village } : null;
}
