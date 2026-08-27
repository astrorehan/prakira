"use client";

import * as React from "react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { AdminDataImport } from "@/components/admin-data-import";

/**
 * Manajemen Data.
 *
 * Judul lama — "Manajemen Data BMKG" — menamai halaman ini menurut sebuah
 * integrasi yang tidak ada: tidak ada satu pun baris di sistem ini yang ditarik
 * dari layanan BMKG. Yang benar-benar dikelola di sini adalah dataset kasus,
 * status pekerjaan ingest, dan jejak auditnya.
 */
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Manajemen Data"
          description="Unggah rekapitulasi kasus, periksa status pemuatan data dan model, serta telusuri jejak audit untuk akuntabilitas publik."
        />

        <AdminDataImport />
      </div>
    </div>
  );
}
