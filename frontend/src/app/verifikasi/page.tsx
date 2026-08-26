"use client";

import * as React from "react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { VerificationQueue } from "@/components/verification-queue";
import { readSession, DEMO_ACCOUNT } from "@/lib/auth";

/**
 * Verifikasi Laporan — PRD §5.5 (M7).
 *
 * Rute ini sudah terdaftar di `lib/routes.ts` sejak chrome konsol dibuat, tapi
 * tidak pernah punya berkas halaman: `/verifikasi` adalah rute mati yang
 * tercatat sebagai utang di docs/DESIGN-SYSTEM.md §12. Utangnya ditutup di
 * sini, dan bukan karena rapi — tanpa halaman ini, kode lacak yang terbit di
 * `/warga/lapor` menjanjikan proses verifikasi yang tidak punya tempat terjadi.
 */
export default function VerifikasiPage() {
  const [reviewer, setReviewer] = React.useState(DEMO_ACCOUNT.label);

  /* Nama pemutus ikut tercatat di tiap keputusan, jadi diambil dari sesi yang
     sedang berjalan. Dibaca setelah mount: `localStorage` tidak ada di server. */
  React.useEffect(() => {
    const session = readSession();
    if (session?.label) setReviewer(session.label);
  }, []);

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Verifikasi Laporan"
          description="Laporan warga yang menunggu keputusan petugas. Laporan yang diterima masuk ke model sebagai sinyal warga dengan bobot lebih rendah daripada rekapitulasi resmi dinas."
        />

        <VerificationQueue reviewer={reviewer} />
      </div>
    </div>
  );
}
