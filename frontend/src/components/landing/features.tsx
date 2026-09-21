"use client";

import * as React from "react";
import { useState } from "react";
import { AlertCircle, Bug, Rat, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiseaseType } from "@/types";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Guide = {
  key: DiseaseType;
  tab: string;
  icon: React.ElementType;
  headline: string;
  standfirst: string;
  steps: { title: string; detail: string }[];
  seekCare: string;
};

/* One disease at a time. The previous version stacked twelve bullets in three
   columns, which is a wall no resident reads — here the reader chooses the one
   that applies to them and gets four steps with room to breathe. */
const GUIDES: Guide[] = [
  {
    key: "DBD",
    tab: "Demam Berdarah",
    icon: Bug,
    headline: "Nyamuk bertelur di air yang diam",
    standfirst:
      "Air tergenang selama seminggu cukup untuk memutus atau memulai siklus nyamuk.",
    steps: [
      {
        title: "Kuras seminggu sekali",
        detail:
          "Bak mandi, ember, dan tampungan dispenser. Sikat dindingnya.",
      },
      {
        title: "Tutup rapat tampungan air",
        detail: "Tandon, gentong, dan drum. Pastikan tidak ada celah.",
      },
      {
        title: "Daur ulang barang bekas",
        detail:
          "Singkirkan ban, kaleng, dan pot yang bisa menampung hujan.",
      },
      {
        title: "Lindungi jam menggigit",
        detail:
          "Gunakan lotion atau kelambu saat nyamuk paling aktif, pagi dan sore.",
      },
    ],
    seekCare:
      "Periksa ke puskesmas bila demam tinggi lebih dari 2 hari atau muncul bintik merah.",
  },
  {
    key: "ISPA",
    tab: "ISPA & Batuk",
    icon: Wind,
    headline: "Udara kering dan berdebu melukai saluran napas",
    standfirst:
      "Udara kering, debu, dan ruang tertutup membuat saluran napas lebih mudah teriritasi.",
    steps: [
      {
        title: "Masker di kawasan berdebu",
        detail: "Terutama di jalur padat kendaraan dan area konstruksi.",
      },
      {
        title: "Buka ventilasi tiap pagi",
        detail: "Udara yang berputar mengurangi penumpukan partikel di dalam rumah.",
      },
      {
        title: "Cukupi cairan",
        detail: "Air putih membantu tubuh menjaga saluran napas tetap lembap.",
      },
      {
        title: "Jaga jarak saat bergejala",
        detail: "Batuk dan pilek lebih mudah menyebar di ruang tertutup dan ramai.",
      },
    ],
    seekCare:
      "Periksa bila batuk lebih dari 3 hari, disertai sesak, atau demam tak turun.",
  },
  {
    key: "LEPTOSPIROSIS",
    tab: "Leptospirosis",
    icon: Rat,
    headline: "Jaga jarak dari air yang tercemar",
    standfirst:
      "Air banjir atau lumpur dapat membawa bakteri dari urine tikus ke luka kecil.",
    steps: [
      {
        title: "Hindari genangan dan air banjir",
        detail: "Jangan berjalan tanpa alas kaki. Gunakan sepatu bot dan sarung tangan.",
      },
      {
        title: "Tutup luka sebelum beraktivitas",
        detail: "Tutup luka dengan rapat, lalu cuci tangan dan kaki dengan sabun.",
      },
      {
        title: "Bersihkan rumah dengan aman",
        detail: "Buang sisa genangan dan bersihkan permukaan dengan disinfektan.",
      },
      {
        title: "Kurangi tempat tikus",
        detail: "Tutup makanan dan sampah, rapikan barang, dan tutup celah rumah.",
      },
    ],
    seekCare:
      "Periksa bila demam atau nyeri otot muncul setelah kontak dengan genangan.",
  },
];

export function EducationSection() {
  const [active, setActive] = useState<DiseaseType>("DBD");
  const guide = GUIDES.find((g) => g.key === active) ?? GUIDES[0];
  const Icon = guide.icon;

  return (
    <section id="edukasi" className="scroll-mt-24 bg-grad-sand py-16 md:py-24">
      <div className="container">
        <SectionHeading
          kicker="Pencegahan"
          title="Yang bisa dilakukan dari rumah"
          lead="Pilih satu penyakit untuk melihat langkah pencegahan yang paling penting."
          aside={
            <div
              role="tablist"
              aria-label="Pilih panduan pencegahan"
              className="inline-flex flex-wrap gap-1 rounded-full border border-sand-200 bg-white p-1"
            >
              {GUIDES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={active === g.key}
                  onClick={() => setActive(g.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-fast",
                    active === g.key
                      ? "bg-brand-700 text-white"
                      : "text-paper-600 hover:text-foreground",
                  )}
                >
                  {g.tab}
                </button>
              ))}
            </div>
          }
        />

        <Reveal
          key={guide.key}
          delay={60}
          className="mt-10 overflow-hidden rounded-3xl border border-sand-200 bg-grad-paper"
        >
          <div className="grid gap-10 p-7 md:grid-cols-12 md:p-10">
            <div className="md:col-span-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-brand-soft">
                <Icon className="h-6 w-6 text-brand-700" aria-hidden />
              </span>
              <h3 className="mt-5 text-h2 text-balance text-foreground">
                {guide.headline}
              </h3>
              <p className="mt-4 text-body text-paper-600">{guide.standfirst}</p>

              <div className="mt-6 flex gap-3 rounded-2xl border border-risk-medium-br bg-risk-medium-bg p-4">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium"
                  aria-hidden
                />
                <p className="text-body-sm text-paper-700">{guide.seekCare}</p>
              </div>
            </div>

            <ol className="grid gap-x-8 gap-y-7 md:col-span-8 md:grid-cols-2">
              {guide.steps.map((step, i) => (
                <li key={step.title}>
                  <div className="flex items-baseline gap-3 border-t border-sand-200 pt-4">
                    <span className="tabular font-mono text-overline text-brand-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h4 className="text-h3 text-foreground">{step.title}</h4>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-paper-600">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
