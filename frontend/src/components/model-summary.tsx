"use client";

import * as React from "react";
import { Calendar, Cpu, Layers, ListOrdered } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import {
  formatAlgorithmName,
  formatFeatureName,
  formatPeriodRange,
} from "@/lib/stats";
import type { BacktestMetric } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * Ringkasan model (PRD §5.7, blok pertama): algoritma, fitur, periode latih,
 * tanggal latih terakhir.
 *
 * Tiga dari empat sudah pernah tampil di kartu backtest. Yang keempat —
 * **fitur** — tidak pernah sampai ke peramban: layanan ML menghitungnya saat
 * pelatihan dan menyimpannya di `metadata.json`, tapi `/backtest` tidak pernah
 * meneruskannya. Tanpa itu halaman transparansi hanya bisa menjawab "model apa
 * yang dipakai", bukan "model ini belajar dari apa" — dan pertanyaan kedua
 * yang biasanya ditanyakan orang yang harus mempercayai angkanya.
 *
 * Bobot kepentingan ditampilkan relatif terhadap fitur teratas, bukan sebagai
 * persentase dari 100. Skala `feature_importances_` berbeda antar algoritma
 * dan jumlahnya tidak selalu satu; menyebutnya "persen" akan menjadi angka
 * yang terlihat pasti padahal tidak.
 */

type ModelSummaryProps = {
  metric: BacktestMetric;
  className?: string;
};

function MetaTile({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-border bg-paper-50 p-4">
      <div className="flex items-center gap-1.5 text-caption font-semibold text-paper-700">
        <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="text-body-sm font-semibold text-foreground">{value}</p>
      {caption && <p className="text-caption text-paper-600">{caption}</p>}
    </div>
  );
}

export function ModelSummary({ metric, className }: ModelSummaryProps) {
  const algo = formatAlgorithmName(metric.algorithm);
  const trainPeriod = formatPeriodRange(metric.train_period);
  const features = metric.top_features ?? [];
  const maxImportance = features.reduce(
    (max, f) => Math.max(max, f.importance),
    0,
  );

  return (
    <Card className={cn("space-y-5 p-6", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetaTile
          icon={Cpu}
          label="Algoritma"
          value={algo.architecture}
          caption={algo.models.join(" · ")}
        />
        <MetaTile
          icon={Calendar}
          label="Periode pelatihan"
          value={trainPeriod.formatted}
          caption={`Durasi ${trainPeriod.monthsLabel}`}
        />
        <MetaTile
          icon={Layers}
          label="Terakhir dilatih"
          value={metric.trained_at ? formatDateTime(metric.trained_at) : "—"}
          caption={`Versi ${metric.model_version}`}
        />
      </div>

      {/* Fitur — blok yang selama ini hilang dari halaman transparansi. */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <h3 className="text-h3 text-foreground">Fitur yang paling menentukan</h3>
        </div>

        {features.length === 0 ? (
          <p className="rounded-xl border border-border bg-paper-50 px-4 py-3 text-body-sm text-paper-600">
            Layanan ML belum mengirim daftar fitur untuk model ini. Jalankan ulang
            backtest setelah layanan diperbarui agar bagian ini terisi — bukan diisi
            perkiraan.
          </p>
        ) : (
          <>
            <ol className="space-y-2.5">
              {features.map((f, index) => {
                const ratio =
                  maxImportance > 0 ? (f.importance / maxImportance) * 100 : 0;

                return (
                  <li key={f.feature} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-body-sm text-foreground">
                        <span className="tabular mr-1.5 text-caption text-paper-600">
                          {index + 1}.
                        </span>
                        {formatFeatureName(f.feature)}
                      </span>
                      <span className="tabular shrink-0 text-caption text-paper-600">
                        {formatNumber(f.importance, {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-200"
                        role="img"
                        aria-label={`Kepentingan relatif ${Math.round(ratio)} persen dari fitur teratas`}
                      >
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(2, ratio)}%` }}
                        />
                      </div>
                      <Badge variant="muted" size="sm" className="shrink-0 font-mono">
                        {f.feature}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="text-caption text-paper-600">
              Panjang bar dibaca relatif terhadap fitur teratas, bukan sebagai persen
              dari total. Urutan ini menjelaskan apa yang paling menggerakkan angka
              prakiraan — bukan bukti hubungan sebab-akibat.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
