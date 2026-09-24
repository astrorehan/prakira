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
 * Manajemen Sistem & AI (khusus Administrator).
 *
 * Ruang kendali Administrator sistem untuk melatih ulang model ML, memantau
 * integritas ingest data, serta memeriksa jejak audit akuntabilitas publik.
 * Dinkes memakai hasilnya (prakiraan, prioritas), tidak mengubah pipeline.
 *
 * Impor data kasus (manual & CSV) dilakukan oleh Nakes di halaman /kasus.
 * Akun Dinkes dan Puskesmas yang mencoba mengakses halaman ini secara manual
 * dialihkan otomatis ke ruang kerja faskes di /dashboard.
 */
export default function AdminPage() {
  const { session, loading } = useSessionContext();
  const router = useRouter();

  const isAuthorized = session?.role === "admin";

  React.useEffect(() => {
    if (!loading && session && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [loading, session, isAuthorized, router]);

  if (!loading && session && !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-risk-high" aria-hidden />
          <h1 className="text-h2 text-foreground">Akses Terbatas</h1>
          <p className="text-body-sm text-paper-600">
            Halaman Manajemen Sistem & AI dikhususkan untuk Administrator Sistem.
            Anda sedang dialihkan ke Dashboard Prediksi…
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard">Buka Dashboard Prediksi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <ConsolePageHeader
          title="Manajemen Sistem & AI"
          description="Pantau kesehatan data dan model, latih ulang model prediksi, dan telusuri jejak audit sistem."
        />

        <AdminDataImport />
      </div>
    </div>
  );
}
