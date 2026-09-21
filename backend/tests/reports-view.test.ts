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
import {
  toPublicEnvironmentTicket,
  type EnvironmentTicket,
} from "../src/services/tickets.js";
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
    handling_mode: null,
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

test("keputusan publik menyertakan jalur dan arahan yang dapat ditindaklanjuti", () => {
  const view = toPublicView(
    row({ kind: "genangan", status: "terverifikasi", handling_mode: "dlh" }),
  );

  assert.deepEqual(view.routing, {
    family: "lingkungan",
    destination: "Dinas Lingkungan Hidup",
    handlingMode: "dlh",
    workflow: "tiket_lingkungan",
  });
  assert.ok(view.guidance.steps.length >= 3);
  assert.match(view.guidance.caution, /Jangan/);
  assert.equal(view.ticket, null);
});

test("keputusan mandiri warga tidak mengisyaratkan tiket DLH", () => {
  const view = toPublicView(
    row({
      kind: "genangan",
      status: "terverifikasi",
      handling_mode: "mandiri_warga",
      review_note: "Bersihkan sumbatan kecil dari tempat yang aman.",
    }),
  );

  assert.equal(view.routing.handlingMode, "mandiri_warga");
  assert.equal(view.routing.destination, "Warga/pelapor");
  assert.equal(view.routing.workflow, "arahan_warga");
  assert.equal(view.reviewNote, "Bersihkan sumbatan kecil dari tempat yang aman.");
  assert.doesNotMatch(view.guidance.steps.join(" "), /kode tiket/i);
  assert.equal(view.ticket, null);
});

test("laporan lingkungan yang belum diputuskan menunggu pilihan tindak lanjut", () => {
  const view = toPublicView(row({ kind: "sampah" }));

  assert.equal(view.routing.handlingMode, null);
  assert.equal(view.routing.workflow, "pilih_tindak_lanjut");
});

test("proyeksi tiket warga tidak membocorkan lokasi internal atau PIC", () => {
  const ticket: EnvironmentTicket = {
    id: "DLH-20260921-A1B2C3",
    report_id: "PKR-A2B3C4",
    kind: "genangan",
    destination_unit: "Dinas Lingkungan Hidup",
    status: "dikerjakan",
    priority: "tinggi",
    kecamatan: "Tembalang",
    kelurahan: "Bulusan",
    summary: "Genangan bertahan tiga hari.",
    created_at: "2026-09-21T01:00:00.000Z",
    updated_at: "2026-09-21T02:00:00.000Z",
    acknowledged_at: "2026-09-21T01:30:00.000Z",
    assigned_to: "UPT internal",
    resolved_at: null,
    resolution_note: null,
  };

  const view = toPublicEnvironmentTicket(ticket);
  assert.deepEqual(view, {
    id: "DLH-20260921-A1B2C3",
    destinationUnit: "Dinas Lingkungan Hidup",
    status: "dikerjakan",
    priority: "tinggi",
    createdAt: "2026-09-21T01:00:00.000Z",
    updatedAt: "2026-09-21T02:00:00.000Z",
    resolvedAt: null,
    resolutionNote: null,
  });
  assert.ok(!Object.hasOwn(view ?? {}, "assigned_to"));
  assert.ok(!Object.hasOwn(view ?? {}, "report_id"));
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
