"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CloudRain,
  Droplets,
  Info,
  Minus,
  RotateCcw,
  Thermometer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiseaseSelector } from "@/components/disease-selector";
import { DataState } from "@/components/data-state";
import { fetchDiseases, runSimulation } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, diseaseLabel, formatNumber, riskConfigOf } from "@/lib/utils";
import type { DiseaseType, SimulateDistrict } from "@/types";

/**
 * Simulator cuaca (what-if).
 *
 * Tiga penggeser, satu pertanyaan: kalau iklim bulan lalu berbeda, peta risiko
 * jadi seperti apa? Yang membuat halaman ini bukan mainan adalah tiga hal yang
 * ditolak untuk disembunyikan:
 *
 * 1. **Kalimat pembatasnya lebih dulu, bukan di catatan kaki.** Model belajar
 *    dari korelasi historis. Menggeser hujan menjawab "bulan dengan hujan
 *    sebesar itu di masa lalu biasanya diikuti berapa kasus" — bukan meramal
 *    akibat dari sebuah intervensi.
 * 2. **Ekstrapolasi ditandai.** Model berbasis pohon membekukan jawabannya di
 *    daun terluar; begitu geseran membawa nilai keluar dari rentang data latih,
 *    barisnya diberi tanda dan jumlahnya disebut di ringkasan.
 * 3. **Kecamatan tanpa data tetap kosong.** Bukan nol, bukan "rendah".
 *
 * Penggeser tidak menembakkan permintaan pada tiap piksel: nilainya ditahan
 * 350 ms setelah gerakan terakhir. Satu permintaan = 32 prediksi di layanan ML.
 */

type Adjustment = {
  rainfallPct: number;
  tempDeltaC: number;
  humidityDeltaPct: number;
};

const NEUTRAL: Adjustment = {
  rainfallPct: 0,
  tempDeltaC: 0,
  humidityDeltaPct: 0,
};

const DEBOUNCE_MS = 350;

/**
 * Skenario siap pakai.
 *
 * Bukan ramalan iklim resmi dan tidak mengaku begitu — ini titik awal yang
 * membuat penggeser tidak berangkat dari nol setiap kali. Angkanya bulat dan
 * sederhana justru supaya tidak terbaca sebagai proyeksi berbasis model iklim.
 */
const PRESETS: { label: string; hint: string; value: Adjustment }[] = [
  {
    label: "Musim hujan lebih basah",
    hint: "Hujan +40%, kelembaban +5 poin",
    value: { rainfallPct: 40, tempDeltaC: 0, humidityDeltaPct: 5 },
  },
  {
    label: "Kemarau panjang",
    hint: "Hujan −60%, suhu +1,5 °C",
    value: { rainfallPct: -60, tempDeltaC: 1.5, humidityDeltaPct: -8 },
  },
  {
    label: "Pancaroba ekstrem",
    hint: "Hujan +80%, suhu +1 °C, kelembaban +8 poin",
    value: { rainfallPct: 80, tempDeltaC: 1, humidityDeltaPct: 8 },
  },
];

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function signed(value: number, digits = 0): string {
  const text = formatNumber(Math.abs(value), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (value === 0) return `0`;
  return `${value > 0 ? "+" : "−"}${text}`;
}

type SliderProps = {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  digits?: number;
  hint: string;
  onChange: (value: number) => void;
};

function Slider({
  label,
  icon,
  value,
  min,
  max,
  step,
  suffix,
  digits = 0,
  hint,
  onChange,
}: SliderProps) {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-body-sm font-medium text-foreground"
        >
          <span className="text-paper-600" aria-hidden>
            {icon}
          </span>
          {label}
        </label>
        <span
          className={cn(
            "font-mono text-body-sm tabular-nums",
            value === 0 ? "text-paper-500" : "text-brand-700",
          )}
        >
          {signed(value, digits)}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer rounded-full bg-paper-200 accent-brand-700"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-caption text-paper-600">
        {hint}
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warning" | "up";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "warning"
          ? "border-risk-medium-br bg-risk-medium-bg"
          : tone === "up"
            ? "border-risk-high-br bg-risk-high-bg"
            : "border-border bg-surface",
      )}
    >
      <p className="text-caption uppercase tracking-wide text-paper-600">
        {label}
      </p>
      <p className="mt-1 font-mono text-h3 tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-caption leading-snug text-paper-600">{sub}</p>
    </div>
  );
}

