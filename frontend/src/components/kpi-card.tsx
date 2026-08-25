import * as React from "react";
import { TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidGlassCard } from "./ui/liquid-glass-card";

type KpiCardProps = {
  label: string;
  value: string | number;
  unit?: string;
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
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 shadow-sm text-primary border border-white">
            {icon}
          </div>
        )}
      </div>

      {/* Main Value & Sparkline */}
      <div className="my-3 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
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

      {/* Footer — delta on the left, supporting figure on the right.
          `status` only renders when there is no description to show: the risk
          colour already carries the level, so the pill is a fallback, never a
          third label on top of both. */}
      {(delta || description || status !== "normal") && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-paper-200/50">
          {delta && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
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
            <span className="text-[11px] font-medium text-muted-foreground ml-auto">
              {description}
            </span>
          ) : (
            <>
              {status === "warning" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-medium ml-auto">
                  <AlertTriangle className="h-3 w-3" /> Waspada
                </span>
              )}
              {status === "danger" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-high ml-auto">
                  <AlertTriangle className="h-3 w-3" /> Siaga
                </span>
              )}
              {status === "success" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-low ml-auto">
                  <ShieldCheck className="h-3 w-3" /> Terkendali
                </span>
              )}
            </>
          )}
        </div>
      )}
    </LiquidGlassCard>
  );
}
