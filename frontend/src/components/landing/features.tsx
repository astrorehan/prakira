"use client";

import * as React from "react";
import { useState } from "react";
import { Bug, Wind, Droplets, AlertCircle } from "lucide-react";
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
      "Aedes aegypti butuh air bersih yang tenang selama seminggu untuk menetas. Memutus satu minggu itu memutus seluruh siklusnya.",
    steps: [
      {
        title: "Kuras seminggu sekali",
        detail:
          "Bak mandi, ember, dan tampungan dispenser. Sikat dindingnya — telur menempel di sana, bukan mengapung.",
      },
      {
        title: "Tutup rapat tampungan air",
        detail: "Tandon, gentong, dan drum. Tutup yang longgar sama saja terbuka.",
      },
      {
        title: "Daur ulang barang bekas",
        detail:
          "Ban, kaleng, dan pot bekas menampung air hujan tanpa terlihat. Kubur atau singkirkan.",
      },
      {
        title: "Lindungi jam menggigit",
        detail:
          "Aedes aktif pagi dan sore. Pakai lotion dan kelambu, terutama untuk anak dan lansia.",
      },
    ],
    seekCare:
      "Ke puskesmas bila demam tinggi mendadak lebih dari 2 hari, apalagi disertai nyeri sendi, mimisan, atau bintik merah.",
  },
  {
    key: "ISPA",
    tab: "ISPA & Batuk",
    icon: Wind,
    headline: "Udara kering dan berdebu melukai saluran napas",
    standfirst:
      "Saat kelembaban turun dan suhu berayun tajam antara siang dan malam, lapisan pelindung saluran napas menipis dan infeksi lebih mudah masuk.",
    steps: [
      {
        title: "Masker di kawasan berdebu",
        detail: "Terutama di jalur padat kendaraan dan area konstruksi.",
      },
      {
        title: "Buka ventilasi tiap pagi",
        detail:
          "Udara yang berputar mengurangi penumpukan partikel dan uap air di dalam rumah.",
      },
      {
        title: "Cukupi cairan",
        detail: "Air putih menjaga lendir tetap encer sehingga lebih mudah dikeluarkan.",
      },
      {
        title: "Jaga jarak saat bergejala",
        detail: "Batuk dan pilek menyebar paling cepat di ruang tertutup dan ramai.",
      },
    ],
    seekCare:
      "Ke puskesmas bila batuk lebih dari 3 hari disertai sesak, napas berbunyi, atau demam yang tidak turun.",
  },
  {
    key: "Diare",
    tab: "Diare",
    icon: Droplets,
    headline: "Setelah banjir, air sumur belum tentu bersih",
    standfirst:
      "Genangan membawa cemaran ke sumber air rumah tangga. Kasus diare biasanya naik satu sampai dua minggu setelah hujan ekstrem.",
    steps: [
      {
        title: "Rebus air sampai mendidih",
        detail: "Biarkan mendidih penuh sekitar satu menit sebelum diangkat.",
      },
      {
        title: "Cuci tangan pakai sabun",
        detail: "Sebelum makan, sebelum menyiapkan makanan, dan setelah dari toilet.",
      },
      {
        title: "Periksa sumur setelah genangan",
        detail: "Air keruh atau berbau perlu diklorinasi sebelum dipakai.",
      },
      {
        title: "Sediakan oralit di rumah",
        detail:
          "Dehidrasi jauh lebih berbahaya daripada diarenya sendiri, terutama pada balita.",
      },
    ],
    seekCare:
      "Ke puskesmas bila diare lebih dari 2 hari, ada darah pada tinja, atau muncul tanda dehidrasi seperti lemas dan jarang buang air kecil.",
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
          lead="Peringatan hanya berguna kalau ada yang bisa dikerjakan setelahnya. Pilih penyakit yang sedang jadi perhatian di wilayah Anda."
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
