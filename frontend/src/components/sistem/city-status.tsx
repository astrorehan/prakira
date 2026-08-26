"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Bug, Droplets, FileText, MapPin, Wind } from "lucide-react";

import { cn, formatNumber, DISEASE_CONFIG, RISK_CONFIG } from "@/lib/utils";
import { getKecamatanDataList, SEMARANG_KECAMATAN_RAW } from "@/lib/mock-data";
import type { DiseaseType, RiskLevel } from "@/types";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";

const DISEASES: DiseaseType[] = ["DBD", "ISPA", "Diare"];

const DISEASE_ICON: Record<DiseaseType, React.ElementType> = {
  DBD: Bug,
  ISPA: Wind,
  Diare: Droplets,
};

/* Ordinal fills for the 16-cell district strip. Lightness descends with risk,
   so the ordinal survives greyscale and a projector. */
const CELL: Record<RiskLevel, string> = {
  tinggi: "bg-risk-high-fill",
  sedang: "bg-risk-medium-fill",
  rendah: "bg-risk-low-fill",
};

const TAG: Record<RiskLevel, string> = {
  tinggi: "bg-risk-high-bg text-risk-high border-risk-high-br",
  sedang: "bg-risk-medium-bg text-risk-medium border-risk-medium-br",
  rendah: "bg-risk-low-bg text-risk-low border-risk-low-br",
};

type Summary = {
  disease: DiseaseType;
  siaga: number;
  waspada: number;
  rendah: number;
  kasusAktif: number;
  prediksiLower: number;
  prediksiUpper: number;
  cells: RiskLevel[];
};

function summarise(disease: DiseaseType): Summary {
  const list = getKecamatanDataList(disease);
  const ranked = [...list].sort((a, b) => b.skor_risiko - a.skor_risiko);

  return {
    disease,
    siaga: list.filter((k) => k.tingkat_risiko === "tinggi").length,
    waspada: list.filter((k) => k.tingkat_risiko === "sedang").length,
    rendah: list.filter((k) => k.tingkat_risiko === "rendah").length,
    kasusAktif: list.reduce((sum, k) => sum + k.kasus_aktif, 0),
    prediksiLower: list.reduce((sum, k) => sum + k.kasus_prediksi_lower, 0),
    prediksiUpper: list.reduce((sum, k) => sum + k.kasus_prediksi_upper, 0),
    cells: ranked.map((k) => k.tingkat_risiko),
  };
}

