"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  Bug,
  Wind,
  Droplets,
  CloudRain,
  ShieldAlert,
  AlertTriangle,
  Download,
  Calendar,
  Sparkles,
  MapPin,
  TrendingUp,
  FileText,
  Table,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { cn, formatNumber, formatIncidence } from "@/lib/utils";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { AppleGlassDate } from "@/components/ui/apple-glass-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { DiseaseSelector } from "@/components/disease-selector";
import { DistrictDetailPanel } from "@/components/district-detail-panel";
import { DistrictRankingTable } from "@/components/district-ranking-table";
import { RecommendationCard } from "@/components/recommendation-card";
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
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>("KEC_SMG_03"); // Default Pedurungan
  const [exportModal, setExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const districts = useMemo(() => {
    return getKecamatanDataList(selectedDisease);
  }, [selectedDisease]);

  const geojson = useMemo(() => {
    return getSemarangGeoJSON();
  }, []);

  const selectedDistrict = useMemo(() => {
    return districts.find((d) => d.id === selectedDistrictId) || districts[0];
  }, [districts, selectedDistrictId]);

  const totals = useMemo(() => {
    const active = districts.reduce((s, d) => s + d.kasus_aktif, 0);
    const pred = districts.reduce((s, d) => s + d.kasus_prediksi, 0);
    const lower = districts.reduce((s, d) => s + d.kasus_prediksi_lower, 0);
    const upper = districts.reduce((s, d) => s + d.kasus_prediksi_upper, 0);
    const highRisk = districts.filter((d) => d.tingkat_risiko === "tinggi").length;
    const avgRain = Math.round(
      districts.reduce((s, d) => s + d.cuaca.curah_hujan_mm, 0) / districts.length,
    );
    const delta = active === 0 ? 0 : Math.round(((pred - active) / active) * 100);

    return {
      active,
      pred,
      lower,
      upper,
      highRisk,
      avgRain,
      delta,
    };
  }, [districts]);

  const filteredRecommendations = useMemo(() => {
    return ACTION_RECOMMENDATIONS.filter((r) => r.disease === selectedDisease);
  }, [selectedDisease]);

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportModal(false);
      alert(`Laporan Prediksi Epidemiologi (${selectedDisease}) format ${format} berhasil diunduh!`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        {/* 1. Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-paper-200/80">
          <div>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Dashboard Prediksi Risiko Epidemiologi Iklim
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Peringatan dini lonjakan kasus DBD, ISPA, dan Diare berbasis cuaca BMKG dan model AI per kecamatan Kota Semarang (2–4 minggu ke depan).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AppleGlassDate
              week="Minggu 34"
              monthYear="Agustus 2026"
            />
          </div>
        </div>

        {/* 2. Disease Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Pilih Penyakit untuk Prediksi:
            </span>
            <DiseaseSelector
              selected={selectedDisease}
              onSelect={(d) => setSelectedDisease(d)}
            />
          </div>
        </div>

        {/* 3. Primary KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={`Kasus Aktif Saat Ini (${selectedDisease})`}
            value={formatNumber(totals.active)}
            unit="kasus"
            delta={totals.delta >= 0 ? `+${totals.delta}%` : `${totals.delta}%`}
            positive={totals.delta <= 0}
            status="warning"
            sparkline={[
              Math.round(totals.active * 0.72),
              Math.round(totals.active * 0.86),
              totals.active,
            ]}
            icon={<Bug className="h-4 w-4" />}
            index={0}
          />

          <KpiCard
            label="Proyeksi 2–4 Minggu ke Depan"
            value={formatNumber(totals.pred)}
            unit="kasus"
            delta={`+${totals.delta}% potensi lonjakan`}
            positive={false}
            status="danger"
            description={`Rentang: ${totals.lower} – ${totals.upper} kasus`}
            icon={<TrendingUp className="h-4 w-4 text-risk-high" />}
            index={1}
          />

          <KpiCard
            label="Kecamatan Zona Siaga (Tinggi)"
            value={`${totals.highRisk} dari 16`}
            unit="wilayah"
            status={totals.highRisk > 0 ? "danger" : "success"}
            description="Perlu intervensi terarah segera"
            icon={<ShieldAlert className="h-4 w-4 text-risk-high" />}
            index={2}
          />

          <KpiCard
            label="Curah Hujan Rata-rata BMKG"
            value={totals.avgRain}
            unit="mm"
            description="Pancaroba Hangat · Kelembaban Tinggi"
            status="normal"
            sparkline={[140, 180, 205, totals.avgRain]}
            icon={<CloudRain className="h-4 w-4 text-brand-600" />}
            index={3}
          />
        </div>

        {/* 4. Spatial Map & District Detail Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col h-full">
            <LiquidGlassCard variant="default" className="p-5 flex flex-col justify-between h-full space-y-3 min-h-[580px]">
              <div className="shrink-0">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-700" />
                  <span>Peta Zona Risiko Spasial</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arahkan kursor atau klik poligon wilayah untuk memuat metrik insiden dan proyeksi tren waktu.
                </p>
              </div>

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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground pt-2 border-t border-paper-200/60 shrink-0">
                <span>Klik kecamatan untuk melihat analisis terperinci pada panel kanan</span>
                
                {/* Bar Petunjuk Tingkat Risiko di Paling Bawah */}
                <div className="flex items-center gap-3">
                  <span className="font-medium text-paper-500">Tingkat Risiko:</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-low" />
                    <span className="text-paper-700 font-medium text-[11px]">Rendah</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-medium" />
                    <span className="text-paper-700 font-medium text-[11px]">Waspada</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-risk-high" />
                    <span className="text-paper-700 font-medium text-[11px]">Siaga</span>
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

        {/* 5. Automated AI Early Action Recommendations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>Rekomendasi Tindakan Otomatis Berbasis Skor Risiko AI</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Instruksi taktis terarah untuk dinas kesehatan dan puskesmas setempat sebelum terjadi lonjakan kasus (intervensi preventif).
              </p>
            </div>
            <Badge variant="outline">Early Action Support</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRecommendations.slice(0, 3).map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onExecute={(id) =>
                  alert(`Instruksi tindakan #${id} berhasil dikirimkan ke puskesmas wilayah terkait!`)
                }
              />
            ))}
          </div>
        </div>

        {/* 6. District Ranking & Priority Table */}
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Ranking Prioritas Intervensi Kecamatan
            </h3>
            <p className="text-xs text-muted-foreground">
              Daftar kecamatan yang diurutkan berdasarkan tingkat keparahan risiko AI dan laju insiden per 100.000 penduduk.
            </p>
          </div>

          <DistrictRankingTable
            districts={districts}
            selectedId={selectedDistrictId}
            onSelectDistrict={(id) => setSelectedDistrictId(id)}
          />
        </div>

        {/* 7. Bottom Export Report Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-paper-200/90 bg-white/90 p-5 shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Ekspor Laporan Prediksi Resmi ({selectedDisease})
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unduh rekapitulasi data epidemiologi dan proyeksi risiko 16 kecamatan dalam format PDF atau Excel.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="blue"
            onClick={() => setExportModal(true)}
            className="text-white font-semibold shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Download className="h-4 w-4 text-white mr-1.5" />
            <span className="text-white">Ekspor Laporan</span>
          </Button>
        </div>
      </div>

      {/* Export Report Modal */}
      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl liquid-glass p-6 shadow-elevated border border-white space-y-4">
            <div className="flex items-center justify-between border-b border-paper-200 pb-3">
              <h4 className="font-display font-semibold text-base text-foreground">
                Ekspor Laporan Prediksi Epidemiologi
              </h4>
              <button
                onClick={() => setExportModal(false)}
                className="text-paper-400 hover:text-paper-600 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pilih format ekspor laporan berkala prediksi risiko penyakit ({selectedDisease}) Kota Semarang untuk koordinasi operasional.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="blue"
                loading={exporting}
                onClick={() => handleExport("PDF Resmi")}
                className="flex flex-col h-auto py-4 gap-1.5 text-white font-semibold rounded-2xl shadow-xs"
              >
                <FileText className="h-5 w-5 text-white" />
                <span className="text-white">Unduh PDF</span>
              </Button>
              <Button
                variant="outline"
                loading={exporting}
                onClick={() => handleExport("Excel Spreadsheet")}
                className="flex flex-col h-auto py-4 gap-1.5 font-semibold rounded-2xl shadow-xs"
              >
                <Table className="h-5 w-5 text-brand-700" />
                <span>Unduh Excel</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
