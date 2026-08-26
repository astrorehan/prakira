"use client";

import * as React from "react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { AdminDataImport } from "@/components/admin-data-import";

/**
 * Manajemen Data BMKG.
 *
 * Judul lama — "Manajemen Dataset, BMKG Sync & Audit Trail" — adalah daftar
 * isi yang menyamar sebagai judul, dan tidak sama dengan label sidebar-nya.
 * Isi halamannya sendiri sudah menyebutkan ketiga bagian itu di kepala tiap
 * kartu; judul tidak perlu mengulangnya.
 */
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Manajemen Data BMKG"
          description="Integrasi data iklim otomatis, unggah manual data kasus, dan jejak audit untuk akuntabilitas publik."
        />

        <AdminDataImport />
      </div>
    </div>
  );
}
