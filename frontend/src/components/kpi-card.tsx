import * as React from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn, COVERAGE_CONFIG, formatRange, type DataCoverage } from "@/lib/utils";
import { LiquidGlassCard } from "./ui/liquid-glass-card";

/**
 * KpiCard — docs/DESIGN-SYSTEM.md §7.5
 *
 * `range` and `coverage` are REQUIRED, exactly as on <Metric> (§7.3): a design
 * system that makes honesty optional gets honesty dropped the week of the
 * deadline. Pass `range={null}` only for observed quantities that genuinely
 * carry no uncertainty (counts of things already recorded).
 */
type KpiCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  /** Lower/upper prediction bound. `null` = observed quantity, no uncertainty. */
  range: { lower: number; upper: number } | null;
  /** Historical data completeness behind this figure. Drives the honesty label. */
  coverage: DataCoverage;
  delta?: string | null;
  positive?: boolean; // In epidemiology: positive=true usually means improvement (e.g. cases down or high accuracy)
  status?: "normal" | "warning" | "danger" | "success";
  variant?: "glass" | "glass-blue" | "solid" | "risk-high" | "risk-medium" | "risk-low";
  icon?: React.ReactNode;
  description?: string;
  sparkline?: number[];
  index?: number;
  className?: string;
};

export function KpiCard({
  label,
  value,
  unit,
  range,
  coverage,
  delta,
  positive = true,
  status = "normal",
  variant = "glass",
  icon,
  description,
  sparkline,
  index = 0,
  className,
}: KpiCardProps) {
  // Map variant
  const cardVariant =
    variant === "glass"
      ? "default"
      : variant === "glass-blue"
      ? "blue"
      : variant === "solid"
      ? "solid"
      : variant;

  const cov = COVERAGE_CONFIG[coverage];
  /* A figure the model cannot stand behind is not shown as a number. It is not
     zero, and it is never quietly rendered as if the data were complete. */
  const insufficient = coverage === "insufficient";

  return (
    <LiquidGlassCard
      variant={cardVariant}
      interactive
      className={cn(
        "group flex flex-col justify-between p-5 transition-all duration-300 animate-fade-in-up",
        `stagger-${Math.min(index + 1, 6)}`,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <span className="overline">{label}</span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 shadow-sm text-primary border border-white">
            {icon}
          </div>
        )}
      </div>

      {/* Main Value & Sparkline */}
      {insufficient ? (
        <p className="my-3 text-body-sm text-paper-600">
          Data historis tidak memadai untuk menghasilkan angka yang dapat
          dipertanggungjawabkan.
        </p>
      ) : (
        <div className="my-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-metric tabular text-foreground md:text-metric-xl">
                {value}
              </span>
              {unit && <span className="text-body-sm text-paper-600">{unit}</span>}
            </div>

            {/* Prediction bounds. Never optional on a forecast (PRD §7-H1). */}
            {range && (
              <span className="font-mono text-caption tabular text-paper-600">
                {formatRange(range.lower, range.upper)}
                <span className="sr-only"> rentang prediksi</span>
              </span>
            )}
          </div>

          {/* Mini Sparkline Bar Chart if provided */}
          {sparkline && sparkline.length > 0 && (
            <div className="flex items-end gap-1 h-8 pb-1">
              {sparkline.map((val, i) => {
                const maxVal = Math.max(...sparkline, 1);
                const heightPct = Math.max(15, (val / maxVal) * 100);
                return (
                  <div
                    key={i}
                    style={{ height: `${heightPct}%` }}
                    className={cn(
                      "w-1.5 rounded-t-sm transition-all group-hover:opacity-100",
                      i === sparkline.length - 1
                        ? "bg-primary"
                        : "bg-primary/30",
                    )}
                    title={`Titik ${i + 1}: ${val}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer — delta on the left, supporting figure on the right.
          `status` only renders when there is no description to show: the risk
          colour already carries the level, so the pill is a fallback, never a
          third label on top of both. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1 border-t border-paper-200/50">
        {delta && !insufficient && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium",
              positive
                ? "bg-risk-low-bg text-risk-low border border-risk-low-br/60"
                : "bg-risk-high-bg text-risk-high border border-risk-high-br/60",
            )}
          >
            {positive ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" />
            )}
            <span>{delta}</span>
          </div>
        )}

        {description ? (
          <span className="text-caption font-medium text-paper-600 ml-auto">
            {description}
          </span>
        ) : (
          <>
            {status === "warning" && !insufficient && (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-risk-medium ml-auto">
                <AlertTriangle className="h-3 w-3" /> Waspada
              </span>
            )}
            {status === "danger" && !insufficient && (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-risk-high ml-auto">
                <AlertTriangle className="h-3 w-3" /> Siaga
              </span>
            )}
            {status === "success" && !insufficient && (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-risk-low ml-auto">
                <ShieldCheck className="h-3 w-3" /> Terkendali
              </span>
            )}
          </>
        )}

        {/* Data coverage. Always present, on its own row when the footer wraps:
            the reader should never have to hunt for how solid the figure is. */}
        <span
          className={cn("basis-full font-mono text-overline uppercase", cov.className)}
          title={cov.description}
        >
          Cakupan data: {cov.label}
        </span>
      </div>
    </LiquidGlassCard>
  );
}
