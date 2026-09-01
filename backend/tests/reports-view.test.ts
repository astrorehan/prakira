/**
 * Apa yang boleh meninggalkan gateway pada sebuah laporan warga.
 *
 * Dua kolom di `laporan_warga` tidak pernah boleh ikut ke klien mana pun:
 * `photo`, karena ia sampai 400.000 karakter dan antrean menariknya ratusan
 * kali sekaligus; dan `device_hash`, karena ia sidik jari perangkat pelapor.
 * Keduanya pernah lolos lewat satu `SELECT *`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  REPORT_COLUMNS,
  toPublicView,
  type ReportRow,
} from "../src/services/reports.js";
import { SIMULATION_DEVICE, SIMULATION_PREFIX } from "../src/services/demo.js";

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "PKR-A2B3C4",
    kind: "genangan",
    kecamatan: "Tembalang",
    kelurahan: "Bulusan",
    occurred_at: "2026-08-30",
    description: "Genangan bertahan tiga hari di gang belakang pasar.",
    submitted_at: "2026-08-31T02:15:00.000Z",
    has_photo: true,
    status: "menunggu",
    reviewed_at: null,
    reviewer: null,
    review_note: null,
    device_hash: "0123456789abcdef0123456789abcdef",
    ...overrides,
  };
}

test("bentuk publik tidak membawa foto maupun sidik jari perangkat", () => {
  const view = toPublicView(row());
  const keys = Object.keys(view);

  assert.ok(!keys.includes("photo"), "foto tidak boleh ikut di daftar");
  assert.ok(!keys.includes("device_hash"), "sidik jari perangkat tidak boleh keluar dari server");
  assert.equal(view.hasPhoto, true, "keberadaan foto tetap harus diberitahukan");
});

test("hasPhoto mengikuti kenyataan barisnya", () => {
  assert.equal(toPublicView(row({ has_photo: false })).hasPhoto, false);
  assert.equal(toPublicView(row({ has_photo: true })).hasPhoto, true);
});

test("baris peragaan tetap bisa dikenali di antrean", () => {
  /* Petugas yang melihat delapan laporan baru berhak tahu mana yang datang
     dari warga dan mana yang disuntikkan untuk demo — lewat kedua penandanya,
     karena deskripsi bisa diedit sementara sidik jarinya tidak. */
  assert.equal(toPublicView(row({ device_hash: SIMULATION_DEVICE })).simulated, true);
  assert.equal(
    toPublicView(row({ description: `${SIMULATION_PREFIX} Genangan di gang.` })).simulated,
    true,
  );
  assert.equal(toPublicView(row()).simulated, false);
});

test("proyeksi kolom menyebut foto hanya sebagai uji keberadaan", () => {
  /* Penjaga terhadap kembalinya `SELECT *`. Yang diuji bukan gaya penulisan:
     satu kolom 400 KB yang ikut terbawa diam-diam ke setiap baris adalah
     selisih antara respons beberapa ratus kilobita dan respons 40 MB. */
  assert.ok(!REPORT_COLUMNS.includes("*"), "kolom harus disebut satu per satu");
  const photoMentions = REPORT_COLUMNS.match(/photo/g) ?? [];
  assert.equal(photoMentions.length, 2, "hanya `(photo IS NOT NULL) AS has_photo`");
  assert.match(REPORT_COLUMNS, /\(photo IS NOT NULL\) AS has_photo/);
});