function RankShift({ row }: { row: SimulateDistrict }) {
  if (row.baseline_rank === null || row.scenario_rank === null) {
    return <span className="text-paper-500">—</span>;
  }

  /* Peringkat 1 adalah yang tertinggi, jadi selisih positif berarti naik. */
  const shift = row.baseline_rank - row.scenario_rank;

  if (shift === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-paper-500">
        <Minus className="h-3 w-3" aria-hidden />
        <span className="sr-only">Peringkat tetap</span>
        tetap
      </span>
    );
  }

  const up = shift > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        up ? "text-risk-high" : "text-risk-low",
      )}
    >
      {up ? (
        <ArrowUp className="h-3 w-3" aria-hidden />
      ) : (
        <ArrowDown className="h-3 w-3" aria-hidden />
      )}
      {up ? "naik" : "turun"} {Math.abs(shift)}
    </span>
  );
}

function RiskCell({ level }: { level: SimulateDistrict["scenario_risk_class"] }) {
  const config = riskConfigOf(level);
  return (
    <Badge variant={config.badgeVariant} size="sm">
      {config.label}
    </Badge>
  );
}

export function WeatherSimulator() {
  const [disease, setDisease] = React.useState<DiseaseType | null>(null);
  const [adjustment, setAdjustment] = React.useState<Adjustment>(NEUTRAL);

  const diseases = useApi(() => fetchDiseases(), []);

  React.useEffect(() => {
    if (!disease && diseases.data && diseases.data.length > 0) {
      setDisease(diseases.data[0].disease);
    }
  }, [diseases.data, disease]);

  const settled = useDebounced(adjustment, DEBOUNCE_MS);
  const pending =
    settled.rainfallPct !== adjustment.rainfallPct ||
    settled.tempDeltaC !== adjustment.tempDeltaC ||
    settled.humidityDeltaPct !== adjustment.humidityDeltaPct;

  const simulation = useApi(
    () =>
      disease
        ? runSimulation({
            disease,
            rainfallPct: settled.rainfallPct,
            tempDeltaC: settled.tempDeltaC,
            humidityDeltaPct: settled.humidityDeltaPct,
          })
        : Promise.resolve(null as never),
    [
      disease,
      settled.rainfallPct,
      settled.tempDeltaC,
      settled.humidityDeltaPct,
    ],
  );

  /* Dimemo supaya `sorted` di bawah tidak dihitung ulang tiap render:
     `?? []` menghasilkan array baru setiap kali dan membatalkan memonya. */
  const rows = React.useMemo(
    () => simulation.data?.data.districts ?? [],
    [simulation.data],
  );
  const summary = simulation.data?.data.summary;
  const meta = simulation.data?.meta;

  /* Keadaan "belum digeser" dibaca dari muatan yang sedang tampil, bukan dari
     posisi penggeser.
     `useApi` menahan data sebelumnya selama pemuatan ulang, jadi kalau angka
     ini diambil dari state lokal, layar sempat menampilkan "21 → 21" — muatan
     netral yang lama — dengan penggeser sudah di +80%. Angka yang salah selama
     dua detik tetap angka yang salah. */
  const shown = simulation.data?.meta.adjustment;
  const isNeutral =
    shown === undefined ||
    (shown.rainfall_pct === 0 &&
      shown.temp_delta_c === 0 &&
      shown.humidity_delta_pct === 0);

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.scenario_rank === null) return 1;
      if (b.scenario_rank === null) return -1;
      return a.scenario_rank - b.scenario_rank;
    });
  }, [rows]);

  const deltaTotal =
    summary === undefined
      ? null
      : summary.scenario_total - summary.baseline_total;

  return (
    <div className="container space-y-6 py-8 md:py-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Simulator</Badge>
          <Badge variant="outline">Model, bukan ramalan</Badge>
        </div>
        <h1 className="text-h1 font-semibold tracking-tight text-foreground">
          Kalau cuacanya begini, apa kata model?
        </h1>
        <p className="max-w-3xl text-body text-paper-700">
          Geser curah hujan, suhu, dan kelembaban bulan-bulan terakhir, lalu
          lihat prakiraan dan peringkat 16 kecamatan dihitung ulang. Yang
          berubah hanya masukan iklim; sejarah kasus, populasi, dan bulan
          prediksinya tetap.
        </p>
      </header>

      <DiseaseSelector
        options={(diseases.data ?? []).map((d) => d.disease)}
        selected={disease}
        onSelect={setDisease}
      />

      {/* Batasan didahulukan, bukan disimpan di kaki halaman. Sebuah penggeser
          yang mengubah peta risiko adalah tempat paling mudah untuk salah baca
          sebagai alat peramal. */}
      <Card className="border-brand-300/50 bg-brand-50 p-4">
        <div className="flex gap-3">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
            aria-hidden
          />
          <div className="space-y-1 text-body-sm text-brand-800">
            <p className="font-semibold">
              Ini menjawab “apa kata model”, bukan “apa yang akan terjadi”.
            </p>
            <p className="text-paper-700">
              Model dilatih pada korelasi historis iklim–kasus, bukan pada
              eksperimen. Menaikkan curah hujan berarti bertanya: pada
              bulan-bulan dengan hujan sebesar itu di masa lalu, berapa kasus
              yang biasanya menyusul di kecamatan ini.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h2 className="text-h4 font-semibold text-foreground">
            Geseran iklim
          </h2>
          <div className="flex items-center gap-2">
            {(pending || simulation.refreshing) && (
              <span className="text-caption text-paper-500">
                {simulation.refreshing ? "Menghitung ulang…" : "Menunggu…"}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdjustment(NEUTRAL)}
              disabled={
                adjustment.rainfallPct === 0 &&
                adjustment.tempDeltaC === 0 &&
                adjustment.humidityDeltaPct === 0
              }
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Setel ulang
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Slider
            label="Curah hujan"
            icon={<CloudRain className="h-4 w-4" />}
            value={adjustment.rainfallPct}
            min={-100}
            max={200}
            step={5}
            suffix="%"
            hint="Berlaku pada curah hujan 1–3 bulan sebelumnya sekaligus."
            onChange={(rainfallPct) =>
              setAdjustment((prev) => ({ ...prev, rainfallPct }))
            }
          />
          <Slider
            label="Suhu rata-rata"
            icon={<Thermometer className="h-4 w-4" />}
            value={adjustment.tempDeltaC}
            min={-5}
            max={5}
            step={0.5}
            digits={1}
            suffix=" °C"
            hint="Ditambahkan ke suhu 1–3 bulan sebelumnya."
            onChange={(tempDeltaC) =>
              setAdjustment((prev) => ({ ...prev, tempDeltaC }))
            }
          />
          <Slider
            label="Kelembaban"
            icon={<Droplets className="h-4 w-4" />}
            value={adjustment.humidityDeltaPct}
            min={-30}
            max={30}
            step={1}
            suffix=" poin"
            hint="Ditambahkan ke kelembaban 1–3 bulan sebelumnya, dibatasi 0–100%."
            onChange={(humidityDeltaPct) =>
              setAdjustment((prev) => ({ ...prev, humidityDeltaPct }))
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-caption text-paper-600">Skenario cepat:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setAdjustment(preset.value)}
              className="rounded-full border border-paper-300 bg-surface px-3 py-1.5 text-caption text-paper-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              title={preset.hint}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      <DataState
        loading={simulation.loading}
        error={simulation.error}
        empty={!simulation.loading && rows.length === 0}
        emptyMessage="Belum ada prakiraan untuk penyakit ini, jadi tidak ada yang bisa disimulasikan."
        loadingMessage="Menghitung ulang 16 kecamatan…"
        onRetry={simulation.reload}
      >
        {summary && meta && (
          <div
            className={cn(
              "space-y-6 transition-opacity",
              simulation.refreshing && "opacity-60",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Total prakiraan kota"
                value={
                  isNeutral
                    ? formatNumber(summary.baseline_total)
                    : `${formatNumber(summary.baseline_total)} → ${formatNumber(summary.scenario_total)}`
                }
                sub={
                  deltaTotal === null || deltaTotal === 0
                    ? `Kasus ${diseaseLabel(meta.disease)} pada ${meta.monthLabel}.`
                    : `${signed(deltaTotal)} kasus dibanding keadaan sekarang.`
                }
                tone={deltaTotal !== null && deltaTotal > 0 ? "up" : "default"}
              />
              <StatTile
                label="Kecamatan kelas tinggi"
                value={
                  isNeutral
                    ? String(summary.baseline_high)
                    : `${summary.baseline_high} → ${summary.scenario_high}`
                }
                sub={`Dari ${summary.evaluated} kecamatan yang punya cukup data.`}
                tone={
                  summary.scenario_high > summary.baseline_high ? "up" : "default"
                }
              />
              <StatTile
                label="Peringkat bergeser"
                value={String(summary.rank_changed)}
                sub="Kecamatan yang urutan prioritasnya berubah karena geseran ini."
              />
              <StatTile
                label="Di luar data latih"
                value={String(summary.beyond_training)}
                sub={
                  summary.beyond_training === 0
                    ? "Semua nilai skenario masih di dalam rentang yang pernah dilihat model."
                    : "Model tidak mengekstrapolasi — jawabannya membeku di batas terluar."
                }
                tone={summary.beyond_training > 0 ? "warning" : "default"}
              />
            </div>

            {summary.beyond_training > 0 && (
              <Card className="border-risk-medium-br bg-risk-medium-bg p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium"
                    aria-hidden
                  />
                  <p className="text-body-sm text-paper-800">
                    <span className="font-semibold">
                      {summary.beyond_training} kecamatan
                    </span>{" "}
                    kini bernilai iklim di luar rentang yang pernah ada di data
                    latih. Angkanya tetap ditampilkan, tapi baca sebagai batas
                    atas pengetahuan model — bukan sebagai prakiraan yang setara
                    dengan sisanya. Barisnya diberi tanda pada tabel di bawah.
                  </p>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
                <h2 className="text-h4 font-semibold text-foreground">
                  Peringkat kecamatan pada skenario ini
                </h2>
                <p className="text-caption text-paper-600">
                  {diseaseLabel(meta.disease)} · {meta.monthLabel}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-paper-50 text-left text-caption uppercase tracking-wide text-paper-600">
                      <th className="px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Kecamatan</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Sekarang
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Skenario
                      </th>
                      <th className="px-4 py-2.5 font-medium">Kelas skenario</th>
                      <th className="px-4 py-2.5 font-medium">Peringkat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => {
                      const flagged = row.beyond_training.length > 0;
                      const noData = row.scenario_cases === null;

                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border last:border-0",
                            flagged && "bg-risk-medium-bg/40",
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono tabular-nums text-paper-600">
                            {row.scenario_rank ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {row.nama}
                              </span>
                              {flagged && (
                                <Badge variant="risk-medium" size="sm">
                                  <AlertTriangle aria-hidden />
                                  Luar data latih
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-paper-700">
                            {noData ? "—" : formatNumber(row.baseline_cases ?? 0)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right font-mono tabular-nums",
                              !noData &&
                                (row.scenario_cases ?? 0) >
                                  (row.baseline_cases ?? 0)
                                ? "font-semibold text-risk-high"
                                : "text-foreground",
                            )}
                          >
                            {noData ? "—" : formatNumber(row.scenario_cases ?? 0)}
                          </td>
                          <td className="px-4 py-2.5">
                            {noData ? (
                              <Badge variant="risk-none" size="sm">
                                Data tidak memadai
                              </Badge>
                            ) : (
                              <RiskCell level={row.scenario_risk_class} />
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-caption">
                            <RankShift row={row} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-h4 font-semibold text-foreground">
                Bagaimana angka ini dihitung
              </h2>
              <ul className="mt-3 space-y-2">
                {meta.notes.map((note) => (
                  <li
                    key={note}
                    className="flex gap-2.5 text-body-sm text-paper-700"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300"
                      aria-hidden
                    />
                    {note}
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-caption font-medium uppercase tracking-wide text-paper-600">
                  Batasan yang berlaku pada seluruh keluaran sistem
                </p>
                <ul className="mt-2 space-y-1.5">
                  {meta.limitations.map((limit) => (
                    <li key={limit} className="text-caption text-paper-600">
                      — {limit}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/model"
                  className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-brand-700 hover:underline"
                >
                  Lihat performa model apa adanya
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </Card>
          </div>
        )}
      </DataState>
    </div>
  );
}
