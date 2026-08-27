"use client";

/**
 * Kecamatan yang sedang dipegang pembaca — satu pilihan, dipakai lintas rute.
 *
 * Halaman depan sudah menanyakan "kecamatan Anda di mana" lewat pencarian hero,
 * deteksi lokasi, papan 16 kecamatan, dan pintasan wilayah paling berisiko.
 * Menanyakannya lagi di `/warga/lapor` membuang jawaban yang sudah diberikan.
 *
 * Dua jalur, dengan urutan yang disengaja:
 *
 *   1. `?kecamatan=` di URL — menang, karena eksplisit dan bisa dibagikan.
 *   2. `localStorage` — cadangan untuk pembaca yang masuk lewat menu.
 *
 * `localStorage` tetap dipakai di sini dan itu disengaja: ini preferensi satu
 * perangkat, bukan data. Yang pindah ke gateway adalah daftar kecamatannya —
 * validasi nama kini memakai direktori dari `/api/meta/kecamatan`, bukan
 * salinan tertulis di frontend.
 */

import * as React from "react";
import { loadKecamatanDirectory, resolveKecamatanName, type KecamatanRef } from "./kecamatan";

const STORAGE_KEY = "prakira.kecamatan.v1";

/** Parameter kueri yang dipakai semua tautan lintas rute. */
export const KECAMATAN_PARAM = "kecamatan";

export function rememberKecamatan(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* Mode privat memblokir tulisan. Pilihan tetap hidup di state React. */
  }
}

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Menempelkan `?kecamatan=` pada tautan, hanya bila ada yang perlu dibawa. */
export function withKecamatan(href: string, name: string | null): string {
  if (!name) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${KECAMATAN_PARAM}=${encodeURIComponent(name)}`;
}

/**
 * Membaca pilihan setelah komponen terpasang.
 *
 * Nilai awal `null` adalah keadaan jujur — belum tahu — dan bukan tebakan yang
 * harus dikoreksi sepersekian detik kemudian. Nama divalidasi terhadap
 * direktori gateway supaya `?kecamatan=Jakarta` tidak menembus ke formulir.
 */
export function useRememberedKecamatan(): [string | null, (name: string) => void] {
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    loadKecamatanDirectory()
      .then((list: KecamatanRef[]) => {
        if (!alive) return;
        const fromUrl = resolveKecamatanName(
          list,
          new URLSearchParams(window.location.search).get(KECAMATAN_PARAM),
        );
        if (fromUrl) {
          setName(fromUrl);
          rememberKecamatan(fromUrl);
          return;
        }
        setName(resolveKecamatanName(list, readStored()));
      })
      .catch(() => {
        /* Tanpa direktori, tidak ada nama yang bisa dipercaya. Biarkan kosong. */
      });

    return () => {
      alive = false;
    };
  }, []);

  const choose = React.useCallback((next: string) => {
    setName(next);
    rememberKecamatan(next);
  }, []);

  return [name, choose];
}
