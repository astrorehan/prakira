"use client";

import {
  CloudRain,
  Activity,
  TrendingUp,
  Droplets,
  ShieldAlert,
  Bug,
} from "lucide-react";
import dynamic from "next/dynamic";

const MockupChart = dynamic(() => import("./mockup-chart"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export function DashboardMockup() {
  return (
    <div className="relative w-full">
      <div className="absolute -inset-12 -z-10 rounded-[40px] bg-gradient-to-tr from-primary/15 via-transparent to-brand-300/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-paper-200/90 bg-white/95 shadow-elevated">
        <div className="flex items-center justify-between border-b border-paper-200/80 bg-paper-50/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-risk-high" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-medium" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-low" />
          </div>
          <div className="rounded-md bg-white border border-paper-200/80 px-3 py-1 text-3xs font-medium tracking-wide text-muted-foreground shadow-xs">
            app.prakira.id/dinas/dashboard
          </div>
          <div className="h-2.5 w-12" />
        </div>

        <div className="grid gap-3 bg-background p-4 sm:grid-cols-12">
          <aside className="hidden flex-col gap-1.5 rounded-xl bg-white p-3 border border-paper-200/80 sm:col-span-3 sm:flex shadow-xs">
            {[
              { icon: Activity, label: "Peta Risiko", active: true },
              { icon: TrendingUp, label: "Prediksi" },
              { icon: CloudRain, label: "Iklim BMKG" },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={"flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors " + (active ? "bg-primary text-white shadow-xs font-medium" : "text-muted-foreground hover:bg-paper-100")}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </aside>

          <div className="grid gap-3 sm:col-span-9 sm:grid-cols-2">
            <div className="col-span-2 flex items-center justify-between rounded-xl bg-gradient-to-br from-primary to-primary-deep p-4 text-white shadow-sm">
              <div>
                <div className="flex items-center gap-1.5 text-3xs uppercase tracking-wider opacity-85 font-medium">
                  <Bug className="h-3 w-3" /> Prediksi Lonjakan DBD (14 Hari)
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">
                  +35% Kasus Baru
                </div>
                <div className="mt-1 text-2xs opacity-85">
                  Zona Bahaya: Pedurungan & Banyumanik
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 shadow-inner">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-xl border border-paper-200/80 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between text-3xs uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CloudRain className="h-3 w-3 text-primary" /> Curah Hujan 7h
                </span>
                <span className="font-mono">mm</span>
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                225.4
                <span className="ml-1 text-3xs font-normal text-muted-foreground">
                  mm (Hujan Lebat)
                </span>
              </div>
              <div className="mt-1 h-12">
                <MockupChart />
              </div>
            </div>

            <div className="rounded-xl border border-paper-200/80 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between text-3xs uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Droplets className="h-3 w-3 text-brand-600" /> Kelembaban Udara
                </span>
                <span className="font-mono text-risk-high font-semibold">86%</span>
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Pancaroba Aktif
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-100">
                <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-brand-500 to-risk-high" />
              </div>
              <div className="mt-2 text-3xs text-risk-high font-medium">
                Kondisi optimal perkembangan jentik
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-3 top-1/3 hidden -translate-y-1/2 rounded-2xl border border-paper-200/90 bg-white/95 px-3.5 py-2 shadow-card md:flex md:items-center md:gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-brand-700" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-700" />
        </span>
        <div className="text-3xs leading-tight">
          <div className="font-semibold tracking-tight text-foreground">BMKG AWS Live</div>
          <div className="text-muted-foreground">Update tiap 60 mnt</div>
        </div>
      </div>

      <div className="absolute -right-3 bottom-1/4 hidden rounded-2xl border border-paper-200/90 bg-white/95 px-3.5 py-2 shadow-card md:flex md:items-center md:gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 shadow-xs">
          <Activity className="h-3.5 w-3.5" />
        </div>
        <div className="text-3xs leading-tight">
          <div className="font-semibold tracking-tight text-foreground">XGBoost Regressor</div>
          <div className="text-risk-low font-semibold">Akurasi R² = 0.914</div>
        </div>
      </div>
    </div>
  );
}