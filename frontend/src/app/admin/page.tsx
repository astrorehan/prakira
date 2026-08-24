"use client";

import * as React from "react";
import { ShieldCheck, Database, Server, RefreshCw, FileSpreadsheet } from "lucide-react";
import { AdminDataImport } from "@/components/admin-data-import";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-paper-200/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1 text-xs font-medium text-brand-800 shadow-sm mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Modul Admin & Tata Kelola Data</span>
            </div>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Manajemen Dataset, BMKG Sync & Audit Trail
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Pusat kendali integrasi data cuaca BMKG otomatis, upload manual CSV kasus penyakit, serta log audit untuk akuntabilitas publik.
            </p>
          </div>
        </div>

        <AdminDataImport />
      </div>
    </div>
  );
}