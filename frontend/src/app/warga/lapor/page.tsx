"use client";

import { WargaShell } from "@/components/warga/shell";
import { CitizenReportForm } from "@/components/citizen-report-form";

/**
 * Laporan warga — PRD §5.4 (M6).
 *
 * Empat tautan di situs ini sudah menjanjikan halaman ini sebelum ia ada:
 * "Laporkan gejala" di hasil risiko, "Laporkan sekarang" di banner ajakan,
 * "Lapor kasus & temuan jentik" di daftar layanan, dan "Lapor kasus & jentik"
 * di kaki halaman sistem. Semuanya mendarat di pengecek risiko. Ini tujuannya.
 */
export default function LaporPage() {
  return (
    <WargaShell
      backHref="/warga"
      backLabel="Portal warga"
      title="Laporkan yang Anda lihat"
      lead="Genangan yang bertahan berhari-hari, tetangga yang demam bersamaan, jentik di bak rumah kosong. Petugas puskesmas memeriksanya, dan laporan yang terverifikasi tersedia sebagai sinyal warga untuk prakiraan bulan berikutnya."
    >
      <CitizenReportForm />
    </WargaShell>
  );
}
