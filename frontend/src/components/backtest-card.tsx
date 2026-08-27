import * as React from "react";
import { Info } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { BacktestMetric, DiseaseType } from "@/types";
import { formatDateTime } from "@/lib/period";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * Hasil backtesting model.
 *
 * Grid ini dulu menampilkan lima kartu tetap dari `BACKTEST_METRICS`, termasuk
 * "LSTM Time-Series Deep Learning" dengan R² 0,932 dan sebuah baris untuk
 * Diare — dua model yang tidak pernah dilatih, pada satu penyakit yang tidak
 * punya dataset. Yang tampil sekarang adalah isi tabel `model_backtest`: satu
 * kartu per model yang benar-benar punya berkas `.pkl` dan benar-benar diuji.
 *
 * Konsekuensinya angkanya jadi kurang mengesankan — R² DBD 0,45, bukan 0,93.
 * PRD §7-H5 memperlakukan itu sebagai persyaratan, bukan kecelakaan: metrik
 * yang jelek tetap ditampilkan apa adanya.
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

function BacktestPanel({ metric, active }: { metric: BacktestMetric; active: boolean }) {
  return (
    <Card className={cn("p-4", active && "border-brand-300")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="overline">{metric.disease}</div>
          <div className="truncate text-body-sm font-medium text-foreground">
            {metric.algorithm ?? "Model tersimpan"}
          </div>
        </div>
        {active && <Badge variant="secondary">Sedang dilihat</Badge>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-metric text-foreground">
          {formatNumber(metric.r2, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
        </span>
        <span className="text-caption text-paper-600">R²</span>
      </div>
      <p className="mt-1 text-caption leading-relaxed text-paper-600">
        {Math.round(metric.r2 * 100)}% ragam kasus pada data uji terjelaskan oleh model.
      </p>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-2.5">
        <MetricRow
          label="MAE (galat absolut rata-rata)"
          value={`${formatNumber(metric.mae, { maximumFractionDigits: 2 })} kasus`}
        />
        <MetricRow
          label="RMSE"
          value={formatNumber(metric.rmse, { maximumFractionDigits: 2 })}
        />
        <MetricRow
          label="Akurasi kelas risiko"
          value={
            metric.class_accuracy_pct === null
              ? "belum dapat dihitung"
              : `${formatNumber(metric.class_accuracy_pct)}%`
          }
        />
        <MetricRow
          label="Bulan pada data uji"
          value={metric.sample_size === null ? "—" : `${formatNumber(metric.sample_size)} bulan`}
        />
      </dl>

      <div className="mt-3 space-y-0.5 border-t border-border pt-2 text-caption text-paper-600">
        <p>Latih: {metric.train_period ?? "—"}</p>
        <p>Uji: {metric.test_period ?? "—"}</p>
        <p className="font-mono text-overline uppercase">{metric.model_version}</p>
        <p>Diambil {formatDateTime(metric.fetched_at)}</p>
      </div>
    </Card>
  );
}

export function BacktestCard({ metrics, disease, className }: BacktestCardProps) {
  /* Penyakit aktif lebih dulu; sisanya tetap tampil supaya perbandingan antar
     model tidak hilang hanya karena filter. */
  const ordered = React.useMemo(
    () =>
      [...metrics].sort(
        (a, b) => Number(b.disease === disease) - Number(a.disease === disease),
      ),
    [metrics, disease],
  );

  if (metrics.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <p className="text-body-sm text-paper-600">
          Belum ada hasil backtesting tersimpan. Jalankan layanan ML lalu segarkan
          halaman ini.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((m) => (
          <BacktestPanel key={m.disease} metric={m} active={m.disease === disease} />
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-caption leading-relaxed text-brand-900">
          <strong className="font-semibold">Transparansi model.</strong> Data dipisah
          berdasarkan waktu: model dilatih hanya pada bulan-bulan sebelum tanggal
          pemisah, lalu diuji pada bulan-bulan sesudahnya. Prosedur ini tidak pernah
          memperlihatkan masa depan kepada model saat pelatihan. Metrik di atas
          disalin apa adanya dari layanan model, termasuk saat hasilnya kurang baik.
        </p>
      </div>
    </div>
  );
}
