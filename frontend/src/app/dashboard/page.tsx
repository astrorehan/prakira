"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  Bug,
  ShieldAlert,
  Download,
  MapPin,
  TrendingUp,
  FileText,
  Table,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { aggregateCoverage, formatNumber } from "@/lib/utils";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { AppleGlassDate } from "@/components/ui/apple-glass-date";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { DiseaseSelector } from "@/components/disease-selector";
import { DistrictDetailPanel } from "@/components/district-detail-panel";
import { DistrictRankingTable } from "@/components/district-ranking-table";
import {
  getKecamatanDataList,
  getSemarangGeoJSON,
  TREND_DATA,
  ACTION_RECOMMENDATIONS,
} from "@/lib/mock-data";
import type { DiseaseType } from "@/types";

const ChoroplethMap = dynamic(() => import("@/components/choropleth-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full rounded-2xl border border-paper-200 bg-paper-100 flex flex-col items-center justify-center text-muted-foreground text-xs animate-pulse gap-2">
      <Activity className="h-6 w-6 text-primary animate-spin" />
      <span>Memuat Peta Spasial Kota Semarang…</span>
    </div>
  ),
});

export default function DashboardPrediksiPage() {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>("DBD");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const districts = useMemo(() => {
    return getKecamatanDataList(selectedDisease);
  }, [selectedDisease]);

  const geojson = useMemo(() => {
    return getSemarangGeoJSON();
  }, []);

  const selectedDistrict = useMemo(() => {
    /* Before the officer picks a district, open on whichever one the current
       disease ranks worst — an operations dashboard should start on what needs
       attention, and it should re-point when the disease filter changes. A
       fixed district id would freeze one kecamatan into every session. */
    return (
      districts.find((d) => d.id === selectedDistrictId) ??
      [...districts].sort((a, b) => b.skor_risiko - a.skor_risiko)[0]
    );
  }, [districts, selectedDistrictId]);

  const totals = useMemo(() => {
    const active = districts.reduce((s, d) => s + d.kasus_aktif, 0);
    const pred = districts.reduce((s, d) => s + d.kasus_prediksi, 0);
    const lower = districts.reduce((s, d) => s + d.kasus_prediksi_lower, 0);
    const upper = districts.reduce((s, d) => s + d.kasus_prediksi_upper, 0);
    const high = districts.filter((d) => d.tingkat_risiko === "tinggi").length;
    const medium = districts.filter((d) => d.tingkat_risiko === "sedang").length;
    const low = districts.filter((d) => d.tingkat_risiko === "rendah").length;

    /* Real 3-week history, summed across districts. The sparkline and the
       week-over-week delta read the same series — never a synthetic ratio. */
    const history = [0, 1, 2].map((week) =>
      districts.reduce((s, d) => s + d.historical_cases_3w[week], 0),
    );
    const lastWeek = history[1];

    return {
      active,
      pred,
      lower,
      upper,
      high,
      medium,
      low,
      history,
      /* City-wide figures inherit the weakest district's coverage — a total is
         only as trustworthy as its thinnest input (PRD §7-H2). */
      coverage: aggregateCoverage(districts.map((d) => d.coverage)),
      /* Observed: this week vs last week. */
      deltaWeekly: lastWeek === 0 ? 0 : Math.round(((active - lastWeek) / lastWeek) * 100),
      /* Projected: forecast vs today. */
      deltaForecast: active === 0 ? 0 : Math.round(((pred - active) / active) * 100),
    };
  }, [districts]);

  const pendingActions = useMemo(() => {
    return ACTION_RECOMMENDATIONS.filter((r) => r.status === "pending").length;
  }, []);

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportModal(false);
      setToast(`Laporan ${selectedDisease} (${format}) berhasil diunduh.`);
      setTimeout(() => setToast(null), 4000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        {/* 1. Header — title, disease filter, period, export */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pb-4 border-b border-paper-200/80">
          <div className="space-y-3">
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Prediksi Risiko Penyakit
            </h1>
            <DiseaseSelector
              selected={selectedDisease}
              onSelect={(d) => setSelectedDisease(d)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <AppleGlassDate week="Minggu 34" monthYear="Agustus 2026" />
            <Button
              size="sm"
              variant="blue"
              onClick={() => setExportModal(true)}
              className="text-white font-semibold shadow-xs"
            >
              <Download className="h-4 w-4 text-white mr-1.5" />
              <span className="text-white">Ekspor Laporan</span>
            </Button>
          </div>
        </div>

        {/* 2. KPI summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Observed count — no prediction interval to show. */}
          <KpiCard
            label={`Kasus Aktif ${selectedDisease}`}
            value={formatNumber(totals.active)}
            unit="kasus"
            range={null}
            coverage={totals.coverage}
            delta={`${totals.deltaWeekly >= 0 ? "+" : ""}${totals.deltaWeekly}% vs minggu lalu`}
            positive={totals.deltaWeekly <= 0}
            sparkline={totals.history}
            icon={<Bug className="h-4 w-4" />}
            index={0}
          />

          {/* Forecast — the interval rides with the number, never beside it. */}
          <KpiCard
            label="Proyeksi 2–4 Minggu"
            value={formatNumber(totals.pred)}
            unit="kasus"
            range={{ lower: totals.lower, upper: totals.upper }}
            coverage={totals.coverage}
            delta={`+${totals.deltaForecast}%`}
            positive={false}
            icon={<TrendingUp className="h-4 w-4 text-risk-high" />}
            index={1}
          />

          {/* Classified districts — a tally of things already decided. */}
          <KpiCard
            label="Kecamatan Zona Siaga"
            value={totals.high}
            unit={`dari ${districts.length}`}
            range={null}
            coverage={totals.coverage}
            description={`Waspada ${totals.medium} · Rendah ${totals.low}`}
            icon={<ShieldAlert className="h-4 w-4 text-risk-high" />}
            index={2}
          />
        </div>

        {/* 3. Spatial map & district detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col h-full">
            <LiquidGlassCard variant="default" className="p-5 flex flex-col justify-between h-full space-y-3 min-h-[580px]">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 shrink-0">
                <MapPin className="h-4 w-4 text-brand-700" />
                <span>Peta Zona Risiko</span>
              </h3>

              <div className="flex-1 min-h-[440px] relative w-full">
                <ChoroplethMap
                  geojson={geojson}
                  districts={districts}
                  disease={selectedDisease}
                  selectedId={selectedDistrictId}
                  onSelect={(id) => setSelectedDistrictId(id)}
                  height="100%"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-muted-foreground pt-2 border-t border-paper-200/60 shrink-0">
                <span>Klik kecamatan untuk detail</span>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-low" />
                    <span className="text-paper-700 font-medium">Rendah</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-medium" />
                    <span className="text-paper-700 font-medium">Waspada</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-high" />
                    <span className="text-paper-700 font-medium">Siaga</span>
                  </span>
                </div>
              </div>
            </LiquidGlassCard>
          </div>

          <div className="lg:col-span-5 flex flex-col h-full">
            <DistrictDetailPanel
              district={selectedDistrict}
              disease={selectedDisease}
              trend={TREND_DATA[selectedDisease]}
              className="h-full min-h-[580px]"
            />
          </div>
        </div>

        {/* 4. Pending early-action strip — the workflow itself lives on /tindakan */}
        {pendingActions > 0 && (
          <Link
            href="/tindakan"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-risk-high-br/70 bg-risk-high-bg/60 px-5 py-3.5 shadow-xs transition-colors hover:bg-risk-high-bg"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-risk-high shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                {pendingActions} tindakan menunggu instruksi
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-risk-high shrink-0">
              <span>Buka Aksi Dini</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}

        {/* 5. District ranking */}
        <div className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">
            Peringkat Prioritas Kecamatan
          </h3>

          <DistrictRankingTable
            districts={districts}
            selectedId={selectedDistrictId}
            onSelectDistrict={(id) => setSelectedDistrictId(id)}
          />
        </div>
      </div>

      {/* Export modal */}
      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl liquid-glass p-6 shadow-elevated border border-white space-y-4">
            <div className="flex items-center justify-between border-b border-paper-200 pb-3">
              <h4 className="font-display font-semibold text-base text-foreground">
                Ekspor Laporan {selectedDisease}
              </h4>
              <button
                onClick={() => setExportModal(false)}
                className="text-paper-600 hover:text-paper-600 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rekapitulasi {districts.length} kecamatan, Minggu 34 Agustus 2026.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="blue"
                loading={exporting}
                onClick={() => handleExport("PDF")}
                className="flex flex-col h-auto py-4 gap-1.5 text-white font-semibold rounded-2xl shadow-xs"
              >
                <FileText className="h-5 w-5 text-white" />
                <span className="text-white">PDF</span>
              </Button>
              <Button
                variant="outline"
                loading={exporting}
                onClick={() => handleExport("Excel")}
                className="flex flex-col h-auto py-4 gap-1.5 font-semibold rounded-2xl shadow-xs"
              >
                <Table className="h-5 w-5 text-brand-700" />
                <span>Excel</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-paper-900 text-white p-4 shadow-pop border border-paper-700 animate-fade-in max-w-md">
          <CheckCircle2 className="h-5 w-5 text-risk-low shrink-0" />
          <p className="text-xs font-medium leading-snug">{toast}</p>
          <button
            onClick={() => setToast(null)}
            className="text-paper-600 hover:text-white text-xs ml-auto shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
