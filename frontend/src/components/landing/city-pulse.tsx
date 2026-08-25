"use client";

import * as React from "react";
import { useMemo } from "react";
import { ArrowUpRight, CloudRain, Thermometer, Droplet } from "lucide-react";
import { getKecamatanDataList } from "@/lib/mock-data";
import type { RiskLevel } from "@/types";

const RISK_META: Record<RiskLevel, { label: string; color: string; fill: string }> = {
  tinggi: { label: "Siaga", color: "#A8442C", fill: "#C95E42" },
  sedang: { label: "Waspada", color: "#D4933A", fill: "#E5AA52" },
  rendah: { label: "Rendah", color: "#1F5132", fill: "#7AA876" },
};

/** 3-week case history as a 56×20 sparkline. Shape only — no axis, no labels. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const d = useMemo(() => {
    if (points.length < 2) return "";
    const max = Math.max(...points);
    const min = Math.min(...points);
    const span = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * 54 + 1;
        const y = 18 - ((p - min) / span) * 16;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg viewBox="0 0 56 20" className="h-5 w-14 shrink-0" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface CityPulseProps {
  onSelectKecamatan: (name: string) => void;
}

/**
 * The hero's data object: a city-level readout that shows the product working
 * before the reader types anything. It reads the same mock source as the rest
 * of the page, so the numbers here and in the results never disagree.
 */
export function CityPulse({ onSelectKecamatan }: CityPulseProps) {
  const list = useMemo(() => getKecamatanDataList("DBD"), []);

  const counts = useMemo(() => {
    const tinggi = list.filter((k) => k.tingkat_risiko === "tinggi").length;
    const sedang = list.filter((k) => k.tingkat_risiko === "sedang").length;
    const rendah = list.filter((k) => k.tingkat_risiko === "rendah").length;
    return { tinggi, sedang, rendah, total: list.length || 1 };
  }, [list]);

  const hotspots = useMemo(
    () => [...list].sort((a, b) => b.skor_risiko - a.skor_risiko).slice(0, 3),
    [list],
  );

  /* City-wide climate context — the input side of the model, averaged. */
  const climate = useMemo(() => {
    const n = list.length || 1;
    const sum = list.reduce(
      (acc, k) => ({
        hujan: acc.hujan + k.cuaca.curah_hujan_mm,
        suhu: acc.suhu + k.cuaca.suhu_c,
        lembab: acc.lembab + k.cuaca.kelembaban_pct,
      }),
      { hujan: 0, suhu: 0, lembab: 0 },
    );
    return {
      hujan: Math.round(sum.hujan / n),
      suhu: (sum.suhu / n).toFixed(1),
      lembab: Math.round(sum.lembab / n),
    };
  }, [list]);

  const segments = [
    { key: "tinggi" as const, value: counts.tinggi },
    { key: "sedang" as const, value: counts.sedang },
    { key: "rendah" as const, value: counts.rendah },
  ];

  return (
    <figure className="relative rounded-3xl border border-sand-200 bg-white shadow-card">
      {/* Masthead — this card is a printed bulletin, so it gets a rule and a
          mono standfirst rather than a coloured header block. */}
      <figcaption className="flex items-start justify-between gap-4 border-b border-sand-200 px-6 py-5">
        <div>
          <p className="font-mono text-overline uppercase text-paper-400">
            Ringkasan kota · DBD
          </p>
          <h2 className="mt-1.5 text-h3 text-foreground">Semarang minggu ini</h2>
        </div>
        <span className="shrink-0 rounded-md bg-sand-100 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-paper-500">
          Mg 34 · 2026
        </span>
      </figcaption>

      <div className="px-6 py-5">
        {/* Distribution — the whole city in one line */}
        <div className="flex h-2.5 w-full origin-left animate-grow-x gap-1 overflow-hidden rounded-full">
          {segments.map(({ key, value }) => (
            <span
              key={key}
              className="h-full rounded-full"
              style={{
                width: `${(value / counts.total) * 100}%`,
                background: RISK_META[key].fill,
              }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {segments.map(({ key, value }) => (
            <div key={key} className="border-t-2 pt-2" style={{ borderColor: RISK_META[key].fill }}>
              <p className="tabular text-metric-sm text-foreground">
                {value}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-paper-500">
                {RISK_META[key].label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Hotspots */}
      <div className="border-t border-sand-200 px-3 pb-2 pt-4">
        <p className="px-3 font-mono text-overline uppercase text-paper-400">
          Perlu perhatian
        </p>

        <ul className="mt-1">
          {hotspots.map((kec, i) => {
            const meta = RISK_META[kec.tingkat_risiko];
            return (
              <li key={kec.id}>
                <button
                  type="button"
                  onClick={() => onSelectKecamatan(kec.nama)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-fast hover:bg-sand-50"
                >
                  <span className="tabular w-3 shrink-0 font-mono text-xs text-paper-400">
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {kec.nama}
                    </span>
                    <span className="tabular block text-[11px] text-paper-500">
                      {kec.kasus_aktif} kasus aktif · prediksi{" "}
                      {kec.kasus_prediksi_lower}–{kec.kasus_prediksi_upper}
                    </span>
                  </span>

                  <span className="hidden sm:block">
                    <Sparkline points={kec.historical_cases_3w} color={meta.fill} />
                  </span>

                  <span
                    className="tabular w-9 shrink-0 text-right text-base font-semibold"
                    style={{ color: meta.color }}
                  >
                    {Math.round(kec.skor_risiko)}
                  </span>

                  <ArrowUpRight className="h-4 w-4 shrink-0 text-paper-300 transition-colors duration-fast group-hover:text-brand-700" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Climate inputs — makes the "why" visible without a paragraph */}
      <div className="grid grid-cols-3 gap-2 border-t border-sand-200 px-6 py-5">
        {[
          { icon: CloudRain, label: "Curah hujan", value: `${climate.hujan} mm` },
          { icon: Thermometer, label: "Suhu", value: `${climate.suhu}°C` },
          { icon: Droplet, label: "Kelembaban", value: `${climate.lembab}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0">
            <Icon className="h-3.5 w-3.5 text-paper-400" aria-hidden />
            <p className="tabular mt-1.5 text-sm font-semibold text-foreground">
              {value}
            </p>
            <p className="truncate text-[11px] text-paper-500">{label}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
