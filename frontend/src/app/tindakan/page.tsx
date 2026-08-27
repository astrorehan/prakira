"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { EarlyActionCenter } from "@/components/early-action-center";
import { DataState } from "@/components/data-state";
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
 */
export default function TindakanPage() {
  const { session } = useSessionContext();
  const { period } = usePeriod();
  const actions = useApi(() => fetchActions(), []);

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-6">
        <ConsolePageHeader
          title="Aksi Dini"
          description="Instruksi intervensi untuk puskesmas dan satgas, disusun sebelum bulan yang diprakirakan tiba. Antrean terurut: yang lewat tenggat lebih dulu."
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
          error={actions.error}
          empty={!actions.loading && (actions.data?.data.length ?? 0) === 0}
          emptyMessage="Belum ada rekomendasi tindakan. Mesin aturan hanya menerbitkan instruksi untuk kecamatan berkelas risiko sedang atau tinggi pada bulan prakiraan berjalan."
          onRetry={actions.reload}
        >
          <EarlyActionCenter
            recommendations={actions.data?.data ?? []}
            systemToday={period?.systemToday ?? null}
            operator={session?.label ?? null}
            onChanged={actions.reload}
          />
        </DataState>
      </div>
    </div>
  );
}
