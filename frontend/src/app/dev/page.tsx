"use client";

import * as React from "react";
import { useState } from "react";
import {
  Palette,
  Layers,
  Sparkles,
  Sliders,
  Code,
  Copy,
  Check,
  Activity,
  Bug,
  Wind,
  Droplets,
  CloudRain,
  ShieldAlert,
  ExternalLink,
  Send,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { AppleGlassDate } from "@/components/ui/apple-glass-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { KpiCard } from "@/components/kpi-card";
import { DiseaseSelector } from "@/components/disease-selector";
import { TrendChart } from "@/components/trend-chart";
import { ClimateCorrelationChart } from "@/components/climate-correlation-chart";
import { BacktestCard } from "@/components/backtest-card";
import { EarlyActionCenter } from "@/components/early-action-center";
import { RecommendationCard } from "@/components/recommendation-card";
import { DispatchActionModal } from "@/components/dispatch-action-modal";
import {
  TREND_DATA,
  CLIMATE_CORRELATION_DATA,
  BACKTEST_METRICS,
  ACTION_RECOMMENDATIONS,
} from "@/lib/mock-data";
import type { DiseaseType, ActionRecommendation } from "@/types";

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<"foundations" | "liquid-glass" | "components" | "early-action" | "charts" | "playground">(
    "foundations"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Playground state knobs
  const [glassBlur, setGlassBlur] = useState(20);
  const [glassOpacity, setGlassOpacity] = useState(72);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>("DBD");
  const [riskScoreKnob, setRiskScoreKnob] = useState(84);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [demoModalRec, setDemoModalRec] = useState<ActionRecommendation | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-paper-200/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/80 bg-brand-100/80 px-3.5 py-1 text-xs font-medium text-brand-800 shadow-sm mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Prakira Developer Design System & Component Library</span>
            </div>
            <h1 className="h-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground">
              EcoHealth <span className="text-primary">Design System</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Spesifikasi desain UI/UX, Liquid Glassmorphism, palet biru cerah, dan pustaka komponen untuk platform prediksi risiko penyakit berbasis iklim (DBD, ISPA, Diare) — Prakira ANFORCOM 2026.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard">
                <span>Lihat Aplikasi Live</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="blue"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  "npm install lucide-react recharts leaflet react-leaflet clsx tailwind-merge",
                  "deps"
                )
              }
            >
              {copiedKey === "deps" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Dependencies</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-paper-200">
          {[
            { id: "foundations" as const, label: "Foundations (Color & Typography)", icon: <Palette className="h-4 w-4" /> },
            { id: "liquid-glass" as const, label: "Liquid Glass System", icon: <Sparkles className="h-4 w-4" /> },
            { id: "components" as const, label: "UI Components & Badges", icon: <Layers className="h-4 w-4" /> },
            { id: "early-action" as const, label: "AI Early Action & Dispatch", icon: <Send className="h-4 w-4" /> },
            { id: "charts" as const, label: "Health Visualizations & Charts", icon: <Activity className="h-4 w-4" /> },
            { id: "playground" as const, label: "Live Interactive Sandbox", icon: <Sliders className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                  : "bg-white/70 text-paper-700 hover:bg-white hover:text-foreground border border-paper-200/80"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: FOUNDATIONS */}
        {activeTab === "foundations" && (
          <div className="space-y-8 animate-fade-in">
            <LiquidGlassCard variant="default" className="p-6 space-y-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Palet Warna Biru Cerah (Bright Medical Blue Palette)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Kombinasi warna biru profesional dan ramah kesehatan yang dioptimalkan untuk visibilitas data tinggi dalam tema terang (bright default).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { name: "Primary Light", hex: "#F0F9FF", desc: "Surface Tint" },
                  { name: "Primary Soft", hex: "#EAF4F5", desc: "Chips & Pill" },
                  { name: "Primary Accent", hex: "#7FB8C0", desc: "Highlights" },
                  { name: "Primary Default", hex: "#0B4A57", desc: "Main Action / CTA" },
                  { name: "Primary Royal", hex: "#2563EB", desc: "Focus / Visual" },
                  { name: "Primary Deep", hex: "#093843", desc: "Hover State" },
                ].map((swatch, i) => (
                  <div
                    key={i}
                    onClick={() => copyToClipboard(swatch.hex, "color-" + i)}
                    className="group cursor-pointer rounded-2xl border border-paper-200 bg-white p-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div
                      className="h-16 w-full rounded-xl border border-paper-200/60 transition-transform group-hover:scale-105 flex items-end justify-end p-1.5"
                      style={{ background: swatch.hex }}
                    >
                      {copiedKey === "color-" + i && (
                        <span className="bg-black/70 text-white text-4xs font-semibold px-1.5 py-0.5 rounded">
                          Tersalin!
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-medium text-foreground">{swatch.name}</div>
                    <div className="text-2xs font-mono text-muted-foreground">{swatch.hex}</div>
                    <div className="text-3xs text-primary mt-0.5">{swatch.desc}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-paper-200">
                <h4 className="font-display text-base font-semibold text-foreground mb-3">
                  Warna Semantik Risiko Epidemiologi (Rendah, Sedang, Tinggi)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: "Risiko Rendah", hex: "#1F5132", bg: "#EDF4EC", desc: "Insiden terkendali, monitoring sanitasi rutin" },
                    { name: "Risiko Waspada (Sedang)", hex: "#D4933A", bg: "#FDF6E9", desc: "Pola iklim mulai memicu peningkatan vektor" },
                    { name: "Risiko Siaga (Tinggi)", hex: "#A8442C", bg: "#FBECE8", desc: "Potensi lonjakan kasus 2-4 minggu, intervensi segera" },
                  ].map((risk, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-4 border transition-all flex items-center gap-3.5"
                      style={{ background: risk.bg, borderColor: risk.hex + "40" }}
                    >
                      <div
                        className="h-10 w-10 rounded-xl shadow-sm flex items-center justify-center text-white font-semibold shrink-0"
                        style={{ background: risk.hex }}
                      >
                        !
                      </div>
                      <div>
                        <div className="font-medium text-xs" style={{ color: risk.hex }}>{risk.name}</div>
                        <div className="text-2xs font-mono text-paper-600">{risk.hex}</div>
                        <div className="text-3xs text-paper-600 mt-0.5">{risk.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-paper-200">
                <h4 className="font-display text-base font-semibold text-foreground mb-3">
                  Identitas Visual Penyakit (DBD, ISPA, Diare)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { disease: "DBD", name: "Demam Berdarah Dengue", hex: "#0B4A57", icon: <Bug className="h-4 w-4" />, vector: "Aedes aegypti (Genangan & Hujan)" },
                    { disease: "ISPA", name: "Infeksi Saluran Pernapasan", hex: "#47617F", icon: <Wind className="h-4 w-4" />, vector: "Partikulat & Debu Pancaroba" },
                    { disease: "Diare", name: "Penyakit Saluran Cerna", hex: "#2C6650", icon: <Droplets className="h-4 w-4" />, vector: "Kontaminasi Air & Banjir Rob" },
                  ].map((dis, i) => (
                    <div key={i} className="rounded-2xl border border-paper-200 bg-white p-4 flex items-center gap-3 shadow-sm">
                      <div
                        className="h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                        style={{ background: dis.hex }}
                      >
                        {dis.icon}
                      </div>
                      <div>
                        <div className="font-medium text-xs text-foreground">{dis.disease} · {dis.name}</div>
                        <div className="text-2xs font-mono" style={{ color: dis.hex }}>{dis.hex}</div>
                        <div className="text-3xs text-muted-foreground">{dis.vector}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB 2: LIQUID GLASS SYSTEM */}
        {activeTab === "liquid-glass" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <LiquidGlassCard variant="default" interactive elevation="md" className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="glass">.liquid-glass</Badge>
                  <h4 className="font-display text-lg font-semibold text-foreground mt-3">
                    Pure Liquid Glass
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Varian standar dengan latar putih transparan 72%, blur 18px, border specular 1px solid rgba(255,255,255,0.9), dan drop shadow halus.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/60 flex justify-between items-center text-xs">
                  <span className="font-mono text-2xs text-primary">blur(18px) saturate(180%)</span>
                  <Button size="sm" variant="glass" className="h-7 text-xs">
                    Interaksi
                  </Button>
                </div>
              </LiquidGlassCard>

              <LiquidGlassCard variant="blue" interactive elevation="md" className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="glass-blue">.liquid-glass-blue</Badge>
                  <h4 className="font-display text-lg font-semibold text-foreground mt-3">
                    Liquid Glass Sky Tint
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Varian bernuansa biru langit dengan gradien linear transparan (brand-50 ke brand-100) dan border biru muda untuk komponen fitur utama.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-brand-100/60 flex justify-between items-center text-xs">
                  <span className="font-mono text-2xs text-primary-royal">shadow-glass-blue</span>
                  <Button size="sm" variant="glass-blue" className="h-7 text-xs">
                    Interaksi
                  </Button>
                </div>
              </LiquidGlassCard>

              <LiquidGlassCard variant="risk-high" interactive elevation="md" className="p-6 flex flex-col justify-between">
                <div>
                  <Badge variant="risk-high" pulse>.liquid-glass-risk-high</Badge>
                  <h4 className="font-display text-lg font-semibold text-foreground mt-3">
                    Liquid Glass Risk Glow
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Varian kaca dengan gradien transparan merah rose untuk notifikasi peringatan bahaya KLB dengan pulsasi dinamis.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-risk-high-br/60 flex justify-between items-center text-xs">
                  <span className="font-mono text-2xs text-risk-high">shadow-glass-risk-high</span>
                  <Button size="sm" variant="destructive" className="h-7 text-xs">
                    Siaga
                  </Button>
                </div>
              </LiquidGlassCard>
            </div>

            {/* Apple Liquid Glass Date Showcase */}
            <LiquidGlassCard variant="default" className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-paper-200">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="official">Apple Design System</Badge>
                    <span className="text-xs font-semibold text-foreground">Liquid Glass Date & Period Capsules</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Komponen container tanggal optik VisionOS / iOS 18 dengan material liquid glass, specular reflection 1px, nested week capsule, dan live status beacon.
                  </p>
                </div>
                <code className="text-2xs font-mono text-brand-700 bg-brand-50 px-2 py-1 rounded-md border border-brand-200">
                  &lt;AppleGlassDate /&gt;
                </code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-mesh-blue border border-paper-200/80 space-y-3">
                  <span className="text-xs font-semibold text-paper-700 uppercase tracking-wider block">1. Default Pure Liquid Glass</span>
                  <div>
                    <AppleGlassDate
                      week="Minggu 34"
                      monthYear="Agustus 2026"
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground">Varian utama dengan latar gradien optik transparan, shadow ambient difusi, dan specular highlight rim.</p>
                </div>

                <div className="p-4 rounded-xl bg-mesh-blue border border-paper-200/80 space-y-3">
                  <span className="text-xs font-semibold text-paper-700 uppercase tracking-wider block">2. With Date Range (18 – 24 Ags 2026)</span>
                  <div>
                    <AppleGlassDate
                      week="Minggu 34"
                      monthYear="Agustus 2026"
                      dateRange="18 – 24 Ags 2026"
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground">Menampilkan rentang hari epidemiologi riil bersama nama bulan dan tahun.</p>
                </div>

                <div className="p-4 rounded-xl bg-mesh-blue border border-paper-200/80 space-y-3">
                  <span className="text-xs font-semibold text-paper-700 uppercase tracking-wider block">3. Brand Sky Tint & Compact Size</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AppleGlassDate
                      variant="brand"
                      week="Minggu 34"
                      monthYear="Agustus 2026"
                    />
                    <AppleGlassDate
                      size="sm"
                      week="W34"
                      monthYear="Ags 2026"
                      showCalendarIcon={false}
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground">Varian bernuansa brand teal dan ukuran compact untuk toolbar sempit.</p>
                </div>

                <div className="p-4 rounded-xl bg-mesh-blue border border-paper-200/80 space-y-3">
                  <span className="text-xs font-semibold text-paper-700 uppercase tracking-wider block">4. VisionOS Large Capsule (Header Prominent)</span>
                  <div>
                    <AppleGlassDate
                      size="lg"
                      week="Minggu 34"
                      monthYear="Agustus 2026"
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground">Ukuran large dengan padding 18px dan font lebih besar untuk highlight dashboard eksekutif.</p>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB 3: UI COMPONENTS */}
        {activeTab === "components" && (
          <div className="space-y-8 animate-fade-in">
            <LiquidGlassCard variant="default" className="p-6 space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Tombol & Varian Interaktif (Buttons)
              </h3>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="default">Primary Default</Button>
                <Button variant="blue">Royal Blue</Button>
                <Button variant="glass">Liquid Glass</Button>
                <Button variant="glass-blue">Glass Sky</Button>
                <Button variant="outline">Outline Glass</Button>
                <Button variant="secondary">Secondary Soft</Button>
                <Button variant="destructive">Destructive Siaga</Button>
                <Button
                  variant="default"
                  loading={buttonLoading}
                  onClick={() => {
                    setButtonLoading(true);
                    setTimeout(() => setButtonLoading(false), 2000);
                  }}
                >
                  {buttonLoading ? "Loading..." : "Test Loading State"}
                </Button>
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard variant="default" className="p-6 space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Lencana Status & Indikator (Badges & Pills)
              </h3>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="glass">Liquid Glass</Badge>
                <Badge variant="glass-blue">Glass Sky Blue</Badge>
                <Badge variant="risk-low" pulse>Risiko Rendah</Badge>
                <Badge variant="risk-medium" pulse>Risiko Sedang</Badge>
                <Badge variant="risk-high" pulse>Risiko Tinggi (Bahaya)</Badge>
                <Badge variant="disease-dbd">DBD · Dengue</Badge>
                <Badge variant="disease-ispa">ISPA · Pernapasan</Badge>
                <Badge variant="disease-diare">Diare · Pencernaan</Badge>
              </div>
            </LiquidGlassCard>

            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Kartu Metrik & KPI Data (Liquid Glass KPI Cards)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Kasus Aktif DBD"
                  value="178"
                  unit="kasus"
                  range={null}
                  coverage="high"
                  delta="+14.2%"
                  positive={false}
                  status="warning"
                  sparkline={[120, 135, 148, 160, 178]}
                  icon={<Bug className="h-4 w-4" />}
                />
                <KpiCard
                  label="Wilayah Siaga Tinggi"
                  value="3"
                  unit="kecamatan"
                  range={null}
                  coverage="medium"
                  delta="+1 kec"
                  positive={false}
                  status="danger"
                  sparkline={[1, 1, 2, 2, 3]}
                  icon={<ShieldAlert className="h-4 w-4 text-risk-high" />}
                />
                <KpiCard
                  label="Curah Hujan Rata-rata"
                  value="225"
                  unit="mm"
                  range={null}
                  coverage="high"
                  description="BMKG Stasiun Semarang"
                  status="normal"
                  variant="glass-blue"
                  sparkline={[110, 145, 180, 210, 225]}
                  icon={<CloudRain className="h-4 w-4 text-brand-600" />}
                />
                <KpiCard
                  label="Akurasi Model ML"
                  value="91.4"
                  unit="%"
                  range={null}
                  coverage="high"
                  delta="+1.2%"
                  positive={true}
                  status="success"
                  description="XGBoost Walk-Forward"
                  sparkline={[88, 89, 90, 91, 91.4]}
                  icon={<Activity className="h-4 w-4 text-risk-low" />}
                />
              </div>
            </div>

            <LiquidGlassCard variant="default" className="p-6 space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Pengukur Risiko Interaktif (Risk Gauges)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/70 border border-paper-200">
                  <RiskGauge score={24} level="rendah" size="md" />
                  <span className="text-xs text-muted-foreground mt-3">Zona Aman / Rendah</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/70 border border-paper-200">
                  <RiskGauge score={58} level="sedang" size="md" />
                  <span className="text-xs text-muted-foreground mt-3">Zona Waspada / Sedang</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/70 border border-paper-200">
                  <RiskGauge score={88} level="tinggi" size="md" />
                  <span className="text-xs text-muted-foreground mt-3">Zona Bahaya / KLB Tinggi</span>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* TAB: EARLY ACTION & DISPATCH SHOWCASE */}
        {activeTab === "early-action" && (
          <div className="space-y-8 animate-fade-in">
            {/* Live Interactive Early Action Center */}
            <div className="rounded-2xl border border-paper-300/90 bg-paper-0 p-6 shadow-card">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-paper-200">
                <div>
                  <Badge variant="official">Komponen Lengkap</Badge>
                  <h3 className="font-display text-xl font-semibold text-foreground mt-2">
                    Early Action Orchestration Center (Live Demo)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modul manajemen intervensi taktis dinas kesehatan lengkap dengan status beacon, toolbar filter, pencarian kecamatan, kartu cerdas, dan modal siaran resmi.
                  </p>
                </div>
                <code className="text-2xs font-mono text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                  &lt;EarlyActionCenter /&gt;
                </code>
              </div>

              <EarlyActionCenter initialRecommendations={ACTION_RECOMMENDATIONS} />
            </div>

            {/* Individual Card States Showcase */}
            <div className="space-y-4">
              <h4 className="font-display text-lg font-semibold text-foreground">
                Matriks Status & Variasi Kartu Rekomendasi
              </h4>
              <p className="text-xs text-muted-foreground">
                Representasi kartu intervensi dalam 3 fase status operasional utama (Menunggu Tindakan, Sedang Berjalan, dan Terkirim).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ACTION_RECOMMENDATIONS.slice(0, 3).map((rec, i) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onOpenDispatch={(r) => setDemoModalRec(r)}
                  />
                ))}
              </div>

              {/* Demo Modal Mount */}
              <DispatchActionModal
                recommendation={demoModalRec}
                open={Boolean(demoModalRec)}
                onOpenChange={(open) => {
                  if (!open) setDemoModalRec(null);
                }}
                onConfirmDispatch={(id) => {
                  setDemoModalRec(null);
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 4: CHARTS */}
        {activeTab === "charts" && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pilih Penyakit untuk Demo Visualisasi:
              </span>
              <DiseaseSelector
                selected={selectedDisease}
                onSelect={(d) => setSelectedDisease(d)}
              />
            </div>

            <LiquidGlassCard variant="default" className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Grafik Tren Prediksi 2-4 Minggu ke Depan vs Aktual
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Proyeksi model Machine Learning dengan lead-time 14-28 hari dan interval kepercayaan.
                  </p>
                </div>
                <Badge variant="glass-blue">Lead Time 2-4 Minggu</Badge>
              </div>

              <TrendChart
                data={TREND_DATA[selectedDisease]}
                disease={selectedDisease}
                showClimateOverlay={true}
              />
            </LiquidGlassCard>

            <LiquidGlassCard variant="default" className="p-6 space-y-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Visualisasi Korelasi Iklim & Kejadian Kasus Historis (12 Bulan)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menampilkan hubungan linier antara curah hujan BMKG, fluktuasi suhu rata-rata, dan kejadian kasus.
                </p>
              </div>

              <ClimateCorrelationChart
                data={CLIMATE_CORRELATION_DATA}
                disease={selectedDisease}
              />
            </LiquidGlassCard>

            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">
                Evaluasi Akurasi & Backtesting Model Machine Learning
              </h3>
              <BacktestCard metrics={BACKTEST_METRICS} disease={selectedDisease} />
            </div>
          </div>
        )}

        {/* TAB 5: PLAYGROUND */}
        {activeTab === "playground" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <LiquidGlassCard variant="default" className="p-6 space-y-6">
                <h4 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Interactive Knobs</span>
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Backdrop Blur:</span>
                    <span className="font-mono text-primary">{glassBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="40"
                    value={glassBlur}
                    onChange={(e) => setGlassBlur(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Surface Opacity:</span>
                    <span className="font-mono text-primary">{glassOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="95"
                    value={glassOpacity}
                    onChange={(e) => setGlassOpacity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Risk Score Slider:</span>
                    <span className="font-mono text-risk-high">{riskScoreKnob}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={riskScoreKnob}
                    onChange={(e) => setRiskScoreKnob(Number(e.target.value))}
                    className="w-full accent-risk-high"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-paper-200">
                  <span className="text-xs font-medium block">Jenis Penyakit:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["DBD", "ISPA", "Diare"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDisease(d)}
                        className={cn(
                          "rounded-xl py-2 text-xs font-medium transition-all",
                          selectedDisease === d
                            ? "bg-primary text-white shadow-sm"
                            : "bg-white border text-paper-700 hover:bg-paper-100"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </LiquidGlassCard>

              <div className="lg:col-span-2 space-y-6">
                <div
                  style={{
                    WebkitBackdropFilter: `blur(${glassBlur}px) saturate(180%)`,
                    background: `rgba(255, 255, 255, ${glassOpacity / 100})`,
                  }}
                  className="rounded-3xl p-6 border border-white/90 shadow-elevated transition-all duration-300"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-paper-200/60">
                    <div className="flex items-center gap-2">
                      <Badge variant={`disease-${selectedDisease.toLowerCase()}` as any}>
                        {selectedDisease}
                      </Badge>
                      <Badge
                        variant={riskScoreKnob >= 70 ? "risk-high" : riskScoreKnob >= 40 ? "risk-medium" : "risk-low"}
                        pulse={riskScoreKnob >= 70}
                      >
                        {riskScoreKnob >= 70 ? "Zona Bahaya" : riskScoreKnob >= 40 ? "Zona Waspada" : "Zona Rendah"}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Live Rendered Sandbox</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                    <div className="space-y-3">
                      <h4 className="font-display text-lg font-semibold text-foreground">
                        Kecamatan Pedurungan (Kota Semarang)
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Evaluasi dinamis model estimasi berbasis curah hujan 240mm dan lag features 2 minggu sebelumnya.
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" variant="blue">
                          Instruksikan Tim
                        </Button>
                        <Button size="sm" variant="outline">
                          Export Laporan
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <RiskGauge score={riskScoreKnob} size="md" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
