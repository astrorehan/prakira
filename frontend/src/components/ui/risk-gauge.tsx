import * as React from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

type RiskGaugeProps = {
  score: number; // 0 - 100
  level?: RiskLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function RiskGauge({
  score,
  level = score >= 70 ? "tinggi" : score >= 40 ? "sedang" : "rendah",
  size = "md",
  showLabel = true,
  className,
}: RiskGaugeProps) {
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Gauge dimension definitions calibrated for ample clearance inside arc
  const dimensions = {
    sm: {
      radius: 40,
      stroke: 6,
      scoreSize: "text-base font-bold",
      labelSize: "text-[7.5px] font-medium tracking-wider",
      labelMargin: "mt-0.5",
      bottomOffset: "pb-0.5",
    },
    md: {
      radius: 52,
      stroke: 7,
      scoreSize: "text-xl font-bold",
      labelSize: "text-[8px] font-medium tracking-widest",
      labelMargin: "mt-0.5",
      bottomOffset: "pb-1",
    },
    lg: {
      radius: 76,
      stroke: 9.5,
      scoreSize: "text-2xl sm:text-3xl font-bold",
      labelSize: "text-[10px] font-medium tracking-widest",
      labelMargin: "mt-1",
      bottomOffset: "pb-1.5",
    },
  }[size];

  const R = dimensions.radius;
  const S = dimensions.stroke;
  const pad = S / 2 + 4;
  const svgWidth = 2 * R + 2 * pad;
  const svgHeight = R + pad + S / 2;
  const cx = svgWidth / 2;
  const cy = R + pad;

  const circumference = Math.PI * R; // Half circle circumference
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const colorConfig = {
    rendah: {
      stroke: "#1F5132",
      text: "text-risk-low",
      bgSoft: "bg-risk-low-bg",
      border: "border-risk-low-br",
      label: "Rendah",
    },
    sedang: {
      stroke: "#D4933A",
      text: "text-risk-medium",
      bgSoft: "bg-risk-medium-bg",
      border: "border-risk-medium-br",
      label: "Waspada",
    },
    tinggi: {
      stroke: "#A8442C",
      text: "text-risk-high",
      bgSoft: "bg-risk-high-bg",
      border: "border-risk-high-br",
      label: "Siaga",
    },
  }[level];

  // SVG arc path from left (cx - R, cy) to right (cx + R, cy)
  const arcPath = `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`;

  return (
    <div className={cn("inline-flex flex-col items-center justify-center", className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: svgWidth, height: svgHeight }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="overflow-visible block"
        >
          {/* Background Arc Track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#DFE6E6"
            strokeWidth={S}
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth={S}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Score & Label inside arc */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pointer-events-none select-none",
            dimensions.bottomOffset
          )}
        >
          <span
            className={cn(
              "font-display leading-none tracking-tight",
              dimensions.scoreSize,
              colorConfig.text
            )}
          >
            {Math.round(score)}
          </span>
          <span
            className={cn(
              "uppercase text-paper-500",
              dimensions.labelMargin,
              dimensions.labelSize
            )}
          >
            Skor Risiko
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={cn(
            "mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border shadow-2xs",
            colorConfig.bgSoft,
            colorConfig.border,
            colorConfig.text
          )}
        >
          {colorConfig.label}
        </span>
      )}
    </div>
  );
}

