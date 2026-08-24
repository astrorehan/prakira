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

  // Circular gauge dimensions
  const dimensions = {
    sm: { radius: 36, stroke: 7, width: 90, height: 55, fontSize: "text-base" },
    md: { radius: 52, stroke: 10, width: 130, height: 80, fontSize: "text-2xl" },
    lg: { radius: 72, stroke: 13, width: 180, height: 110, fontSize: "text-3xl" },
  }[size];

  const circumference = Math.PI * dimensions.radius; // Half circle
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const colorConfig = {
    rendah: {
      stroke: "#1B6B4F",
      text: "text-risk-low",
      bgSoft: "bg-risk-low-bg",
      label: "Rendah",
    },
    sedang: {
      stroke: "#A8690C",
      text: "text-risk-medium",
      bgSoft: "bg-risk-medium-bg",
      label: "Sedang",
    },
    tinggi: {
      stroke: "#A32B1F",
      text: "text-risk-high",
      bgSoft: "bg-risk-high-bg",
      label: "Tinggi",
    },
  }[level];

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative flex items-center justify-center">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height + 10}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M ${dimensions.stroke / 2},${dimensions.height} A ${dimensions.radius},${dimensions.radius} 0 0,1 ${dimensions.width - dimensions.stroke / 2},${dimensions.height}`}
            fill="none"
            stroke="#DFE6E6"
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          <path
            d={`M ${dimensions.stroke / 2},${dimensions.height} A ${dimensions.radius},${dimensions.radius} 0 0,1 ${dimensions.width - dimensions.stroke / 2},${dimensions.height}`}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Score */}
        <div className="absolute bottom-0 flex flex-col items-center justify-center">
          <span className={cn("font-display font-semibold tracking-tight", dimensions.fontSize, colorConfig.text)}>
            {Math.round(score)}
          </span>
          <span className="text-[10px] uppercase font-medium text-muted-foreground -mt-1">
            Skor Risiko
          </span>
        </div>
      </div>

      {showLabel && (
        <span
          className={cn(
            "mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider",
            colorConfig.bgSoft,
            colorConfig.text,
          )}
        >
          {colorConfig.label}
        </span>
      )}
    </div>
  );
}
