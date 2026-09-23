"use client";

import * as React from "react";
import { CalendarDays, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeriod } from "@/lib/use-period";
import { Skeleton } from "@/components/ui/skeleton";

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
 *
 * Bila jalur prakiraan tidak sampai ke bulan berjalan — data iklim bulan
 * antara ikut berhenti, misalnya — chip berubah nada dan menyebut sampai mana
 * prakiraan itu benar-benar berlaku.
 */
export function PeriodChip({ className }: { className?: string }) {
  const { period, loading } = usePeriod();

  if (loading || !period) {
    return (
      <span
        className={cn("inline-flex h-4 items-center gap-2", className)}
        role="status"
        aria-label="Memuat periode"
      >
        <Skeleton className="h-3 w-3 shrink-0 rounded" />
        <Skeleton className="h-3 w-40" />
      </span>
    );
  }

  const behind = period.forecastBehindCalendar;

  /* Keterangan, bukan tombol: tanpa bingkai, tanpa latar. Chip berbingkai di
     sebelah tombol terbaca sebagai kendali ketiga dan ikut berebut perhatian. */
  return (
    <span
      role="status"
      title={period.lagNotice ?? undefined}
      aria-label={
        behind && period.lagNotice
          ? period.lagNotice
          : `Data terakhir ${period.monthYear}, prakiraan ${period.predictionLabel}`
      }
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-paper-500",
        className,
      )}
    >
      {behind ? (
        <TriangleAlert className="h-3 w-3 shrink-0 text-risk-medium" aria-hidden="true" />
      ) : (
        <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="tabular whitespace-nowrap">Data s.d. {period.monthYear}</span>
      <span aria-hidden="true" className="text-paper-300">
        ·
      </span>
      <span className="tabular whitespace-nowrap">Prakiraan {period.predictionLabel}</span>
      {behind && (
        <>
          <span aria-hidden="true" className="text-paper-300">
            ·
          </span>
          <span className="whitespace-nowrap text-caption font-medium text-risk-medium">
            belum sampai bulan berjalan
          </span>
        </>
      )}
      <PeriodInfo monthYear={period.monthYear} predictionLabel={period.predictionLabel} />
    </span>
  );
}

/**
 * Penjelasan jarak antara bulan data dan bulan prakiraan — cukup satu ikon.
 * Chip-nya sendiri tetap pendek; siapa pun yang bertanya "kenapa Oktober
 * kalau datanya Desember?" menemukan jawabannya saat mengarahkan kursor atau
 * menekan Tab, tanpa paragraf yang menetap di layar.
 */
function PeriodInfo({
  monthYear,
  predictionLabel,
}: {
  monthYear: string;
  predictionLabel: string;
}) {
  const id = React.useId();
  return (
    <span className="group/info relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        aria-label="Tentang periode prakiraan"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-paper-500 hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface p-3 text-left text-caption leading-relaxed text-paper-700 opacity-0 shadow-card transition-opacity duration-fast group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100"
      >
        Rekap kasus resmi terakhir: <strong className="font-semibold text-foreground">{monthYear}</strong>.
        Model memprakirakan bulan demi bulan sampai{" "}
        <strong className="font-semibold text-foreground">{predictionLabel}</strong> memakai
        data iklim BMKG terbaru; makin jauh bulannya, makin lebar rentangnya.
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
        {/* F17: judul halaman dijamin lebarnya. Tanpa lantai ini kolom
            kendali mengambil 700 px dari 865 px dan "Beranda / Prioritas"
            patah jadi tiga baris. */}
        <div className="min-w-0 flex-1 space-y-1.5 md:min-w-[18rem]">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {description && (
            <p className="max-w-2xl text-body-sm text-paper-600">{description}</p>
          )}
          {/* Periode ikut judul sebagai keterangan, bukan di barisan tombol. */}
          <PeriodChip className="pt-0.5" />
        </div>

        {/* F17: baris kendali boleh membungkus supaya judul tidak patah. */}
        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-1 md:justify-end">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
