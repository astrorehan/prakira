/**
 * Kata sandi — scrypt dari `node:crypto`.
 *
 * Bukan bcrypt/argon2 karena keduanya modul native: satu kegagalan kompilasi
 * di mesin lain membuat seluruh gateway tidak bisa dipasang. scrypt bawaan
 * Node adalah KDF yang memang dirancang untuk kata sandi (RFC 7914), dan
 * perbandingannya di bawah memakai waktu tetap.
 *
 * Seluruh fungsi di sini asinkron, dan itu bukan soal gaya penulisan.
 * `scryptSync` menahan event loop selama KDF-nya bekerja — pada N=16384
 * sekitar 100 ms sekali panggil. Node berutas tunggal, jadi selama 100 ms itu
 * gateway tidak melayani dashboard, peta, maupun portal warga untuk siapa pun.
 * Beberapa puluh percobaan masuk per detik sudah cukup menghentikan seluruh
 * layanan tanpa menebak satu kata sandi pun, dan tidak ada yang perlu ditembus
 * lebih dulu untuk melakukannya. Bentuk callback-nya menjalankan KDF di
 * threadpool libuv; event loop tetap melayani permintaan lain sementara ia
 * bekerja.
 *
 * Threadpool itu tetap berhingga — empat utas secara bawaan, dan dipakai
 * bersama oleh fs dan dns — jadi ia memperlambat pembanjiran, bukan
 * menghentikannya. Yang menghentikannya `login-guard.ts`.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";

const KEY_LENGTH = 64;
const SCRYPT_PARAMS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return { hash: derived.toString("hex"), salt };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

/* Sasaran tiruan untuk email yang tidak terdaftar. Nilainya acak dan tidak
   pernah cocok dengan apa pun; gunanya hanya memberi `verifyDecoy` sesuatu
   untuk dikerjakan. */
const DECOY_SALT = crypto.randomBytes(16).toString("hex");
const DECOY_HASH = crypto.randomBytes(KEY_LENGTH).toString("hex");

/**
 * Mengerjakan KDF yang sama untuk email yang tidak ada, lalu selalu gagal.
 *
 * Rute masuk sudah sengaja memakai satu pesan untuk email tak dikenal dan
 * kata sandi salah, supaya penebak tidak bisa memastikan sebuah email
 * terdaftar. Tetapi jalur kodenya membocorkan yang ditutup pesannya: bila
 * penggunanya tidak ditemukan, `verifyPassword` tidak pernah dipanggil, dan
 * jawabannya kembali dalam satu-dua milidetik alih-alih seratus. Selisih
 * sebesar itu terbaca jelas lewat jaringan mana pun — pesannya sama, waktunya
 * yang menjawab. Memanggil ini di cabang "tidak ditemukan" menyamakan
 * keduanya.
 */
export function verifyDecoy(password: string): Promise<boolean> {
  return verifyPassword(password, DECOY_HASH, DECOY_SALT);
}
