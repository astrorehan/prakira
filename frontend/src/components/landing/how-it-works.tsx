"use client";

import * as React from "react";
import { useMemo } from "react";
import { CLIMATE_COLORS } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";
import { fetchClimateSeries, fetchTrend } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useCityData } from "@/lib/use-city-data";
import type { ClimatePoint, TrendPoint } from "@/types";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Tiga panel yang menjelaskan cara kerja model.
 *
 * Ketiganya dulu menggambar `CLIMATE_CORRELATION_DATA` dan `TREND_DATA.DBD` —
 * dua konstanta yang ditulis tangan. Karena panel-panel ini adalah bagian
 * halaman yang berjanji "Prakira tidak menebak", menggambarnya dari angka
 * karangan adalah kontradiksi yang paling mahal di seluruh produk. Sekarang
 * ketiganya membaca deret yang sama dengan konsol.
 */

/* Charts share one coordinate space so the three panels line up optically. */
const W = 280;
const H = 96;
const PAD = 4;

function scale(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
}

function xAt(i: number, n: number) {
  return PAD + (i / (n - 1)) * (W - PAD * 2);
}

type ChartProps = {
  play: boolean;
  series: ClimatePoint[];
  trend: TrendPoint[];
  disease: string;
};

/** Panel tanpa data menampilkan alasannya, bukan sumbu kosong. */
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-sand-200 px-3 text-center">
      <p className="text-3xs text-paper-600">{label}</p>
    </div>
  );
}

function linePath(values: number[]) {
  const y = scale(values);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i, values.length).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
}

/* ── 1. Masukan iklim: curah hujan bulanan ───────────────────────────────── */
function RainfallBars({ play, series }: ChartProps) {
  const data = series.filter((d) => d.curah_hujan_mm !== null);
  if (data.length === 0) return <EmptyChart label="Data curah hujan belum tersedia." />;

  const max = Math.max(...data.map((d) => d.curah_hujan_mm as number));
  const bw = (W - PAD * 2) / data.length - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img"
      aria-label="Curah hujan bulanan Kota Semarang selama 12 bulan">
      <defs>
        <linearGradient id="grad-rain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3F86A6" />
          <stop offset="100%" stopColor="#2E6F8E" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const h = ((d.curah_hujan_mm as number) / max) * (H - PAD * 2);
        return (
          <rect
            key={d.periode}
            x={PAD + i * ((W - PAD * 2) / data.length)}
            y={H - PAD - h}
            width={bw}
            height={play ? h : 0}
            rx="2"
            fill="url(#grad-rain)"
            style={{
              transition: `height 700ms var(--ease-out) ${i * 45}ms, y 700ms var(--ease-out) ${i * 45}ms`,
            }}
          />
        );
      })}
    </svg>
  );
}

