"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCityData } from "@/lib/use-city-data";
import type { DiseaseType, RiskLevel } from "@/types";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const RISK: Record<RiskLevel, { word: string; bar: string; ink: string; tint: string }> = {
  tinggi: { word: "Siaga", bar: "bg-grad-bar-high", ink: "text-risk-high", tint: "bg-risk-high-bg" },
  sedang: { word: "Waspada", bar: "bg-grad-bar-medium", ink: "text-risk-medium", tint: "bg-risk-medium-bg" },
  rendah: { word: "Rendah", bar: "bg-grad-bar-low", ink: "text-risk-low", tint: "bg-risk-low-bg" },
};

/* Kecamatan tanpa prakiraan punya penampilannya sendiri. Meminjam gaya
   "rendah" akan membuat kekosongan data terbaca sebagai kabar baik. */
const RISK_UNKNOWN = {
  word: "Belum ada",
  bar: "bg-paper-300",
  ink: "text-paper-600",
  tint: "bg-paper-100",
};

interface DistrictBoardProps {
  /** `null` while the reader has not chosen — no row is highlighted. */
  selectedKecamatan: string | null;
  onSelectKecamatan: (name: string) => void;
}

/**
 * Every district, ranked. This replaces the "click around a map and hope" model
 * with a list a reader can scan top-to-bottom — the ranking itself is the
 * finding, and the bar makes the gap between #1 and #16 legible at a glance.
 */
export function DistrictBoard({
  selectedKecamatan,
  onSelectKecamatan,
}: DistrictBoardProps) {
  const { byDisease, diseases, loading, error } = useCityData();
  const [disease, setDisease] = useState<DiseaseType | null>(null);

  React.useEffect(() => {
    if (!disease && diseases.length > 0) setDisease(diseases[0]);
  }, [diseases, disease]);

  /* Kecamatan tanpa skor turun ke dasar daftar, bukan naik ke puncak sebagai
     "skor 0". Papan peringkat yang menaruh kekosongan di posisi teraman
     adalah kesimpulan yang tidak pernah dibuat model. */
  const ranked = useMemo(() => {
    const list = disease ? (byDisease[disease] ?? []) : [];
    return [...list].sort((a, b) => (b.skor_risiko ?? -1) - (a.skor_risiko ?? -1));
  }, [byDisease, disease]);

  const half = Math.ceil(ranked.length / 2);
  const columns = [ranked.slice(0, half), ranked.slice(half)];

  return (
    <section id="peta" className="scroll-mt-24 bg-grad-paper py-16 md:py-24">
      <div className="container">
        <SectionHeading
          kicker="Peta risiko"
          title="16 kecamatan, satu papan peringkat"
          lead="Urut dari skor tertinggi. Pilih satu untuk melihat rincian dan langkah pencegahannya."
          aside={
            <div
              role="tablist"
              aria-label="Pilih penyakit"
              className="inline-flex rounded-full border border-sand-200 bg-sand-50 p-1"
            >
              {diseases.map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={disease === d}
                  type="button"
                  onClick={() => setDisease(d)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-fast",
                    disease === d
                      ? "bg-brand-700 text-white"
                      : "text-paper-600 hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          }
        />

        <Reveal delay={80} className="mt-10 grid gap-x-10 md:grid-cols-2">
          {columns.map((col, ci) => (
            <ul key={ci} className="divide-y divide-sand-200 border-t border-sand-200">
              {col.map((kec, i) => {
                const rank = ci * half + i + 1;
                const risk = kec.tingkat_risiko ? RISK[kec.tingkat_risiko] : RISK_UNKNOWN;
                const active = kec.nama === selectedKecamatan;

                return (
                  <li key={kec.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectKecamatan(kec.nama);
                        document
                          .getElementById("risk-check")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={cn(
                        "group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-4 py-3.5 text-left transition-colors duration-fast",
                        active ? "bg-sand-50" : "hover:bg-sand-50",
                      )}
                    >
                      <span className="tabular pl-3 font-mono text-caption text-paper-600">
                        {String(rank).padStart(2, "0")}
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-body font-medium text-foreground">
                            {kec.nama}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-paper-300 opacity-0 transition-opacity duration-fast group-hover:opacity-100" />
                        </span>

                        {/* Score as a proportional rule — the ranking made visual. */}
                        <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-sand-100">
                          <span
                            className={cn("block h-full rounded-full", risk.bar)}
                            style={{ width: `${kec.skor_risiko ?? 0}%` }}
                          />
                        </span>
                      </span>

                      <span className="flex items-center gap-3 pr-3">
                        <span
                          className={cn(
                            "hidden rounded-md px-2 py-1 font-mono text-3xs uppercase tracking-wider sm:inline-block",
                            risk.tint,
                            risk.ink,
                          )}
                        >
                          {risk.word}
                        </span>
                        <span
                          className={cn("tabular w-8 text-right text-h3", risk.ink)}
                        >
                          {kec.skor_risiko === null ? "—" : Math.round(kec.skor_risiko)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
        </Reveal>

        {(loading || error || ranked.length === 0) && (
          <p className="mt-6 text-body-sm text-paper-600">
            {loading
              ? "Memuat papan peringkat…"
              : error
                ? error
                : "Belum ada kecamatan dengan prakiraan untuk penyakit ini."}
          </p>
        )}

        {/* Skor adalah persentil prediksi terhadap riwayat kecamatan itu
            sendiri, bukan gabungan tiga faktor seperti yang tertulis
            sebelumnya - kepadatan penduduk tidak pernah masuk perhitungannya. */}
        <p className="mt-6 border-t border-sand-200 pt-4 font-mono text-3xs uppercase tracking-wider text-paper-600">
          Skor 0–100 · posisi prakiraan bulan depan terhadap riwayat kasus kecamatan
          itu sendiri
        </p>
      </div>
    </section>
  );
}
