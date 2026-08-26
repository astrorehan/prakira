"use client";

import { WargaShell } from "@/components/warga/shell";
import { ReportTracker } from "@/components/report-tracker";

/**
 * Lacak laporan — PRD §5.4.
 *
 * Halaman ini ada supaya kode lacak berarti sesuatu. Kode yang diterbitkan
 * tanpa tempat memeriksanya bukan tanda terima, melainkan hiasan.
 */
export default function StatusPage() {
  return (
    <WargaShell
      backHref="/warga"
      backLabel="Portal warga"
      title="Lacak laporan Anda"
      lead="Masukkan kode yang Anda terima setelah mengirim laporan. Tidak perlu akun — kode itu satu-satunya kunci, dan kami memang tidak menyimpan nama atau nomor Anda."
    >
      <ReportTracker />
    </WargaShell>
  );
}
