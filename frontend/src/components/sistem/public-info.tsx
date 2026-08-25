"use client";

import * as React from "react";
import { AlertTriangle, FileCheck2, Mail, ScrollText } from "lucide-react";

import { BACKTEST_METRICS } from "@/lib/mock-data";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";

const STEPS = [
  {
    no: "01",
    title: "Pengumpulan data",
    body: "Empat stasiun BMKG di Kota Semarang mengirim curah hujan, suhu, kelembaban, angin, dan radiasi setiap jam. Dinas Kesehatan mengunggah rekap kasus mingguan per kecamatan.",
  },
  {
    no: "02",
    title: "Pemodelan risiko",
    body: "Model dilatih pada hubungan iklim–kasus dengan jeda dua hingga empat minggu, lalu menghasilkan skor risiko dan rentang proyeksi untuk tiap kecamatan.",
  },
  {
    no: "03",
    title: "Verifikasi & penerbitan",
    body: "Bidang P2P memeriksa keluaran model sebelum diterbitkan. Peringatan resmi hanya keluar setelah verifikasi manusia, bukan otomatis dari model.",
  },
];

const LIMITS = [
  "Prakiraan adalah probabilitas, bukan kepastian. Angka proyeksi selalu ditampilkan sebagai rentang.",
  "Kecamatan dengan riwayat data tipis menghasilkan rentang yang lebih lebar — bukan berarti wilayah tersebut aman.",
  "Sistem ini tidak menggantikan diagnosis medis. Keluhan kesehatan perorangan tetap harus diperiksa tenaga kesehatan.",
  "Perubahan pelaporan kasus di lapangan dapat menggeser hasil model pada pekan berikutnya.",
];

export function PublicInfo() {
  const best = [...BACKTEST_METRICS].sort((a, b) => b.accuracy_pct - a.accuracy_pct)[0];

  return (
    <section id="informasi" className="scroll-mt-16 border-t border-sand-200 bg-grad-paper">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="max-w-2xl border-t border-sand-200 pt-6">
            <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-500">
              06 · Informasi publik
            </p>
            <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
              Cara sistem bekerja, dan di mana batasnya
            </h2>
            <p className="mt-4 text-body-lg text-paper-600">
              Metode, akurasi, dan keterbatasan dibuka penuh agar setiap angka di halaman
              ini bisa diperiksa ulang.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ── Method + accuracy ── */}
          <div className="min-w-0 lg:col-span-7">
            <Reveal>
              <ol className="border-t border-sand-200">
                {STEPS.map((step) => (
                  <li key={step.no} className="flex gap-5 border-b border-sand-200 py-5">
                    <span className="font-mono text-overline uppercase tabular text-paper-400">
                      {step.no}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-h3 text-foreground">{step.title}</h3>
                      <p className="mt-1.5 max-w-xl text-caption text-paper-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={100} className="mt-8 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand-200 bg-sand-50 px-5 py-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                  Uji ulang model · {best.backtest_period}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
                  Akurasi terbaik{" "}
                  <CountUp to={best.accuracy_pct} decimals={1} suffix=" %" className="font-medium text-brand-700" />
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-sand-200">
                      {["Model", "Penyakit", "MAE", "RMSE", "R²", "Akurasi"].map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`px-3 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 ${
                            i >= 2 ? "text-right" : ""
                          } ${i === 0 ? "pl-5" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BACKTEST_METRICS.map((m) => (
                      <tr key={`${m.model_name}-${m.disease}`} className="border-b border-sand-100 last:border-b-0">
                        <td className="py-3 pl-5 pr-3 text-caption text-foreground">{m.model_name}</td>
                        <td className="px-3 py-3 text-caption text-paper-600">{m.disease}</td>
                        <td className="px-3 py-3 text-right text-caption tabular text-paper-700">
                          {m.mae.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-caption tabular text-paper-700">
                          {m.rmse.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-caption tabular text-paper-700">
                          {m.r2.toFixed(3)}
                        </td>
                        <td className="px-3 py-3 pr-5 text-right text-caption tabular font-medium text-foreground">
                          {m.accuracy_pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="border-t border-sand-200 bg-sand-50 px-5 py-3 text-[11px] text-paper-500">
                Dievaluasi pada {BACKTEST_METRICS[0].sample_size.toLocaleString("id-ID")} sampel
                kecamatan-minggu. Metrik dihitung ulang setiap triwulan dan diterbitkan apa adanya,
                termasuk ketika turun.
              </p>
            </Reveal>
          </div>

          {/* ── Limits + PPID ── */}
          <div className="min-w-0 space-y-4 lg:col-span-5">
            <Reveal delay={80}>
              <div className="rounded-2xl border border-risk-medium-br bg-risk-medium-bg p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
                  <h3 className="text-h3 text-foreground">Batasan penggunaan</h3>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {LIMITS.map((line) => (
                    <li key={line} className="flex gap-2.5 text-caption text-paper-700">
                      <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-risk-medium" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  <h3 className="text-h3 text-foreground">Permohonan informasi publik</h3>
                </div>
                <p className="mt-3 text-caption text-paper-600">
                  Data mentah, dokumen metodologi, dan riwayat penerbitan peringatan dapat diminta
                  melalui PPID Dinas Kesehatan Kota Semarang.
                </p>
                <dl className="mt-4 space-y-2.5 border-t border-sand-200 pt-4 text-caption">
                  {[
                    ["Dasar hukum", "UU 14/2008 tentang Keterbukaan Informasi Publik"],
                    ["Waktu tanggapan", "10 hari kerja, dapat diperpanjang 7 hari"],
                    ["Biaya", "Tidak dipungut biaya"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-5">
                      <dt className="shrink-0 text-paper-500">{k}</dt>
                      <dd className="text-right font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
                <a
                  href="mailto:ppid@dinkes.semarangkota.go.id"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sand-200 bg-sand-50 text-caption font-medium text-paper-700 transition-colors duration-fast hover:border-brand-300 hover:text-brand-700"
                >
                  <Mail className="h-4 w-4" />
                  ppid@dinkes.semarangkota.go.id
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
