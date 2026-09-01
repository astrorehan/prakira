/**
 * Pembatas laju percobaan masuk.
 *
 * Laporan warga sudah dibatasi rapi lewat `checkRateLimit` di
 * `services/reports.ts`, tetapi `POST /api/auth/login` tidak dibatasi sama
 * sekali. Dua akibatnya bertumpuk: kata sandi bisa ditebak tanpa batas, dan
 * setiap tebakan memaksa gateway mengerjakan KDF yang mahal. Yang kedua lebih
 * berbahaya di aula pameran dengan jaringan terbuka — ia tidak menuntut
 * tebakan yang benar sekali pun.
 *
 * Hitungannya disimpan di memori proses, bukan di basis data, dan itu
 * disengaja. Pembatas yang menulis satu baris ke Postgres untuk setiap
 * percobaan justru memberi penyerang cara memaksa gateway bekerja — persis
 * yang hendak dicegah. Gateway ini satu proses (lihat `databasePoolMax` di
 * `env.ts`), jadi peta di memori memang melihat seluruh lalu lintasnya.
 * Harganya: hitungannya hangus saat proses dinyalakan ulang. Itu bisa
 * diterima — penyerang tidak bisa menyalakan ulang gateway, dan sesi yang
 * sah juga hangus di saat yang sama.
 *
 * Yang dihitung hanya percobaan yang gagal, dan masuk yang berhasil
 * menghapusnya. Petugas yang salah ketik lalu berhasil tidak pernah terkunci.
 */
import crypto from "node:crypto";
import { env } from "../env.js";

/* Batas jumlah alamat yang dilacak sekaligus. Peta ini tumbuh sebesar jumlah
   alamat yang pernah gagal, dan penyerang bisa berpindah alamat lebih cepat
   daripada jendelanya lewat. Tanpa batas, pembatas laju itu sendiri menjadi
   kebocoran memori yang bisa dipicu dari luar. */
const MAX_TRACKED = 5_000;

const failures = new Map<string, number[]>();

export type LoginGuardState = {
  max: number;
  windowMinutes: number;
  /** Sisa percobaan sebelum terkunci. */
  remaining: number;
  blocked: boolean;
  /** Detik sampai satu percobaan tertua keluar dari jendela. */
  retryAfterSeconds: number;
};

/**
 * Kunci pelacakan untuk sebuah alamat.
 *
 * Alamat IP tidak pernah disimpan mentah, sejalan dengan `deviceHash` pada
 * laporan warga: yang dibutuhkan pembatas laju hanya "apakah ini asal yang
 * sama", dan itu tidak menuntut alamatnya bisa dibaca kembali.
 */
export function loginKey(ip: string): string {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

function recent(key: string, now: number): number[] {
  const cutoff = now - env.loginRateLimit.windowMinutes * 60_000;
  return (failures.get(key) ?? []).filter((t) => t > cutoff);
}

function state(times: number[], now: number): LoginGuardState {
  const { max, windowMinutes } = env.loginRateLimit;
  const oldest = times[0];
  return {
    max,
    windowMinutes,
    remaining: Math.max(0, max - times.length),
    blocked: times.length >= max,
    retryAfterSeconds:
      oldest === undefined
        ? 0
        : Math.max(
            1,
            Math.ceil((oldest + windowMinutes * 60_000 - now) / 1000),
          ),
  };
}

/** Membaca keadaan tanpa mengubahnya. Dipanggil sebelum pekerjaan apa pun. */
export function checkLogin(key: string): LoginGuardState {
  const now = Date.now();
  return state(recent(key, now), now);
}

/**
 * Mencatat satu percobaan gagal.
 *
 * `justBlocked` menandai percobaan yang tepat menyentuh ambang, supaya jejak
 * audit memuat satu baris "diblokir" alih-alih satu baris untuk tiap
 * percobaan sesudahnya.
 */
export function recordLoginFailure(
  key: string,
): LoginGuardState & { justBlocked: boolean } {
  const now = Date.now();
  const times = recent(key, now);
  const wasBlocked = times.length >= env.loginRateLimit.max;
  times.push(now);

  /* Dihapus lalu ditulis ulang supaya urutan Map mengikuti urutan kebaruan —
     `evictOldest` mengandalkan itu. */
  failures.delete(key);
  failures.set(key, times);
  if (failures.size > MAX_TRACKED) evictOldest(now);

  const next = state(times, now);
  return { ...next, justBlocked: next.blocked && !wasBlocked };
}

/** Masuk yang berhasil menghapus riwayat gagal alamat itu. */
export function clearLoginFailures(key: string): void {
  failures.delete(key);
}

function evictOldest(now: number): void {
  const cutoff = now - env.loginRateLimit.windowMinutes * 60_000;
  for (const [key, times] of failures) {
    if (times[times.length - 1] <= cutoff) failures.delete(key);
  }
  /* Bila masih penuh setelah yang kedaluwarsa dibuang, yang datang lebih dulu
     dilepas. Pada titik ini serangannya tersebar dan pembatas per-alamat
     memang tidak lagi menolong; yang masih harus dijaga adalah memorinya. */
  for (const key of failures.keys()) {
    if (failures.size <= MAX_TRACKED) break;
    failures.delete(key);
  }
}

/** Hanya untuk pengujian. */
export function resetLoginGuard(): void {
  failures.clear();
}
