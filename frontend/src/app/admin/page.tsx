"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { AdminDataImport } from "@/components/admin-data-import";
import { useSessionContext } from "@/components/session-provider";
import { Button } from "@/components/ui/button";

/**
 * Manajemen Sistem & AI (Admin & Dinas).
 *
 * Ruang kendali khusus Administrator dan Dinas Kesehatan untuk melatih ulang
 * model ML, mengimpor rekapitulasi data massal, memantau integritas ingest,
 * serta memeriksa jejak audit akuntabilitas publik.
 *
 * Petugas Puskesmas (Nakes) yang mencoba mengakses halaman ini secara manual
 * dialihkan otomatis ke ruang kerja faskes di /kasus.
 */
export default function AdminPage() {
  const { session, loading } = useSessionContext();
  const router = useRouter();

  const isAuthorized =
    session?.role === "admin" || session?.role === "dinas";

  React.useEffect(() => {
    if (!loading && session && !isAuthorized) {
      router.replace("/kasus");
    }
  }, [loading, session, isAuthorized, router]);

  if (!loading && session && !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-risk-high" aria-hidden />
          <h1 className="text-h2 text-foreground">Akses Terbatas</h1>
          <p className="text-body-sm text-paper-600">
            Halaman Manajemen Sistem & AI dikhususkan untuk Administrator dan Dinas
            Kesehatan. Anda sedang dialihkan ke ruang kerja Entri Kasus Faskes…
          </p>
          <Button asChild size="sm">
            <Link href="/kasus">Buka Halaman Entri Kasus</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Manajemen Sistem & AI"
          description="Latih ulang model prediksi ML, kelola impor rekapitulasi dinas, pantau status ingest, serta telusuri jejak audit sistem untuk akuntabilitas publik."
        />

        <AdminDataImport />
      </div>
    </div>
  );
}
