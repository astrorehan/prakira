"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeriod } from "@/lib/use-period";

/**
 * Kepala halaman konsol — satu bentuk untuk semua rute nakes.
 *
 * Sebelumnya tiap halaman menyusun kepalanya sendiri: satu memakai `.eyebrow`,
 * satu menyalin isinya sebagai kelas mentah, dan judulnya berupa kalimat
 * ("Manajemen Dataset, BMKG Sync & Audit Trail") yang bertengkar dengan label
 * sidebar-nya sendiri. Judul halaman adalah janji navigasi: kalau sidebar
 * menyebut satu nama, halamannya harus menjawab dengan nama yang sama.
 *
 * docs/DESIGN-SYSTEM.md §4.2 — judul halaman memakai `text-h1`, bukan tumpukan
 * `text-2xl sm:text-3xl lg:text-4xl`.
 */

/**
 * Chip periode.
 *
 * Dulu mencetak "Minggu 34 · Agustus 2026" dari konstanta. Dataset yang ada
 * bergranularitas bulanan dan berhenti di bulan tertentu, jadi chip ini
 * sekarang menyebut dua hal yang benar-benar berbeda: bulan data terakhir dan
 * bulan yang diprakirakan. Petugas harus bisa melihat keduanya tanpa membuka
 * halaman lain.
 */
export function PeriodChip({ className }: { className?: string }) {
  const { period, loading } = usePeriod();

  if (loading || !period) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-hairline",
          className,
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden="true" />
        <span className="text-caption text-paper-600">Memuat periode…</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`Data terakhir ${period.monthYear}, prakiraan ${period.predictionLabel}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-hairline",
        className,
      )}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
      <span className="tabular text-caption font-medium text-foreground">
        Data {period.monthYear}
      </span>
      <span aria-hidden="true" className="text-paper-300">
        ·
      </span>
      <span className="text-caption text-paper-600">
        Prakiraan {period.predictionLabel}
      </span>
    </span>
  );
}

type ConsolePageHeaderProps = {
  /** Sama persis dengan label sidebar. Kalau berbeda, salah satunya salah. */
  title: string;
  /** Satu kalimat: apa yang bisa diputuskan di halaman ini. */
  description?: string;
  /** Tombol utama halaman. Maksimal satu yang primer (§10.8). */
  actions?: React.ReactNode;
  /** Baris kendali di bawah judul — filter, selector, tab. */
  children?: React.ReactNode;
  className?: string;
};

export function ConsolePageHeader({
  title,
  description,
  actions,
  children,
  className,
}: ConsolePageHeaderProps) {
  return (
    <header className={cn("border-b border-border pb-5", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {description && (
            <p className="max-w-2xl text-body-sm text-paper-600">{description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <PeriodChip />
          {actions}
        </div>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
