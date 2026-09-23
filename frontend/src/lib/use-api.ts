"use client";

/**
 * Satu pola pengambilan data untuk seluruh konsol.
 *
 * Setiap permukaan data sekarang punya empat keadaan yang harus benar-benar
 * ada di layar: memuat, gagal, kosong, dan terisi (PRD §8 — "juri akan
 * mengklik hal-hal yang belum ada datanya"). Menulis keempatnya berulang di
 * dua belas komponen adalah cara paling pasti agar salah satunya terlupa,
 * jadi keadaannya dipusatkan di sini.
 */

import * as React from "react";
import { ApiError, getApiCacheGeneration } from "@/lib/api";

type CacheOptions = { cacheKey: string; cacheTimeMs: number };
const responseCache = new Map<string, { value: unknown; expiresAt: number; generation: number }>();

function cachedResponse<T>(key: string | undefined): T | null {
  if (!key) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now() || entry.generation !== getApiCacheGeneration()) {
    responseCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  /** Gangguan saat muat ulang; data terakhir tetap dipertahankan. */
  refreshError: string | null;
  /** Benar hanya pada pemuatan pertama; muat ulang memakai `refreshing`. */
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
};

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  cache?: CacheOptions,
): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const [dataKey, setDataKey] = React.useState<string | null>(null);

  /* `fetcher` biasanya arrow function baru tiap render; yang menentukan kapan
     data ditarik ulang adalah `deps` yang ditulis pemanggil. */
  const ref = React.useRef(fetcher);
  ref.current = fetcher;

  /* Apakah sudah pernah ada data, dibaca di luar siklus render.
     Versi sebelumnya menentukannya lewat `setData(previous => …)` dan memanggil
     `setLoading` dari dalam updater itu. Updater state harus murni: React
     memanggilnya dua kali di StrictMode, dan urutannya terhadap `.finally()`
     tidak dijamin — kalau permintaannya selesai lebih dulu, `loading` kembali
     menyala setelah datanya tiba dan halamannya tersangkut di "Memuat data…". */
  const hasData = React.useRef(false);
  const previousDeps = React.useRef<React.DependencyList | null>(null);

  React.useEffect(() => {
    let alive = true;
    const requestGeneration = getApiCacheGeneration();

    const dependencyChanged =
      previousDeps.current === null ||
      previousDeps.current.length !== deps.length ||
      deps.some((value, index) => !Object.is(value, previousDeps.current?.[index]));
    previousDeps.current = [...deps];

    const cached = dependencyChanged ? cachedResponse<T>(cache?.cacheKey) : null;
    if (cached !== null) {
      hasData.current = true;
      setData(cached);
      setDataKey(cache?.cacheKey ?? null);
      setError(null);
      setRefreshError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setRefreshError(null);
    if (dependencyChanged) {
      /* Data dari penyakit/entitas lama tidak boleh tetap terlihat di bawah
         label baru ketika permintaan transisinya gagal. Reload manual dengan
         dependency yang sama tetap memakai stale-while-revalidate. */
      hasData.current = false;
      setData(null);
      setDataKey(cache?.cacheKey ?? null);
      setLoading(true);
      setRefreshing(false);
    } else if (hasData.current) setRefreshing(true);
    else setLoading(true);

    ref
      .current()
      .then((result) => {
        if (!alive) return;
        hasData.current = true;
        setData(result);
        setDataKey(cache?.cacheKey ?? null);
        if (cache?.cacheKey && result !== null && requestGeneration === getApiCacheGeneration()) {
          responseCache.set(cache.cacheKey, {
            value: result,
            expiresAt: Date.now() + cache.cacheTimeMs,
            generation: requestGeneration,
          });
        }
        setError(null);
        setRefreshError(null);
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        const message =
          caught instanceof ApiError
            ? caught.message
            : caught instanceof Error
              ? caught.message
              : "Terjadi kesalahan yang tidak dikenal.";

        if (hasData.current) {
          /* Kegagalan refresh tidak boleh menghapus snapshot terakhir yang
             masih berguna. Pemanggil dapat memilih menampilkan refreshError
             sebagai peringatan tanpa mengganti seluruh layar menjadi kosong. */
          setRefreshError(message);
          return;
        }

        hasData.current = false;
        setData(null);
        setError(message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);

  const cacheKey = cache?.cacheKey;
  const cached = cachedResponse<T>(cacheKey);
  const visibleData = cacheKey ? cached ?? (dataKey === cacheKey ? data : null) : data;
  const awaitingKey = !!cacheKey && visibleData === null && dataKey !== cacheKey;

  return {
    data: visibleData,
    error: awaitingKey ? null : error,
    refreshError,
    loading: cached !== null ? false : loading || awaitingKey,
    refreshing,
    reload,
  };
}
