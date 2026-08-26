"use client";

import * as React from "react";
import { CloudRain, Stethoscope, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { CountUp } from "./count-up";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/* Figures come from the XGBoost backtest in lib/mock-data (BACKTEST_METRICS,
   DBD row). Stated with their period so the number is checkable, not a boast. */
const METRICS = [
  {
    value: 0.91,
    decimals: 2,
    label: "R² pada backtest",
    note: "Seberapa dekat prakiraan dengan kasus yang benar-benar terjadi",
  },
  {
    value: 4.12,
    decimals: 2,
    label: "Rata-rata meleset",
    note: "Selisih kasus per kecamatan per minggu (MAE)",
  },
  {
    value: 156,
    decimals: 0,
    label: "Minggu diuji",
    note: "Periode evaluasi 2023–2026, di luar data latih",
  },
  {
    value: 16,
    decimals: 0,
    label: "Kecamatan",
    note: "Seluruh Kota Semarang, diperbarui tiap minggu",
  },
];

const SOURCES = [
  {
    icon: CloudRain,
    name: "BMKG",
    detail: "Curah hujan, suhu, dan kelembaban harian dari 4 stasiun pengamatan.",
  },
  {
    icon: Stethoscope,
    name: "Dinas Kesehatan Kota Semarang",
    detail: "Riwayat kasus mingguan per kecamatan sejak 2023.",
  },
  {
    icon: Users,
    name: "Laporan warga",
    detail: "Gejala dan kondisi lingkungan, dipakai setelah diverifikasi puskesmas.",
  },
];

export function TrustSection() {
  return (
    <section id="bukti" className="scroll-mt-24 bg-grad-paper py-16 md:py-24">
      <div className="container">
        <SectionHeading
          kicker="Akurasi & sumber"
          title="Diuji ke belakang sebelum dipakai ke depan"
          lead="Model dijalankan ulang pada tiga tahun data lama, lalu hasilnya dibandingkan dengan kasus yang sebenarnya terjadi. Angka di bawah ini berasal dari uji itu."
        />

        {/* Metrics — ruled columns, not four floating boxes. */}
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 90} className="border-t border-sand-200 pt-5">
              <p className="tabular text-metric text-foreground">
                <CountUp to={m.value} decimals={m.decimals} />
              </p>
              <p className="mt-2 text-body font-medium text-foreground">{m.label}</p>
              <p className="mt-1.5 text-body-sm leading-relaxed text-paper-600">
                {m.note}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Sources */}
        <Reveal
          delay={120}
          className="mt-16 grid gap-10 rounded-3xl border border-sand-200 bg-sand-50 p-7 md:grid-cols-12 md:p-10"
        >
          <div className="md:col-span-4">
            <h3 className="text-h2 text-foreground">Dari mana datanya</h3>
            <p className="mt-3 text-body text-paper-600">
              Tiga sumber, semuanya resmi atau terverifikasi. Tidak ada angka yang
              dikarang oleh model sendiri.
            </p>
          </div>

          <ul className="md:col-span-8">
            {SOURCES.map(({ icon: Icon, name, detail }) => (
              <li
                key={name}
                className="flex gap-4 border-t border-sand-200 py-5 first:border-t-0 first:pt-0"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                <div>
                  <p className="text-body font-medium text-foreground">{name}</p>
                  <p className="mt-1 text-body-sm text-paper-600">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* The honest caveat, stated plainly rather than buried in a footer. */}
        <Reveal
          delay={80}
          className="mt-6 flex flex-col items-start justify-between gap-5 border-t border-sand-200 pt-6 md:flex-row md:items-center"
        >
          <p className="max-w-2xl text-body-sm leading-relaxed text-paper-600">
            Prakira adalah alat bantu keputusan, bukan alat diagnosis. Prakiraan
            selalu disertai rentang ketidakpastian, dan kecamatan dengan riwayat data
            tipis ditandai secara terpisah — data yang sedikit bukan berarti aman.
          </p>

          <Button asChild variant="outline" size="lg" className="group shrink-0">
            <Link href="/masuk">
              Buka dashboard petugas
              <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
