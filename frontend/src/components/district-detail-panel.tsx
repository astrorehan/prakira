"use client";

import * as React from "react";
import {
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  LineChart,
  Info,
  Bug,
  Droplets,
  Trash2,
  Waves,
  AlertTriangle,
} from "lucide-react";
import {
  cn,
  COVERAGE_CONFIG,
  formatMaybeIncidence,
  formatMaybeNumber,
  formatMaybePercent,
} from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import type { DiseaseType, DistrictTriggerSummary, KecamatanData, TrendPoint } from "@/types";
import { RiskGauge } from "./ui/risk-gauge";
import { TrendChart } from "./trend-chart";

interface DistrictDetailPanelProps {
  district: KecamatanData | undefined;
  disease: DiseaseType;
  trend: TrendPoint[];
  trigger?: DistrictTriggerSummary;
  className?: string;
}

/**
 * Panel kecamatan.
 *
 * Tiga hal yang diperbaiki bersamaan dengan masuknya gateway:
 *
 * 1. Lencana "Keyakinan model 94%" dihapus. Angka itu berasal dari
 *    `0.91 + (idx % 7) * 0.01` di berkas mock — bukan keluaran model. Yang
 *    menggantikannya adalah dua hal yang benar-benar dihitung: interval
 *    prediksi dan cakupan data.
 * 2. "Proyeksi 2–4 Minggu" jadi bulan yang sebenarnya diprediksi. Model
 *    dilatih bulanan; label mingguan menjanjikan resolusi yang tidak ada.
 * 3. Kecamatan tanpa prediksi tidak lagi meminjam gaya "rendah" — ia punya
 *    tampilannya sendiri, dan angka prediksinya kosong, bukan nol.
 */
