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
import { DISEASE_CONFIG } from "@/lib/utils";

type TrendChartProps = {
  data: TrendPoint[];
  disease?: DiseaseType;
  showClimateOverlay?: boolean;
  className?: string;
};

export function TrendChart({
  data,
  disease = "DBD",
  showClimateOverlay = true,
  className,
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
  const forecastColor = "#A32B1F"; // Alert Rose for high forecast or #EA580C
  const rainColor = "#17808F";

  return (
    <div className="w-full flex flex-col">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={formattedData}
            margin={{ top: 16, right: 16, bottom: 0, left: -8 }}
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
              tick={{ fill: "#5A6C6E", fontSize: 11 }}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
            />

            {/* Left Axis: Kasus Penyakit */}
            <YAxis
              yAxisId="left"
              tick={{ fill: "#5A6C6E", fontSize: 11 }}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
              width={40}
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
                      <span className="text-[10px] text-muted-foreground">{point.tanggal}</span>
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
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-paper-100">
                          <span>Confidence Interval:</span>
                          <span className="font-medium text-paper-700">
                            {point.lower_bound} - {point.upper_bound}
                          </span>
                        </div>
                      )}

                      {showClimateOverlay && (
                        <div className="flex items-center justify-between text-[11px] text-brand-700 pt-1">
                          <span>Curah Hujan:</span>
                          <span className="font-semibold">{point.curah_hujan_mm} mm</span>
                        </div>
                      )}
                    </div>

                    {isForecast && (
                      <div className="mt-2 rounded bg-risk-medium-bg px-2 py-1 text-[10px] font-medium text-risk-medium border border-risk-medium-br/60">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-paper-200/70 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm" style={{ background: primaryColor }} />
            <span className="font-medium text-foreground">Kasus Aktual (Dinkes)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 rounded-sm"
              style={{
                background: `repeating-linear-gradient(to right, ${forecastColor} 0, ${forecastColor} 3px, transparent 3px, transparent 6px)`,
              }}
            />
            <span className="font-semibold text-risk-high">Prediksi AI (XGBoost/RF)</span>
          </span>
          {showClimateOverlay && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm bg-brand-500/40" />
              <span>Curah Hujan BMKG (mm)</span>
            </span>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          * Lead time prediksi: <strong>14-28 hari ke depan</strong> (Early Warning)
        </div>
      </div>
    </div>
  );
}
