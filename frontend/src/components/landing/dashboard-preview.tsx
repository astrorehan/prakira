"use client";

import * as React from "react";
import { CloudRain, Stethoscope, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { CountUp } from "./count-up";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { fetchBacktests } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useCityData } from "@/lib/use-city-data";

/**
 * Bagian "akurasi & sumber".
 *
 * Empat angka di sini dulu ditulis tangan: R² 0,91, MAE 4,12, "156 minggu
 * diuji", "16 kecamatan diperbarui tiap minggu". Tiga dari empat salah
 * terhadap sistem yang sebenarnya berjalan — model DBD punya R² 0,45, data
 * ujinya dihitung dalam bulan, dan pembaruannya bulanan. Halaman yang
 * judulnya "Diuji ke belakang sebelum dipakai ke depan" adalah tempat paling
 * buruk untuk angka yang tidak berasal dari pengujian mana pun.
 */
export function TrustSection() {
  const backtests = useApi(() => fetchBacktests(), []);
  const { rows, meta } = useCityData();

  const rowsBacktest = backtests.data?.data ?? [];
  /* Model dengan data uji terpanjang mewakili bagian ini: menampilkan rata-rata
     dari beberapa model akan menghasilkan angka yang tidak dimiliki model mana
     pun. Nama modelnya ikut disebut supaya angkanya bisa ditelusuri. */
  const headline = rowsBacktest.reduce<(typeof rowsBacktest)[number] | null>(
    (best, m) => (best === null || (m.sample_size ?? 0) > (best.sample_size ?? 0) ? m : best),
    null,
  );

  const METRICS = headline
    ? [
        {
          value: headline.r2,
          decimals: 3,
          label: `R² pada backtest ${headline.disease}`,
          note: "Seberapa dekat prakiraan dengan kasus yang benar-benar terjadi",
        },
        {
          value: headline.mae,
          decimals: 2,
          label: "Rata-rata meleset",
          note: `Selisih kasus per kecamatan per bulan (MAE), model ${headline.disease}`,
        },
        {
          value: headline.sample_size ?? 0,
          decimals: 0,
          label: "Bulan diuji",
          note: `Periode uji ${headline.test_period ?? "—"}, di luar data latih`,
        },
        {
          value: rows.length,
          decimals: 0,
          label: "Kecamatan",
          note: `Seluruh Kota Semarang, data terakhir ${meta?.monthYear ?? "—"}`,
        },
      ]
    : [];

  const SOURCES = [
    {
      icon: CloudRain,
      name: "Data iklim",
      detail:
        "Curah hujan, suhu, dan kelembaban bulanan per kecamatan, disiapkan sebagai berkas dataset di repositori ini.",
    },
    {
      icon: Stethoscope,
      name: "Rekapitulasi kasus",
      detail: `Riwayat kasus bulanan per kecamatan, ${meta?.historyMonths ?? 0} bulan tersedia di basis data.`,
    },
    {
      icon: Users,
      name: "Laporan warga",
      detail: "Gejala dan kondisi lingkungan, dipakai setelah diverifikasi petugas.",
    },
  ];

  return (
    <section id="bukti" className="scroll-mt-24 bg-grad-paper py-16 md:py-24">
      <div className="container">
        <SectionHeading
          kicker="Akurasi & sumber"
          title="Diuji ke belakang sebelum dipakai ke depan"
          lead="Model dilatih hanya pada bulan-bulan sebelum tanggal pemisah, lalu diminta memprediksi bulan-bulan sesudahnya. Angka di bawah ini berasal dari uji itu, apa adanya."
        />

        {METRICS.length === 0 && (
          <p className="mt-8 text-body-sm text-paper-600">
            {backtests.loading
              ? "Memuat hasil pengujian model…"
              : "Hasil pengujian model belum tersedia. Jalankan layanan model lalu muat ulang halaman ini."}
          </p>
        )}

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
