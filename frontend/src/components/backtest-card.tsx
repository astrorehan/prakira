"use client";

import * as React from "react";
import {
  Info,
  ShieldCheck,
  Check,
  Copy,
  Sparkles,
  Layers,
  Calendar,
  Activity,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Cpu,
  BarChart2,
  Sliders,
} from "lucide-react";
import { cn, formatNumber, diseaseProfile } from "@/lib/utils";
import type { BacktestMetric, DiseaseType } from "@/types";
import { formatDateTime } from "@/lib/period";
import {
  formatAlgorithmName,
  evaluateR2,
  formatPeriodRange,
} from "@/lib/stats";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BacktestComparisonChart } from "./backtest-comparison-chart";

/**
 * Hasil backtesting & evaluasi transparansi model machine learning.
 *
 * Mengikuti prinsip PRAKIRA "Buletin" Design System:
 * - Data historis dipisah berdasarkan waktu (walk-forward temporal split)
 * - Kejujuran metrik tanpa angka karangan (R² DBD ~0.45 & ISPA ~0.77)
 * - Identitas algoritma manusiawi (bukan nama variabel snake_case mentah)
 * - Visualisasi perbandingan kasus riil vs estimasi model
 */

type BacktestCardProps = {
  metrics: BacktestMetric[];
  /** Penyakit yang sedang aktif di halaman. Menentukan kartu mana yang utama. */
  disease: DiseaseType;
  /** Callback opsional untuk memilih penyakit saat kartu diklik */
  onSelectDisease?: (disease: DiseaseType) => void;
  className?: string;
};

