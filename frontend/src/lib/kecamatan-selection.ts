/**
 * Kecamatan yang sedang dipegang pembaca — satu pilihan, dipakai lintas rute.
 *
 * Halaman depan sudah menanyakan "kecamatan Anda di mana" lewat pencarian hero,
 * deteksi lokasi, papan 16 kecamatan, dan pintasan wilayah paling berisiko.
 * Menanyakannya lagi di `/warga/lapor` membuang jawaban yang sudah diberikan
 * dan memaksa orang menjawab pertanyaan yang sama dua kali.
 *
 * Dua jalur, dengan urutan yang disengaja:
 *
 *   1. `?kecamatan=` di URL — menang, karena eksplisit dan bisa dibagikan.
 *      Tautan "Laporkan gejala" membawa kecamatan yang sedang dilihat.
 *   2. `localStorage` — cadangan, supaya pembaca yang masuk lewat menu atau
 *      footer tetap membawa pilihannya.
 *
 * Nama disimpan apa adanya (`"Semarang Barat"`), bukan slug: nama itulah kunci
 * di `SEMARANG_KECAMATAN_RAW`, dan menyandikannya jadi slug hanya menambah satu
 * tabel terjemahan yang bisa melenceng.
 */

import * as React from "react";
import { SEMARANG_KECAMATAN_RAW } from "./mock-data";

const STORAGE_KEY = "prakira.kecamatan.v1";

/** Parameter kueri yang dipakai semua tautan lintas rute. */
export const KECAMATAN_PARAM = "kecamatan";

function isKnown(name: string): boolean {
  return SEMARANG_KECAMATAN_RAW.some((k) => k.nama === name);
}

/** Mengembalikan nama resmi bila cocok tanpa peduli besar-kecil huruf. */
export function resolveKecamatan(value: string | null | undefined): string | null {
  if (!value) return null;
  const q = value.trim().toLowerCase();
  return SEMARANG_KECAMATAN_RAW.find((k) => k.nama.toLowerCase() === q)?.nama ?? null;
}

export function rememberKecamatan(name: string): void {
  if (typeof window === "undefined" || !isKnown(name)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* Mode privat memblokir tulisan. Pilihan tetap hidup di state React. */
  }
}

export function recallKecamatan(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return resolveKecamatan(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Menempelkan `?kecamatan=` pada tautan, hanya bila ada yang perlu dibawa. */
export function withKecamatan(href: string, name: string | null): string {
  if (!name || !isKnown(name)) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${KECAMATAN_PARAM}=${encodeURIComponent(name)}`;
}

/**
 * Membaca pilihan setelah komponen terpasang.
 *
 * Dibaca di `useEffect`, bukan saat render: `localStorage` tidak ada di server,
 * jadi membacanya langsung membuat markup server dan klien berbeda dan React
 * membuang seluruh pohonnya. Nilai awal `null` adalah keadaan jujur — belum
 * tahu — dan bukan tebakan yang harus dikoreksi sepersekian detik kemudian.
 */
export function useRememberedKecamatan(): [string | null, (name: string) => void] {
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fromUrl = resolveKecamatan(
      new URLSearchParams(window.location.search).get(KECAMATAN_PARAM),
    );
    if (fromUrl) {
      setName(fromUrl);
      rememberKecamatan(fromUrl);
      return;
    }
    setName(recallKecamatan());
  }, []);

  const choose = React.useCallback((next: string) => {
    setName(next);
    rememberKecamatan(next);
  }, []);

  return [name, choose];
}
