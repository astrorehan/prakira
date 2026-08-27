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
import { ApiError } from "@/lib/api";

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  /** Benar hanya pada pemuatan pertama; muat ulang memakai `refreshing`. */
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
};

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

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

  React.useEffect(() => {
    let alive = true;

    setError(null);
    if (hasData.current) setRefreshing(true);
    else setLoading(true);

    ref
      .current()
      .then((result) => {
        if (!alive) return;
        hasData.current = true;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        hasData.current = false;
        setData(null);
        setError(
          caught instanceof ApiError
            ? caught.message
            : caught instanceof Error
              ? caught.message
              : "Terjadi kesalahan yang tidak dikenal.",
        );
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

  return { data, error, loading, refreshing, reload };
}
