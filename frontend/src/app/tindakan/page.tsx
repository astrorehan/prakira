"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ShieldAlert } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { EarlyActionCenter } from "@/components/early-action-center";
import { DataState } from "@/components/data-state";
import { QueueSkeleton } from "@/components/console/console-skeleton";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/components/session-provider";
import { fetchActions } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { usePeriod } from "@/lib/use-period";

/**
 * Aksi Dini — separuh operasional produk.
 *
 * Dashboard menjawab "di mana risikonya"; halaman ini menjawab "apa yang kita
 * kirim, ke siapa, dan sudah keluar atau belum". Antreannya sekarang datang
 * dari mesin aturan di gateway: lima rekomendasi yang dulu ditulis tangan —
 * lengkap dengan nomor surat, nama kepala puskesmas, dan tanggal pengiriman —
 * digantikan tindakan yang benar-benar diturunkan dari kelas risiko bulan
 * berjalan. Kalau tidak ada kecamatan berkelas tinggi atau sedang, antreannya
 * kosong, dan itu jawaban yang benar.
 *
 * Akun Administrator IT dialihkan otomatis ke /admin.
 */
export default function TindakanPage() {
  const { session, loading } = useSessionContext();
  const router = useRouter();
  const { period } = usePeriod();
  const actions = useApi(() => fetchActions(), []);

  const isAdmin = session?.role === "admin";
  const isPuskesmas = session?.role === "puskesmas";

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
            Penerbitan dan pengelolaan aksi dini intervensi dikhususkan untuk Petugas Kesehatan & Satgas.
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
      <div className="container mx-auto max-w-7xl space-y-6">
        <ConsolePageHeader
          title={isPuskesmas ? "Tugas saya" : "Rekomendasi aksi"}
          description={
            isPuskesmas
              ? "Lihat rekomendasi wilayah dan panduan pelaksanaannya."
              : "Rekomendasi dari prakiraan risiko. Dinkes memilih unit atau puskesmas pelaksana dan mencatat penugasan."
          }
          actions={
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Peta risiko</span>
              </Link>
            </Button>
          }
        />

        <DataState
          loading={actions.loading}
          loadingFallback={<QueueSkeleton kind="actions" />}
          error={actions.error}
          empty={!actions.loading && (actions.data?.data.length ?? 0) === 0}
          emptyMessage="Belum ada rekomendasi untuk periode prakiraan ini."
          onRetry={actions.reload}
        >
          <EarlyActionCenter
            recommendations={actions.data?.data ?? []}
            systemToday={period?.systemToday ?? null}
            operator={session?.label ?? null}
            showMineFilter={isPuskesmas}
            canAssign={session?.role === "dinas"}
            canWork={isPuskesmas}
            onChanged={actions.reload}
          />
        </DataState>
      </div>
    </div>
  );
}
