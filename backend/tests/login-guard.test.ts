/**
 * Pembatas laju masuk dan penyamaan waktu jawaban.
 *
 * Keduanya jenis perilaku yang tidak terlihat dari layar: sebuah gateway
 * tanpa pembatas laju tampak persis sama dengan yang punya, sampai seseorang
 * mencobanya. Berkas ini yang mencobanya.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkLogin,
  clearLoginFailures,
  loginKey,
  recordLoginFailure,
  resetLoginGuard,
} from "../src/services/login-guard.js";
import { hashPassword, verifyDecoy, verifyPassword } from "../src/services/password.js";
import { env } from "../src/env.js";

const KEY = loginKey("203.0.113.7");
const OTHER = loginKey("203.0.113.8");

test("percobaan di bawah ambang tidak diblokir", () => {
  resetLoginGuard();
  for (let i = 1; i < env.loginRateLimit.max; i += 1) {
    const state = recordLoginFailure(KEY);
    assert.equal(state.blocked, false, `gagal ke-${i} tidak seharusnya memblokir`);
    assert.equal(state.remaining, env.loginRateLimit.max - i);
  }
  assert.equal(checkLogin(KEY).blocked, false);
});

test("percobaan ke-N menyentuh ambang dan memblokir", () => {
  resetLoginGuard();
  let state = recordLoginFailure(KEY);
  for (let i = 1; i < env.loginRateLimit.max; i += 1) state = recordLoginFailure(KEY);

  assert.equal(state.blocked, true);
  assert.equal(state.justBlocked, true, "baris audit hanya boleh terbit sekali");
  assert.equal(state.remaining, 0);
  assert.ok(state.retryAfterSeconds > 0, "harus memberi tahu kapan boleh mencoba lagi");

  /* Percobaan berikutnya tetap diblokir, tetapi bukan lagi "baru diblokir" —
     jejak audit tidak boleh terisi satu baris untuk setiap percobaan. */
  const again = recordLoginFailure(KEY);
  assert.equal(again.blocked, true);
  assert.equal(again.justBlocked, false);
});

test("masuk yang berhasil menghapus riwayat gagal", () => {
  resetLoginGuard();
  for (let i = 0; i < env.loginRateLimit.max - 1; i += 1) recordLoginFailure(KEY);
  assert.ok(checkLogin(KEY).remaining < env.loginRateLimit.max);

  clearLoginFailures(KEY);
  assert.equal(checkLogin(KEY).remaining, env.loginRateLimit.max);
  assert.equal(checkLogin(KEY).blocked, false);
});

test("alamat lain tidak ikut terkunci", () => {
  resetLoginGuard();
  for (let i = 0; i < env.loginRateLimit.max + 2; i += 1) recordLoginFailure(KEY);
  assert.equal(checkLogin(KEY).blocked, true);
  assert.equal(checkLogin(OTHER).blocked, false);
});

test("kuncian lepas setelah jendelanya lewat", (t) => {
  resetLoginGuard();
  t.mock.timers.enable({ apis: ["Date"] });

  for (let i = 0; i < env.loginRateLimit.max; i += 1) recordLoginFailure(KEY);
  assert.equal(checkLogin(KEY).blocked, true);

  /* Satu detik sebelum jendela habis masih terkunci — batasnya harus benar
     ke arah aman, bukan sekadar "kira-kira semenit lagi". */
  t.mock.timers.tick(env.loginRateLimit.windowMinutes * 60_000 - 1_000);
  assert.equal(checkLogin(KEY).blocked, true);

  t.mock.timers.tick(2_000);
  assert.equal(checkLogin(KEY).blocked, false);
  assert.equal(checkLogin(KEY).remaining, env.loginRateLimit.max);
});

test("kunci pelacakan tidak memuat alamat aslinya", () => {
  const ip = "203.0.113.7";
  const key = loginKey(ip);
  assert.ok(!key.includes(ip), "alamat IP tidak boleh bisa dibaca kembali dari kuncinya");
  assert.match(key, /^[0-9a-f]{32}$/);
  assert.equal(key, loginKey(ip), "kunci harus tetap sama untuk alamat yang sama");
  assert.notEqual(key, loginKey("203.0.113.8"));
});

test("peta pelacakan tidak tumbuh tanpa batas", () => {
  resetLoginGuard();
  /* Penyerang bisa berpindah alamat lebih cepat daripada jendelanya lewat.
     Bila setiap alamat baru menambah satu entri permanen, pembatas lajunya
     sendiri menjadi kebocoran memori yang bisa dipicu dari luar. */
  for (let i = 0; i < 7_000; i += 1) recordLoginFailure(loginKey(`198.51.100.${i}`));

  /* Yang diuji bukan angka batasnya, melainkan bahwa ada batasnya: setelah
     tujuh ribu alamat, yang paling baru tetap terlacak dan yang paling lama
     sudah dilepas. */
  const newest = loginKey("198.51.100.6999");
  assert.equal(checkLogin(newest).remaining, env.loginRateLimit.max - 1);
  assert.equal(checkLogin(loginKey("198.51.100.0")).remaining, env.loginRateLimit.max);
});

test("kata sandi yang benar cocok, yang salah tidak", async () => {
  const { hash, salt } = await hashPassword("kata-sandi-uji-2026");
  assert.equal(await verifyPassword("kata-sandi-uji-2026", hash, salt), true);
  assert.equal(await verifyPassword("kata-sandi-uji-2027", hash, salt), false);
});

test("email tak dikenal tetap mengerjakan KDF yang sama", async () => {
  /* Penjaga terhadap kembalinya kebocoran waktu: bila seseorang menaruh lagi
     jalan pintas untuk email yang tidak ditemukan, jawabannya kembali dalam
     hitungan mikrodetik dan lamanya jawaban memberi tahu penebak bahwa sebuah
     email terdaftar — meski pesannya sengaja disamakan.
     
     Ambangnya mutlak, bukan perbandingan dengan verifikasi sungguhan:
     perbandingan rasio ikut mengukur beban mesin CI dan menjadi rapuh.
     scrypt N=16384 memerlukan 16 MB lalu lintas memori; tidak ada perangkat
     keras yang menyelesaikannya dalam lima milidetik, dan jalan pintas mana
     pun selesai jauh di bawah satu. */
  const started = process.hrtime.bigint();
  const result = await verifyDecoy("tebakan-apa-pun");
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  assert.equal(result, false, "sasaran tiruan tidak boleh pernah cocok");
  assert.ok(
    elapsedMs > 5,
    `verifyDecoy selesai dalam ${elapsedMs.toFixed(2)} ms — terlalu cepat untuk sebuah scrypt`,
  );
});
