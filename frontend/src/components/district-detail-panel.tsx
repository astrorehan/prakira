"use client";

import * as React from "react";
import {
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  LineChart,
  Sparkles,
} from "lucide-react";
import { cn, RISK_CONFIG, formatIncidence, formatNumber } from "@/lib/utils";
import type { DiseaseType, KecamatanData, TrendPoint, ActionRecommendation } from "@/types";
import { RiskGauge } from "./ui/risk-gauge";
import { TrendChart } from "./trend-chart";

interface DistrictDetailPanelProps {
  district: KecamatanData | undefined;
  disease: DiseaseType;
  trend: TrendPoint[];
  recommendations?: ActionRecommendation[];
  onExecute?: (id: string) => void;
  className?: string;
}

export function DistrictDetailPanel({
  district,
  disease,
  trend,
  className,
}: DistrictDetailPanelProps) {
  if (!district) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center rounded-2xl backdrop-blur-2xl bg-white/70 border border-white/80 shadow-[0_16px_36px_-10px_rgba(14,34,37,0.1),inset_0_1px_1px_0_rgba(255,255,255,0.95)] min-h-[560px] h-full",
          className,
        )}
      >
        <Activity className="h-8 w-8 text-muted-foreground animate-pulse mb-3" />
        <p className="text-sm font-medium text-foreground">Pilih Wilayah pada Peta</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Klik salah satu kecamatan pada peta Kota Semarang untuk membuka analisis risiko dan proyeksi tren waktu.
        </p>
      </div>
    );
  }

  const glassStyleByRisk = {
    tinggi:
      "bg-gradient-to-br from-risk-high-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(168,68,44,0.16),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(243,194,180,0.45)]",
    sedang:
      "bg-gradient-to-br from-risk-medium-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(212,147,58,0.16),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(246,219,169,0.45)]",
    rendah:
      "bg-gradient-to-br from-risk-low-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(31,81,50,0.12),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(197,222,194,0.45)]",
  }[district.tingkat_risiko];

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between gap-3.5 p-5 rounded-2xl backdrop-blur-2xl transition-all duration-300 animate-fade-in min-h-[560px] h-full overflow-hidden",
        glassStyleByRisk,
        className,
      )}
    >
      {/* 1. Header: District Info + Risk Gauge (Vertically Centered) */}
      <div className="flex items-center justify-between gap-3 border-b border-white/70 pb-3 shrink-0">
        <div>
          <span className="text-[10px] font-semibold text-paper-500 uppercase tracking-wider block">
            Detail Wilayah
          </span>
          <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground">
            Kecamatan {district.nama}
          </h3>
        </div>

        <RiskGauge
          score={district.skor_risiko}
          level={district.tingkat_risiko}
          size="md"
          className="shrink-0 drop-shadow-2xs"
        />
      </div>

      {/* 2. Key Metrics Comparison Grid */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="rounded-xl bg-white/75 backdrop-blur-md p-3 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            Kasus Aktif
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold text-foreground">
              {formatNumber(district.kasus_aktif)}
            </span>
            <span className="text-xs text-muted-foreground">kasus</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-paper-100/80">
            <span>Insiden:</span>
            <span className="font-semibold text-foreground">
              {formatIncidence(district.incidence_rate)}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-white/75 backdrop-blur-md p-3 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            Proyeksi 2–4 Minggu
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold text-risk-high">
              {formatNumber(district.kasus_prediksi)}
            </span>
            <span className="text-xs font-semibold text-risk-high">kasus</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-risk-high pt-1 border-t border-paper-100/80 font-medium">
            <span>Potensi Lonjakan:</span>
            <span className="font-semibold">
              {district.delta_mingguan >= 0 ? "+" : ""}
              {district.delta_mingguan}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Climate & Environmental Factors */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/65 backdrop-blur-md p-2 border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5 text-brand-600 shrink-0" />
          <div className="leading-none">
            <span className="text-[9px] text-muted-foreground block uppercase">Hujan</span>
            <span className="font-semibold text-foreground">{district.cuaca.curah_hujan_mm} mm</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-risk-medium shrink-0" />
          <div className="leading-none">
            <span className="text-[9px] text-muted-foreground block uppercase">Suhu</span>
            <span className="font-semibold text-foreground">{district.cuaca.suhu_c} °C</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-paper-600 shrink-0" />
          <div className="leading-none truncate">
            <span className="text-[9px] text-muted-foreground block uppercase">Cuaca</span>
            <span className="font-semibold text-foreground truncate">{district.cuaca.status_cuaca}</span>
          </div>
        </div>
      </div>

      {/* 4. Primary Content: Proyeksi Tren Waktu (Fills remaining height firmly) */}
      <div className="rounded-xl bg-white/80 backdrop-blur-md p-3.5 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] flex-1 min-h-[220px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <LineChart className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Proyeksi Tren Kasus ({disease})
            </span>
          </div>
          <span className="text-[10px] text-brand-800 bg-brand-50 px-2 py-0.5 rounded-full font-medium border border-brand-200/60 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Keyakinan model {Math.round(district.confidence * 100)}%</span>
          </span>
        </div>

        <div className="w-full relative">
          <TrendChart
            data={trend}
            disease={disease}
            showClimateOverlay={false}
            chartHeightClass="h-[180px] w-full"
            compact={true}
          />
        </div>
      </div>
    </div>
  );
}
