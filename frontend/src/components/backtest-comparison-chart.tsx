"use client";

import * as React from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Table as TableIcon,
  Info,
} from "lucide-react";
import type { BacktestMonth, DiseaseType, RiskLevel } from "@/types";
import { cn, diseaseLabel, formatNumber, RISK_CONFIG, RISK_UNKNOWN } from "@/lib/utils";
import { formatMonth, formatMonthShort } from "@/lib/period";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type BacktestComparisonChartProps = {
  monthlyResults: BacktestMonth[];
  disease: DiseaseType;
  className?: string;
};

type TooltipPayloadItem = {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  payload: BacktestMonth & { displayMonth: string; fullMonth: string; error: number };
};

function CustomComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const actualRisk = row.risk_class_actual
    ? RISK_CONFIG[row.risk_class_actual.toLowerCase() as RiskLevel] ?? RISK_UNKNOWN
    : RISK_UNKNOWN;
  const predRisk = row.risk_class_predicted
    ? RISK_CONFIG[row.risk_class_predicted.toLowerCase() as RiskLevel] ?? RISK_UNKNOWN
    : RISK_UNKNOWN;

  const isRiskMatched =
    row.risk_class_actual &&
    row.risk_class_predicted &&
    row.risk_class_actual.toLowerCase() === row.risk_class_predicted.toLowerCase();

  const error = Math.abs(row.actual - row.predicted);
  const errorPct = row.actual > 0 ? ((error / row.actual) * 100).toFixed(1) : "0";

  return (
    <div className="min-w-[240px] rounded-xl border border-paper-200 bg-paper-0/95 p-3.5 shadow-lift backdrop-blur-md">
      <div className="border-b border-paper-200 pb-2">
        <p className="font-semibold text-paper-900">{row.fullMonth || label}</p>
        <p className="text-3xs uppercase tracking-wider text-paper-600">Evaluasi Data Uji (Blind Test)</p>
      </div>

      <div className="mt-2.5 space-y-2 text-body-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-paper-900 ring-2 ring-paper-300" />
            <span className="text-paper-700">Kasus Riil (Aktual):</span>
          </div>
          <span className="font-semibold tabular text-paper-900">
            {formatNumber(row.actual)} <span className="text-caption font-normal text-paper-600">kasus</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-brand-200" />
            <span className="text-paper-700">Prakiraan Model:</span>
          </div>
          <span className="font-semibold tabular text-brand-700">
            {formatNumber(row.predicted)} <span className="text-caption font-normal text-paper-600">kasus</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-paper-100 pt-1.5 text-caption">
          <span className="text-paper-600">Deviasi Selisih (Galat):</span>
          <span className="font-medium tabular text-paper-800">
            ±{formatNumber(error)} kasus ({errorPct}%)
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-paper-50 p-2 border border-paper-200/80">
        <div className="flex items-center justify-between text-3xs font-medium text-paper-600 mb-1">
          <span>STATUS RISIKO WILAYAH</span>
          {isRiskMatched ? (
            <span className="inline-flex items-center gap-1 font-semibold text-risk-low">
              <CheckCircle2 className="h-3 w-3" /> Cocok
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-risk-medium">
              <AlertCircle className="h-3 w-3" /> Berbeda
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-2xs">
          <div className="rounded border bg-white px-2 py-1 flex items-center justify-between" style={{ borderColor: actualRisk.color + "30" }}>
            <span className="text-paper-600">Aktual:</span>
            <span className={cn("font-semibold", actualRisk.textColor)}>{actualRisk.label}</span>
          </div>
          <div className="rounded border bg-white px-2 py-1 flex items-center justify-between" style={{ borderColor: predRisk.color + "30" }}>
            <span className="text-paper-600">Prediksi:</span>
            <span className={cn("font-semibold", predRisk.textColor)}>{predRisk.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BacktestComparisonChart({
  monthlyResults,
  disease,
  className,
}: BacktestComparisonChartProps) {
  const [viewMode, setViewMode] = React.useState<"chart" | "table">("chart");

  const chartData = React.useMemo(() => {
    return monthlyResults.map((m) => {
      const error = Math.abs(m.actual - m.predicted);
      return {
        ...m,
        displayMonth: formatMonthShort(m.month_start),
        fullMonth: formatMonth(m.month_start),
        error,
      };
    });
  }, [monthlyResults]);

  const stats = React.useMemo(() => {
    if (monthlyResults.length === 0) {
      return { total: 0, matched: 0, matchPct: 0, meanError: 0 };
    }
    const matched = monthlyResults.filter(
      (m) =>
        m.risk_class_actual &&
        m.risk_class_predicted &&
        m.risk_class_actual.toLowerCase() === m.risk_class_predicted.toLowerCase(),
    ).length;
    const totalError = monthlyResults.reduce((acc, m) => acc + Math.abs(m.actual - m.predicted), 0);
    return {
      total: monthlyResults.length,
      matched,
      matchPct: Math.round((matched / monthlyResults.length) * 100),
      meanError: Math.round((totalError / monthlyResults.length) * 10) / 10,
    };
  }, [monthlyResults]);

  if (monthlyResults.length === 0) {
    return (
      <div className={cn("rounded-xl border border-dashed border-paper-300 p-6 text-center bg-paper-50/50", className)}>
        <p className="text-body-sm text-paper-600">
          Rincian deret uji bulanan belum tersedia untuk model {diseaseLabel(disease)}.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls & Mini Summary */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-body-sm font-semibold text-paper-900">
              Perbandingan Kurva: Kasus Riil vs Hasil Prediksi Model
            </h4>
            <Badge variant="secondary" className="font-mono text-3xs">
              {stats.total} Bulan Uji
            </Badge>
          </div>
          <p className="text-caption text-paper-600">
            Total akumulasi kasus per bulan pada seluruh kecamatan selama periode data uji independen.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex rounded-lg border border-paper-200 bg-paper-100 p-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("chart")}
            className={cn(
              "h-7 gap-1.5 px-2.5 text-caption font-medium rounded-md transition-all",
              viewMode === "chart"
                ? "bg-paper-0 text-paper-900 shadow-xs hover:bg-paper-0"
                : "text-paper-600 hover:text-paper-900 hover:bg-transparent",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            <span>Grafik</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("table")}
            className={cn(
              "h-7 gap-1.5 px-2.5 text-caption font-medium rounded-md transition-all",
              viewMode === "table"
                ? "bg-paper-0 text-paper-900 shadow-xs hover:bg-paper-0"
                : "text-paper-600 hover:text-paper-900 hover:bg-transparent",
            )}
          >
            <TableIcon className="h-3.5 w-3.5" aria-hidden />
            <span>Tabel Evaluasi</span>
          </Button>
        </div>
      </div>

      {/* Main Visual: Chart Mode */}
      {viewMode === "chart" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-paper-600 border-b border-paper-100 pb-2">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-paper-900" />
                <span className="font-medium text-paper-800">Kasus Riil (Aktual)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-brand-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                <span className="font-medium text-brand-700">Prakiraan Model</span>
              </div>
            </div>
            <div className="text-3xs text-paper-600 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              <span>Arahkan kursor pada titik bulan untuk rincian deviasi</span>
            </div>
          </div>

          <div className="h-[230px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE6E6" vertical={false} />
                <XAxis
                  dataKey="displayMonth"
                  tick={{ fill: "#5A6C6E", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#DFE6E6" }}
                />
                <YAxis
                  tick={{ fill: "#5A6C6E", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatNumber(val)}
                />
                <Tooltip content={<CustomComparisonTooltip />} />
                
                {/* Actual Line - Solid dark petrol */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Kasus Aktual"
                  stroke="#0E2225"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0E2225", strokeWidth: 1.5, stroke: "#FFFFFF" }}
                  activeDot={{ r: 6, fill: "#0E2225", stroke: "#DFE6E6", strokeWidth: 2 }}
                />

                {/* Predicted Line - Dashed brand teal */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Prediksi Model"
                  stroke="#17808F"
                  strokeWidth={2.2}
                  strokeDasharray="5 5"
                  dot={{ r: 3.5, fill: "#17808F", strokeWidth: 1.5, stroke: "#FFFFFF" }}
                  activeDot={{ r: 5.5, fill: "#17808F", stroke: "#D6E9EC", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Table Mode */
        <div className="overflow-x-auto rounded-xl border border-paper-200">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-paper-200 bg-paper-50 text-caption font-semibold text-paper-700">
              <tr>
                <th className="px-3.5 py-2.5">Bulan Uji</th>
                <th className="px-3.5 py-2.5 text-right">Kasus Riil</th>
                <th className="px-3.5 py-2.5 text-right">Prediksi Model</th>
                <th className="px-3.5 py-2.5 text-right">Deviasi (Galat)</th>
                <th className="px-3.5 py-2.5 text-center">Status Aktual</th>
                <th className="px-3.5 py-2.5 text-center">Status Prediksi</th>
                <th className="px-3.5 py-2.5 text-center">Kesesuaian Risiko</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-100 bg-paper-0">
              {chartData.map((row) => {
                const actualRisk = row.risk_class_actual
                  ? RISK_CONFIG[row.risk_class_actual.toLowerCase() as RiskLevel] ?? RISK_UNKNOWN
                  : RISK_UNKNOWN;
                const predRisk = row.risk_class_predicted
                  ? RISK_CONFIG[row.risk_class_predicted.toLowerCase() as RiskLevel] ?? RISK_UNKNOWN
                  : RISK_UNKNOWN;
                const isMatched =
                  row.risk_class_actual &&
                  row.risk_class_predicted &&
                  row.risk_class_actual.toLowerCase() === row.risk_class_predicted.toLowerCase();

                return (
                  <tr key={row.month_start} className="hover:bg-paper-50/60 transition-colors">
                    <td className="px-3.5 py-2 font-medium text-paper-900">{row.fullMonth}</td>
                    <td className="px-3.5 py-2 text-right font-semibold tabular text-paper-900">
                      {formatNumber(row.actual)}
                    </td>
                    <td className="px-3.5 py-2 text-right font-semibold tabular text-brand-700">
                      {formatNumber(row.predicted)}
                    </td>
                    <td className="px-3.5 py-2 text-right tabular text-paper-600">
                      ±{formatNumber(row.error)}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border", actualRisk.bgSoft, actualRisk.border, actualRisk.textColor)}>
                        {actualRisk.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border", predRisk.bgSoft, predRisk.border, predRisk.textColor)}>
                        {predRisk.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-risk-low bg-risk-low-bg border border-risk-low-br px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Cocok
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-risk-medium bg-risk-medium-bg border border-risk-medium-br px-2 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" /> Beda
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
        <div className="rounded-xl border border-paper-200/80 bg-paper-50/80 px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-caption text-paper-600">Ketepatan Status Risiko:</span>
          <span className="text-body-sm font-semibold tabular text-risk-low">
            {stats.matched}/{stats.total} bulan ({stats.matchPct}%)
          </span>
        </div>
        <div className="rounded-xl border border-paper-200/80 bg-paper-50/80 px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-caption text-paper-600">Rata-rata Selisih Kasus:</span>
          <span className="text-body-sm font-semibold tabular text-paper-900">
            ±{formatNumber(stats.meanError)} kasus/bln
          </span>
        </div>
        <div className="rounded-xl border border-paper-200/80 bg-paper-50/80 px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-caption text-paper-600">Metode Uji:</span>
          <span className="text-caption font-semibold text-brand-700">
            Walk-Forward Blind Test
          </span>
        </div>
      </div>
    </div>
  );
}

