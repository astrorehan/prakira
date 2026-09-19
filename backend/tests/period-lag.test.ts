/**
 * Keterlambatan data terhadap kalender nyata.
 *
 * Dataset berhenti di satu bulan; kalender terus berjalan. Gateway harus
 * menyatakan jaraknya secara eksplisit supaya "Prakiraan Januari 2026" yang
 * tampil di bulan September tidak terbaca sebagai prakiraan bulan ini.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  calendarMonthOf,
  describeDataLag,
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

test("data mutakhir: prakiraan bulan ini tersedia, tanpa peringatan", () => {
  const lag = describeDataLag("2026-08-01", new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.dataLagMonths, 1);
  assert.equal(lag.forecastBehindCalendar, false);
  assert.equal(lag.lagNotice, null);
});

test("data tertinggal: prakiraan tetap satu bulan setelah observasi, dan dikatakan", () => {
  const lag = describeDataLag("2025-12-01", new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.calendarMonth, "2026-09-01");
  assert.equal(lag.dataLagMonths, 9);
  assert.equal(lag.forecastBehindCalendar, true);
  assert.match(lag.lagNotice ?? "", /terakhir Desember 2025/);
  assert.match(lag.lagNotice ?? "", /tertinggal 9 bulan dari kalender September 2026/);
  assert.match(lag.lagNotice ?? "", /hanya untuk Januari 2026, bukan September 2026/);
});

test("observasi bulan berjalan sudah masuk: prakiraan bulan depan, bukan tertinggal", () => {
  const lag = describeDataLag("2026-09-01", new Date("2026-09-20T00:00:00Z"));
  assert.equal(lag.dataLagMonths, 0);
  assert.equal(lag.forecastBehindCalendar, false);
});

test("tanpa observasi sama sekali", () => {
  const lag = describeDataLag(null, new Date("2026-09-10T00:00:00Z"));
  assert.equal(lag.dataLagMonths, null);
  assert.equal(lag.forecastBehindCalendar, false);
  assert.equal(lag.lagNotice, null);
});
