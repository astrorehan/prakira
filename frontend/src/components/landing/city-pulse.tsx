"use client";

import * as React from "react";
import { useMemo } from "react";
import { ArrowUpRight, CloudRain, Thermometer, Droplet } from "lucide-react";
import { useCityData } from "@/lib/use-city-data";
import { formatMonth } from "@/lib/period";
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
 * Objek data di hero: ringkasan kota yang menunjukkan produknya bekerja sebelum
 * pembaca mengetik apa pun.
 *
 * Sebelumnya kartu ini membaca `getKecamatanDataList("DBD")` — satu penyakit,
 * datanya karangan — dan mencetak "Mg 34 · 2026" sebagai label periode. Yang
 * dibaca sekarang adalah ringkasan lintas penyakit dari gateway, dan label
 * periodenya adalah bulan data terakhir yang sungguh ada.
 */
export function CityPulse({ onSelectKecamatan }: CityPulseProps) {
  const { byDisease, diseases, rows, summary, meta, loading, error } = useCityData();

  /* Iklim dibaca dari penyakit mana pun yang tersedia: kolom cuacanya sama
     untuk seluruh penyakit pada bulan yang sama. */
  const list = useMemo(
    () => (diseases.length > 0 ? (byDisease[diseases[0]] ?? []) : []),
    [byDisease, diseases],
  );

  const counts = useMemo(
    () => ({
      tinggi: summary.counts.tinggi,
      sedang: summary.counts.sedang,
      rendah: summary.counts.rendah,
      total: summary.total || 1,
    }),
    [summary],
  );

  const hotspots = useMemo(
    () =>
      rows
        .filter((r) => r.level !== null)
        .slice(0, 3)
        .map((r) => ({
          row: r,
          data: byDisease[r.driver ?? ""]?.find((d) => d.nama === r.nama) ?? null,
        }))
        .filter((h): h is { row: (typeof rows)[number]; data: NonNullable<typeof h.data> } =>
          h.data !== null,
        ),
    [rows, byDisease],
  );

  /* Konteks iklim kota — sisi masukan model, dirata-ratakan. Kecamatan yang
     kolom iklimnya kosong tidak ikut dihitung, bukan dihitung sebagai nol. */
  const climate = useMemo(() => {
    const mean = (pick: (k: (typeof list)[number]) => number | null) => {
      const values = list.map(pick).filter((v): v is number => v !== null);
      if (values.length === 0) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const hujan = mean((k) => k.cuaca.curah_hujan_mm);
    const suhu = mean((k) => k.cuaca.suhu_c);
    const lembab = mean((k) => k.cuaca.kelembaban_pct);

    return {
      hujan: hujan === null ? "—" : `${Math.round(hujan)} mm`,
      suhu: suhu === null ? "—" : `${suhu.toFixed(1)}°C`,
      lembab: lembab === null ? "—" : `${Math.round(lembab)}%`,
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
          <p className="font-mono text-overline uppercase text-paper-600">
            Ringkasan kota · {diseases.join(" & ") || "—"}
          </p>
          <h2 className="mt-1.5 text-h3 text-foreground">
            Semarang, prakiraan {formatMonth(meta?.predictionMonth)}
          </h2>
        </div>
        <span className="shrink-0 rounded-md bg-sand-100 px-2 py-1 font-mono text-3xs uppercase tracking-wider text-paper-600">
          Data {formatMonth(meta?.latestObserved)}
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
              <p className="font-mono text-3xs uppercase tracking-wider text-paper-600">
                {RISK_META[key].label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Hotspots */}
      <div className="border-t border-sand-200 px-3 pb-2 pt-4">
        <p className="px-3 font-mono text-overline uppercase text-paper-600">
          Perlu perhatian
        </p>

        {hotspots.length === 0 && (
          <p className="px-3 py-3 text-2xs text-paper-600">
            {loading
              ? "Memuat ringkasan kota…"
              : error
                ? error
                : "Belum ada kecamatan dengan prakiraan pada periode berjalan."}
          </p>
        )}

        <ul className="mt-1">
          {hotspots.map(({ row, data: kec }, i) => {
            const meta = RISK_META[row.level as "tinggi" | "sedang" | "rendah"];
            return (
              <li key={kec.id}>
                <button
                  type="button"
                  onClick={() => onSelectKecamatan(kec.nama)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-fast hover:bg-sand-50"
                >
                  <span className="tabular w-3 shrink-0 font-mono text-xs text-paper-600">
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {kec.nama}
                    </span>
                    <span className="tabular block text-2xs text-paper-600">
                      {row.driver} · {kec.kasus_aktif ?? "—"} kasus bulan lalu ·
                      prakiraan {kec.kasus_prediksi_lower ?? "—"}–
                      {kec.kasus_prediksi_upper ?? "—"}
                    </span>
                  </span>

                  <span className="hidden sm:block">
                    {kec.riwayat_periode.length > 1 && (
                      <Sparkline points={kec.riwayat_periode} color={meta.fill} />
                    )}
                  </span>

                  <span
                    className="tabular w-9 shrink-0 text-right text-base font-semibold"
                    style={{ color: meta.color }}
                  >
                    {row.score === null ? "—" : Math.round(row.score)}
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
          { icon: CloudRain, label: "Curah hujan", value: climate.hujan },
          { icon: Thermometer, label: "Suhu", value: climate.suhu },
          { icon: Droplet, label: "Kelembaban", value: climate.lembab },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0">
            <Icon className="h-3.5 w-3.5 text-paper-600" aria-hidden />
            <p className="tabular mt-1.5 text-sm font-semibold text-foreground">
              {value}
            </p>
            <p className="truncate text-2xs text-paper-600">{label}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
