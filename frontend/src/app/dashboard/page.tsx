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
} from "lucide-react";
import { cn, RISK_CONFIG, DISEASE_CONFIG, formatIncidence } from "@/lib/utils";
import { LiquidGlassCard, LiquidGlassHeader, LiquidGlassTitle, LiquidGlassContent } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { DiseaseSelector } from "@/components/disease-selector";
import { TrendChart } from "@/components/trend-chart";
import { RecommendationCard } from "@/components/recommendation-card";
import { DistrictRankingTable } from "@/components/district-ranking-table";
import { RiskGauge } from "@/components/ui/risk-gauge";
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
    <div className="h-[520px] w-full rounded-2xl border border-paper-200 bg-paper-100 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
      Memuat Peta Spasial Kota Semarang...
    </div>
  ),
});

export default function DashboardPrediksiPage() {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>("DBD");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>("KEC_SMG_03");

  const districts = useMemo(() => {
    return getKecamatanDataList(selectedDisease);
  }, [selectedDisease]);

  const geojson = useMemo(() => {
    return getSemarangGeoJSON();
  }, []);

  const selectedDistrict = useMemo(() => {
    return districts.find((d) => d.id === selectedDistrictId) || districts[0];
  }, [districts, selectedDistrictId]);

  const totalActiveCases = districts.reduce((sum, d) => sum + d.kasus_aktif, 0);
  const totalPredCases = districts.reduce((sum, d) => sum + d.kasus_prediksi, 0);
  const highRiskCount = districts.filter((d) => d.tingkat_risiko === "tinggi").length;

  const filteredRecommendations = ACTION_RECOMMENDATIONS.filter(
    (r) => r.disease === selectedDisease || r.priority === "high"
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-paper-200/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-3.5 py-1 text-xs font-medium text-brand-800 shadow-sm mb-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Dinas Kesehatan & Puskesmas Kota Semarang</span>
            </div>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Dashboard Prediksi Risiko Penyakit Berbasis Iklim
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Sistem peringatan dini (Early Warning Platform) dengan proyeksi 2-4 minggu ke depan untuk mengoptimalkan alokasi logistik, fogging fokus, dan respons preventif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-paper-200 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Minggu 34 (Agustus 2026)</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => alert("Laporan mingguan sedang diunduh dalam format PDF!")}>
              <Download className="h-3.5 w-3.5" />
              <span>Export Laporan</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pilih Jenis Penyakit Epidemiologi:
          </span>
          <DiseaseSelector
            selected={selectedDisease}
            onSelect={(d) => setSelectedDisease(d)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label={"Total Kasus Aktif (" + selectedDisease + ")"}
            value={totalActiveCases}
            unit="kasus"
            delta="+18.4%"
            positive={false}
            status="warning"
            sparkline={[Math.round(totalActiveCases * 0.7), Math.round(totalActiveCases * 0.85), totalActiveCases]}
            icon={<Bug className="h-4 w-4" />}
          />
          <KpiCard
            label="Proyeksi 2-4 Minggu ke Depan"
            value={totalPredCases}
            unit="kasus"
            delta={"+" + Math.round(((totalPredCases - totalActiveCases) / totalActiveCases) * 100) + "%"}
            positive={false}
            status="danger"
            variant="risk-high"
            description="Estimasi model XGBoost & BMKG"
            icon={<TrendingUp className="h-4 w-4 text-risk-high" />}
          />
          <KpiCard
            label="Kecamatan Zona Siaga (Tinggi)"
            value={highRiskCount + " dari 16"}
            unit="kec"
            status="danger"
            variant="glass-blue"
            description="Perlu intervensi terarah segera"
            icon={<ShieldAlert className="h-4 w-4 text-risk-high" />}
          />
          <KpiCard
            label="Curah Hujan Rata-rata BMKG"
            value="225"
            unit="mm"
            description="Kondisi Pancaroba Hangat"
            status="normal"
            sparkline={[140, 180, 210, 225]}
            icon={<CloudRain className="h-4 w-4 text-brand-600" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <LiquidGlassCard variant="default" className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Peta Zona Risiko per Kecamatan (Kota Semarang)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Arahkan kursor atau klik wilayah polygon untuk melihat metrik insiden dan rekomendasi tindakan.
                  </p>
                </div>
                <Badge variant="glass-blue">16 Kecamatan Terpetakan</Badge>
              </div>

              <ChoroplethMap
                geojson={geojson}
                districts={districts}
                disease={selectedDisease}
                selectedId={selectedDistrictId}
                onSelect={(id) => setSelectedDistrictId(id)}
                height="500px"
              />
            </LiquidGlassCard>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {selectedDistrict && (
              <LiquidGlassCard
                variant={
                  selectedDistrict.tingkat_risiko === "tinggi"
                    ? "risk-high"
                    : selectedDistrict.tingkat_risiko === "sedang"
                    ? "risk-medium"
                    : "blue"
                }
                className="p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">
                      Detail Wilayah Terpilih
                    </span>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      Kecamatan {selectedDistrict.nama}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      BPS: {selectedDistrict.kode_bps} · {(selectedDistrict.populasi / 1000).toFixed(0)}k Jiwa · {selectedDistrict.luas_km2} km²
                    </span>
                  </div>
                  <RiskGauge
                    score={selectedDistrict.skor_risiko}
                    level={selectedDistrict.tingkat_risiko}
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-paper-200/60 text-xs">
                  <div className="rounded-xl bg-white/80 p-2.5 border border-white">
                    <span className="text-muted-foreground block text-[10px]">Kasus Aktif Saat Ini</span>
                    <span className="font-semibold text-foreground text-sm">{selectedDistrict.kasus_aktif} kasus</span>
                    <span className="text-[10px] text-muted-foreground block">{formatIncidence(selectedDistrict.incidence_rate)}</span>
                  </div>
                  <div className="rounded-xl bg-white/80 p-2.5 border border-white">
                    <span className="text-muted-foreground block text-[10px]">Prediksi 2-4 Mgg Depan</span>
                    <span className="font-semibold text-risk-high text-sm">{selectedDistrict.kasus_prediksi} kasus</span>
                    <span className="text-[10px] text-risk-high font-semibold block">+{selectedDistrict.delta_mingguan}% lonjakan</span>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-white/80 p-3 border border-white text-xs space-y-1.5">
                  <span className="font-medium text-paper-800 block text-[11px] uppercase tracking-wider">
                    Rekomendasi Tindakan Otomatis:
                  </span>
                  {selectedDistrict.rekomendasi.map((rek, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-paper-700">
                      <span className="text-primary font-semibold">•</span>
                      <span>{rek}</span>
                    </div>
                  ))}
                </div>
              </LiquidGlassCard>
            )}

            <LiquidGlassCard variant="default" className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-semibold text-foreground">
                  Tren Proyeksi 2-4 Minggu ({selectedDisease})
                </h4>
                <Badge variant="secondary" size="sm">Kota Semarang</Badge>
              </div>
              <TrendChart
                data={TREND_DATA[selectedDisease]}
                disease={selectedDisease}
                showClimateOverlay={false}
              />
            </LiquidGlassCard>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Rekomendasi Tindakan Otomatis Berbasis Skor Risiko AI
              </h3>
              <p className="text-xs text-muted-foreground">
                Instruksi taktis untuk dinas kesehatan dan puskesmas setempat sebelum terjadi lonjakan kasus (preventif).
              </p>
            </div>
            <Badge variant="outline">Early Action Support</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRecommendations.slice(0, 3).map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onExecute={(id) => alert("Instruksi tindakan #" + id + " berhasil dikirimkan ke puskesmas wilayah terkait!")}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              Ranking Prioritas Intervensi Kecamatan
            </h3>
            <p className="text-xs text-muted-foreground">
              Daftar kecamatan yang diurutkan berdasarkan tingkat keparahan risiko dan laju insiden per 100.000 penduduk.
            </p>
          </div>
          <DistrictRankingTable
            districts={districts}
            onSelectDistrict={(id) => setSelectedDistrictId(id)}
          />
        </div>
      </div>
    </div>
  );
}