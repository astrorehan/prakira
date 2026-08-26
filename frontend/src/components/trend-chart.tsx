"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  Line,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { TrendPoint, DiseaseType } from "@/types";
import { DISEASE_CONFIG, cn } from "@/lib/utils";

type TrendChartProps = {
  data: TrendPoint[];
  disease?: DiseaseType;
  showClimateOverlay?: boolean;
  className?: string;
  chartHeightClass?: string;
  hideFooterLegend?: boolean;
  compact?: boolean;
};

export function TrendChart({
  data,
  disease = "DBD",
  showClimateOverlay = true,
  className,
  chartHeightClass,
  hideFooterLegend = false,
  compact = false,
}: TrendChartProps) {
  const cfg = DISEASE_CONFIG[disease];

  // Reformat data so prediction line continues smoothly from last actual point
  const formattedData = data.map((d) => ({
    ...d,
    actualDisplay: d.kasus_aktual,
    predictionDisplay: d.kasus_prediksi,
    confidenceRange:
      d.lower_bound && d.upper_bound ? [d.lower_bound, d.upper_bound] : null,
  }));

  // Find last actual point to bridge with prediction line
  const lastActualIdx = formattedData.reduce(
    (maxIdx, cur, i) => (cur.actualDisplay !== null ? i : maxIdx),
    -1,
  );
  if (lastActualIdx !== -1 && lastActualIdx < formattedData.length - 1) {
    formattedData[lastActualIdx].predictionDisplay =
      formattedData[lastActualIdx].actualDisplay;
  }

  const primaryColor = cfg.color; // e.g. #0B4A57
  const forecastColor = "#A8442C"; // Alert Terracotta for high forecast
  const rainColor = "#17808F";

  return (
    <div className={cn("w-full flex flex-col flex-1 min-h-0", className)}>
      <div className={cn("w-full relative", chartHeightClass || "h-72 sm:h-80")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
            margin={
              compact
                ? { top: 8, right: 8, bottom: 0, left: -20 }
                : { top: 16, right: 16, bottom: 0, left: -8 }
            }
          >
            <defs>
              <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={forecastColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={forecastColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#DFE6E6" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="periode"
              tick={{ fill: "#5A6C6E", fontSize: compact ? 9.5 : 11 }}
              tickMargin={compact ? 4 : 8}
              axisLine={false}
              tickLine={false}
            />

            {/* Left Axis: Kasus Penyakit */}
            <YAxis
              yAxisId="left"
              tick={{ fill: "#5A6C6E", fontSize: compact ? 9.5 : 11 }}
              tickMargin={2}
              axisLine={false}
              tickLine={false}
              width={compact ? 30 : 40}
            />

            {/* Right Axis: Curah Hujan (mm) */}
            {showClimateOverlay && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#17808F", fontSize: 10 }}
                tickMargin={4}
                axisLine={false}
                tickLine={false}
                width={36}
              />
            )}

            <Tooltip
              cursor={{ stroke: primaryColor, strokeDasharray: "2 4", strokeWidth: 1.5 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload as TrendPoint;
                const isForecast = point.kasus_aktual === null || point.periode.includes("*");

                return (
                  <div className="liquid-glass rounded-xl p-3.5 shadow-elevated border border-white/90 text-xs min-w-[200px]">
                    <div className="flex items-center justify-between gap-2 border-b border-paper-200/60 pb-1.5 mb-2">
                      <span className="font-semibold text-foreground">{point.periode}</span>
                      <span className="text-3xs text-muted-foreground">{point.tanggal}</span>
                    </div>

                    <div className="space-y-1.5">
                      {point.kasus_aktual !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-paper-600 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: primaryColor }} />
                            Kasus Aktual:
                          </span>
                          <span className="font-semibold text-foreground">{point.kasus_aktual} kasus</span>
                        </div>
                      )}

                      {point.kasus_prediksi !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-risk-high font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-risk-high" />
                            Prediksi AI:
                          </span>
                          <span className="font-semibold text-risk-high">{point.kasus_prediksi} kasus</span>
                        </div>
                      )}

                      {point.lower_bound && point.upper_bound && (
                        <div className="flex items-center justify-between text-3xs text-muted-foreground pt-1 border-t border-paper-100">
                          <span>Confidence Interval:</span>
                          <span className="font-medium text-paper-700">
                            {point.lower_bound} - {point.upper_bound}
                          </span>
                        </div>
                      )}

                      {showClimateOverlay && (
                        <div className="flex items-center justify-between text-2xs text-brand-700 pt-1">
                          <span>Curah Hujan:</span>
                          <span className="font-semibold">{point.curah_hujan_mm} mm</span>
                        </div>
                      )}
                    </div>

                    {isForecast && (
                      <div className="mt-2 rounded bg-risk-medium-bg px-2 py-1 text-3xs font-medium text-risk-medium border border-risk-medium-br/60">
                        Proyeksi Model ML (Lead Time 2-4 Minggu)
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Climate Rainfall Bars */}
            {showClimateOverlay && (
              <Bar
                yAxisId="right"
                dataKey="curah_hujan_mm"
                fill={rainColor}
                opacity={0.18}
                radius={[4, 4, 0, 0]}
                name="Curah Hujan (mm)"
              />
            )}

            {/* Actual Area + Line */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="actualDisplay"
              stroke="transparent"
              fill="url(#actualAreaGrad)"
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="actualDisplay"
              stroke={primaryColor}
              strokeWidth={2.8}
              dot={{ r: 3.5, fill: primaryColor, stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: primaryColor, stroke: "#FFFFFF", strokeWidth: 2 }}
              name="Kasus Aktual"
              connectNulls
            />

            {/* Forecast Area + Dotted Line */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="predictionDisplay"
              stroke="transparent"
              fill="url(#forecastAreaGrad)"
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="predictionDisplay"
              stroke={forecastColor}
              strokeWidth={2.8}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: "#FFFFFF", stroke: forecastColor, strokeWidth: 2.5 }}
              activeDot={{ r: 6.5, fill: forecastColor, stroke: "#FFFFFF", strokeWidth: 2.5 }}
              name="Prediksi Model (2-4 Mgg)"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Indicator Footer */}
      {!hideFooterLegend && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-200/70 pt-2.5 text-xs",
            compact && "mt-2 pt-2 text-2xs gap-2"
          )}
        >
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3.5 rounded-xs" style={{ background: primaryColor }} />
              <span className="font-medium text-foreground">Aktual</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-3.5 rounded-xs"
                style={{
                  background: `repeating-linear-gradient(to right, ${forecastColor} 0, ${forecastColor} 2.5px, transparent 2.5px, transparent 5px)`,
                }}
              />
              <span className="font-semibold text-risk-high">Proyeksi 2–4 minggu</span>
            </span>
            {showClimateOverlay && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-xs bg-brand-500/40" />
                <span>Hujan BMKG</span>
              </span>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
