"use client";

import * as React from "react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { VerificationQueue } from "@/components/verification-queue";

/**
 * Verifikasi Laporan — PRD §5.5 (M7).
 *
 * Nama pemutus tidak lagi diambil dari `localStorage` dan tidak lagi punya
 * cadangan berupa akun demo bawaan: gateway sudah tahu siapa yang sedang masuk
 * dari cookie sesinya, dan nama itulah yang tercatat di jejak audit. Halaman
 * ini karena itu tidak perlu meneruskan apa pun ke antreannya.
 */
export default function VerifikasiPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Verifikasi Laporan"
          description="Laporan warga yang menunggu keputusan petugas. Laporan yang diterima masuk ke model sebagai sinyal warga dengan bobot lebih rendah daripada rekapitulasi resmi dinas."
        />

        <VerificationQueue />
      </div>
    </div>
  );
}
