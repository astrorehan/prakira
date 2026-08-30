"use client";

/**
 * Unduhan berkas — nyata, bukan animasi.
 *
 * Dua halaman konsol dulu punya tombol "Ekspor Laporan" yang menjalankan
 * `setTimeout(1200)` lalu memunculkan toast "berhasil diunduh". Tidak ada
 * berkas yang pernah dibuat. Tombol yang mengaku sudah mengunduh sesuatu
 * adalah kebohongan kecil yang mahal: petugas akan mencari berkas itu.
 *
 * Yang disediakan berkas ini hanya CSV. Dokumen berformat dinas tidak dibuat
 * di sini dan tidak dipalsukan: `/tindakan/nota/[id]` menyusunnya sebagai satu
 * lembar A4 yang benar di layar dan di kertas, lalu menyerahkan pencetakannya
 * ke mesin cetak peramban — "Simpan sebagai PDF" sudah ada di dialog cetak,
 * jadi repositori ini tidak perlu pustaka penata halaman sama sekali.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [head, ...body].join("\r\n");
}

/**
 * Memicu unduhan di peramban.
 *
 * BOM UTF-8 di depan berkas disengaja: tanpanya Excel di Windows membaca
 * "Semarang Tengah" dengan benar tapi merusak setiap karakter beraksen dan
 * simbol derajat pada kolom suhu.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  /* Objek URL menahan blob-nya di memori sampai dicabut. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `laporan-dbd-2025-12.csv` — tanpa spasi dan tanpa karakter yang perlu di-escape. */
export function slugify(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
