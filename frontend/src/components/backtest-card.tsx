import * as React from "react";
import { Info } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { BacktestMetric, DiseaseType } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * Hasil backtesting model.
 *
 * Dua perbaikan:
 *
 * 1. Kartu pertama dulu diberi varian `blue` karena posisinya indeks 0 —
 *    penonjolan berdasarkan urutan berkas, bukan berdasarkan arti. Sekarang
 *    yang ditonjolkan adalah penyakit yang sedang dipilih di halaman, sehingga
 *    pemilih penyakit akhirnya juga mengendalikan bagian ini. Sebelumnya
 *    memilih ISPA mengubah grafik tetapi meninggalkan sorotan di DBD.
 * 2. `R²` berdiri sebagai angka besar tanpa keterangan. R² 0,89 pada model
 *    deret waktu berarti "89% ragam kasus historis terjelaskan" — kalimat itu
 *    sekarang ikut tercetak, karena angka evaluasi model dibaca juga oleh
 *    pembaca yang bukan statistikawan.
 */

type BacktestCardProps = {
  metrics: BacktestMetric[];
  /** Penyakit yang sedang aktif di halaman. Menentukan kartu mana yang utama. */
  disease: DiseaseType;
  className?: string;
};

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-paper-600">{label}</dt>
      <dd className="tabular text-caption font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function BacktestPanel({
  metric,
  active,
  best,
}: {
  metric: BacktestMetric;
  /** Penyakit ini yang sedang dipilih di halaman. */
  active: boolean;
  /** Model dengan R² tertinggi di antara model penyakit aktif. */
  best: boolean;
}) {
  return (
    <Card className={cn("p-4", active && "border-brand-300")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="overline">{metric.disease}</div>
          <div className="truncate text-body-sm font-medium text-foreground">
            {metric.model_name}
          </div>
        </div>
        {/* Satu lencana untuk satu kartu. Menandai ketiga model DBD dengan
            "sedang dilihat" tidak memberi tahu apa pun — yang berguna adalah
            model mana yang terbaik di antara mereka. */}
        {best && <Badge variant="secondary">R² tertinggi</Badge>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-metric text-foreground">
          {formatNumber(metric.r2, { minimumFractionDigits: 2 })}
        </span>
        <span className="text-caption text-paper-600">R²</span>
      </div>
      <p className="mt-1 text-caption leading-relaxed text-paper-600">
        {Math.round(metric.r2 * 100)}% ragam kasus historis terjelaskan oleh model.
      </p>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-2.5">
        <MetricRow label="MAE (galat absolut rata-rata)" value={`${formatNumber(metric.mae)} kasus`} />
        <MetricRow label="RMSE" value={formatNumber(metric.rmse)} />
        <MetricRow label="Akurasi arah tren" value={`${formatNumber(metric.accuracy_pct)}%`} />
        <MetricRow label="Jumlah data uji" value={`${formatNumber(metric.sample_size)} record`} />
      </dl>

      <p className="mt-3 border-t border-border pt-2 text-caption text-paper-600">
        {metric.backtest_period}
      </p>
    </Card>
  );
}

export function BacktestCard({ metrics, disease, className }: BacktestCardProps) {
  /* Penyakit aktif lebih dulu; sisanya tetap tampil supaya perbandingan antar
     model tidak hilang hanya karena filter. */
  const ordered = React.useMemo(
    () => [...metrics].sort((a, b) => Number(b.disease === disease) - Number(a.disease === disease)),
    [metrics, disease],
  );

  const bestModel = React.useMemo(() => {
    const forDisease = metrics.filter((m) => m.disease === disease);
    return forDisease.reduce<BacktestMetric | null>(
      (best, m) => (best === null || m.r2 > best.r2 ? m : best),
      null,
    );
  }, [metrics, disease]);

  if (metrics.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <p className="text-body-sm text-paper-600">
          Belum ada hasil backtesting untuk periode ini.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ordered.map((m) => (
          <BacktestPanel
            key={`${m.disease}-${m.model_name}`}
            metric={m}
            active={m.disease === disease}
            best={m === bestModel}
          />
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-caption leading-relaxed text-brand-900">
          <strong className="font-semibold">Transparansi model.</strong> Validasi memakai{" "}
          <em>walk-forward backtesting</em>: model dilatih pada data sampai minggu ke-n, diminta
          memprediksi minggu ke-(n+2) hingga (n+4), lalu hasilnya dibandingkan dengan rekapitulasi
          riil Dinas Kesehatan. Prosedur ini tidak pernah memperlihatkan masa depan kepada model
          saat pelatihan.
        </p>
      </div>
    </div>
  );
}
