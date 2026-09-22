/**
 * Jarak antara data, prakiraan, dan kalender nyata.
 *
 * Rekapitulasi kasus berhenti di satu bulan; kalender terus berjalan. Jalur
 * prakiraan yang menyusuri bulan antara satu per satu menutup jarak itu, dan
 * berkas ini menjaga dua hal sekaligus: jalurnya utuh dari sesudah observasi
 * terakhir sampai bulan depan, dan halaman hanya bersuara bila jalur itu
 * benar-benar tidak sampai ke bulan berjalan.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  calendarMonthOf,
  describeDataLag,
  forecastMonthOf,
  forecastMonths,
  monthsBetween,
} from "../src/services/period.js";

test("monthsBetween menghitung lintas tahun", () => {
  assert.equal(monthsBetween("2025-12-01", "2026-09-01"), 9);
  assert.equal(monthsBetween("2026-01-01", "2026-01-01"), 0);
  assert.equal(monthsBetween("2026-03-01", "2026-01-01"), -2);
});

test("calendarMonthOf memakai WIB, bukan UTC", () => {
  // 30 September 20:00 UTC = 1 Oktober 03:00 WIB.
  assert.equal(calendarMonthOf(new Date("2026-09-30T20:00:00Z")), "2026-10-01");
  assert.equal(calendarMonthOf(new Date("2026-09-15T00:00:00Z")), "2026-09-01");
});

test("bulan prakiraan aktif adalah bulan depan, bukan bulan setelah observasi", () => {
  assert.equal(
    forecastMonthOf("2025-12-01", new Date("2026-09-10T00:00:00Z")),
    "2026-10-01",
  );
});

test("observasi yang sudah mutakhir tidak melompati bulan depan", () => {
  assert.equal(
    forecastMonthOf("2026-09-01", new Date("2026-09-20T00:00:00Z")),
    "2026-10-01",
  );
  assert.equal(forecastMonthOf(null, new Date("2026-09-20T00:00:00Z")), null);
});

test("jalur prakiraan utuh dari sesudah observasi sampai bulan depan", () => {
  const months = forecastMonths("2025-12-01", new Date("2026-09-10T00:00:00Z"));
  assert.equal(months.length, 10);
  assert.equal(months[0], "2026-01-01");
  assert.equal(months[months.length - 1], "2026-10-01");
});

test("data mutakhir: satu bulan prakiraan, tanpa peringatan", () => {
  const months = forecastMonths("2026-08-01", new Date("2026-09-10T00:00:00Z"));
  assert.deepEqual(months, ["2026-09-01", "2026-10-01"]);

  const lag = describeDataLag("2026-08-01", new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.dataLagMonths, 1);
  assert.equal(lag.forecastBehindCalendar, false);
  assert.equal(lag.lagNotice, null);
});

test("data tertinggal sembilan bulan: prakiraan tetap sampai bulan depan, halaman diam", () => {
  const lag = describeDataLag("2025-12-01", new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.calendarMonth, "2026-09-01");
  assert.equal(lag.dataLagMonths, 9);
  assert.equal(lag.forecastBehindCalendar, false);
  assert.equal(lag.lagNotice, null);
});

test("tanpa observasi sama sekali", () => {
  const lag = describeDataLag(null, new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.dataLagMonths, null);
  assert.equal(lag.forecastBehindCalendar, false);
  assert.equal(lag.lagNotice, null);
  assert.deepEqual(forecastMonths(null, new Date("2026-09-10T00:00:00Z")), []);
});