/* ── One disease, one register row ───────────────────────────────────────── */
function DiseaseRow({ summary }: { summary: Summary }) {
  const config = DISEASE_CONFIG[summary.disease];
  const Icon = DISEASE_ICON[summary.disease];

  return (
    <div className="border-t border-sand-200 py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sand-200 bg-sand-50 text-brand-700">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-h3 text-foreground">{config.name}</h3>
            <p className="mt-1 text-caption text-paper-600">{config.vector}</p>
          </div>
        </div>

        <dl className="flex items-start gap-8">
          <div>
            <dt className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
              Kasus aktif
            </dt>
            <dd className="mt-1 text-metric-sm tabular text-foreground">
              <CountUp to={summary.kasusAktif} />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
              Proyeksi 4 minggu
            </dt>
            <dd className="mt-1 text-metric-sm tabular text-foreground">
              {formatNumber(summary.prediksiLower)}
              <span className="mx-1 text-paper-600">–</span>
              {formatNumber(summary.prediksiUpper)}
            </dd>
          </div>
        </dl>
      </div>

      {/* 16 districts, ranked left to right. The strip is the finding. */}
      <div className="mt-5">
        <div className="flex h-2 gap-[3px]" role="img" aria-label={`Sebaran risiko ${summary.disease}: ${summary.siaga} kecamatan siaga, ${summary.waspada} waspada, ${summary.rendah} rendah`}>
          {summary.cells.map((level, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-[2px]", CELL[level], level === "tinggi" && "risk-hatch")}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
          {(
            [
              ["tinggi", summary.siaga],
              ["sedang", summary.waspada],
              ["rendah", summary.rendah],
            ] as const
          ).map(([level, count]) => (
            <span key={level} className="flex items-center gap-1.5 text-caption text-paper-600">
              <span className={cn("h-2 w-2 rounded-[2px]", CELL[level])} />
              <span className="tabular font-medium text-foreground">{count}</span>
              {RISK_CONFIG[level].label.toLowerCase()}
            </span>
          ))}
          <span className="ml-auto font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
            16 kecamatan · urut skor
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Layanan 01: cek status wilayah ──────────────────────────────────────── */
function LookupPanel() {
  /* Empty until the reader answers. The panel's own label asks which kecamatan
     they live in — filling that in for them puts one district in front of
     every visitor and reads as a verdict rather than a prompt. */
  const [kecamatan, setKecamatan] = useState("");

  const rows = useMemo(
    () =>
      DISEASES.map((disease) => {
        const found = getKecamatanDataList(disease).find((k) => k.nama === kecamatan);
        return { disease, data: found };
      }),
    [kecamatan],
  );

  const profile = SEMARANG_KECAMATAN_RAW.find((k) => k.nama === kecamatan);
  const cuaca = rows[0]?.data?.cuaca;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-5 py-3">
        <span className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
          Layanan SL-01 · Cek status wilayah
        </span>
        <span className="rounded border border-sand-200 bg-white px-1.5 py-0.5 font-mono text-3xs uppercase text-paper-600">
          Tanpa login
        </span>
      </div>

      <div className="p-5">
        <label
          htmlFor="pilih-kecamatan"
          className="block text-caption font-medium text-paper-600"
        >
          Pilih kecamatan tempat tinggal
        </label>
        <div className="relative mt-2">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-600"
            aria-hidden
          />
          <select
            id="pilih-kecamatan"
            value={kecamatan}
            onChange={(e) => setKecamatan(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-sand-200 bg-white pl-10 pr-10 text-sm font-medium text-foreground transition-colors duration-fast hover:border-brand-300 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Pilih kecamatan…</option>
            {SEMARANG_KECAMATAN_RAW.map((k) => (
              <option key={k.id} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
          <ArrowRight
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-paper-600"
            aria-hidden
          />
        </div>

        {profile ? (
          <p className="mt-2.5 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
            Kode BPS {profile.kode_bps} · {formatNumber(profile.pop)} jiwa · {profile.luas.toFixed(2)} km²
          </p>
        ) : null}

        {!kecamatan && (
          <p className="mt-5 rounded-xl border border-dashed border-sand-300 bg-sand-50/60 px-4 py-6 text-center text-caption text-paper-600">
            Skor DBD, ISPA, dan Diare muncul di sini setelah kecamatan dipilih.
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          {rows.map(({ disease, data }) => {
            if (!data) return null;
            const level = data.tingkat_risiko;
            return (
              <div
                key={disease}
                className="flex items-center gap-3 rounded-xl border border-sand-200 bg-sand-50/60 px-3.5 py-3"
              >
                <span className="w-14 shrink-0 text-sm font-medium text-foreground">{disease}</span>
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand-200">
                    <span
                      className={cn("block h-full rounded-full", CELL[level])}
                      style={{ width: `${data.skor_risiko}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-2xs text-paper-600">
                    Skor <span className="tabular font-medium text-foreground">{data.skor_risiko}</span>
                    <span className="mx-1.5 text-paper-300">·</span>
                    {data.kasus_aktif} kasus aktif
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded border px-2 py-0.5 font-mono text-3xs uppercase tracking-[0.06em]",
                    TAG[level],
                  )}
                >
                  {RISK_CONFIG[level].label}
                </span>
              </div>
            );
          })}
        </div>

        {cuaca ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-sand-200 pt-4 text-2xs text-paper-600">
            <span>
              Hujan <span className="tabular font-medium text-foreground">{cuaca.curah_hujan_mm}</span> mm
            </span>
            <span>
              Suhu <span className="tabular font-medium text-foreground">{cuaca.suhu_c.toFixed(1)}</span> °C
            </span>
            <span>
              Lembap <span className="tabular font-medium text-foreground">{cuaca.kelembaban_pct}</span> %
            </span>
            <span className="text-paper-600">{cuaca.status_cuaca}</span>
          </div>
        ) : null}

        <a
          href="#register"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-medium text-white transition-colors duration-fast hover:bg-brand-600"
        >
          Lihat rincian &amp; langkah pencegahan
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */
export function CityStatus() {
  const summaries = useMemo(() => DISEASES.map(summarise), []);
  const totalSiaga = summaries.reduce((sum, s) => sum + s.siaga, 0);

  return (
    <section id="status" className="scroll-mt-16 bg-grad-page">
      <div className="container py-12 md:py-16">
        {/* Bulletin masthead */}
        <Reveal className="border-b border-sand-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
            <div className="max-w-2xl">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
                Buletin risiko mingguan · Edisi Minggu 34
              </p>
              <h1 className="mt-4 text-h1 text-balance text-foreground md:text-display">
                Status risiko penyakit iklim Kota Semarang
              </h1>
              <p className="mt-5 text-body-lg text-paper-600">
                Ringkasan resmi kondisi risiko DBD, ISPA, dan Diare di 16 kecamatan untuk
                periode <strong className="font-semibold text-foreground">18–24 Agustus 2026</strong>,
                disusun dari data iklim BMKG dan laporan kasus Dinas Kesehatan.
                Saat ini{" "}
                <strong className="font-semibold text-risk-high">
                  {totalSiaga} status siaga
                </strong>{" "}
                aktif di seluruh kota.
              </p>
            </div>

            {/* Document metadata — the block that makes a page a record. */}
            <dl className="w-full max-w-xs shrink-0 rounded-2xl border border-sand-200 bg-white/70 p-5 text-caption">
              <div className="flex items-center gap-2 border-b border-sand-200 pb-3">
                <FileText className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                <span className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                  Dokumen terbitan
                </span>
              </div>
              {[
                ["Nomor", "440/1892/DKK-P2P/VIII/2026"],
                ["Diterbitkan", "24 Agustus 2026, 18:00 WIB"],
                ["Berlaku sampai", "31 Agustus 2026"],
                ["Penanggung jawab", "Bidang P2P Dinkes Kota Semarang"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-sand-100 py-2.5 last:border-b-0 last:pb-0">
                  <dt className="shrink-0 text-paper-600">{label}</dt>
                  <dd className="text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        {/* Register + service */}
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <Reveal className="min-w-0 lg:col-span-7">
            <h2 className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
              Rekapitulasi per penyakit
            </h2>
            <div className="mt-6">
              {summaries.map((s) => (
                <DiseaseRow key={s.disease} summary={s} />
              ))}
            </div>
            <p className="mt-6 border-t border-sand-200 pt-4 text-caption text-paper-600">
              Proyeksi ditampilkan sebagai rentang, bukan angka tunggal. Rentang melebar
              ketika riwayat data kecamatan tidak lengkap.
            </p>
          </Reveal>

          <Reveal delay={120} className="min-w-0 lg:col-span-5">
            <LookupPanel />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
