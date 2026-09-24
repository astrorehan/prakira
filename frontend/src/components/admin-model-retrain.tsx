"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { cn, diseaseLabel } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { retrainModel, type BacktestMeta, type Envelope } from "@/lib/api";
import type { BacktestMetric, DiseaseSummary, RetrainResult } from "@/types";
import type { AsyncState } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";

export type AdminModelRetrainCardProps = {
  diseases?: DiseaseSummary[];
  /** Diambil halaman induk supaya ringkasan di atas dan kartu ini sepakat. */
  backtests: AsyncState<Envelope<BacktestMetric[], BacktestMeta>>;
  onRetrained?: () => void;
  className?: string;
};

const SUPPORTED_DISEASES = ["DBD", "ISPA", "LEPTOSPIROSIS"];

function Stat({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="text-overline uppercase text-paper-600">{label}</span>
      <span className="truncate text-body-sm font-semibold tabular text-foreground">{children}</span>
    </div>
  );
}

export function AdminModelRetrainCard({
  diseases,
  backtests,
  onRetrained,
  className,
}: AdminModelRetrainCardProps) {
  const [selectedDisease, setSelectedDisease] = React.useState<string>("DBD");
  const [includeCitizen, setIncludeCitizen] = React.useState<boolean>(false);
  const [retraining, setRetraining] = React.useState<boolean>(false);
  const [retrainResult, setRetrainResult] = React.useState<RetrainResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const activeDiseases = React.useMemo(() => {
    const list =
      diseases && diseases.length > 0
        ? diseases.map((d) => d.disease.toUpperCase())
        : SUPPORTED_DISEASES;
    return Array.from(new Set(list));
  }, [diseases]);

  const currentMetric = React.useMemo<BacktestMetric | null>(() => {
    const rows = backtests.data?.data ?? [];
    return rows.find((r) => r.disease.toUpperCase() === selectedDisease.toUpperCase()) ?? null;
  }, [backtests.data, selectedDisease]);

  const selectDisease = (d: string) => {
    setSelectedDisease(d);
    setRetrainResult(null);
    setErrorMessage(null);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setErrorMessage(null);
    setRetrainResult(null);

    try {
      const response = await retrainModel(selectedDisease, includeCitizen, "lingkungan");
      setRetrainResult(response.data);
      invalidatePeriod();
      backtests.reload();
      onRetrained?.();
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

  const label = diseaseLabel(selectedDisease) || selectedDisease;

  return (
    <Card className={cn("flex flex-col gap-5 p-4 sm:p-5", className)}>
      {/* Kepala */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-h3 text-foreground">
            <BrainCircuit className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span>Latih ulang model</span>
          </h3>
          <p className="text-caption leading-relaxed text-paper-600">
            Latih model prediksi dengan data observasi terbaru lalu bandingkan metrik akurasinya.
          </p>
        </div>

        <Link
          href="/model"
          className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-brand-700 transition-colors hover:text-brand-800"
        >
          <span>Transparansi model</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Pilihan penyakit: segmented control, bergulir di layar sempit */}
      <div
        role="tablist"
        aria-label="Pilih penyakit"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
      >
        {activeDiseases.map((d) => {
          const isSelected = selectedDisease.toUpperCase() === d.toUpperCase();
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => selectDisease(d)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-body-sm font-medium transition-colors duration-fast ease-out",
                isSelected
                  ? "border-brand-700 bg-brand-700 text-white shadow-xs"
                  : "border-border bg-surface text-paper-600 hover:bg-paper-100 hover:text-foreground",
              )}
            >
              {diseaseLabel(d) || d}
            </button>
          );
        })}
      </div>

      {/* Model aktif */}
      <section aria-label={`Model aktif ${label}`} className="rounded-xl border border-border bg-paper-50 p-4">
        <div className="mb-3 flex flex-col gap-1 border-b border-border pb-2.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span className="overline text-foreground">Model aktif · {label}</span>
          </span>
          <span className="text-caption tabular text-paper-500">
            {currentMetric?.trained_at
              ? `Dilatih ${formatDateTime(currentMetric.trained_at)}`
              : "Belum ada histori latih"}
          </span>
        </div>

        {backtests.loading ? (
          <p className="py-4 text-center text-caption text-paper-500">Memuat metrik model…</p>
        ) : !currentMetric ? (
          <p className="py-2 text-caption leading-relaxed text-paper-600">
            Model {label} belum punya rekaman backtest. Jalankan pelatihan pertama di bawah.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Versi">
              <span title={currentMetric.model_version}>{currentMetric.model_version}</span>
            </Stat>
            <Stat label="MAE">
              {currentMetric.mae.toFixed(2)}{" "}
              <span className="text-caption font-normal text-paper-500">kasus/bln</span>
            </Stat>
            <Stat label="RMSE">{currentMetric.rmse.toFixed(2)}</Stat>
            <Stat label="Skor R²">{currentMetric.r2.toFixed(3)}</Stat>
          </div>
        )}
      </section>

      {/* Aksi */}
      <div className="flex flex-col gap-4">
        <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:bg-paper-50">
          <input
            type="checkbox"
            checked={includeCitizen}
            onChange={(e) => setIncludeCitizen(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand-700 focus:ring-brand-600"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-sm font-medium text-foreground">
              Evaluasi sinyal lingkungan warga terverifikasi
            </span>
            <span className="text-caption leading-relaxed text-paper-600">
              Bandingkan varian dengan genangan, sampah, dan saluran terverifikasi terhadap model
              dasar. Varian warga tidak diaktifkan diam-diam.
            </span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-caption text-paper-500">
            Pelatihan berjalan sinkron di layanan ML dan bisa memakan waktu.
          </span>
          <Button
            type="button"
            onClick={handleRetrain}
            disabled={retraining}
            className="w-full gap-2 sm:w-auto sm:min-w-[180px]"
          >
            {retraining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Melatih & backtest…
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                Latih ulang {selectedDisease.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Galat */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-risk-medium-br bg-risk-medium-bg p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-medium" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-body-sm font-semibold text-foreground">Retraining gagal</span>
            <span className="break-words text-caption text-paper-700">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Hasil pelatihan */}
      {retrainResult && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-risk-low-br bg-risk-low-bg p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-risk-low" aria-hidden="true" />
              <span className="text-body-sm font-semibold text-foreground">
                {retrainResult.citizen_signal_comparison
                  ? `Evaluasi sinyal warga ${retrainResult.disease} selesai`
                  : `Pelatihan model ${retrainResult.disease} selesai`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setRetrainResult(null)}
              aria-label="Tutup ringkasan"
              className="rounded-md p-1 text-paper-600 transition-colors hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Badge
            variant={retrainResult.improved ? "risk-low" : "risk-medium"}
            className="self-start"
          >
            {retrainResult.improved ? "Akurasi membaik" : "Netral / tidak berubah"}
          </Badge>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <Stat label="Versi">
                {retrainResult.previous_version ?? "awal"}
                <ArrowRight className="mx-1 inline h-3 w-3 text-paper-400" aria-hidden="true" />
                {retrainResult.new_version}
              </Stat>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <Stat label="MAE baru">{retrainResult.metrics.mae.toFixed(2)} kasus/bln</Stat>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <Stat label="R² baru">{retrainResult.metrics.r2.toFixed(3)}</Stat>
            </div>
          </div>

          {retrainResult.citizen_signal_comparison && (
            <div className="rounded-lg border border-border bg-surface p-3 text-caption leading-relaxed">
              <p className="font-semibold text-foreground">Perbandingan sinyal warga</p>
              <p className="mt-1 text-paper-700">
                MAE model dasar {retrainResult.citizen_signal_comparison.without.mae.toFixed(2)} ·
                MAE dengan sinyal {retrainResult.citizen_signal_comparison.with_signal.mae.toFixed(2)}
              </p>
              <p className="mt-1 text-paper-600">{retrainResult.citizen_signal_comparison.note}</p>
            </div>
          )}

          <p className="text-caption leading-relaxed text-paper-700">
            {retrainResult.citizen_signal_comparison
              ? "Varian dengan sinyal warga hanya dievaluasi berdampingan; prakiraan aktif tetap memakai model yang sudah disetujui."
              : retrainResult.improved
                ? "Model dasar baru sudah dimuat dan melayani prakiraan dashboard."
                : "Akurasi model tetap dicatat secara transparan untuk audit mutu."}
          </p>
        </div>
      )}
    </Card>
  );
}
