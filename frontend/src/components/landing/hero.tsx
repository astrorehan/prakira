"use client";

import Link from "next/link";
import { ArrowRight, CloudRain, Activity, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";

/* Data provenance, not implementation trivia. "PostGIS" means nothing to a
   health official; where the numbers come from means everything. */
const SUMBER = [
  { icon: CloudRain, label: "BMKG" },
  { icon: Activity, label: "Dinkes Kota Semarang" },
  { icon: Users, label: "Laporan warga terverifikasi" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-wash-warm">
      <div className="container relative pb-20 pt-14 md:pb-28 md:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow animate-fade-in">Peringatan dini · Kota Semarang</p>

            <h1 className="mt-6 animate-fade-in-up text-display text-balance text-foreground">
              Bertindak sebelum kasus naik, bukan sesudahnya.
            </h1>

            <p className="mt-6 max-w-lg animate-fade-in-up stagger-2 text-body-lg text-paper-600">
              Prakira memperkirakan risiko lonjakan penyakit terkait iklim per kecamatan
              hingga empat minggu ke depan, lalu menerjemahkannya menjadi daftar tindakan
              berprioritas untuk dinas dan puskesmas.
            </p>

            <div className="mt-9 flex animate-fade-in-up stagger-3 flex-wrap items-center gap-3">
              <RolePickerDialog>
                <Button size="lg" className="group">
                  Buka dasbor
                  <ArrowRight className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
                </Button>
              </RolePickerDialog>
              <Button asChild size="lg" variant="outline">
                <Link href="/warga">Cek risiko wilayah saya</Link>
              </Button>
            </div>

            {/* Provenance strip. Restrained weight, no pills, no shadows. */}
            <div className="mt-12 animate-fade-in-up stagger-4">
              <p className="overline">Sumber data</p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {SUMBER.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-body-sm text-paper-700">
                    <Icon className="h-4 w-4 text-brand-500" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-md border-l-2 border-paper-300 pl-3 text-caption text-paper-500">
                Estimasi risiko berbasis pola statistik historis untuk mendukung keputusan.
                Bukan alat diagnosis.
              </p>
            </div>
          </div>

          <div className="animate-fade-in lg:col-span-6">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
