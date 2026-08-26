"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppleGlassDateProps extends React.HTMLAttributes<HTMLDivElement> {
  week?: string | number;
  monthYear?: string;
  dateRange?: string;
  showLivePulse?: boolean;
  liveLabel?: string;
  showCalendarIcon?: boolean;
  variant?: "default" | "compact" | "brand" | "frosted";
  size?: "sm" | "default" | "lg";
}

export function AppleGlassDate({
  week = "Minggu 34",
  monthYear = "Agustus 2026",
  dateRange,
  showLivePulse = false,
  liveLabel,
  showCalendarIcon = true,
  variant = "default",
  size = "default",
  className,
  ...props
}: AppleGlassDateProps) {
  const weekLabel = typeof week === "number" ? `Minggu ${week}` : week;

  return (
    <div
      role="status"
      aria-label={`${weekLabel}, ${monthYear}`}
      className={cn(
        "group relative inline-flex items-center select-none transition-all duration-300 ease-out",
        // Apple Liquid Glass Optics (VisionOS / iOS 18 style)
        "backdrop-blur-xl backdrop-saturate-[180%]",
        "border border-white/80 dark:border-white/20",
        // Ambient glass shadow + Specular top & bottom inner refraction highlights
        "shadow-[0_4px_20px_-2px_rgba(11,74,87,0.08),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_1.5px_0_rgba(255,255,255,0.95),inset_0_-1px_1px_0_rgba(0,0,0,0.03)]",
        // Hover & Active tactile micro-physics
        "hover:scale-[1.015] hover:bg-white/85 hover:border-white hover:shadow-[0_8px_28px_-4px_rgba(11,74,87,0.14),0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_0_rgba(255,255,255,1)]",

        // Variant styling
        variant === "default" && "bg-gradient-to-b from-white/85 via-white/60 to-white/45",
        variant === "frosted" && "bg-white/70",
        variant === "brand" && "bg-gradient-to-b from-brand-50/90 via-white/70 to-brand-50/50 border-brand-200/60",
        variant === "compact" && "bg-white/75",

        // Size styling
        size === "sm" && "gap-2 px-3 py-1 rounded-full text-xs",
        size === "default" && "gap-2.5 px-3.5 py-1.5 rounded-full text-xs",
        size === "lg" && "gap-3 px-4.5 py-2 rounded-2xl text-sm",

        className
      )}
      {...props}
    >
      {/* Specular curved reflection overlay (Apple top-edge sheen) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/60 via-white/15 to-transparent"
      />

      {/* Apple SF-style Calendar Icon Badge */}
      {showCalendarIcon && (
        <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-b from-brand-50 to-brand-100/70 border border-brand-200/70 text-brand-700 shadow-[0_1px_2px_rgba(11,74,87,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] shrink-0 transition-transform group-hover:scale-105">
          <CalendarDays className="h-3.5 w-3.5 stroke-[2]" />
        </div>
      )}

      {/* Week Pill Tag (Inner mini capsule) */}
      <div className="relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-brand-900 border border-white/90 shadow-[0_1px_2px_rgba(14,34,37,0.05),inset_0_1px_0_rgba(255,255,255,1)] font-semibold text-2xs tracking-tight shrink-0">
        <span>{weekLabel}</span>
      </div>

      {/* Apple Subtle Separator */}
      <span className="text-paper-300 font-light select-none text-xs">·</span>

      {/* Month & Year Text */}
      <span className="relative font-medium text-paper-800 tracking-tight text-xs whitespace-nowrap">
        {monthYear}
      </span>

      {/* Optional Date Range Subtitle / Tag */}
      {dateRange && (
        <>
          <span className="text-paper-300 font-light select-none text-xs">·</span>
          <span className="relative text-2xs font-medium text-paper-600 font-mono whitespace-nowrap">
            {dateRange}
          </span>
        </>
      )}

      {/* Apple Live Pulse Indicator (VisionOS / Dynamic Island style) */}
      {showLivePulse && (
        <div className="relative hidden sm:inline-flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-full bg-risk-low-bg border border-risk-low-br text-risk-low text-3xs font-medium tracking-tight shrink-0 shadow-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-risk-low" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-risk-low" />
          </span>
          <span className="font-medium text-3xs">{liveLabel}</span>
        </div>
      )}
    </div>
  );
}
