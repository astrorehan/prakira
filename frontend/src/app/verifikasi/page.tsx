"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { VerificationQueue } from "@/components/verification-queue";
import { useSessionContext } from "@/components/session-provider";
import { Button } from "@/components/ui/button";

/**
 * Verifikasi Laporan — PRD §5.5 (M7).
 *
 * Nama pemutus tidak lagi diambil dari `localStorage` dan tidak lagi punya
 * cadangan berupa akun demo bawaan: gateway sudah tahu siapa yang sedang masuk
 * dari cookie sesinya, dan nama itulah yang tercatat di jejak audit. Halaman
 * ini karena itu tidak perlu meneruskan apa pun ke antreannya.
 *
 * Akun Administrator IT dialihkan otomatis ke /admin.
 */
export default function VerifikasiPage() {
  const { session, loading } = useSessionContext();
  const router = useRouter();

  const isAdmin = session?.role === "admin";

  React.useEffect(() => {
    if (!loading && session && isAdmin) {
      router.replace("/admin");
    }
  }, [loading, session, isAdmin, router]);

  if (!loading && session && isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-risk-high" aria-hidden />
          <h1 className="text-h2 text-foreground">Akses Khusus Nakes</h1>
          <p className="text-body-sm text-paper-600">
            Verifikasi laporan lingkungan warga dikhususkan untuk Petugas Kesehatan & Surveilans.
            Anda sedang dialihkan ke Konsol Administrator…
          </p>
          <Button asChild size="sm">
            <Link href="/admin">Buka Manajemen Sistem & AI</Link>
          </Button>
        </div>
      </div>
    );
  }

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