function R2GaugeBar({ r2, percentage }: { r2: number; percentage: number }) {
  // Clamped ratio from 0 to 1
  const ratio = Math.max(0, Math.min(1, r2));

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-3xs font-medium text-paper-600">
        <span>0,0 (Acak)</span>
        <span className="font-semibold text-paper-700">0,40 (Moderat)</span>
        <span className="font-semibold text-paper-700">0,70 (Kuat)</span>
        <span>1,0 (Sempurna)</span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-paper-200">
        {/* Benchmark Marker Lines */}
        <div className="absolute inset-y-0 left-[40%] w-0.5 bg-paper-400 z-10 opacity-70" title="Ambang Moderat (0.40)" />
        <div className="absolute inset-y-0 left-[70%] w-0.5 bg-paper-400 z-10 opacity-70" title="Ambang Kuat (0.70)" />

        {/* Dynamic Progress Bar */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            r2 >= 0.7
              ? "bg-grad-bar-low"
              : r2 >= 0.4
                ? "bg-grad-bar-medium"
                : "bg-grad-bar-high",
          )}
          style={{ width: `${Math.max(5, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label ?? "Salin ke papan klip"}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-3xs font-mono text-paper-600 hover:text-paper-900 hover:bg-paper-200 transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-risk-low" />
          <span className="text-risk-low font-sans font-medium">Tersalin</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>{label ?? "Salin"}</span>
        </>
      )}
    </button>
  );
}

function BacktestSelectorCard({
  metric,
  active,
  onSelect,
}: {
  metric: BacktestMetric;
  active: boolean;
  onSelect?: () => void;
}) {
  const profile = diseaseProfile(metric.disease);
  const algo = formatAlgorithmName(metric.algorithm);
  const r2Eval = evaluateR2(metric.r2);
  const testPeriodInfo = formatPeriodRange(metric.test_period);
  const isLimitedSample = (metric.sample_size ?? 0) <= 3;

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "relative flex flex-col justify-between p-5 transition-all duration-200 select-none",
        active
          ? "border-brand-500 ring-2 ring-brand-100 bg-paper-0 shadow-card"
          : "border-paper-200 bg-paper-0/70 hover:bg-paper-0 hover:border-paper-300 hover:shadow-sm cursor-pointer",
      )}
    >
      {/* Top Tag & Status */}
      <div className="flex items-start justify-between gap-3 border-b border-paper-100 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-overline uppercase font-bold tracking-wider text-brand-700">
              {metric.disease}
            </span>
            <span className="text-caption text-paper-600 truncate">
              {profile.name}
            </span>
          </div>
          <h3 className="mt-0.5 text-body-sm font-semibold text-paper-900 truncate">
            {algo.architecture}
          </h3>
        </div>

        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-2xs font-semibold text-brand-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            Sedang Dianalisis
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-paper-200 bg-paper-100 px-2 py-0.5 text-3xs font-medium text-paper-600 transition-colors group-hover:text-paper-900">
            <span>Pilih Model</span>
            <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Sub-models pills */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {algo.models.map((m) => (
          <span
            key={m}
            className="inline-flex items-center rounded-md bg-paper-100 px-2 py-0.5 font-mono text-3xs font-medium text-paper-700 border border-paper-200/80"
          >
            {m}
          </span>
        ))}
      </div>

      {/* Main R² Score Section */}
      <div className="mt-4 rounded-xl border border-paper-200 bg-paper-50/70 p-3.5 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="tabular text-metric font-semibold text-paper-900">
                {formatNumber(metric.r2, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
              </span>
              <span className="text-caption font-semibold text-paper-600">R²</span>
            </div>
            <p className="text-caption text-paper-600">
              {r2Eval.percentage}% ragam kasus data uji terjelaskan
            </p>
          </div>

          <Badge variant={r2Eval.badgeVariant} className="shrink-0 text-3xs">
            {r2Eval.label}
          </Badge>
        </div>

        {/* Visual Calibration Gauge */}
        <R2GaugeBar r2={metric.r2} percentage={r2Eval.percentage} />
      </div>

      {/* 2x2 Metric Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {/* 1. Akurasi Kelas Risiko */}
        <div className="rounded-xl border border-paper-200/90 bg-white p-2.5 space-y-0.5">
          <span className="text-3xs uppercase tracking-wider font-semibold text-paper-600 block">
            Akurasi Status Risiko
          </span>
          <p className="tabular text-body-sm font-semibold text-paper-900">
            {metric.class_accuracy_pct === null
              ? "—"
              : `${formatNumber(metric.class_accuracy_pct, { maximumFractionDigits: 1 })}%`}
          </p>
          <p className="text-4xs text-paper-600 truncate">
            Ketepatan level Waspada/Siaga
          </p>
        </div>

        {/* 2. MAE */}
        <div className="rounded-xl border border-paper-200/90 bg-white p-2.5 space-y-0.5">
          <span className="text-3xs uppercase tracking-wider font-semibold text-paper-600 block">
            Rata-rata Meleset (MAE)
          </span>
          <p className="tabular text-body-sm font-semibold text-paper-900 truncate">
            ±{formatNumber(metric.mae, { maximumFractionDigits: 2 })}{" "}
            <span className="text-4xs font-normal text-paper-600">kasus/kec.</span>
          </p>
          <p className="text-4xs text-paper-600 truncate">
            Deviasi absolut rata-rata
          </p>
        </div>

        {/* 3. RMSE */}
        <div className="rounded-xl border border-paper-200/90 bg-white p-2.5 space-y-0.5">
          <span className="text-3xs uppercase tracking-wider font-semibold text-paper-600 block">
            Sensitivitas Outlier (RMSE)
          </span>
          <p className="tabular text-body-sm font-semibold text-paper-900 truncate">
            {formatNumber(metric.rmse, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-4xs text-paper-600 truncate">
            Akar kuadrat galat
          </p>
        </div>

        {/* 4. Periode Uji */}
        <div className="rounded-xl border border-paper-200/90 bg-white p-2.5 space-y-0.5">
          <span className="text-3xs uppercase tracking-wider font-semibold text-paper-600 block">
            Data Uji Buta
          </span>
          <p className="tabular text-body-sm font-semibold text-paper-900">
            {metric.sample_size === null ? "—" : `${metric.sample_size} Bulan`}
          </p>
          <p className="text-4xs text-paper-600 truncate">
            {testPeriodInfo.formatted}
          </p>
        </div>
      </div>

      {/* Discrepancy / Limited Sample Notice */}
      {isLimitedSample && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-risk-medium-br bg-risk-medium-bg px-2.5 py-1.5 text-2xs text-paper-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-risk-medium" />
          <span className="leading-tight">
            Periode uji singkat ({metric.sample_size} bulan) — interpretasikan tren dengan hati-hati.
          </span>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="mt-4 border-t border-paper-100 pt-2.5 flex items-center justify-between text-3xs text-paper-600">
        <span className="font-mono">{testPeriodInfo.formatted}</span>
        <span className="font-mono uppercase text-4xs bg-paper-100 px-1.5 py-0.5 rounded border border-paper-200">
          {metric.model_version.split("-").slice(-1)[0] ?? metric.model_version}
        </span>
      </div>
    </Card>
  );
}

export function BacktestCard({
  metrics,
  disease,
  onSelectDisease,
  className,
}: BacktestCardProps) {
  const [detailTab, setDetailTab] = React.useState<"chart" | "tech">("chart");

  /* Model penyakit aktif */
  const activeMetric = React.useMemo(() => {
    return metrics.find((m) => m.disease.toLowerCase() === disease.toLowerCase()) ?? metrics[0];
  }, [metrics, disease]);

  /* Urutan kartu: yang sedang aktif tetap di depan atau teratur */
  const ordered = React.useMemo(() => {
    return [...metrics].sort(
      (a, b) => Number(b.disease === disease) - Number(a.disease === disease),
    );
  }, [metrics, disease]);

  if (metrics.length === 0) {
    return (
      <Card className={cn("p-8 text-center bg-paper-0 border-paper-200", className)}>
        <Activity className="mx-auto h-8 w-8 text-paper-400" />
        <h4 className="mt-2 text-h3 text-paper-900">Belum Ada Hasil Uji Model Tersimpan</h4>
        <p className="mt-1 text-body-sm text-paper-600 max-w-md mx-auto">
          Layanan machine learning belum menyelesaikan evaluasi backtest historis. Jalankan layanan lalu segarkan halaman.
        </p>
      </Card>
    );
  }

  const activeAlgo = activeMetric ? formatAlgorithmName(activeMetric.algorithm) : null;
  const activeTrainPeriod = activeMetric ? formatPeriodRange(activeMetric.train_period) : null;
  const activeTestPeriod = activeMetric ? formatPeriodRange(activeMetric.test_period) : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* 1. Disease Model Selector Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        {ordered.map((m) => (
          <BacktestSelectorCard
            key={m.disease}
            metric={m}
            active={m.disease.toLowerCase() === disease.toLowerCase()}
            onSelect={() => onSelectDisease?.(m.disease)}
          />
        ))}
      </div>

      {/* 2. Detailed Inspection & Visual Comparison Panel for Active Model */}
      {activeMetric && (
        <Card className="p-6 space-y-6 border-paper-200 bg-paper-0 shadow-card">
          {/* Header & Sub-tab Switcher */}
          <div className="flex flex-col justify-between gap-4 border-b border-paper-100 pb-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <h3 className="text-h3 text-paper-900">
                  Evaluasi Mendalam: Model {activeMetric.disease}
                </h3>
              </div>
              <p className="text-caption text-paper-600">
                {activeAlgo?.subtitle} · Disinkronkan {formatDateTime(activeMetric.fetched_at)}
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-paper-200 bg-paper-100 p-0.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetailTab("chart")}
                className={cn(
                  "h-8 gap-1.5 px-3 text-caption font-medium rounded-md transition-all",
                  detailTab === "chart"
                    ? "bg-paper-0 text-paper-900 shadow-xs hover:bg-paper-0"
                    : "text-paper-600 hover:text-paper-900 hover:bg-transparent",
                )}
              >
                <TrendingUp className="h-4 w-4" aria-hidden />
                <span>Perbandingan Kurva Uji</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetailTab("tech")}
                className={cn(
                  "h-8 gap-1.5 px-3 text-caption font-medium rounded-md transition-all",
                  detailTab === "tech"
                    ? "bg-paper-0 text-paper-900 shadow-xs hover:bg-paper-0"
                    : "text-paper-600 hover:text-paper-900 hover:bg-transparent",
                )}
              >
                <Sliders className="h-4 w-4" aria-hidden />
                <span>Metodologi & Parameter</span>
              </Button>
            </div>
          </div>

          {/* Sub-tab 1: Actual vs Predicted Chart */}
          {detailTab === "chart" && (
            <BacktestComparisonChart
              monthlyResults={activeMetric.monthly_results}
              disease={activeMetric.disease}
            />
          )}

          {/* Sub-tab 2: Detailed Technical Methodology */}
          {detailTab === "tech" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Data Latih Box */}
                <div className="rounded-xl border border-paper-200 bg-paper-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-caption font-semibold text-paper-700">
                    <Calendar className="h-4 w-4 text-brand-600" />
                    <span>Periode Pelatihan (Train)</span>
                  </div>
                  <p className="text-body-sm font-semibold text-paper-900">
                    {activeTrainPeriod?.formatted}
                  </p>
                  <p className="text-caption text-paper-600">
                    Durasi: {activeTrainPeriod?.monthsLabel}
                  </p>
                </div>

                {/* Data Uji Box */}
                <div className="rounded-xl border border-paper-200 bg-paper-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-caption font-semibold text-paper-700">
                    <BarChart2 className="h-4 w-4 text-brand-600" />
                    <span>Periode Pengujian (Test)</span>
                  </div>
                  <p className="text-body-sm font-semibold text-paper-900">
                    {activeTestPeriod?.formatted}
                  </p>
                  <p className="text-caption text-paper-600">
                    Durasi: {activeTestPeriod?.monthsLabel} ({activeMetric.sample_size ?? 0} bulan evaluasi)
                  </p>
                </div>

                {/* Versi & Build */}
                <div className="rounded-xl border border-paper-200 bg-paper-50 p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-caption font-semibold text-paper-700">
                    <Cpu className="h-4 w-4 text-brand-600" />
                    <span>Identifikasi Build Model</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-caption font-semibold text-paper-900 truncate">
                      {activeMetric.model_version}
                    </span>
                    <CopyButton text={activeMetric.model_version} />
                  </div>
                  <p className="text-caption text-paper-600">
                    Diambil: {formatDateTime(activeMetric.fetched_at)}
                  </p>
                </div>
              </div>

              {/* Arsitektur Description */}
              <div className="rounded-xl border border-paper-200 bg-white p-4 space-y-2">
                <h4 className="text-body-sm font-semibold text-paper-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand-600" />
                  <span>Prinsip Arsitektur Ensemble</span>
                </h4>
                <p className="text-body-sm text-paper-700 leading-relaxed">
                  {activeAlgo?.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-paper-100">
                  {activeAlgo?.models.map((m) => (
                    <Badge key={m} variant="secondary" className="font-mono text-3xs">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 3. Transparent Methodology Callout Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-300/60 bg-brand-50/80 p-4 shadow-xs">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <div className="space-y-1 text-caption leading-relaxed text-brand-900">
          <p className="font-semibold text-body-sm text-brand-900">
            Jaminan Transparansi & Validasi Bebas Kebocoran Data (Zero Data Leakage)
          </p>
          <p className="text-paper-700">
            Model diuji menggunakan pemisahan temporal murni (<em>walk-forward time-series split</em>).
            Model hanya dilatih menggunakan bulan-bulan historis sebelum tanggal pemisah, lalu diuji pada
            bulan-bulan sesudahnya tanpa pernah melihat data masa depan saat pelatihan.
            Semua metrik ditampilkan apa adanya sesuai hasil pengujian riil demi keandalan keputusan kesehatan publik.
          </p>
        </div>
      </div>
    </div>
  );
}
