"use client";

import * as React from "react";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Bug, Wind, Droplets, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { withKecamatan } from "@/lib/kecamatan-selection";
import { districtAcrossDiseases, useCityData } from "@/lib/use-city-data";
import { formatMonth } from "@/lib/period";
import { diseaseProfile } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DiseaseType, KecamatanData, RiskLevel } from "@/types";

import { Reveal } from "./reveal";

interface RiskResultSectionProps {
  /** `null` until the reader picks one — the section then reports the city. */
  selectedKecamatan: string | null;
  onSelectKecamatan: (name: string) => void;
}

/* Plain-language status. "Aman / Waspada / Siaga" is what a resident acts on;
   the ordinal score below it is what a health officer acts on. Each level
   carries its own surface gradient and bar gradient so the whole panel shifts
   temperature with the risk instead of wearing a coloured stripe. */
const STATUS: Record<
  RiskLevel,
  {
    word: string;
    lead: string;
    ink: string;
    surface: string;
    bar: string;
    edge: string;
    textGrad: string;
  }
> = {
  rendah: {
    word: "Aman",
    lead: "Tidak ada indikasi lonjakan pada bulan yang diprakirakan.",
    ink: "text-risk-low",
    surface: "bg-grad-risk-low",
    bar: "bg-grad-bar-low",
    edge: "border-risk-low-br",
    textGrad: "linear-gradient(120deg,#2C6650 0%,#1F5132 60%,#14351F 100%)",
  },
  sedang: {
    word: "Waspada",
    lead: "Pola cuaca mulai mendukung penularan. Mulai pencegahan sekarang.",
    ink: "text-risk-medium",
    surface: "bg-grad-risk-medium",
    bar: "bg-grad-bar-medium",
    edge: "border-risk-medium-br",
    textGrad: "linear-gradient(120deg,#E5AA52 0%,#D4933A 55%,#9A6318 100%)",
  },
  tinggi: {
    word: "Siaga",
    lead: "Potensi lonjakan kasus pada bulan yang diprakirakan.",
    ink: "text-risk-high",
    surface: "bg-grad-risk-high",
    bar: "bg-grad-bar-high",
    edge: "border-risk-high-br",
    textGrad: "linear-gradient(120deg,#C95E42 0%,#A8442C 55%,#6E2413 100%)",
  },
};

const DISEASE_ICON: Record<string, React.ElementType> = {
  DBD: Bug,
  ISPA: Wind,
  Diare: Droplets,
};

/** Profil penyakit dari `lib/utils`, jadi nama panjang dan vektornya tidak
 *  ditulis dua kali di dua berkas yang bisa saling melenceng. */
function diseaseMeta(type: DiseaseType) {
  const profile = diseaseProfile(type);
  return {
    icon: DISEASE_ICON[type] ?? Bug,
    full: profile.name,
    blurb: profile.vector,
  };
}

const ORDER: Record<RiskLevel, number> = { rendah: 0, sedang: 1, tinggi: 2 };

/** Cakupan data dalam bahasa sehari-hari — permukaan ini dibaca warga. */
const COVERAGE_WORD: Record<string, string> = {
  high: "lengkap",
  medium: "cukup",
  low: "tipis",
  insufficient: "tidak memadai",
};

/** Score 0–100 on a continuous gradient track, with the quartile ticks that
 *  separate the three risk classes marked on it. */
function ScoreBar({ score, bar }: { score: number; bar: string }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-sand-100">
      <div
        className={cn("h-full origin-left animate-grow-x rounded-full", bar)}
        style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
      />
    </div>
  );
}

const STATUS_UNKNOWN = {
  word: "Belum ada",
  lead: "Belum ada prakiraan untuk periode berjalan.",
  ink: "text-paper-600",
  surface: "bg-sand-50",
  bar: "bg-paper-300",
  edge: "border-sand-200",
  textGrad: "linear-gradient(120deg,#6B6560 0%,#4A443F 100%)",
};

function statusOf(level: RiskLevel | null) {
  return level ? STATUS[level] : STATUS_UNKNOWN;
}

