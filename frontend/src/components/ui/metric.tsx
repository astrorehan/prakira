import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { COVERAGE_CONFIG, formatNumber, type DataCoverage } from "@/lib/utils";

/**
 * Metric — docs/DESIGN-SYSTEM.md §7.3
 *
 * The standard number block. `range` and `coverage` are REQUIRED, not optional:
 * a design system that makes honesty optional gets honesty dropped the week of
 * the deadline. See PRD §7-H1/H2.
 *
 * Pass `range={null}` only for quantities that genuinely have no uncertainty
 * (counts of things already observed, e.g. "12 laporan menunggu verifikasi").
 */

type Trend = "up" | "down" | "flat";

export type MetricProps = {
  /** Small-caps mono label. Keep it under ~24 characters. */
  label: string;
  value: number | string;
  unit?: string;
  /** Lower/upper prediction bound. `null` = observed quantity, no uncertainty. */
  range: { lower: number; upper: number } | null;
  /** Historical data completeness for this district. Drives the honesty label. */
  coverage: DataCoverage;
  delta?: { value: number; label?: string } | null;
  /** true when a rise is bad (cases). false when a rise is good (accuracy). */
  invertDelta?: boolean;
  sparkline?: number[];
  size?: "sm" | "md" | "lg";
  className?: string;
};

function trendOf(v: number): Trend {
  if (v > 0.05) return "up";
  if (v < -0.05) return "down";
  return "flat";
}

export function Metric({
  label,
  value,
  unit,
  range,
  coverage,
  delta,
  invertDelta = true,
  sparkline,
  size = "md",
  className,
}: MetricProps) {
  const cov = COVERAGE_CONFIG[coverage];
  const insufficient = coverage === "insufficient";

  const valueClass =
    size === "lg" ? "text-metric-xl" : size === "sm" ? "text-metric-sm" : "text-metric";

  const trend = delta ? trendOf(delta.value) : "flat";
  const bad = trend === "flat" ? false : invertDelta ? trend === "up" : trend === "down";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="overline">{label}</span>

      {insufficient ? (
        <p className="text-body-sm text-paper-500">
          Data historis tidak memadai untuk wilayah ini.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(valueClass, "tabular text-foreground")}>
              {typeof value === "number" ? formatNumber(value) : value}
            </span>
            {unit && <span className="text-body-sm font-normal text-paper-600">{unit}</span>}
          </div>

          {range && (
            <span className="font-mono text-caption tabular text-paper-500">
              {formatNumber(range.lower)} – {formatNumber(range.upper)}
              <span className="sr-only"> rentang prediksi</span>
            </span>
          )}
        </>
      )}

      {(delta || sparkline || true) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          {delta && !insufficient && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-caption font-medium tabular",
                trend === "flat"
                  ? "text-paper-500"
                  : bad
                    ? "text-risk-high"
                    : "text-risk-low",
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden />
              {delta.value > 0 ? "+" : ""}
              {delta.value.toFixed(1)}%
              {delta.label && (
                <span className="font-normal text-paper-500">{delta.label}</span>
              )}
            </span>
          )}

          {sparkline && sparkline.length > 1 && !insufficient && (
            <Sparkline values={sparkline} />
          )}

          <span
            className={cn("font-mono text-overline uppercase", cov.className)}
            title={cov.description}
          >
            Cakupan: {cov.label}
          </span>
        </div>
      )}
    </div>
  );
}

/** Bare 32px sparkline. No axis, no fill gradient — it is a texture, not a chart. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const w = 72;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`Tren ${values.length} periode terakhir`}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-paper-400" />
    </svg>
  );
}

export { Sparkline };
