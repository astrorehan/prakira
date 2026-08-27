"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClimatePoint, DiseaseType } from "@/types";
import { cn, CLIMATE_COLORS, diseaseProfile } from "@/lib/utils";
import { formatMonthShort } from "@/lib/period";
import { climateCorrelations, type Correlation } from "@/lib/stats";

/**
 * Kasus vs satu variabel iklim.
 *
 * Versi sebelumnya menumpuk curah hujan (100–300 mm) dan suhu (28–30 °C) pada
 * satu sumbu kanan, sehingga garis suhu menjadi garis datar di dasar grafik dan
 * tidak menyampaikan apa pun; kelembaban malah hanya muncul di tooltip dan
 * tabel, tidak pernah tergambar. Sekarang variabel iklim dipilih satu per satu
 * dan mendapat sumbunya sendiri, dengan `r` tiap variabel tercetak di
 * pemilihnya — jadi pertanyaan "iklim mana yang menjelaskan penyakit ini"
 * dijawab oleh kendalinya sendiri, bukan oleh satu angka tetap di kaki grafik.
 *
 * Warna variabel iklim terkunci di `CLIMATE_COLORS` (§2.5). Hex mentah
 * (`#17808F`, `#EA580C`) yang dulu ditulis langsung di sini bahkan bukan warna
 * palet.
 *
 * Deret masuk sebagai `ClimatePoint` dari gateway: kasus per penyakit dibawa
 * dalam peta `kasus`, bukan tiga kolom tetap `kasus_dbd`/`kasus_ispa`/
 * `kasus_diare`. Bentuk lamanya memaksa setiap penyakit baru menyentuh berkas
 * ini, dan memaksa "Diare" tetap ada sebagai kolom kosong.
 */

type ClimateKey = "rain" | "temp" | "humid";

const VARIABLES: {
  key: ClimateKey;
  label: string;
  dataKey: "curah_hujan_mm" | "suhu_c" | "kelembaban_pct";
  unit: string;
  color: string;
  /** Curah hujan adalah akumulasi — batang. Suhu & kelembaban kontinu — garis. */
  shape: "bar" | "line";
}[] = [
  {
    key: "rain",
    label: "Curah hujan",
    dataKey: "curah_hujan_mm",
    unit: "mm",
    color: CLIMATE_COLORS.rain,
    shape: "bar",
  },
  {
    key: "temp",
    label: "Suhu",
    dataKey: "suhu_c",
    unit: "°C",
    color: CLIMATE_COLORS.temp,
    shape: "line",
  },
  {
    key: "humid",
    label: "Kelembaban",
    dataKey: "kelembaban_pct",
    unit: "%",
    color: CLIMATE_COLORS.humid,
    shape: "line",
  },
];

const AXIS_TICK = { fill: "#A3B2B3", fontSize: 11 };

type ClimateCorrelationProps = {
  data: ClimatePoint[];
  disease: DiseaseType;
  className?: string;
};

type ChartRow = {
  periode: string;
  periodeLabel: string;
  curah_hujan_mm: number;
  suhu_c: number;
  kelembaban_pct: number;
  kasus: number;
};

