"use client";

import * as React from "react";
import { Crosshair, Ruler, TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatPeriodRange } from "@/lib/stats";
import type { BacktestMetric } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * Dua pertanyaan yang tidak bisa dijawab MAE sendirian.
 *
 * **"Kenapa tidak pakai rata-rata saja?"** Sebuah model dengan MAE 0,36
 * kasus/bulan terdengar mengesankan sampai diketahui bahwa menebak rata-rata
 * historis kecamatan pun mencapai 0,33. Blok pertama menaruh model
 * berdampingan dengan tiga tebakan yang tidak butuh model sama sekali, diukur
 * pada periode uji yang sama. Modelnya menang di DBD dan kalah di dua penyakit
 * lain, dan keduanya ditampilkan — halaman yang sudah menjawab pertanyaan ini
 * lebih kuat daripada halaman yang menghindarinya (PRD §7-H5).
 *
 * **"Angka rentangnya dari mana?"** Blok kedua. Rentang prakiraan dikalibrasi
 * dari galat yang benar-benar teramati, lalu cakupannya diperiksa pada periode
 * uji yang tidak pernah ikut dikalibrasi. Yang dipajang bukan janjinya
 * melainkan hasil pemeriksaannya.
 */

type ModelBenchmarkProps = {
  metric: BacktestMetric;
  className?: string;
};

function pct(value: number): string {
  return `${formatNumber(value * 100, { maximumFractionDigits: 1 })}%`;
}

function mae(value: number): string {
  /* Skala MAE berbeda tiga orde antar penyakit — 0,36 kasus untuk
     Leptospirosis, 408 untuk ISPA. Presisi tetap dua desimal akan menuliskan
     "408,00" yang menyiratkan ketelitian yang tidak ada. */
  const digits = Math.abs(value) >= 100 ? 0 : 2;
  return formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function BaselineTable({ metric }: { metric: BacktestMetric }) {
  const comparison = metric.baselines;
  const summary = comparison?.summary ?? null;
  const rows = Object.entries(comparison?.baselines ?? {});
  if (!summary || rows.length === 0) return null;

  const beats = summary.model_beats_all_baselines;

  /* Model dan pembanding diurutkan bersama menurut MAE, bukan ditaruh model di
     atas lalu pembanding di bawah. Peringkat yang tersusun sendiri lebih sulit
     disalahbaca daripada peringkat yang harus dihitung pembacanya. */
  const ranked = [
    { key: "model", label: "Model PRAKIRA", mae: metric.mae, r2: metric.r2, isModel: true },
    ...rows.map(([key, b]) => ({
      key,
      label: b.label,
      mae: b.mae,
      r2: b.r2,
      isModel: false,
    })),
  ].sort((a, b) => a.mae - b.mae);

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-body font-semibold text-foreground">
            <Crosshair className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            Dibandingkan tebakan tanpa model
          </h3>
          <p className="text-body-sm leading-relaxed text-paper-600">
            Tiga cara memprakirakan yang tidak memerlukan pembelajaran mesin,
            dinilai pada periode uji yang sama persis. Statistiknya hanya diambil
            dari periode latih, jadi tidak ada pembanding yang diam-diam sudah
            tahu jawabannya.
          </p>
        </div>
        <Badge variant={beats ? "risk-low" : "risk-medium"} size="lg">
          {beats ? (
            <TrendingUp aria-hidden="true" />
          ) : (
            <TrendingDown aria-hidden="true" />
          )}
          {beats ? "Model unggul" : "Model kalah"}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-body-sm">
          <caption className="sr-only">
            Perbandingan galat rata-rata model terhadap tiga pembanding naif,
            terkecil lebih dulu.
          </caption>
          <thead>
            <tr className="border-b border-border text-caption uppercase tracking-wide text-paper-600">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">
                Cara memprakirakan
              </th>
              <th scope="col" className="py-2 px-3 text-right font-semibold">
                MAE
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                R²
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-border/60 last:border-0",
                  row.isModel && "bg-brand-50/70",
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "py-2.5 pr-3 text-left font-medium",
                    row.isModel ? "text-brand-900 font-semibold" : "text-paper-700",
                  )}
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    "py-2.5 px-3 text-right tabular-nums",
                    row.isModel ? "font-semibold text-brand-900" : "text-paper-700",
                  )}
                >
                  {mae(row.mae)}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-paper-700">
                  {formatNumber(row.r2, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rounded-xl border border-border bg-paper-50 p-4 text-body-sm leading-relaxed text-paper-700">
        {beats ? (
          <>
            Pembanding terkuat adalah{" "}
            <span className="font-semibold text-foreground">
              {summary.best_baseline_label.toLowerCase()}
            </span>{" "}
            dengan MAE {mae(summary.best_baseline_mae)}. Model meleset{" "}
            <span className="font-semibold text-foreground">
              {formatNumber(summary.mae_improvement_pct, {
                maximumFractionDigits: 1,
              })}
              % lebih kecil
            </span>{" "}
            daripada itu, jadi pemodelannya memang menambah sesuatu.
          </>
        ) : (
          <>
            Pembanding terkuat adalah{" "}
            <span className="font-semibold text-foreground">
              {summary.best_baseline_label.toLowerCase()}
            </span>{" "}
            dengan MAE {mae(summary.best_baseline_mae)} — lebih kecil daripada
            MAE model, {mae(summary.model_mae)}. Untuk penyakit ini, pemodelannya
            belum terbukti menambah apa pun di atas tebakan sederhana itu, dan
            prakiraannya sebaiknya dibaca sebagai indikasi kasar saja.
          </>
        )}
      </p>
    </Card>
  );
}

