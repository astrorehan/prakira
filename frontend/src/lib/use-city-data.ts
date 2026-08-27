"use client";

/**
 * Data kota untuk permukaan publik — satu pengambilan, dipakai bersama.
 *
 * Halaman depan menampilkan tujuh bagian yang semuanya bertanya hal serupa:
 * kelas risiko tiap kecamatan, penyakit apa yang menyebabkannya, dan berapa
 * prakiraannya. Sebelumnya masing-masing memanggil `getKecamatanDataList()`
 * sendiri — murah karena datanya karangan. Terhadap gateway, tujuh permintaan
 * paralel untuk jawaban yang sama adalah pemborosan yang juga bisa membuat
 * satu bagian halaman menampilkan angka lebih lama daripada bagian lain.
 */

import * as React from "react";
import { fetchAllDistricts, type Envelope, type DistrictsMeta } from "@/lib/api";
import { getCityRiskRows, summarizeCityRisk, type CityRiskRow } from "@/lib/city-risk";
import type { KecamatanData } from "@/types";

type Payload = Envelope<
  Record<string, KecamatanData[]>,
  DistrictsMeta & { staleDiseases: string[] }
>;

let cache: Promise<Payload> | null = null;

export function loadCityData(): Promise<Payload> {
  if (!cache) {
    cache = fetchAllDistricts().catch((error) => {
      cache = null;
      throw error;
    });
  }
  return cache;
}

export function invalidateCityData(): void {
  cache = null;
}

export type CityData = {
  /** Kecamatan per penyakit, kunci = nama penyakit dari gateway. */
  byDisease: Record<string, KecamatanData[]>;
  diseases: string[];
  /** Satu baris per kecamatan, membawa penyakit terburuknya. */
  rows: CityRiskRow[];
  summary: ReturnType<typeof summarizeCityRisk>;
  meta: (DistrictsMeta & { staleDiseases: string[] }) | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const EMPTY_SUMMARY = {
  rows: [] as CityRiskRow[],
  counts: { tinggi: 0, sedang: 0, rendah: 0 },
  unknown: 0,
  total: 0,
};

export function useCityData(): CityData {
  const [payload, setPayload] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);

    loadCityData()
      .then((result) => {
        if (alive) {
          setPayload(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (alive) {
          setPayload(null);
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [nonce]);

  /* `?? {}` menghasilkan objek baru tiap render, sehingga memo di bawahnya
     tidak pernah benar-benar mengingat apa pun. */
  const byDisease = React.useMemo(() => payload?.data ?? {}, [payload]);
  const rows = React.useMemo(() => getCityRiskRows(byDisease), [byDisease]);
  const summary = React.useMemo(
    () => (rows.length === 0 ? EMPTY_SUMMARY : summarizeCityRisk(rows)),
    [rows],
  );

  const reload = React.useCallback(() => {
    invalidateCityData();
    setNonce((n) => n + 1);
  }, []);

  return {
    byDisease,
    diseases: payload?.meta.diseases ?? [],
    rows,
    summary,
    meta: payload?.meta ?? null,
    loading,
    error,
    reload,
  };
}

/** Baris satu kecamatan pada satu penyakit. `null` bila belum ada datanya. */
export function districtOf(
  byDisease: Record<string, KecamatanData[]>,
  disease: string,
  nama: string,
): KecamatanData | null {
  return byDisease[disease]?.find((d) => d.nama === nama) ?? null;
}

/** Semua penyakit untuk satu kecamatan, terurut sesuai daftar penyakit. */
export function districtAcrossDiseases(
  byDisease: Record<string, KecamatanData[]>,
  nama: string,
): { disease: string; data: KecamatanData }[] {
  return Object.entries(byDisease)
    .map(([disease, list]) => {
      const data = list.find((d) => d.nama === nama);
      return data ? { disease, data } : null;
    })
    .filter((row): row is { disease: string; data: KecamatanData } => row !== null);
}
