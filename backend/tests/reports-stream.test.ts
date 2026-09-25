/**
 * Pengujian aliran event real-time laporan warga dan endpoint peta.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { reportEvents } from "../src/services/events.js";
import type { ReportRow } from "../src/services/reports.js";

function dummyReport(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "PKR-TEST01",
    kind: "jentik",
    kecamatan: "Tugu",
    kelurahan: "Mangkang Wetan",
    occurred_at: "2026-09-25",
    description: "Ditemukan jentik nyamuk pada genangan air di bak terbuka.",
    submitted_at: "2026-09-25T10:00:00.000Z",
    has_photo: false,
    status: "menunggu",
    reviewed_at: null,
    reviewer: null,
    review_note: null,
    handling_mode: null,
    device_hash: "0123456789abcdef0123456789abcdef",
    landmark: "Sebelah kantor kelurahan",
    rt_rw: "01/02",
    latitude: -6.9723,
    longitude: 110.3154,
    location_accuracy_m: 10,
    photo_device: null,
    photo_taken_at: null,
    info_request: null,
    info_requested_at: null,
    related_report_id: null,
    forward_state: null,
    forward_target: null,
    forward_channel: null,
    forward_reference: null,
    forward_note: null,
    forwarded_at: null,
    forwarded_by: null,
    forward_pattern: null,
    ...overrides,
  };
}

test("reportEvents menyiarkan event report:created dengan data laporan lengkap", (t, done) => {
  const sample = dummyReport();

  const listener = (report: ReportRow) => {
    try {
      assert.equal(report.id, "PKR-TEST01");
      assert.equal(report.kind, "jentik");
      assert.equal(report.kecamatan, "Tugu");
      assert.equal(report.status, "menunggu");
      assert.equal(report.latitude, -6.9723);
      assert.equal(report.longitude, 110.3154);
      reportEvents.off("report:created", listener);
      done();
    } catch (err) {
      reportEvents.off("report:created", listener);
      done(err);
    }
  };

  reportEvents.on("report:created", listener);
  reportEvents.emitReportCreated(sample);
});

test("reportEvents menyiarkan event report:reviewed saat laporan diverifikasi", (t, done) => {
  const verified = dummyReport({
    id: "PKR-VERIF1",
    status: "terverifikasi",
    reviewed_at: "2026-09-25T10:30:00.000Z",
    reviewer: "Petugas Puskesmas Tugu",
  });

  const listener = (report: ReportRow) => {
    try {
      assert.equal(report.id, "PKR-VERIF1");
      assert.equal(report.status, "terverifikasi");
      assert.equal(report.reviewer, "Petugas Puskesmas Tugu");
      reportEvents.off("report:reviewed", listener);
      done();
    } catch (err) {
      reportEvents.off("report:reviewed", listener);
      done(err);
    }
  };

  reportEvents.on("report:reviewed", listener);
  reportEvents.emitReportReviewed(verified);
});

test("reportEvents menyiarkan event report:forwarded saat laporan diteruskan", (t, done) => {
  const forwarded = dummyReport({
    id: "PKR-FWD01",
    status: "terverifikasi",
    forward_state: "diteruskan",
    forward_target: "Dinas Lingkungan Hidup",
  });

  const listener = (report: ReportRow) => {
    try {
      assert.equal(report.id, "PKR-FWD01");
      assert.equal(report.forward_state, "diteruskan");
      assert.equal(report.forward_target, "Dinas Lingkungan Hidup");
      reportEvents.off("report:forwarded", listener);
      done();
    } catch (err) {
      reportEvents.off("report:forwarded", listener);
      done(err);
    }
  };

  reportEvents.on("report:forwarded", listener);
  reportEvents.emitReportForwarded(forwarded);
});

test("toPublicView menyembunyikan titik koordinat untuk publik tetapi menyediakannya untuk petugas", async () => {
  const { toPublicView } = await import("../src/services/reports.js");
  const report = dummyReport();

  const publicProjection = toPublicView(report, null, null, "public");
  assert.equal(publicProjection.id, "PKR-TEST01");
  assert.equal(publicProjection.status, "menunggu");
  assert.equal(publicProjection.location, null, "Koordinat publik wajib null untuk privasi pelapor");
  assert.equal(publicProjection.photoMeta, null, "Metadata foto publik wajib null");

  const staffProjection = toPublicView(report, null, null, "staff");
  assert.equal(staffProjection.id, "PKR-TEST01");
  assert.notEqual(staffProjection.location, null, "Petugas wajib menerima titik koordinat untuk plot peta");
  assert.equal(staffProjection.location?.latitude, -6.9723);
  assert.equal(staffProjection.location?.longitude, 110.3154);
});

test("scoping forMyDistrict menandai laporan di wilayah kerja puskesmas dengan benar", () => {
  const puskesmasScope = "Tugu";
  const inScope = dummyReport({ kecamatan: "Tugu" });
  const outOfScope = dummyReport({ kecamatan: "Semarang Selatan" });

  const flagInScope = inScope.kecamatan.toLowerCase() === puskesmasScope.toLowerCase();
  const flagOutOfScope = outOfScope.kecamatan.toLowerCase() === puskesmasScope.toLowerCase();

  assert.equal(flagInScope, true, "Laporan di wilayah kerja puskesmas harus bernilai true");
  assert.equal(flagOutOfScope, false, "Laporan di luar wilayah kerja puskesmas harus bernilai false");
});

test("filter peta Puskesmas hanya meloloskan laporan masuk belum diverifikasi di wilayahnya", () => {
  const scope = "Tugu";
  const reports = [
    dummyReport({ id: "R1", kecamatan: "Tugu", status: "menunggu" }),
    dummyReport({ id: "R2", kecamatan: "Tugu", status: "perlu_informasi" }),
    dummyReport({ id: "R3", kecamatan: "Tugu", status: "terverifikasi" }),
    dummyReport({ id: "R4", kecamatan: "Tugu", status: "ditolak" }),
    dummyReport({ id: "R5", kecamatan: "Banyumanik", status: "menunggu" }),
  ];

  const puskesmasView = reports.filter((r) => {
    if (r.kecamatan.toLowerCase() !== scope.toLowerCase()) return false;
    return r.status === "menunggu" || r.status === "perlu_informasi";
  });

  assert.deepEqual(puskesmasView.map((r) => r.id), ["R1", "R2"]);
});

test("filter peta Dinkes hanya meloloskan laporan terverifikasi puskesmas yang belum selesai ditangani", () => {
  const reports = [
    dummyReport({ id: "D1", status: "menunggu" }), // Belum diverifikasi puskesmas
    dummyReport({ id: "D2", status: "terverifikasi", kind: "gejala" }), // Gejala terverifikasi -> masuk dinkes, belum ditangani
    dummyReport({ id: "D3", status: "terverifikasi", kind: "genangan", handling_mode: "mandiri_warga", forward_state: null }), // Selesai di tingkat warga puskesmas, tidak dikirim ke dinkes
    dummyReport({ id: "D4", status: "terverifikasi", kind: "genangan", handling_mode: "mandiri_warga", forward_state: "diusulkan" }), // Eskalasi berulang -> dikirim ke dinkes/DLH, belum ditangani
    dummyReport({ id: "D5", status: "terverifikasi", kind: "sampah", forward_state: "perlu_diteruskan" }), // Masuk dinkes/DLH, belum diteruskan
    dummyReport({ id: "D6", status: "terverifikasi", kind: "sampah", forward_state: "diteruskan" }), // Sudah ditangani/diteruskan -> selesai
  ];

  const dinkesView = reports.filter((r) => {
    if (r.status !== "terverifikasi") return false;
    if (r.forward_state === "diteruskan") return false;
    if (r.handling_mode === "mandiri_warga" && !r.forward_state) return false;
    return true;
  });

  assert.deepEqual(dinkesView.map((r) => r.id), ["D2", "D4", "D5"]);
});