function CalibrationPanel({ metric }: { metric: BacktestMetric }) {
  const c = metric.conformal;
  if (!c) return null;

  const gap = c.empirical_coverage - c.target_coverage;
  /* Cakupan di bawah target berarti rentangnya terlalu sempit — kenyataan
     lebih sering keluar daripada yang dijanjikan labelnya. Di atas target
     berarti terlalu lebar: aman, tapi kurang tajam. Hanya arah pertama yang
     perlu ditandai sebagai peringatan. */
  const short = gap < -0.02;
  const calibration = formatPeriodRange(c.calibration_period);

  return (
    <Card className="space-y-5 p-6">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-body font-semibold text-foreground">
          <Ruler className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          Seberapa sering kenyataan masuk ke dalam rentang
        </h3>
        <p className="text-body-sm leading-relaxed text-paper-600">
          Setiap prakiraan disertai rentang, misalnya “3 kasus (2–4)”. Lebarnya
          tidak diperkirakan, melainkan dikalibrasi dari galat yang benar-benar
          dialami model pada bulan-bulan yang belum pernah dilihatnya.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1 rounded-xl border border-border bg-paper-50 p-4">
          <p className="text-caption font-semibold text-paper-700">Dijanjikan</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {pct(c.target_coverage)}
          </p>
          <p className="text-caption text-paper-600">Target saat kalibrasi</p>
        </div>
        <div
          className={cn(
            "space-y-1 rounded-xl border p-4",
            short
              ? "border-risk-medium-br bg-risk-medium-bg"
              : "border-risk-low-br bg-risk-low-bg",
          )}
        >
          <p className="text-caption font-semibold text-paper-700">Tercapai</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              short ? "text-risk-medium" : "text-risk-low",
            )}
          >
            {pct(c.empirical_coverage)}
          </p>
          <p className="text-caption text-paper-600">
            Dari {formatNumber(c.n_evaluated)} bulan × kecamatan pada periode uji
          </p>
        </div>
        <div className="space-y-1 rounded-xl border border-border bg-paper-50 p-4">
          <p className="text-caption font-semibold text-paper-700">Lebar khas</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            ±{mae(c.median_width / 2)}
          </p>
          <p className="text-caption text-paper-600">
            Median lebar rentang, dalam kasus per bulan
          </p>
        </div>
      </div>

      <p className="rounded-xl border border-border bg-paper-50 p-4 text-body-sm leading-relaxed text-paper-700">
        {short ? (
          <>
            Rentangnya{" "}
            <span className="font-semibold text-foreground">terlalu sempit</span>:
            ia menampung kenyataan lebih jarang daripada yang dijanjikan
            labelnya. Baca rentang ini sebagai batas bawah ketidakpastian, bukan
            batas atasnya.
          </>
        ) : (
          <>
            Rentangnya menampung kenyataan lebih sering daripada yang dijanjikan
            — arah yang aman, tapi berarti ia sedikit lebih lebar daripada yang
            perlu.
          </>
        )}{" "}
        Kalibrasinya memakai {formatNumber(c.n_calibration)} pengamatan dari{" "}
        {calibration.formatted}, digulirkan maju dalam{" "}
        {c.n_folds ?? "beberapa"} tahap sehingga mencakup musim hujan maupun
        kemarau. Periode uji tidak pernah ikut dikalibrasi, jadi angka “tercapai”
        di atas adalah pemeriksaan yang sesungguhnya, bukan pengukuran diri
        sendiri.
      </p>
    </Card>
  );
}

export function ModelBenchmark({ metric, className }: ModelBenchmarkProps) {
  if (!metric.baselines?.summary && !metric.conformal) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-2", className)}>
      <BaselineTable metric={metric} />
      <CalibrationPanel metric={metric} />
    </div>
  );
}