export function DistrictDetailPanel({
  district,
  disease,
  trend,
  trigger,
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
        <p className="text-sm font-medium text-foreground">Pilih wilayah pada peta</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Klik salah satu kecamatan pada peta Kota Semarang untuk membuka analisis
          risiko dan proyeksi trennya.
        </p>
      </div>
    );
  }

  const glassStyleByRisk = district.tingkat_risiko
    ? {
        tinggi:
          "bg-gradient-to-br from-risk-high-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(168,68,44,0.16),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(243,194,180,0.45)]",
        sedang:
          "bg-gradient-to-br from-risk-medium-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(212,147,58,0.16),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(246,219,169,0.45)]",
        rendah:
          "bg-gradient-to-br from-risk-low-bg/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(31,81,50,0.12),0_1px_3px_rgba(14,34,37,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_0_0_1px_rgba(197,222,194,0.45)]",
      }[district.tingkat_risiko]
    : "bg-gradient-to-br from-paper-100/85 via-white/75 to-white/80 border-white/85 shadow-[0_16px_36px_-10px_rgba(14,34,37,0.10),inset_0_1px_1.5px_0_rgba(255,255,255,0.95)]";

  const coverage = COVERAGE_CONFIG[district.coverage];
  const hasPrediction = district.kasus_prediksi !== null;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between gap-3.5 p-5 rounded-2xl backdrop-blur-2xl transition-all duration-300 animate-fade-in min-h-[560px] h-full overflow-hidden",
        glassStyleByRisk,
        className,
      )}
    >
      {/* 1. Kepala: identitas wilayah + gauge risiko */}
      <div className="flex items-center justify-between gap-3 border-b border-white/70 pb-3 shrink-0">
        <div>
          <span className="text-3xs font-semibold text-paper-600 uppercase tracking-wider block">
            Detail wilayah
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

      {/* 2. Angka utama: observasi di kiri, prakiraan di kanan */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="rounded-xl bg-white/75 backdrop-blur-md p-3 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span className="text-3xs font-medium text-muted-foreground uppercase tracking-wider block">
            Kasus {formatMonth(district.periode_observasi)}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold text-foreground">
              {formatMaybeNumber(district.kasus_aktif)}
            </span>
            <span className="text-xs text-muted-foreground">kasus</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-3xs text-muted-foreground pt-1 border-t border-paper-100/80">
            <span>Insidensi:</span>
            <span className="font-semibold text-foreground">
              {formatMaybeIncidence(district.incidence_rate)}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-white/75 backdrop-blur-md p-3 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span className="text-3xs font-medium text-muted-foreground uppercase tracking-wider block">
            Prakiraan {formatMonth(district.periode_prediksi)}
          </span>

          {hasPrediction ? (
            <>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold text-risk-high">
                  {formatMaybeNumber(district.kasus_prediksi)}
                </span>
                <span className="text-xs font-semibold text-risk-high">kasus</span>
              </div>
              {/* Angka prediksi tidak pernah tampil tanpa batasnya (PRD §7-H1). */}
              <div className="mt-1 flex items-center justify-between gap-2 text-3xs pt-1 border-t border-paper-100/80">
                <span className="text-muted-foreground">Rentang:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatMaybeNumber(district.kasus_prediksi_lower)}–
                  {formatMaybeNumber(district.kasus_prediksi_upper)}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-3xs leading-relaxed text-paper-600">
              Belum ada prediksi untuk kecamatan ini. Kekosongan ini bukan tanda aman.
            </p>
          )}
        </div>
      </div>

      {/* 3. Iklim bulan observasi */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/65 backdrop-blur-md p-2 border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <CloudRain className="h-3.5 w-3.5 text-brand-600 shrink-0" />
          <div className="leading-none">
            <span className="text-4xs text-muted-foreground block uppercase">Hujan</span>
            <span className="font-semibold text-foreground">
              {formatMaybeNumber(district.cuaca.curah_hujan_mm)} mm
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-risk-medium shrink-0" />
          <div className="leading-none">
            <span className="text-4xs text-muted-foreground block uppercase">Suhu</span>
            <span className="font-semibold text-foreground">
              {formatMaybeNumber(district.cuaca.suhu_c)} °C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-paper-600 shrink-0" />
          <div className="leading-none truncate">
            <span className="text-4xs text-muted-foreground block uppercase">Sifat</span>
            <span className="font-semibold text-foreground truncate">
              {district.cuaca.status_cuaca ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Pemicu dominan menurut model — mengisi kalimat "Dasar:" (§5.2) */}
      {district.drivers.length > 0 && (
        <div className="rounded-xl border border-white/85 bg-white/70 p-2.5 text-3xs leading-relaxed text-paper-700 shrink-0">
          <span className="font-semibold text-foreground">Pemicu dominan: </span>
          {district.drivers
            .map(
              (d) =>
                `${d.label} ${d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${d.unit} (persentil ${d.percentile})`,
            )
            .join("; ")}
          .
        </div>
      )}

      {/* 4b. Sinyal pemicu lingkungan terverifikasi dari warga */}
      {trigger && trigger.total > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 backdrop-blur-md p-2.5 text-3xs text-amber-950 shrink-0 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden />
              <span>Sinyal Pemicu Warga:</span>
            </span>
            <span className="font-semibold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded text-4xs">
              {trigger.total} terverifikasi
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trigger.byKind.jentik > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-amber-200 text-4xs font-semibold text-amber-900">
                <Bug className="h-3 w-3 text-amber-700 shrink-0" />
                <span>{trigger.byKind.jentik} Jentik</span>
              </span>
            )}
            {trigger.byKind.genangan > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-amber-200 text-4xs font-semibold text-amber-900">
                <Droplets className="h-3 w-3 text-sky-600 shrink-0" />
                <span>{trigger.byKind.genangan} Genangan</span>
              </span>
            )}
            {trigger.byKind.sampah > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-amber-200 text-4xs font-semibold text-amber-900">
                <Trash2 className="h-3 w-3 text-paper-700 shrink-0" />
                <span>{trigger.byKind.sampah} Sampah</span>
              </span>
            )}
            {trigger.byKind.saluran > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-amber-200 text-4xs font-semibold text-amber-900">
                <Waves className="h-3 w-3 text-teal-600 shrink-0" />
                <span>{trigger.byKind.saluran} Saluran</span>
              </span>
            )}
            {trigger.byKind.gejala > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 border border-amber-200 text-4xs font-semibold text-amber-900">
                <Activity className="h-3 w-3 text-rose-600 shrink-0" />
                <span>{trigger.byKind.gejala} Gejala</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. Tren kota — deret bulanan aktual lalu prakiraan */}
      <div className="rounded-xl bg-white/80 backdrop-blur-md p-3.5 border border-white/90 shadow-[0_2px_8px_-2px_rgba(14,34,37,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] flex-1 min-h-[220px] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <LineChart className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Tren kasus kota ({disease})
            </span>
          </div>
          <span
            className={cn(
              "text-3xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 border-paper-200 bg-paper-50",
              coverage.className,
            )}
            title={coverage.description}
          >
            <Info className="h-3 w-3" aria-hidden />
            <span>Cakupan data {coverage.label.toLowerCase()}</span>
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

        {/* Deret ini milik kota, bukan kecamatan yang sedang dipilih — dan itu
            harus tertulis, bukan disimpulkan sendiri oleh pembacanya. */}
        <p className="mt-2 text-4xs text-paper-600 shrink-0">
          Deret tingkat kota. Perubahan kasus {district.nama} dibanding bulan
          sebelumnya: {formatMaybePercent(district.delta_periode)}.
        </p>
      </div>
    </div>
  );
}
