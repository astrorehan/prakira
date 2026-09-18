"use client";

import * as React from "react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { ManualCaseEntryCard } from "@/components/manual-case-entry";

/**
 * Entri Kasus Faskes — PRD & Alur Kerja Nakes.
 *
 * Halaman khusus untuk tenaga kesehatan di tingkat puskesmas dan fasilitas
 * kesehatan untuk mencatatkan rekapitulasi kasus klinis terkonfirmasi per wilayah
 * kecamatan. Data yang dientri langsung tersinkronisasi ke tabel observasi surveilans
 * dan terekam di jejak audit.
 */
export default function KasusPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Entri Kasus"
          description="Pencatatan data kasus klinis bulanan per kecamatan oleh petugas fasilitas kesehatan dan puskesmas untuk pembaruan surveilans penyakit."
        />

        <ManualCaseEntryCard />
      </div>
    </div>
  );
}
