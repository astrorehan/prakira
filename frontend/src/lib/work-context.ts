"use client";

/**
 * Konteks pekerjaan yang dibawa saat petugas membuka alat evaluasi.
 *
 * F14. Simulator, uji historis, dan transparansi model adalah permukaan publik
 * — dan memang harus tetap begitu, karena bukti seberapa jauh prakiraan boleh
 * dipercaya tidak boleh dikunci di balik kotak masuk petugas. Tetapi bagi
 * petugas, ketiganya dibuka di tengah pekerjaan: sedang memeriksa DBD di
 * Genuk, lalu ingin tahu apakah modelnya pernah benar di wilayah itu.
 *
 * Sebelumnya kepindahan itu memutus konteks dua kali. Chrome-nya berganti
 * (sidebar hilang, masthead publik muncul), dan saat kembali, penyakit,
 * wilayah, serta periode yang sedang dipegang harus dipilih ulang dari awal.
 *
 * Modul ini menyimpan satu hal: pekerjaan apa yang sedang ditinggalkan, dan ke
 * mana harus kembali. `sessionStorage`, bukan `localStorage`: ini keadaan satu
 * sesi kerja, bukan preferensi perangkat. Menutup tab berarti pekerjaannya
 * sudah selesai atau ditinggalkan — keduanya tidak layak dibangkitkan lagi
 * seminggu kemudian.
 */

import * as React from "react";

const STORAGE_KEY = "prakira.work-context.v1";

/** Parameter yang ikut di URL supaya tautan tetap bisa dibagikan. */
export const WORK_PARAM = {
  disease: "disease",
  kecamatan: "kecamatan",
  periode: "periode",
  from: "dari",
} as const;

export type WorkContext = {
  /** Rute konsol yang ditinggalkan, lengkap dengan kueri yang berlaku. */
  href: string;
  /** Nama pekerjaannya, persis seperti judul halaman itu. */
  label: string;
  disease?: string | null;
  kecamatan?: string | null;
  periode?: string | null;
  /** Antrean/tab yang sedang terbuka, bila halamannya punya. */
  queue?: string | null;
  /** Kapan ditinggalkan — dipakai untuk tidak menawarkan konteks basi. */
  at: number;
};

/** Konteks yang lebih tua dari ini tidak lagi ditawarkan. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function rememberWorkContext(
  ctx: Omit<WorkContext, "at">,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...ctx, at: Date.now() } satisfies WorkContext),
    );
  } catch {
    /* Mode privat memblokir tulisan. Tautan kembali cukup jadi tautan biasa. */
  }
}

export function readWorkContext(): WorkContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkContext;
    if (!parsed || typeof parsed.href !== "string" || typeof parsed.at !== "number") {
      return null;
    }
    /* Hanya rute internal. Konteks yang tersimpan tidak boleh jadi jalan
       memindahkan petugas ke alamat luar. */
    if (!parsed.href.startsWith("/") || parsed.href.startsWith("//")) return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Tidak ada yang perlu dilakukan. */
  }
}

/**
 * Menempelkan penyakit/wilayah/periode pada tautan alat evaluasi.
 *
 * Hanya nilai yang ada yang ikut; tautan tanpa konteks tetap tautan bersih.
 */
export function withWorkParams(
  href: string,
  ctx: Partial<Pick<WorkContext, "disease" | "kecamatan" | "periode">> & {
    from?: string;
  },
): string {
  const params = new URLSearchParams();
  if (ctx.disease) params.set(WORK_PARAM.disease, ctx.disease);
  if (ctx.kecamatan) params.set(WORK_PARAM.kecamatan, ctx.kecamatan);
  if (ctx.periode) params.set(WORK_PARAM.periode, ctx.periode);
  if (ctx.from) params.set(WORK_PARAM.from, ctx.from);

  const query = params.toString();
  if (!query) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}

/**
 * Membaca konteks yang dititipkan lewat URL.
 *
 * Dipakai alat evaluasi untuk membuka penyakit yang sedang dikerjakan petugas,
 * bukan penyakit pertama di daftar. Aman dipanggil hanya di dalam efek.
 */
export function readWorkParams(): {
  disease: string | null;
  kecamatan: string | null;
  periode: string | null;
  from: string | null;
} {
  if (typeof window === "undefined") {
    return { disease: null, kecamatan: null, periode: null, from: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    disease: params.get(WORK_PARAM.disease),
    kecamatan: params.get(WORK_PARAM.kecamatan),
    periode: params.get(WORK_PARAM.periode),
    from: params.get(WORK_PARAM.from),
  };
}

/**
 * Penyakit yang harus dibuka alat evaluasi.
 *
 * Petugas yang datang dari konsol sedang memegang satu penyakit; membuka
 * daftar pada penyakit pertama abjad berarti ia harus memilih ulang sebelum
 * bisa membaca apa pun. Nama dari URL hanya dipakai bila benar-benar ada di
 * daftar gateway — selebihnya kembali ke perilaku lama.
 */
export function pickInitialDisease<T extends string>(
  list: readonly T[],
  wanted: string | null,
): T | null {
  if (list.length === 0) return null;
  const match = wanted
    ? list.find((d) => d.toLowerCase() === wanted.toLowerCase())
    : undefined;
  return match ?? list[0];
}

/** Membaca konteks setelah komponen terpasang — tanpa menebak saat render server. */
export function useWorkContext(): WorkContext | null {
  const [ctx, setCtx] = React.useState<WorkContext | null>(null);
  React.useEffect(() => setCtx(readWorkContext()), []);
  return ctx;
}
