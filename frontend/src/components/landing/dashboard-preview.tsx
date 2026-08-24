"use client";

import {
  CloudRain,
  Activity,
  Users,
  MapPin,
  ShieldCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import { RolePickerDialog } from "@/components/role-picker-dialog";
import { Button } from "@/components/ui/button";

const STATS = [
  {
    icon: MapPin,
    value: "16",
    label: "Kecamatan terpantau",
    sublabel: "Kota Semarang",
  },
  {
    icon: CloudRain,
    value: "4",
    label: "Stasiun BMKG",
    sublabel: "Sinkronisasi real-time",
  },
  {
    icon: Activity,
    value: "3",
    label: "Jenis penyakit",
    sublabel: "DBD, ISPA, Diare",
  },
  {
    icon: BarChart3,
    value: "R² 0.91",
    label: "Akurasi model",
    sublabel: "XGBoost backtesting",
  },
];

const SOURCES = [
  {
    icon: CloudRain,
    name: "BMKG",
    desc: "Data cuaca real-time",
  },
  {
    icon: Activity,
    name: "Dinas Kesehatan",
    desc: "Data kasus historis",
  },
  {
    icon: Users,
    name: "Laporan Warga",
    desc: "Terverifikasi puskesmas",
  },
];

export function TrustSection() {
  return (
    <section
      id="trust"
      className="py-16 md:py-24 bg-background"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Dapat Dipercaya</div>
          <h2 className="mt-5 h-section text-balance">
            Data nyata, bukan tebakan
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Prakira menggabungkan data cuaca resmi BMKG dengan data kasus historis
            Dinas Kesehatan Kota Semarang menggunakan machine learning untuk
            menghasilkan estimasi risiko yang terukur.
          </p>
        </div>

        {/* Stats grid */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label, sublabel }, idx) => (
            <div
              key={label}
              className="rounded-2xl border border-paper-200 bg-white p-5 shadow-card text-center transition-all hover:-translate-y-0.5 hover:shadow-lift"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 mx-auto shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground font-mono">
                {value}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {label}
              </div>
              <div className="text-xs text-muted-foreground">{sublabel}</div>
            </div>
          ))}
        </div>

        {/* Sources strip */}
        <div className="mt-10 rounded-2xl border border-paper-200 bg-paper-50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Sumber Data
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Setiap prediksi dihasilkan dari data berikut — bukan alat diagnosis, melainkan pendukung keputusan.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {SOURCES.map(({ icon: Icon, name, desc }) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-paper-200 bg-white px-4 py-3 shadow-xs"
                >
                  <Icon className="h-4 w-4 text-brand-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peek for officers */}
        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            Apakah Anda petugas kesehatan?{" "}
            <RolePickerDialog>
              <button
                type="button"
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Buka Dashboard Petugas
                <Zap className="h-3.5 w-3.5" />
              </button>
            </RolePickerDialog>
          </span>
        </div>
      </div>
    </section>
  );
}