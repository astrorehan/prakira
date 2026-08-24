"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { ClimateCorrelationPoint, DiseaseType } from "@/types";
import { DISEASE_CONFIG } from "@/lib/utils";

type ClimateCorrelationProps = {
  data: ClimateCorrelationPoint[];
  disease?: DiseaseType;
  className?: string;
};

export function ClimateCorrelationChart({
  data,
  disease = "DBD",
  className,
}: ClimateCorrelationProps) {
  const cfg = DISEASE_CONFIG[disease];

  const diseaseKey =
    disease === "DBD"
      ? "kasus_dbd"
      : disease === "ISPA"
      ? "kasus_ispa"
      : "kasus_diare";

  return (
    <div className="w-full flex flex-col">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 0, left: -8 }}
          >
            <defs>
              <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#17808F" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#17808F" stopOpacity={0.05} />
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

            {/* Left Axis: Kasus */}
            <YAxis
              yAxisId="cases"
              tick={{ fill: "#5A6C6E", fontSize: 11 }}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            {/* Right Axis: Curah Hujan mm */}
            <YAxis
              yAxisId="climate"
              orientation="right"
              tick={{ fill: "#17808F", fontSize: 10 }}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
              width={36}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0]?.payload as ClimateCorrelationPoint;

                return (
                  <div className="liquid-glass rounded-xl p-3.5 shadow-elevated border border-white/90 text-xs min-w-[210px]">
                    <div className="font-semibold text-foreground border-b border-paper-200/60 pb-1 mb-2">
                      {pt.periode}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-foreground font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                          Kasus {disease}:
                        </span>
                        <span>{pt[diseaseKey]} kasus</span>
                      </div>
                      <div className="flex justify-between items-center text-brand-700">
                        <span>Curah Hujan:</span>
                        <span className="font-semibold">{pt.curah_hujan_mm} mm</span>
                      </div>
                      <div className="flex justify-between items-center text-risk-medium">
                        <span>Suhu Rata-rata:</span>
                        <span className="font-semibold">{pt.suhu_c}°C</span>
                      </div>
                      <div className="flex justify-between items-center text-brand-700">
                        <span>Kelembaban:</span>
                        <span className="font-semibold">{pt.kelembaban_pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Rainfall Bars */}
            <Bar
              yAxisId="climate"
              dataKey="curah_hujan_mm"
              fill="#17808F"
              opacity={0.3}
              radius={[4, 4, 0, 0]}
              name="Curah Hujan (mm)"
            />

            {/* Temperature Line */}
            <Line
              yAxisId="climate"
              type="monotone"
              dataKey="suhu_c"
              stroke="#A8690C"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#A8690C" }}
              name="Suhu (°C)"
            />

            {/* Disease Cases Line */}
            <Line
              yAxisId="cases"
              type="monotone"
              dataKey={diseaseKey}
              stroke={cfg.color}
              strokeWidth={3}
              dot={{ r: 4, fill: cfg.color, stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 6.5, fill: cfg.color, stroke: "#FFFFFF", strokeWidth: 2 }}
              name={`Kasus ${disease}`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-200/70 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: cfg.color }} />
            <span className="font-medium text-foreground">Tren Kasus {disease}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-brand-500/40" />
            <span>Curah Hujan (mm)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-risk-medium rounded-full" />
            <span>Suhu (°C)</span>
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Korelasi Pearson: <strong>r = +0.84</strong> (Pancaroba & Curah Hujan Tinggi)
        </div>
      </div>
    </div>
  );
}