function DiseaseCard({
  type,
  data,
  index,
}: {
  type: DiseaseType;
  data: KecamatanData;
  index: number;
}) {
  const status = statusOf(data.tingkat_risiko);
  const meta = diseaseMeta(type);
  const Icon = meta.icon;

  return (
    <Reveal
      delay={index * 90}
      className={cn(
        "flex h-full flex-col rounded-3xl border p-6 md:p-7",
        status.edge,
        status.surface,
      )}
    >
      <div className="flex min-h-[2.75rem] items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/70">
            <Icon className="h-5 w-5 text-paper-600" aria-hidden />
          </span>
          <div>
            <p className="text-h3 text-foreground">{type}</p>
            <p className="text-caption text-paper-600">{meta.blurb}</p>
          </div>
        </div>
        <span
          className={cn(
            "mt-1 shrink-0 text-overline uppercase tracking-[0.1em]",
            status.ink,
          )}
        >
          {status.word}
        </span>
      </div>

      <div className="mt-7">
        <div className="flex items-end justify-between">
          <span className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Skor risiko
          </span>
          <span className="tabular text-metric leading-none text-foreground">
            {data.skor_risiko === null ? "—" : Math.round(data.skor_risiko)}
            <span className="text-caption text-paper-600"> /100</span>
          </span>
        </div>
        <div className="mt-3">
          <ScoreBar score={data.skor_risiko ?? 0} bar={status.bar} />
        </div>
      </div>

      <dl className="mt-6 flex divide-x divide-white/80 rounded-2xl border border-white/70 bg-white/60">
        <div className="flex-1 px-4 py-3">
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Kasus aktif
          </dt>
          <dd className="tabular mt-1 text-h3 text-foreground">
            {data.kasus_aktif ?? "—"}
          </dd>
        </div>
        <div className="flex-1 px-4 py-3">
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Prakiraan
          </dt>
          <dd className="tabular mt-1 text-h3 text-foreground">
            {data.kasus_prediksi_lower === null
              ? "—"
              : `${data.kasus_prediksi_lower}–${data.kasus_prediksi_upper}`}
          </dd>
        </div>
      </dl>

      {/* Dulu di sini ada dua kalimat "Yang bisa Anda lakukan" yang diambil dari
          `rekomendasi` bawaan berkas mock — teks yang sama untuk setiap
          kecamatan pada kelas risiko yang sama, tanpa hubungan dengan model.
          Yang menggantikannya adalah pemicu yang benar-benar dipakai model,
          dan tautan ke panduan pencegahan yang memang ditulis untuk dibaca. */}
      {data.drivers.length > 0 && (
        <div className="mt-6 border-t border-white/80 pt-5">
          <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Pemicu menurut model
          </p>
          <ul className="mt-3 space-y-2.5">
            {data.drivers.slice(0, 2).map((driver) => (
              <li key={driver.feature} className="flex gap-2.5 text-body-sm text-paper-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span>
                  {driver.label}{" "}
                  {driver.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  {driver.unit} · persentil {driver.percentile} dari riwayatnya
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Reveal>
  );
}


/* ── City view ────────────────────────────────────────────────────────────
   What the section shows before the reader has chosen. The hero asks which
   kecamatan they live in; answering that question for them with one district
   would contradict the ask and give that district the page for free. So the
   opening state reports the whole city and treats every district equally. */

const CITY_LEVEL_META: { level: RiskLevel; blurb: string }[] = [
  { level: "tinggi", blurb: "potensi lonjakan pada bulan yang diprakirakan" },
  { level: "sedang", blurb: "cuaca mulai mendukung penularan" },
  { level: "rendah", blurb: "tidak ada indikasi lonjakan" },
];

function CitySummary({
  onSelectKecamatan,
}: {
  onSelectKecamatan: (name: string) => void;
}) {
  const { summary, meta, loading, error } = useCityData();
  const { rows, counts, total } = summary;

  /* The city wears its worst district's colour. A headline that reads "Aman"
     over three Siaga kecamatan would be a lie of aggregation. */
  const headlineLevel: RiskLevel =
    counts.tinggi > 0 ? "tinggi" : counts.sedang > 0 ? "sedang" : "rendah";
  const status = STATUS[headlineLevel];
  const headlineCount =
    headlineLevel === "rendah" ? total : counts[headlineLevel];

  /* Only the districts at the headline level. Listing Waspada alongside Siaga
     turns a call to action into a wall of twelve chips, and the full ranking
     already lives in the board further down the page. */
  const watchlist = rows.filter((r) => r.level === headlineLevel && r.level !== "rendah");

  if (loading || error || total === 0) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white/70 p-10 text-center">
        <p className="text-body text-paper-600">
          {loading
            ? "Memuat status kota…"
            : error
              ? error
              : "Belum ada data kecamatan di sistem."}
        </p>
      </div>
    );
  }

  return (
    <>
      <Reveal>
        <div className="border-t border-sand-200 pt-4">
          <span className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Ringkasan · {total} kecamatan Kota Semarang
          </span>
        </div>

        <div
          className={cn(
            "relative mt-6 overflow-hidden rounded-[28px] border",
            status.edge,
            status.surface,
          )}
        >
          <div className="grid gap-10 p-8 md:grid-cols-12 md:items-stretch md:p-12">
            <div className="md:col-span-7">
              <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
                Status kota, prakiraan {formatMonth(meta?.predictionMonth)}
              </p>
              <p
                className="tabular mt-3 text-display leading-[0.95] tracking-[-0.03em]"
                style={{
                  backgroundImage: status.textGrad,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {headlineCount} {status.word}
              </p>
              <p className="mt-5 max-w-md text-body-lg text-paper-700">
                {headlineLevel === "rendah"
                  ? "Seluruh kecamatan tenang. Tidak ada indikasi lonjakan di kota ini."
                  : `${headlineCount} dari ${total} kecamatan berstatus ${status.word} untuk setidaknya satu penyakit. Cari kecamatan Anda di atas untuk hasil yang spesifik.`}
              </p>
              <p className="mt-6 border-t border-white/70 pt-4 text-caption text-paper-600">
                Dihitung dari data iklim dan riwayat kasus sampai{" "}
                {formatMonth(meta?.latestObserved)}
                {summary.unknown > 0
                  ? ` · ${summary.unknown} kecamatan belum punya prakiraan`
                  : ""}
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="flex h-full flex-col rounded-3xl border border-white/70 bg-white/70 p-6">
                <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
                  Sebaran status
                </p>

                <dl className="mt-5 space-y-4">
                  {CITY_LEVEL_META.map(({ level, blurb }) => {
                    const levelStatus = STATUS[level];
                    const count = counts[level];
                    return (
                      <div key={level}>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt
                            className={cn(
                              "text-overline uppercase tracking-[0.1em]",
                              levelStatus.ink,
                            )}
                          >
                            {levelStatus.word}
                          </dt>
                          <dd className="tabular text-h3 text-foreground">
                            {count}
                            <span className="text-caption text-paper-600">
                              {" "}
                              /{total}
                            </span>
                          </dd>
                        </div>
                        <div className="mt-2">
                          <ScoreBar
                            score={(count / total) * 100}
                            bar={levelStatus.bar}
                          />
                        </div>
                        <p className="mt-1.5 text-caption text-paper-600">{blurb}</p>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {watchlist.length > 0 && (
        <Reveal delay={90} className="mt-6 rounded-3xl border border-sand-200 bg-white/70 p-7">
          <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Kecamatan berstatus {status.word}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {watchlist.map(({ nama, level, driver, score }) => {
              const levelStatus = statusOf(level);
              return (
                <button
                  key={nama}
                  type="button"
                  onClick={() => onSelectKecamatan(nama)}
                  className="group inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3.5 py-2 text-left transition-colors duration-fast hover:border-brand-300"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
                  <span className="text-body-sm font-medium text-foreground">
                    {nama}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-3xs uppercase tracking-wider",
                      levelStatus.ink,
                    )}
                  >
                    {levelStatus.word} · {driver ?? "—"}{" "}
                    {score === null ? "" : Math.round(score)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 border-t border-sand-100 pt-4 text-caption text-paper-600">
            Status kota memakai penyakit terburuk tiap kecamatan, bukan rata-ratanya.
          </p>
        </Reveal>
      )}
    </>
  );
}

/* ── District view ────────────────────────────────────────────────────────── */

function DistrictResult({ selectedKecamatan }: { selectedKecamatan: string }) {
  const { byDisease, meta } = useCityData();

  const rows = useMemo(
    () =>
      districtAcrossDiseases(byDisease, selectedKecamatan).map(({ disease, data }) => ({
        type: disease as DiseaseType,
        data,
      })),
    [byDisease, selectedKecamatan],
  );

  if (rows.length === 0) return null;

  /* Kecamatan tanpa prakiraan diperlakukan sebagai peringkat terendah, bukan
     sebagai "rendah": kelasnya tetap kosong di layar. */
  const rank = (level: RiskLevel | null) => (level === null ? -1 : ORDER[level]);
  const worst = rows.reduce((prev, curr) =>
    rank(curr.data.tingkat_risiko) > rank(prev.data.tingkat_risiko) ? curr : prev,
  );
  const status = statusOf(worst.data.tingkat_risiko);

  return (
    <>
      {/* ── The answer ── */}
      <Reveal>
        <div className="border-t border-sand-200 pt-4">
          <span className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Hasil · Kecamatan {selectedKecamatan}
          </span>
        </div>

        <div
          className={cn(
            "relative mt-6 overflow-hidden rounded-[28px] border",
            status.edge,
            status.surface,
          )}
        >
          <div className="grid gap-10 p-8 md:grid-cols-12 md:items-stretch md:p-12">
            <div className="md:col-span-7">
              <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
                Status wilayah Anda
              </p>
              <p
                className="mt-3 text-display leading-[0.95] tracking-[-0.03em]"
                style={{
                  backgroundImage: status.textGrad,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {status.word}
              </p>
              <p className="mt-5 max-w-md text-body-lg text-paper-700">
                {status.lead}
              </p>
              <p className="mt-6 border-t border-white/70 pt-4 text-caption text-paper-600">
                Prakiraan {formatMonth(meta?.predictionMonth)} · dihitung dari data
                iklim dan riwayat kasus sampai {formatMonth(meta?.latestObserved)}
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="flex h-full flex-col rounded-3xl border border-white/70 bg-white/70 p-6">
                <p className="text-overline uppercase tracking-[0.1em] text-paper-600">
                  Penyumbang risiko tertinggi
                </p>
                <p className="mt-2 text-h2 text-foreground">
                  {diseaseMeta(worst.type).full}
                </p>
                <div className="mt-5">
                  <ScoreBar score={worst.data.skor_risiko ?? 0} bar={status.bar} />
                </div>
                {/* "Keyakinan model 94%" dihapus: angkanya tidak pernah keluar
                    dari model. Cakupan data dihitung dari kelengkapan riwayat
                    kecamatan ini dan memang menjawab pertanyaan yang sama. */}
                <p className="tabular mt-4 text-caption leading-relaxed text-paper-600">
                  Skor{" "}
                  {worst.data.skor_risiko === null
                    ? "—"
                    : Math.round(worst.data.skor_risiko)}{" "}
                  · cakupan data {COVERAGE_WORD[worst.data.coverage]}
                </p>

                <dl className="mt-auto flex divide-x divide-sand-200 border-t border-sand-200 pt-4">
                  <div className="flex-1 pr-4">
                    <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
                      Kasus kini
                    </dt>
                    <dd className="tabular mt-1 text-h2 text-foreground">
                      {worst.data.kasus_aktif ?? "—"}
                    </dd>
                  </div>
                  <div className="flex-1 pl-4">
                    <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
                      Prakiraan {formatMonth(meta?.predictionMonth)}
                    </dt>
                    <dd className="tabular mt-1 text-h2 text-foreground">
                      {worst.data.kasus_prediksi_lower === null
                        ? "—"
                        : `${worst.data.kasus_prediksi_lower}–${worst.data.kasus_prediksi_upper}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Per-disease detail ── */}
      <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ type, data }, i) => (
          <DiseaseCard key={type} type={type} data={data} index={i} />
        ))}
      </div>

      {/* ── One action, not three ── */}
      <Reveal
        delay={120}
        className="mt-8 flex flex-col items-center justify-between gap-5 rounded-3xl border border-sand-200 bg-grad-brand-soft px-7 py-6 sm:flex-row"
      >
        <p className="max-w-lg text-body-sm text-paper-700">
          Melihat gejala atau genangan air di sekitar rumah? Laporan Anda
          diverifikasi petugas dan tersedia sebagai sinyal untuk prakiraan bulan depan.
        </p>
        {/* Kecamatan yang sedang dilihat ikut ke formulir. Pembaca sudah
            menjawab "di mana Anda tinggal" untuk sampai ke layar ini;
            menanyakannya lagi di halaman berikutnya membuang jawabannya. */}
        <Button asChild size="lg" className="group w-full shrink-0 sm:w-auto">
          <Link href={withKecamatan("/warga/lapor", selectedKecamatan)}>
            Laporkan temuan
            <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </Reveal>
    </>
  );
}

export function RiskResultSection({
  selectedKecamatan,
  onSelectKecamatan,
}: RiskResultSectionProps) {
  const { rows } = useCityData();

  /* Nama yang tidak dikenal jatuh ke tampilan kota, bukan ke bagian kosong —
     jangkar yang dituju hero harus selalu mendarat pada sesuatu yang terbaca. */
  const known = useMemo(
    () => !!selectedKecamatan && rows.some((r) => r.nama === selectedKecamatan),
    [selectedKecamatan, rows],
  );

  return (
    <section id="risk-check" className="scroll-mt-24 bg-grad-paper py-16 md:py-24">
      <div className="container">
        {known && selectedKecamatan ? (
          <DistrictResult selectedKecamatan={selectedKecamatan} />
        ) : (
          <CitySummary onSelectKecamatan={onSelectKecamatan} />
        )}
      </div>
    </section>
  );
}
