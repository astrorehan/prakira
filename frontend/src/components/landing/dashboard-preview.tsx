"use client";

import {
  Activity,
  TrendingUp,
  CloudRain,
  MapPin,
  Bug,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import dynamic from "next/dynamic";

const PreviewChart = dynamic(() => import("./preview-chart"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const SIDEBAR = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Bug, label: "Prediksi DBD" },
  { icon: TrendingUp, label: "Tren Kasus" },
  { icon: CloudRain, label: "Iklim BMKG" },
  { icon: MapPin, label: "Zonasi Wilayah" },
];

export function DashboardPreview() {
  return (
    <section id="preview" className="bg-paper-100/60 py-20 md:py-28 border-y border-paper-200/80">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Dashboard Preview</div>
          <h2 className="mt-5 h-section text-balance">
            Antarmuka yang intuitif, analisis data yang mendalam
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Dirancang untuk memudahkan kepala dinas dan tenaga medis puskesmas mengambil keputusan pencegahan secara cepat.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-paper-200/90 bg-white shadow-elevated">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-paper-200 bg-paper-50/80 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Prakira
              </span>
              <span className="ml-3 text-xs text-muted-foreground">/ Dinas Kesehatan / Dashboard</span>
            </div>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="flex h-2 w-2 rounded-full bg-risk-low animate-pulse" /> Live Early Warning
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-12">
            {/* Sidebar */}
            <aside className="hidden border-r border-paper-200 bg-background p-4 lg:col-span-2 lg:block">
              <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
                Navigasi
              </div>
              <nav className="mt-3 flex flex-col gap-1">
                {SIDEBAR.map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={"flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium" + (active ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-paper-100")}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-10">
              <div className="grid gap-4 p-5 sm:p-7">
                {/* KPI row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total Kasus DBD (Mg 34)", value: "178", unit: "kasus", trend: "+14.2%", tone: "primary" },
                    { label: "Wilayah Siaga Tinggi", value: "3", unit: "kecamatan", trend: "Pedurungan, Bny, Tmb", tone: "danger" },
                    { label: "Curah Hujan BMKG", value: "225", unit: "mm/minggu", trend: "Hujan Lebat", tone: "primary" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-paper-200 bg-white p-5 shadow-xs">
                      <div className="text-[11px] uppercase font-medium tracking-wider text-muted-foreground">
                        {k.label}
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold tracking-tight text-foreground">{k.value}</span>
                        <span className="text-xs font-medium text-muted-foreground">{k.unit}</span>
                      </div>
                      <div className={"mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" + (k.tone === "primary" ? "bg-brand-50 text-brand-700 border border-brand-100" : "bg-risk-high-bg text-risk-high border border-risk-high-br")}>
                        <TrendingUp className="h-3 w-3" />
                        {k.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-paper-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold tracking-tight text-foreground">Tren Proyeksi 2-4 Minggu vs Aktual</div>
                        <div className="text-xs text-muted-foreground">Kota Semarang — DBD Kasus Mingguan</div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <span className="h-2 w-2 rounded-full bg-primary" /> Aktual
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-risk-high">
                          <span className="h-2 w-2 rounded-full bg-risk-high" /> Prediksi AI
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 h-48">
                      <PreviewChart />
                    </div>
                  </div>
                </div>

                {/* Map Grid */}
                <div className="relative overflow-hidden rounded-2xl border border-paper-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/40 p-5">
                  <div className="absolute inset-0 bg-grid-light opacity-40" />
                  <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        Peta Zonasi Risiko 16 Kecamatan
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Kota Semarang — Terintegrasi Data BMKG & Dinas Kesehatan
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      {[
                        { label: "Rendah (Aman)", color: "#1B6B4F" },
                        { label: "Sedang (Waspada)", color: "#A8690C" },
                        { label: "Tinggi (Siaga)", color: "#A32B1F" },
                      ].map((s) => (
                        <span key={s.label} className="flex items-center gap-1 rounded-full border border-paper-200 bg-white px-2.5 py-0.5 font-semibold shadow-xs">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          <span style={{ color: s.color }}>{s.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-4 grid grid-cols-8 sm:grid-cols-16 gap-1.5">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const colors = ["#A32B1F", "#A8690C", "#1B6B4F", "#A32B1F", "#1B6B4F", "#A8690C", "#1B6B4F", "#1B6B4F"];
                      const c = colors[i % colors.length];
                      return (
                        <div
                          key={i}
                          className="aspect-square rounded-lg transition-all hover:scale-110 flex items-center justify-center text-[9px] font-semibold text-white shadow-xs cursor-pointer"
                          style={{ background: c, opacity: 0.85 }}
                          title={"Kecamatan " + (i + 1)}
                        >
                          K{i + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}