import * as React from "react";
import { CheckCircle2, Cpu, BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BacktestMetric } from "@/types";
import { LiquidGlassCard } from "./ui/liquid-glass-card";

type BacktestCardProps = {
  metrics: BacktestMetric[];
  className?: string;
};

export function BacktestCard({ metrics, className }: BacktestCardProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {metrics.map((m, idx) => (
          <LiquidGlassCard
            key={idx}
            variant={idx === 0 ? "blue" : "default"}
            interactive
            className="p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  {m.disease} · {m.model_name.split("(")[0]}
                </span>
                <span className="rounded-full bg-risk-low-bg px-2 py-0.5 text-[10px] font-semibold text-risk-low">
                  {m.accuracy_pct}% Akurasi
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold text-foreground">
                  R² = {m.r2}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground border-t border-paper-200/60 pt-2.5">
                <div className="flex justify-between">
                  <span>MAE (Mean Absolute Error):</span>
                  <span className="font-semibold text-foreground">{m.mae} kasus</span>
                </div>
                <div className="flex justify-between">
                  <span>RMSE (Root Mean Square):</span>
                  <span className="font-semibold text-foreground">{m.rmse}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jumlah Data Uji:</span>
                  <span className="font-semibold text-foreground">{m.sample_size} records</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-[10px] text-muted-foreground flex items-center gap-1.5 border-t border-paper-100">
              <CheckCircle2 className="h-3 w-3 text-risk-low shrink-0" />
              <span>{m.backtest_period}</span>
            </div>
          </LiquidGlassCard>
        ))}
      </div>

      <div className="rounded-xl border border-brand-100/80 bg-brand-50/60 p-3.5 text-xs text-brand-900 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Transparansi Model Machine Learning:</strong> Validasi model dilakukan secara berkala menggunakan metode <em>walk-forward backtesting</em> membandingkan estimasi lag-climate 1-4 minggu sebelumnya dengan rekapitulasi data riil Dinas Kesehatan.
        </p>
      </div>
    </div>
  );
}
