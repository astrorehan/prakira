"use client";

import * as React from "react";
import { AlertTriangle, FileCheck2, Mail, ScrollText } from "lucide-react";

import { fetchBacktests } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { DataState } from "@/components/data-state";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";

const STEPS = [
  {
    no: "01",
    title: "Pengumpulan data",
    body: "Curah hujan, suhu, dan kelembaban tersimpan sebagai deret bulanan per kecamatan, sejajar dengan rekapitulasi kasus yang diunggah petugas melalui konsol.",
  },
  {
    no: "02",
    title: "Pemodelan risiko",
    body: "Model dilatih pada hubungan iklim–kasus dengan jeda satu hingga tiga bulan, lalu menghasilkan skor risiko dan rentang prakiraan untuk tiap kecamatan.",
  },
  {
    no: "03",
    title: "Verifikasi & penerbitan",
    body: "Bidang P2P memeriksa keluaran model sebelum diterbitkan. Peringatan resmi hanya keluar setelah verifikasi manusia, bukan otomatis dari model.",
  },
];

/**
 * Halaman informasi publik.
 *
 * Tabel akurasi di bawah dulu menyalin lima baris `BACKTEST_METRICS` — termasuk
 * satu model LSTM dan satu baris Diare yang tidak pernah dilatih — lalu
 * menutupnya dengan kalimat "dievaluasi pada 2.496 sampel kecamatan-minggu".
 * Baik modelnya, angkanya, maupun satuan waktunya tidak ada. Daftar batasan
 * juga tidak lagi ditulis di sini: gateway mengirimkannya bersama hasil
 * backtest, jadi konsol petugas dan halaman publik membaca batasan yang sama.
 */
export function PublicInfo() {
  const backtests = useApi(() => fetchBacktests(), []);
  const metrics = backtests.data?.data ?? [];
  const limits = backtests.data?.meta.limitations ?? [];

  /* Model dengan R² tertinggi mewakili ringkasan di atas tabel. */
  const best = metrics.reduce<(typeof metrics)[number] | null>(
    (top, m) => (top === null || m.r2 > top.r2 ? m : top),
    null,
  );

  return (
    <section id="informasi" className="scroll-mt-16 border-t border-sand-200 bg-grad-paper">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="max-w-2xl border-t border-sand-200 pt-6">
            <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
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
                    <span className="font-mono text-overline uppercase tabular text-paper-600">
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
                <span className="flex items-center gap-2 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                  Uji ulang model · {best?.test_period ?? "belum tersedia"}
                </span>
                {best?.class_accuracy_pct !== null && best?.class_accuracy_pct !== undefined && (
                  <span className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                    Akurasi kelas terbaik{" "}
                    <CountUp
                      to={best.class_accuracy_pct}
                      decimals={1}
                      suffix=" %"
                      className="font-medium text-brand-700"
                    />
                  </span>
                )}
              </div>

              <DataState
                loading={backtests.loading}
                error={backtests.error}
                empty={!backtests.loading && metrics.length === 0}
                emptyMessage="Hasil pengujian model belum tersedia."
                onRetry={backtests.reload}
                className="m-4"
              >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-sand-200">
                      {["Model", "Penyakit", "MAE", "RMSE", "R²", "Akurasi kelas"].map((h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`px-3 py-3 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600 ${
                            i >= 2 ? "text-right" : ""
                          } ${i === 0 ? "pl-5" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={m.disease} className="border-b border-sand-100 last:border-b-0">
                        <td className="py-3 pl-5 pr-3 text-caption text-foreground">
                          {m.algorithm ?? m.model_version}
                        </td>
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
                          {m.class_accuracy_pct === null
                            ? "—"
                            : `${m.class_accuracy_pct.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </DataState>

              <p className="border-t border-sand-200 bg-sand-50 px-5 py-3 text-2xs text-paper-600">
                {best
                  ? `Periode uji ${best.test_period ?? "—"}, di luar data latih. Metrik diterbitkan apa adanya, termasuk ketika turun.`
                  : "Hasil pengujian model belum tersedia pada pemasangan ini."}
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
                {/* Daftar batasan datang dari gateway, jadi halaman publik dan
                    konsol petugas tidak bisa menyebut batasan yang berbeda. */}
                <ul className="mt-4 space-y-2.5">
                  {limits.map((line) => (
                    <li key={line} className="flex gap-2.5 text-caption text-paper-700">
                      <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-risk-medium" />
                      {line}
                    </li>
                  ))}
                  {limits.length === 0 && (
                    <li className="text-caption text-paper-700">
                      Daftar batasan belum dapat diambil dari layanan data.
                    </li>
                  )}
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
                      <dt className="shrink-0 text-paper-600">{k}</dt>
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
