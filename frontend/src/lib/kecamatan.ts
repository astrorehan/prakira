"use client";

/**
 * Direktori 16 kecamatan — satu pengambilan, dipakai bersama.
 *
 * Daftar nama, populasi, dan sentroid dulu ditulis tangan di `mock-data.ts`
 * dan diimpor enam berkas berbeda. Sentroidnya pun tebakan; yang dipakai
 * sekarang dihitung gateway dari poligon GeoJSON yang sama yang digambar peta,
 * sehingga pin dan poligon tidak bisa lagi saling meleset.
 *
 * Promise-nya di-memo di tingkat modul: enam komponen yang membutuhkan daftar
 * ini pada satu halaman hanya memicu satu permintaan.
 */

import * as React from "react";
import { fetchKecamatanList, type KecamatanRef } from "@/lib/api";

export type { KecamatanRef };

let cache: Promise<KecamatanRef[]> | null = null;

export function loadKecamatanDirectory(): Promise<KecamatanRef[]> {
  if (!cache) {
    cache = fetchKecamatanList().catch((error) => {
      /* Kegagalan tidak boleh terkunci selamanya: percobaan berikutnya harus
         benar-benar mencoba lagi, bukan mewarisi promise yang sudah gagal. */
      cache = null;
      throw error;
    });
  }
  return cache;
}

export type DirectoryState = {
  list: KecamatanRef[];
  names: string[];
  loading: boolean;
  error: string | null;
};

export function useKecamatanDirectory(): DirectoryState {
  const [list, setList] = React.useState<KecamatanRef[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    loadKecamatanDirectory()
      .then((result) => {
        if (alive) {
          setList(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const names = React.useMemo(() => list.map((k) => k.nama), [list]);
  return { list, names, loading, error };
}

/** Nama resmi bila cocok tanpa peduli besar-kecil huruf; `null` bila asing. */
export function resolveKecamatanName(
  list: KecamatanRef[],
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const query = value.trim().toLowerCase();
  return list.find((k) => k.nama.toLowerCase() === query)?.nama ?? null;
}

/* Semarang membentang sekitar 0,15° lintang. Titik yang lebih jauh dari ini
   dari setiap sentroid bukan berada di kota ini, dan menebak kecamatan
   untuknya lebih buruk daripada tidak menampilkan apa pun. ~0,22° ≈ 25 km. */
const MAX_DEGREES = 0.22;

/**
 * Kecamatan dengan sentroid terdekat, atau `null` bila titiknya di luar kota.
 *
 * Derajat kuadrat dengan koreksi kosinus pada bujur — cukup untuk *mengurutkan*
 * enam belas sentroid dalam satu kota, dan menghindari haversine yang hasilnya
 * toh hanya dibandingkan satu sama lain.
 */
export function nearestKecamatan(
  list: KecamatanRef[],
  lat: number,
  lon: number,
): string | null {
  const scale = Math.cos((lat * Math.PI) / 180);
  let best: string | null = null;
  let bestDistanceSq = Infinity;

  for (const kec of list) {
    const [kecLat, kecLon] = kec.koordinat;
    const dy = kecLat - lat;
    const dx = (kecLon - lon) * scale;
    const distanceSq = dy * dy + dx * dx;

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = kec.nama;
    }
  }

  return bestDistanceSq > MAX_DEGREES * MAX_DEGREES ? null : best;
}
