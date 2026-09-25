"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

import { CountUp } from "./count-up";
import { Reveal } from "./reveal";

/**
 * "Masalahnya" — kenapa halaman ini ada, dalam satu pita gelap.
 *
 * Diterjemahkan dari banner kampanye: laut petrol, titik halftone, tiga kartu
 * kaca. Ini satu-satunya permukaan gelap di tengah halaman, jadi ia berfungsi
 * sebagai jeda antara jawaban (di atas) dan cara kerjanya (di bawah).
 *
 * Angka di sini adalah rekap tahunan, bukan prakiraan, sehingga tidak memakai
 * warna risiko. Warna tiap kartu adalah identitas penyakitnya (`dz-*`).
 */
const HEADLINE = { value: 63450, label: "jiwa terdampak banjir rob" };

const STATS: {
  value: number;
  prefix?: React.ReactNode;
  suffix?: string;
  label: string;
  dot: string;
}[] = [
  {
    value: 84,
    prefix: <ArrowUp className="mr-1 inline h-[0.8em] w-[0.8em] -translate-y-[0.06em]" aria-label="naik" />,
    suffix: "%",
    label: "Kasus leptospirosis",
    dot: "bg-dz-lepto-fill",
  },
  { value: 156708, suffix: "+", label: "Kasus ISPA", dot: "bg-dz-ispa-fill" },
  { value: 132, label: "Kasus DBD", dot: "bg-dz-dbd-fill" },
];

export function ProblemBand() {
  return (
    <section aria-labelledby="masalah-title" className="bg-white py-12 md:py-16">
      <div className="container">
        <Reveal className="relative isolate overflow-hidden rounded-[2rem] bg-grad-ocean px-6 py-12 text-white shadow-pop md:px-12 md:py-16">
          <div aria-hidden className="halftone halftone-light pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden className="halftone halftone-light halftone-bl pointer-events-none absolute inset-0 -z-10 opacity-60" />

          <div className="text-center">
            <p className="font-mono text-overline uppercase tracking-[0.18em] text-ocean-200">
              Masalahnya · Semarang 2025
            </p>
            <h2
              id="masalah-title"
              className="mx-auto mt-4 max-w-3xl text-balance text-[clamp(2rem,1.3rem+3vw,3.5rem)] font-semibold uppercase leading-[1.05] tracking-[-0.01em]"
            >
              <CountUp to={HEADLINE.value} grouped className="bg-grad-ink-light bg-clip-text text-transparent" />{" "}
              {HEADLINE.label}
            </h2>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-3 md:mt-12 md:gap-5">
            {STATS.map((s, i) => (
              <Reveal
                as="li"
                key={s.label}
                delay={120 + i * 110}
                className="glass-tile flex flex-col items-center justify-center rounded-3xl px-5 py-8 text-center"
              >
                <span className="tabular text-[clamp(2.5rem,1.8rem+2.4vw,3.75rem)] font-medium leading-none tracking-[-0.02em]">
                  {s.prefix}
                  <CountUp to={s.value} grouped />
                  {s.suffix}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-body-sm text-ocean-100">
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
                  {s.label}
                </span>
              </Reveal>
            ))}
          </ul>

          <p className="mt-8 text-center text-caption text-ocean-200/90">
            Rekap tahunan Kota Semarang · bukan prakiraan, dan tidak ikut dihitung dalam skor risiko
          </p>
        </Reveal>
      </div>
    </section>
  );
}