/* ── 2. Polanya: hujan mendahului kasus ──────────────────────────────────── */
function LagLines({ play, series, disease }: ChartProps) {
  const data = useMemo(
    () =>
      series.filter(
        (d) => d.curah_hujan_mm !== null && typeof d.kasus[disease] === "number",
      ),
    [series, disease],
  );

  const rain = useMemo(
    () => (data.length > 1 ? linePath(data.map((d) => d.curah_hujan_mm as number)) : ""),
    [data],
  );
  const cases = useMemo(
    () => (data.length > 1 ? linePath(data.map((d) => d.kasus[disease])) : ""),
    [data, disease],
  );

  if (data.length < 2) return <EmptyChart label="Deret iklim–kasus belum cukup panjang." />;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img"
      aria-label="Curah hujan mendahului kenaikan kasus DBD sekitar satu bulan">
      <defs>
        <linearGradient id="grad-cases" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C95E42" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C95E42" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${cases} L${W - PAD} ${H - PAD} L${PAD} ${H - PAD} Z`}
        fill="url(#grad-cases)"
        opacity={play ? 1 : 0}
        style={{ transition: "opacity 800ms var(--ease-out) 500ms" }}
      />
      {[rain, cases].map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={i === 0 ? CLIMATE_COLORS.rain : "#C95E42"}
          strokeWidth={i === 0 ? 1.75 : 2.25}
          strokeDasharray={i === 0 ? "4 3" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: i === 0 ? "0.02 0.015" : "1",
            strokeDashoffset: play ? 0 : 1,
            transition: `stroke-dashoffset 1200ms var(--ease-out) ${i * 200}ms`,
          }}
        />
      ))}
    </svg>
  );
}

/* ── 3. Keluarannya: prakiraan beserta rentangnya ────────────────────────── */
function ForecastBand({ play, trend }: ChartProps) {
  const data = trend;
  const forecastIdxAll = data
    .map((d, i) => (d.kasus_prediksi != null ? i : -1))
    .filter((i) => i >= 0);

  if (data.length < 2 || forecastIdxAll.length === 0) {
    return <EmptyChart label="Prakiraan belum tersedia." />;
  }

  const all = data.flatMap((d) => [
    d.kasus_aktual ?? d.kasus_prediksi ?? 0,
    d.upper_bound ?? d.kasus_prediksi ?? 0,
  ]);
  const y = scale(all);
  const n = data.length;

  const actual = data
    .map((d, i) =>
      d.kasus_aktual == null
        ? null
        : `${i === 0 ? "M" : "L"}${xAt(i, n).toFixed(1)} ${y(d.kasus_aktual).toFixed(1)}`,
    )
    .filter(Boolean)
    .join(" ");

  const forecastIdx = data
    .map((d, i) => (d.kasus_prediksi != null ? i : -1))
    .filter((i) => i >= 0);

  const forecast = forecastIdx
    .map((i, k) =>
      `${k === 0 ? "M" : "L"}${xAt(i, n).toFixed(1)} ${y(data[i].kasus_prediksi!).toFixed(1)}`,
    )
    .join(" ");

  const band = [
    ...forecastIdx.map(
      (i, k) =>
        `${k === 0 ? "M" : "L"}${xAt(i, n).toFixed(1)} ${y(data[i].upper_bound ?? data[i].kasus_prediksi!).toFixed(1)}`,
    ),
    ...[...forecastIdx]
      .reverse()
      .map(
        (i) =>
          `L${xAt(i, n).toFixed(1)} ${y(data[i].lower_bound ?? data[i].kasus_prediksi!).toFixed(1)}`,
      ),
    "Z",
  ].join(" ");

  const splitX = xAt(forecastIdx[0], n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img"
      aria-label="Kasus tercatat dan prakiraan bulan berikutnya dengan rentang ketidakpastian">
      <defs>
        <linearGradient id="grad-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E5AA52" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C95E42" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <line
        x1={splitX}
        y1={PAD}
        x2={splitX}
        y2={H - PAD}
        stroke="#AFC6D5"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <path
        d={band}
        fill="url(#grad-band)"
        opacity={play ? 1 : 0}
        style={{ transition: "opacity 700ms var(--ease-out) 700ms" }}
      />
      <path
        d={actual}
        fill="none"
        stroke="#0B4A57"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: play ? 0 : 1,
          transition: "stroke-dashoffset 900ms var(--ease-out)",
        }}
      />
      <path
        d={forecast}
        fill="none"
        stroke="#C95E42"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: play ? 0 : 1,
          transition: "stroke-dashoffset 900ms var(--ease-out) 600ms",
        }}
      />
    </svg>
  );
}

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });
  const { diseases, meta } = useCityData();
  const disease = diseases[0] ?? "";

  const climate = useApi(() => fetchClimateSeries(24), []);
  const trend = useApi(
    () => (disease ? fetchTrend(disease, 12) : Promise.resolve(null as never)),
    [disease],
  );

  const series = climate.data?.data ?? [];
  const trendPoints = trend.data?.data ?? [];
  const months = series.filter((d) => d.curah_hujan_mm !== null).length;

  /* Keterangan tiap panel menyebut angka yang benar-benar digambar. Versi
     sebelumnya menuliskan "4 stasiun BMKG", "3 tahun riwayat", dan "12 bulan"
     sebagai teks tetap, tanpa hubungan apa pun dengan deret di sebelahnya. */
  const steps = [
    {
      n: "01",
      title: "Baca cuacanya",
      body: "Curah hujan, suhu, dan kelembaban per kecamatan masuk sebagai deret bulanan, sejajar dengan rekapitulasi kasus.",
      legend: `Curah hujan bulanan · ${months} bulan terakhir`,
      chart: RainfallBars,
    },
    {
      n: "02",
      title: "Temukan polanya",
      body: `Model belajar dari riwayat kasus dan iklim yang sudah terjadi. Kurva kasus ${disease || "penyakit"} bergerak mengikuti kurva hujan dengan jeda beberapa minggu.`,
      legend: `Curah hujan (putus-putus) vs kasus ${disease || "—"}`,
      chart: LagLines,
    },
    {
      n: "03",
      title: "Terbitkan prakiraan",
      body: `Hasilnya: prakiraan untuk ${meta?.predictionLabel ?? "bulan berikutnya"} lengkap dengan rentang ketidakpastiannya — bukan satu angka yang berpura-pura pasti.`,
      legend: "Tercatat · prakiraan · rentang",
      chart: ForecastBand,
    },
  ];

  return (
    <section id="cara-kerja" className="scroll-mt-24 bg-grad-sand py-16 md:py-24">
      <div className="container">
        <SectionHeading
          kicker="Cara kerja"
          title="Cuaca berubah lebih dulu. Kasus menyusul."
          lead="Prakira tidak menebak. Ia membaca hubungan yang sudah terjadi berulang di Semarang, lalu memproyeksikannya ke depan."
        />

        <div ref={ref} className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-sand-200 bg-sand-200 md:grid-cols-3">
          {steps.map((step, i) => {
            const Chart = step.chart;
            return (
              <Reveal
                key={step.n}
                delay={i * 120}
                className="flex flex-col bg-grad-paper p-7"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-grad-brand-soft text-overline font-semibold text-brand-700">
                  {step.n}
                </span>
                <h3 className="mt-3 text-h3 text-foreground">{step.title}</h3>
                <p className="mt-2.5 text-body-sm leading-relaxed text-paper-600">
                  {step.body}
                </p>

                <div className="mt-auto pt-7">
                  <Chart
                    play={inView}
                    series={series}
                    trend={trendPoints}
                    disease={disease}
                  />
                  <p className="mt-2 border-t border-sand-200 pt-2 font-mono text-3xs uppercase tracking-wider text-paper-600">
                    {step.legend}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