export function ClimateCorrelationChart({
  data,
  disease,
  className,
}: ClimateCorrelationProps) {
  const [active, setActive] = React.useState<ClimateKey>("rain");

  const cfg = diseaseProfile(disease);

  /* Bulan yang salah satu variabelnya kosong dibuang, bukan diisi nol:
     korelasi yang dihitung dari nol palsu bukan korelasi. */
  const rows = React.useMemo<ChartRow[]>(
    () =>
      data
        .filter(
          (d) =>
            d.curah_hujan_mm !== null &&
            d.suhu_c !== null &&
            d.kelembaban_pct !== null &&
            typeof d.kasus[disease] === "number",
        )
        .map((d) => ({
          periode: d.periode,
          periodeLabel: formatMonthShort(d.periode),
          curah_hujan_mm: d.curah_hujan_mm as number,
          suhu_c: d.suhu_c as number,
          kelembaban_pct: d.kelembaban_pct as number,
          kasus: d.kasus[disease],
        })),
    [data, disease],
  );

  const correlations = React.useMemo(
    () => climateCorrelations(rows, rows.map((d) => d.kasus)),
    [rows],
  );

  const byKey = React.useMemo(
    () => Object.fromEntries(correlations.map((c) => [c.key, c])) as Record<ClimateKey, Correlation>,
    [correlations],
  );

  const variable = VARIABLES.find((v) => v.key === active) ?? VARIABLES[0];
  const activeCorrelation = byKey[active];

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {/* Pemilih variabel iklim — sekaligus ringkasan korelasi tiap variabel. */}
      <div
        role="tablist"
        aria-label="Variabel iklim yang dibandingkan"
        className="flex flex-wrap gap-1.5"
      >
        {VARIABLES.map((v) => {
          const c = byKey[v.key];
          const selected = v.key === active;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(v.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors duration-fast ease-out",
                selected
                  ? "border-paper-300 bg-surface shadow-xs"
                  : "border-transparent bg-paper-100 hover:bg-paper-200/70",
              )}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: v.color }}
              />
              <span
                className={cn(
                  "text-body-sm font-medium",
                  selected ? "text-foreground" : "text-paper-600",
                )}
              >
                {v.label}
              </span>
              <span
                className={cn(
                  "tabular text-caption",
                  selected ? "text-foreground" : "text-paper-600",
                )}
              >
                r = {c.display}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: -8 }}>
            {/* Kisi horizontal saja (§7.9). */}
            <CartesianGrid stroke="#DFE6E6" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="periodeLabel"
              tick={AXIS_TICK}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              yAxisId="cases"
              tick={AXIS_TICK}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
              width={44}
              label={{
                value: "Kasus",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                style: { fill: "#7C8D8F", fontSize: 11 },
              }}
            />

            <YAxis
              yAxisId="climate"
              orientation="right"
              tick={{ ...AXIS_TICK, fill: variable.color }}
              tickMargin={4}
              axisLine={false}
              tickLine={false}
              width={46}
              domain={variable.key === "rain" ? [0, "auto"] : ["auto", "auto"]}
              label={{
                value: variable.unit,
                position: "insideTopRight",
                offset: -8,
                style: { fill: variable.color, fontSize: 11 },
              }}
            />

            <Tooltip
              cursor={{ stroke: "#C9D4D4", strokeWidth: 1 }}
              content={({ active: hovered, payload }) => {
                if (!hovered || !payload?.length) return null;
                const pt = payload[0]?.payload as ChartRow;

                return (
                  <div className="min-w-[220px] rounded-xl border border-border bg-surface p-3.5 shadow-pop">
                    <div className="mb-2 border-b border-border pb-1 text-body-sm font-semibold text-foreground">
                      {pt.periodeLabel}
                    </div>
                    <dl className="space-y-1.5 text-caption">
                      <div className="flex items-center justify-between gap-4 font-semibold text-foreground">
                        <dt className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: cfg.color }}
                          />
                          Kasus {disease}
                        </dt>
                        <dd className="tabular">{pt.kasus}</dd>
                      </div>
                      {VARIABLES.map((v) => (
                        <div
                          key={v.key}
                          className={cn(
                            "flex items-center justify-between gap-4",
                            v.key === active ? "text-foreground" : "text-paper-600",
                          )}
                        >
                          <dt className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 rounded-full"
                              style={{ background: v.color }}
                            />
                            {v.label}
                          </dt>
                          <dd className="tabular font-medium">
                            {pt[v.dataKey]} {v.unit}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              }}
            />

            {variable.shape === "bar" ? (
              <Bar
                yAxisId="climate"
                dataKey={variable.dataKey as string}
                fill={variable.color}
                opacity={0.28}
                radius={[4, 4, 0, 0]}
                name={`${variable.label} (${variable.unit})`}
                isAnimationActive={false}
              />
            ) : (
              <Line
                yAxisId="climate"
                type="monotone"
                dataKey={variable.dataKey as string}
                stroke={variable.color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: variable.color }}
                name={`${variable.label} (${variable.unit})`}
                isAnimationActive={false}
              />
            )}

            <Line
              yAxisId="cases"
              type="monotone"
              dataKey="kasus"
              stroke={cfg.color}
              strokeWidth={3}
              dot={{ r: 4, fill: cfg.color, stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 6.5, fill: cfg.color, stroke: "#FFFFFF", strokeWidth: 2 }}
              name={`Kasus ${disease}`}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-4 text-caption text-paper-600">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full"
              style={{ background: cfg.color }}
            />
            <span className="font-medium text-foreground">Kasus {disease}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("shrink-0", variable.shape === "bar" ? "h-3 w-3 rounded-sm" : "h-0.5 w-4 rounded-full")}
              style={{ background: variable.color, opacity: variable.shape === "bar" ? 0.4 : 1 }}
            />
            <span>
              {variable.label} ({variable.unit})
            </span>
          </span>
        </div>

        {/* Angka korelasi dihitung dari deret yang sedang tergambar. */}
        <p className="tabular text-caption text-paper-600">
          Pearson {variable.label.toLowerCase()} vs kasus {disease}:{" "}
          <strong className="text-foreground">r = {activeCorrelation.display}</strong> ·{" "}
          {activeCorrelation.strength} · {activeCorrelation.significance} · n ={" "}
          {activeCorrelation.n}
        </p>
      </div>
    </div>
  );
}
