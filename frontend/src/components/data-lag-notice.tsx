"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import type { ReportingPeriod } from "@/types";

/**
 * Pemberitahuan bahwa prakiraan bulan berjalan belum tersedia.
 *
 * Kepala halaman sudah menyebut "Data Desember 2025 · Prakiraan Januari 2026".
 * Yang tidak ia sebut: bahwa kalender di dinding sudah September. Pembaca
 * yang tidak membandingkan keduanya akan mengira Januari adalah bulan depan.
 * Komponen ini menyatakan jaraknya secara terang, dan hanya muncul kalau
 * jaraknya memang ada — data mutakhir tidak butuh peringatan.
 *
 * Model dilatih satu langkah ke depan, jadi jalan keluarnya bukan menghapus
 * pembatas di layanan ML melainkan memperbarui observasi. Pesan ini bilang
 * begitu supaya petugas tahu apa yang harus dilakukan.
 */
export function DataLagNotice({
  period,
  className,
}: {
  period: Pick<
    ReportingPeriod,
    "forecastBehindCalendar" | "lagNotice" | "latestObserved" | "calendarMonth"
  > | null | undefined;
  className?: string;
}) {
  if (!period?.forecastBehindCalendar || !period.lagNotice) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3",
        className,
      )}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
      <div className="text-body-sm text-foreground">
        <p className="font-semibold">
          Prakiraan {formatMonth(period.calendarMonth)} belum tersedia.
        </p>
        <p className="text-paper-700">
          {period.lagNotice} Untuk memprakirakan bulan berjalan, impor kasus dan
          cuaca bulanan sampai {formatMonth(previousMonth(period.calendarMonth))} lewat halaman
          Kasus.
        </p>
      </div>
    </div>
  );
}

/** `2026-09-01` -> `2026-08-01`. */
function previousMonth(monthStart: string): string {
  const [year, month] = monthStart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
