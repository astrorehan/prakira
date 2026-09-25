"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, ShieldAlert } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { ManualCaseEntryCard } from "@/components/manual-case-entry";
import { CaseCsvImportCard } from "@/components/case-csv-import";
import { useSessionContext } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Entri & Impor Kasus Faskes — Konsol Tenaga Kesehatan.
 *
 * Ruang kerja nakes untuk memasukkan data kasus resmi ke sistem, baik melalui:
 * 1. Formulir Entri Manual (input satu per satu per kecamatan & bulan).
 * 2. Impor Rekapitulasi CSV (unggah massal berkas seluruh 16 kecamatan).
 *
 * Seluruh data yang diinput otomatis masuk ke tabel observasi surveilans
 * dan siap dipelajari oleh model AI saat Administrator melakukan retraining.
 */
export default function KasusPage() {
  const { session, loading } = useSessionContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"manual" | "csv">("manual");

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
            Halaman Entri Kasus dikhususkan untuk Petugas Kesehatan Puskesmas & Faskes.
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
          title="Entri & Impor Kasus Penyakit"
          description="Pencatatan data kasus klinis bulanan per kecamatan oleh petugas fasilitas kesehatan. Pilih entri formulir manual atau unggah rekapitulasi massal via berkas CSV."
        />

        {/* Tab Switcher: Manual vs CSV. Akun puskesmas ikut memakai impor CSV;
            gateway menolak baris di luar kecamatannya. */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-left text-body-sm font-semibold transition sm:flex-none sm:justify-start sm:px-5",
              activeTab === "manual"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-paper-500 hover:border-border hover:text-foreground",
            )}
          >
            <FileText className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span>
              Formulir <span className="hidden sm:inline">Entri </span>Manual
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-left text-body-sm font-semibold transition sm:flex-none sm:justify-start sm:px-5",
              activeTab === "csv"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-paper-500 hover:border-border hover:text-foreground",
            )}
          >
            <FileSpreadsheet className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span>
              Impor <span className="hidden sm:inline">Rekapitulasi Berkas </span>(CSV)
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "manual" ? (
          <ManualCaseEntryCard />
        ) : (
          <div className="max-w-4xl">
            <CaseCsvImportCard />
          </div>
        )}
      </div>
    </div>
  );
}
