"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  History,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn, diseaseLabel, formatNumber } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  fetchBacktests,
  fetchDiseases,
  retrainModel,
} from "@/lib/api";
import type { BacktestMetric, DiseaseSummary, RetrainResult } from "@/types";
import { useApi } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";

export type AdminModelRetrainCardProps = {
  diseases?: DiseaseSummary[];
  onRetrained?: () => void;
  className?: string;
};

const SUPPORTED_DISEASES = ["DBD", "ISPA", "LEPTOSPIROSIS"];

export function AdminModelRetrainCard({
  diseases: propDiseases,
  onRetrained,
  className,
}: AdminModelRetrainCardProps) {
  const [selectedDisease, setSelectedDisease] = React.useState<string>("DBD");
  const [includeCitizen, setIncludeCitizen] = React.useState<boolean>(false);
  const [retraining, setRetraining] = React.useState<boolean>(false);
  const [retrainResult, setRetrainResult] = React.useState<RetrainResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const backtests = useApi(() => fetchBacktests(), []);
  const diseasesApi = useApi(() => fetchDiseases(), []);

  const activeDiseases = React.useMemo(() => {
    const list =
      propDiseases && propDiseases.length > 0
        ? propDiseases.map((d) => d.disease.toUpperCase())
        : diseasesApi.data && diseasesApi.data.length > 0
          ? diseasesApi.data.map((d) => d.disease.toUpperCase())
          : SUPPORTED_DISEASES;

    // Distinct list
    return Array.from(new Set(list));
  }, [propDiseases, diseasesApi.data]);

  // Current metric for selected disease
  const currentMetric = React.useMemo<BacktestMetric | null>(() => {
    const rows = backtests.data?.data ?? [];
    return rows.find((r) => r.disease.toUpperCase() === selectedDisease.toUpperCase()) ?? null;
  }, [backtests.data, selectedDisease]);

  const handleRetrain = async () => {
    setRetraining(true);
    setErrorMessage(null);
    setRetrainResult(null);

    try {
      const response = await retrainModel(selectedDisease, includeCitizen);
      setRetrainResult(response.data);
      invalidatePeriod();
      backtests.reload();
      if (onRetrained) onRetrained();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Layanan ML tidak dapat dihubungi untuk retraining. Pastikan ml-services sedang berjalan.",
      );
    } finally {
      setRetraining(false);
    }
  };

  return (
    <Card className={cn("flex flex-col gap-5 p-5 sm:p-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-heading-sm text-foreground">
              Retraining Model Machine Learning
            </h3>
            <Badge variant="outline" className="border-brand-300 text-brand-700 text-overline uppercase">
              Wewenang Admin / Dinas
            </Badge>
          </div>
          <p className="text-body-sm text-paper-600">
            Latih ulang model prediksi dengan data observasi terbaru dan evaluasi perubahan metrik akurasi.
          </p>
        </div>

        <Link
          href="/model"
          className="inline-flex items-center gap-1 text-caption font-medium text-brand-700 hover:text-brand-800 transition-colors"
        >
          <span>Buka Halaman Transparansi Model</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Disease Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        <span className="text-caption font-semibold uppercase tracking-wider text-paper-600 mr-1">
          Pilih Penyakit:
        </span>
        {activeDiseases.map((d) => {
          const isSelected = selectedDisease.toUpperCase() === d.toUpperCase();
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setSelectedDisease(d);
                setRetrainResult(null);
                setErrorMessage(null);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors",
                isSelected
                  ? "bg-brand-700 text-white shadow-xs font-semibold"
                  : "bg-surface text-paper-600 hover:bg-paper-100 hover:text-foreground border border-border",
              )}
            >
              {diseaseLabel(d) || d}
            </button>
          );
        })}
      </div>

      {/* Active Model Status Box */}
      <div className="rounded-xl border border-border bg-paper-50 p-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand-700" />
            <span className="text-caption font-semibold uppercase tracking-wider text-foreground">
              Status Model Aktif ({selectedDisease.toUpperCase()})
            </span>
          </div>
          <span className="text-caption text-paper-500 tabular">
            {currentMetric?.trained_at
              ? `Dilatih: ${formatDateTime(currentMetric.trained_at)}`
              : "Belum ada histori latih"}
          </span>
        </div>

        {backtests.loading ? (
          <div className="py-4 text-center text-caption text-paper-500">
            Memuat status metrik model…
          </div>
        ) : !currentMetric ? (
          <div className="py-3 text-caption text-paper-600">
            Model untuk {selectedDisease} belum memiliki rekaman backtesting di basis data. Klik tombol di bawah untuk melatih model pertama kali.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-overline uppercase text-paper-600">Versi Model</span>
              <span className="text-caption font-semibold text-foreground truncate" title={currentMetric.model_version}>
                {currentMetric.model_version}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-overline uppercase text-paper-600">MAE (Error Rata-rata)</span>
              <span className="text-body-sm font-semibold tabular text-foreground">
                {currentMetric.mae.toFixed(2)} <span className="text-caption font-normal text-paper-500">kasus/bln</span>
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-overline uppercase text-paper-600">RMSE</span>
              <span className="text-body-sm font-semibold tabular text-foreground">
                {currentMetric.rmse.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-overline uppercase text-paper-600">Skor R² (Determinasi)</span>
              <span className="text-body-sm font-semibold tabular text-foreground">
                {currentMetric.r2.toFixed(3)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Retrain Action Section */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-surface p-4">
        {/* Toggle include citizen signal */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={includeCitizen}
            onChange={(e) => setIncludeCitizen(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-brand-700 focus:ring-brand-600"
          />
          <div className="flex flex-col">
            <span className="text-body-sm font-medium text-foreground group-hover:text-brand-800 transition-colors">
              Sertakan Sinyal Lingkungan Warga Terverifikasi
            </span>
            <span className="text-caption text-paper-600">
              Menguji apakah laporan warga terverifikasi (genangan air, sampah, saluran) meningkatkan performa prediksi risiko untuk {selectedDisease}.
            </span>
          </div>
        </label>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/60">
          <span className="text-caption text-paper-500">
            * Pelatihan dijalankan secara sinkron oleh layanan machine learning
          </span>

          <Button
            type="button"
            onClick={handleRetrain}
            disabled={retraining}
            className="min-w-[180px] bg-brand-700 hover:bg-brand-800 text-white font-medium shadow-xs"
          >
            {retraining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Melatih Model & Backtest…
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Latih Ulang {selectedDisease.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 animate-in fade-in">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
          <div className="flex flex-col gap-1 text-body-sm">
            <span className="font-semibold">Retraining Gagal Dilakukan</span>
            <span className="text-caption text-amber-900">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Evaluation Results Banner (Post-Retrain) */}
      {retrainResult && (
        <div className="flex flex-col gap-3 rounded-xl border border-teal-300 bg-teal-50/70 p-4 text-teal-950 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-700" />
              <span className="font-display font-semibold text-body-base text-teal-950">
                Pelatihan Model {retrainResult.disease} Selesai!
              </span>
            </div>

            <Badge
              variant={retrainResult.improved ? "risk-low" : "risk-medium"}
              className="text-overline uppercase"
            >
              {retrainResult.improved ? "Akurasi Membaik" : "Netral / Tidak Berubah"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
            <div className="flex flex-col bg-white/70 rounded-lg p-2.5 border border-teal-200/60">
              <span className="text-overline uppercase text-paper-600">Pembaruan Versi</span>
              <span className="text-caption font-semibold text-foreground">
                {retrainResult.previous_version ?? "awal"} <ArrowRight className="inline h-3 w-3 text-paper-400 mx-0.5" /> {retrainResult.new_version}
              </span>
            </div>

            <div className="flex flex-col bg-white/70 rounded-lg p-2.5 border border-teal-200/60">
              <span className="text-overline uppercase text-paper-600">MAE Hasil Evaluasi</span>
              <span className="text-caption font-semibold text-foreground tabular">
                {retrainResult.metrics.mae.toFixed(2)} kasus/bulan
              </span>
            </div>

            <div className="flex flex-col bg-white/70 rounded-lg p-2.5 border border-teal-200/60">
              <span className="text-overline uppercase text-paper-600">Skor R² Baru</span>
              <span className="text-caption font-semibold text-foreground tabular">
                {retrainResult.metrics.r2.toFixed(3)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-caption text-teal-900">
            <span>
              {retrainResult.improved
                ? "Model baru berhasil dimuat ke memori (hot-reload) dan otomatis melayani prakiraan dashboard."
                : "Akurasi model tetap dicatat secara transparan untuk audit mutu kecerdasan buatan."}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetrainResult(null)}
              className="text-caption border-teal-300 hover:bg-teal-100"
            >
              Tutup Ringkasan
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
