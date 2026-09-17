"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Info,
  Minus,
  Scale,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiseaseSelector } from "@/components/disease-selector";
import { DataState } from "@/components/data-state";
import { ImpactCalculator } from "@/components/impact-calculator";
import { fetchDiseases, fetchPriority } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, diseaseLabel, formatNumber, riskConfigOf } from "@/lib/utils";
import type { DiseaseType, PriorityRow, PriorityWeighting } from "@/types";

/**
 * Prioritas terdampak — risiko dikalikan orang yang menanggungnya.
 *
 * Halaman ini ada karena satu kelemahan yang jujur dari skor risiko sistem
 * ini: skornya adalah persentil terhadap sejarah kecamatan itu sendiri. Untuk
 * pertanyaan "seberapa tidak biasa bulan ini", itu benar. Untuk pertanyaan
 * "kecamatan mana yang harus dijaga lebih dulu", ia bisa menaruh kecamatan
 * 98 ribu jiwa di atas kecamatan 192 ribu jiwa.
 *
 * Yang ditampilkan karena itu bukan satu urutan melainkan **dua urutan
 * berdampingan**, beserta pergeserannya. Menggantikan diam-diam peringkat
 * risiko dengan peringkat prioritas akan menyembunyikan justru bagian yang
 * paling perlu dibaca: bahwa keduanya menjawab pertanyaan berbeda.
 */

const WEIGHTINGS: {
  key: PriorityWeighting;
  label: string;
  description: string;
}[] = [
  {
    key: "populasi",
    label: "Populasi",
    description: "Skor risiko dikalikan jumlah jiwa kecamatan.",
  },
  {
    key: "kepadatan",
    label: "Populasi × kepadatan",
    description:
      "Ditambah akar kepadatan relatif terhadap median kota, untuk wilayah yang penularannya lebih cepat.",
  },
];

function Shift({ value }: { value: number | null }) {
  if (value === null) return <span className="text-paper-500">—</span>;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-paper-500">
        <Minus className="h-3 w-3" aria-hidden />
        tetap
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        up ? "text-risk-high" : "text-paper-600",
      )}
    >
      {up ? (
        <ArrowUp className="h-3 w-3" aria-hidden />
      ) : (
        <ArrowDown className="h-3 w-3" aria-hidden />
      )}
      {up ? "naik" : "turun"} {Math.abs(value)}
    </span>
  );
}

function IndexBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-caption text-paper-500">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-200">
        <span
          className="block h-full rounded-full bg-brand-700"
          style={{ width: `${Math.max(value, 2)}%` }}
        />
      </span>
      <span className="w-10 text-right font-mono text-caption tabular-nums text-paper-700">
        {formatNumber(value, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
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

export function PriorityBoard() {
  const [disease, setDisease] = React.useState<DiseaseType | null>(null);
  const [weighting, setWeighting] =
    React.useState<PriorityWeighting>("populasi");

  const diseases = useApi(() => fetchDiseases(), []);

  React.useEffect(() => {
    if (!disease && diseases.data && diseases.data.length > 0) {
      setDisease(diseases.data[0].disease);
    }
  }, [diseases.data, disease]);

  const priority = useApi(
    () =>
      disease
        ? fetchPriority(disease, weighting)
        : Promise.resolve(null as never),
    [disease, weighting],
  );

  const rows: PriorityRow[] = priority.data?.data.rows ?? [];
  const summary = priority.data?.data.summary;
  const meta = priority.data?.meta;

  const scored = rows.filter((r) => r.indeks_prioritas !== null);
  const biggestClimb = scored.reduce<PriorityRow | null>(
    (best, row) =>
      best === null || (row.pergeseran ?? 0) > (best.pergeseran ?? 0)
        ? row
        : best,
    null,
  );

  return (
    <div className="container space-y-6 py-8 md:py-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Prioritas</Badge>
          <Badge variant="outline">Risiko × orang terdampak</Badge>
        </div>
        <h1 className="text-h1 font-semibold tracking-tight text-foreground">
          Yang paling tidak biasa belum tentu yang paling perlu didahulukan
        </h1>
        <p className="max-w-3xl text-body text-paper-700">
          Skor risiko sistem ini adalah persentil terhadap sejarah kecamatan itu
          sendiri: tiga kasus bisa berarti tinggi di kecamatan yang biasanya
          nol. Halaman ini menaruh urutan itu berdampingan dengan urutan yang
          ikut menghitung berapa jiwa berada di belakang angkanya.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <DiseaseSelector
          options={(diseases.data ?? []).map((d) => d.disease)}
          selected={disease}
          onSelect={setDisease}
        />

        <div
          className="inline-flex rounded-full border border-paper-300 bg-surface p-0.5"
          role="group"
          aria-label="Pembobotan indeks prioritas"
        >
          {WEIGHTINGS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWeighting(option.key)}
              aria-pressed={weighting === option.key}
              title={option.description}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors",
                weighting === option.key
                  ? "bg-brand-700 text-white"
                  : "text-paper-700 hover:bg-paper-100",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <DataState
        loading={priority.loading}
        error={priority.error}
        empty={!priority.loading && scored.length === 0}
        emptyMessage="Belum ada prakiraan untuk penyakit ini, jadi tidak ada yang bisa diprioritaskan."
        loadingMessage="Menyusun peringkat prioritas…"
        onRetry={priority.reload}
      >
        {meta && summary && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Jiwa di kecamatan kelas tinggi"
                value={formatNumber(summary.jiwaKelasTinggi)}
                sub={`Dari ${formatNumber(summary.jiwaTerhitung)} jiwa di ${summary.evaluated} kecamatan yang punya prakiraan.`}
              />
              <StatTile
                label="Naik peringkat"
                value={String(summary.naikTajam.length)}
                sub={
                  summary.naikTajam.length === 0
                    ? "Tidak ada kecamatan yang naik tiga peringkat atau lebih."
                    : `Naik ≥3 peringkat: ${summary.naikTajam.slice(0, 3).join(", ")}${summary.naikTajam.length > 3 ? ", …" : ""}.`
                }
              />
              <StatTile
                label="Turun peringkat"
                value={String(summary.turunTajam.length)}
                sub={
                  summary.turunTajam.length === 0
                    ? "Tidak ada kecamatan yang turun tiga peringkat atau lebih."
                    : `Turun ≥3 peringkat: ${summary.turunTajam.slice(0, 3).join(", ")}${summary.turunTajam.length > 3 ? ", …" : ""}.`
                }
              />
              <StatTile
                label="Pergeseran terbesar"
                value={
                  biggestClimb && (biggestClimb.pergeseran ?? 0) > 0
                    ? `+${biggestClimb.pergeseran}`
                    : "—"
                }
                sub={
                  biggestClimb && (biggestClimb.pergeseran ?? 0) > 0
                    ? `${biggestClimb.nama}: peringkat risiko ${biggestClimb.peringkat_risiko} menjadi prioritas ${biggestClimb.peringkat_prioritas}.`
                    : "Urutan risiko dan urutan prioritas berhimpit bulan ini."
                }
              />
            </div>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
                <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                  <Scale className="h-4 w-4 text-paper-600" aria-hidden />
                  Dua urutan berdampingan
                </h2>
                <p className="text-caption text-paper-600">
                  {diseaseLabel(meta.disease)} · {meta.predictionLabel}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-paper-50 text-left text-caption uppercase tracking-wide text-paper-600">
                      <th className="px-4 py-2.5 font-medium">Prioritas</th>
                      <th className="px-4 py-2.5 font-medium">Kecamatan</th>
                      <th className="px-4 py-2.5 font-medium">Kelas risiko</th>
                      <th className="px-4 py-2.5 text-right font-medium">Skor</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Populasi
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Jiwa/km²
                      </th>
                      <th className="px-4 py-2.5 font-medium">Indeks</th>
                      <th className="px-4 py-2.5 font-medium">
                        Dari peringkat risiko
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const config = riskConfigOf(row.tingkat_risiko);
                      const missing = row.indeks_prioritas === null;

                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border last:border-0",
                            (row.pergeseran ?? 0) >= 3 && "bg-brand-50/60",
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono tabular-nums text-paper-600">
                            {row.peringkat_prioritas ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {row.nama}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={config.badgeVariant} size="sm">
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-paper-700">
                            {row.skor_risiko ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-paper-700">
                            {formatNumber(row.populasi)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-paper-600">
                            {formatNumber(row.kepadatan)}
                          </td>
                          <td className="px-4 py-2.5">
                            <IndexBar value={row.indeks_prioritas} />
                          </td>
                          <td className="px-4 py-2.5 text-caption">
                            {missing ? (
                              <span className="text-paper-500">
                                Tidak diperingkat
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <span className="font-mono tabular-nums text-paper-500">
                                  #{row.peringkat_risiko}
                                </span>
                                <Shift value={row.pergeseran} />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                  <Info className="h-4 w-4 text-paper-600" aria-hidden />
                  Cara indeks ini dihitung
                </h2>
                <ul className="mt-3 space-y-2">
                  {meta.method.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2.5 text-body-sm text-paper-700"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300"
                        aria-hidden
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Yang tidak diukur ditulis sekeras yang diukur. Indeks
                  kerentanan yang diam soal kekosongannya mengundang pembacaan
                  bahwa ia sudah lengkap. */}
              <Card className="border-risk-medium-br bg-risk-medium-bg p-5">
                <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                  <Users className="h-4 w-4 text-risk-medium" aria-hidden />
                  Yang belum masuk indeks ini
                </h2>
                <ul className="mt-3 space-y-2">
                  {meta.missingFactors.map((factor) => (
                    <li
                      key={factor}
                      className="flex gap-2.5 text-body-sm text-paper-800"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-risk-medium"
                        aria-hidden
                      />
                      {factor}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-caption text-paper-700">
                  Faktor-faktor ini tidak dikarang menjadi angka. Begitu
                  datanya tersedia dari sumber resmi, rumusnya tinggal
                  ditambahi — sampai saat itu, kekosongannya tercetak di sini.
                </p>
              </Card>
            </div>

            <ImpactCalculator
              disease={meta.disease}
              monthLabel={meta.predictionLabel}
              rows={rows}
            />

            <Card className="p-5">
              <p className="text-body-sm text-paper-700">
                Peringkat risiko yang jadi masukan halaman ini berasal dari
                model yang sama yang diuji di halaman transparansi. Angka
                sensitivitas dan alarm palsunya apa adanya di sana.
              </p>
              <div className="mt-3 flex flex-wrap gap-4">
                <Link
                  href="/model"
                  className="inline-flex items-center gap-1.5 text-body-sm font-medium text-brand-700 hover:underline"
                >
                  Transparansi model
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link
                  href="/mesin-waktu"
                  className="inline-flex items-center gap-1.5 text-body-sm font-medium text-brand-700 hover:underline"
                >
                  Mesin waktu — putar ulang periode uji
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
