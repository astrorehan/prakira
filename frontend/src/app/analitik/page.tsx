"use client";

import * as React from "react";
import { useState } from "react";
import {
  BarChart3,
  Activity,
  FileText,
  Download,
  Calendar,
  Sparkles,
  CheckCircle2,
  Info,
  Cpu,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiseaseSelector } from "@/components/disease-selector";
import { ClimateCorrelationChart } from "@/components/climate-correlation-chart";
import { BacktestCard } from "@/components/backtest-card";
import { CLIMATE_CORRELATION_DATA, BACKTEST_METRICS } from "@/lib/mock-data";
import type { DiseaseType } from "@/types";

export default function AnalitikPage() {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>("DBD");
  const [exportModal, setExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportModal(false);
      alert("Laporan Analitik Prakira format " + format + " berhasil di-generate dan diunduh!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-paper-200/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1 text-xs font-medium text-brand-800 shadow-sm mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Modul Analitik & Riwayat Epidemiologi</span>
            </div>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Analisis Korelasi Iklim & Evaluasi Backtesting Model
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Transparansi model Machine Learning (XGBoost, Random Forest, LSTM) dalam menangkap pola musiman dan lag features cuaca BMKG.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="blue" onClick={() => setExportModal(true)}>
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor Laporan Resmi</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pilih Penyakit untuk Analisis Korelasi:
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
                Visualisasi Korelasi Curah Hujan & Suhu vs Kasus ({selectedDisease})
              </h3>
              <p className="text-xs text-muted-foreground">
                Data historis 12 bulan terakhir memetakan pengaruh anomali iklim terhadap peningkatan kasus.
              </p>
            </div>
            <Badge variant="glass-blue">P-value &lt; 0.001 (Signifikan)</Badge>
          </div>

          <ClimateCorrelationChart
            data={CLIMATE_CORRELATION_DATA}
            disease={selectedDisease}
          />
        </LiquidGlassCard>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                <span>Perbandingan Akurasi Prediksi vs Aktual (Backtesting Matrix)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Pengujian model menggunakan data time-series historis 3 tahun terakhir di Kota Semarang.
              </p>
            </div>
            <Badge variant="outline">156 Minggu Evaluasi</Badge>
          </div>

          <BacktestCard metrics={BACKTEST_METRICS} />
        </div>

        <LiquidGlassCard variant="default" className="p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Tabel Rekapitulasi Data Cuaca vs Kejadian Penyakit (12 Bulan)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white/90">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-50 border-b border-paper-200 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Periode</th>
                  <th className="py-2.5 px-3">Curah Hujan (mm)</th>
                  <th className="py-2.5 px-3">Suhu Rata-rata (°C)</th>
                  <th className="py-2.5 px-3">Kelembaban (%)</th>
                  <th className="py-2.5 px-3">Kasus DBD</th>
                  <th className="py-2.5 px-3">Kasus ISPA</th>
                  <th className="py-2.5 px-4">Kasus Diare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-100">
                {CLIMATE_CORRELATION_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-50/50">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{row.periode}</td>
                    <td className="py-2.5 px-3 font-semibold text-brand-700">{row.curah_hujan_mm} mm</td>
                    <td className="py-2.5 px-3 text-risk-medium">{row.suhu_c}°C</td>
                    <td className="py-2.5 px-3 text-brand-700">{row.kelembaban_pct}%</td>
                    <td className="py-2.5 px-3 font-semibold text-brand-800">{row.kasus_dbd}</td>
                    <td className="py-2.5 px-3 font-semibold text-brand-800">{row.kasus_ispa}</td>
                    <td className="py-2.5 px-4 font-semibold text-brand-800">{row.kasus_diare}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LiquidGlassCard>
      </div>

      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl liquid-glass p-6 shadow-elevated border border-white space-y-4">
            <div className="flex items-center justify-between border-b border-paper-200 pb-3">
              <h4 className="font-display font-semibold text-base text-foreground">
                Ekspor Laporan Epidemiologi Periodik
              </h4>
              <button onClick={() => setExportModal(false)} className="text-paper-400 hover:text-paper-600 text-xs">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pilih format ekspor laporan berkala untuk keperluan rapat koordinasi dinas kesehatan dan puskesmas wilayah.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="blue"
                loading={exporting}
                onClick={() => handleExport("PDF Resmi")}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <FileText className="h-5 w-5" />
                <span>Unduh PDF</span>
              </Button>
              <Button
                variant="outline"
                loading={exporting}
                onClick={() => handleExport("Excel Spreadsheet")}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <Table className="h-5 w-5 text-risk-low" />
                <span>Unduh Excel</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}