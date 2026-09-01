"use client";

import * as React from "react";
import { ArrowRight, History, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiseaseSelector } from "@/components/disease-selector";
import { BacktestCard } from "@/components/backtest-card";
import { ModelSummary } from "@/components/model-summary";
import { ModelBenchmark } from "@/components/model-benchmark";
import { ModelCoverage } from "@/components/model-coverage";
import { DataState } from "@/components/data-state";
import {
  fetchBacktests,
  fetchDiseases,
  fetchKecamatanList,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { diseaseLabel } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import { formatPeriodRange } from "@/lib/stats";
import type { DiseaseType } from "@/types";

/**
 * Transparansi model (M8, PRD §5.7).
 *
 * Lima blok yang diminta PRD ada semua di satu halaman, berurutan: ringkasan
 * model, performa per penyakit, backtest prediksi vs aktual, cakupan data per
 * kecamatan, lalu batasan.
 *
 * Sebelumnya isinya tersebar: metrik dan grafik uji menumpang di `/analitik`
 * di belakang penjaga sesi, cakupan per kecamatan tidak ditampilkan di mana
 * pun meski sudah tersimpan, dan daftar batasan hanya muncul sebagai satu
 * paragraf di halaman layanan. Menyembunyikan halaman "seberapa boleh angka
 * ini dipercaya" di balik kotak masuk petugas adalah kesalahan produk: yang
 * paling perlu membacanya justru orang yang tidak punya akun.
 *
 * Karena itu rute ini publik. Ia tidak menampilkan satu pun identitas pelapor,
 * dan tidak ada satu pun tombol yang menulis.
 */
export function ModelTransparency() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(
    null,
  );

  const diseases = useApi(() => fetchDiseases(), []);
  const backtests = useApi(() => fetchBacktests(), []);
  const kecamatan = useApi(() => fetchKecamatanList(), []);

  React.useEffect(() => {
    if (!selectedDisease && diseases.data && diseases.data.length > 0) {
      setSelectedDisease(diseases.data[0].disease);
    }
  }, [diseases.data, selectedDisease]);

  const diseaseNames = React.useMemo(
    () => (diseases.data ?? []).map((d) => d.disease),
    [diseases.data],
  );

  const metrics = React.useMemo(() => backtests.data?.data ?? [], [backtests.data]);

  const activeMetric = React.useMemo(
    () =>
      metrics.find(
        (m) => m.disease.toLowerCase() === (selectedDisease ?? "").toLowerCase(),
      ) ?? null,
    [metrics, selectedDisease],
  );

  /* Jendela data penyakit aktif: awal periode latih sampai akhir periode uji.
     Dipakai untuk menyebut terhadap apa cakupan per kecamatan diukur. */
  const dataWindow = React.useMemo(() => {
    if (!activeMetric) return { label: undefined, months: null };

    const train = formatPeriodRange(activeMetric.train_period);
    const test = formatPeriodRange(activeMetric.test_period);
    if (train.startLabel === "—" || test.endLabel === "—") {
      return { label: undefined, months: null };
    }

    const months =
      train.monthsCount !== null && test.monthsCount !== null
        ? train.monthsCount + test.monthsCount
        : null;

    return { label: `${train.startLabel} – ${test.endLabel}`, months };
  }, [activeMetric]);

  const limitations = backtests.data?.meta.limitations ?? [];
  const errors = backtests.data?.meta.errors;

  return (
    <div className="container space-y-12 py-12 md:py-16">
      {/* Kepala halaman */}
      <header className="mx-auto max-w-3xl space-y-5 text-center">
        <div className="eyebrow mx-auto">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Transparansi Model
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance text-foreground md:text-5xl">
          Seberapa jauh angka prakiraan ini boleh dipercaya
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Halaman ini memuat metrik uji setiap model apa adanya — termasuk yang
          hasilnya biasa saja — beserta data yang melatihnya, kecamatan mana yang
          datanya tipis, dan hal-hal yang tidak bisa dijawab sistem ini.
        </p>

        {metrics.length > 0 && (
          <p className="text-caption text-paper-600">
            Terakhir disinkronkan dari layanan machine learning{" "}
            {formatDateTime(metrics[0].fetched_at)}.
          </p>
        )}
      </header>

      {/* Pemilih penyakit */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-body-sm text-paper-600">Model yang ditinjau:</span>
        <DiseaseSelector
          options={diseaseNames}
          selected={selectedDisease}
          onSelect={setSelectedDisease}
        />
      </div>

      {/* Kegagalan menarik hasil uji disebutkan, bukan disembunyikan di balik
          grid kosong yang terbaca seperti "modelnya memang belum pernah ada". */}
      {errors && (
        <div className="mx-auto flex max-w-3xl items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium"
            aria-hidden="true"
          />
          <div className="text-body-sm text-paper-700">
            {Object.entries(errors).map(([disease, message]) => (
              <p key={disease}>
                <span className="font-semibold text-foreground">
                  {diseaseLabel(disease)}:
                </span>{" "}
                {message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 1. Ringkasan model — algoritma, fitur, periode & tanggal latih */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="h-section text-foreground">Ringkasan model</h2>
          <p className="text-body-sm text-paper-600">
            Apa yang dipakai untuk memprakirakan {diseaseLabel(selectedDisease)}, dan
            dari data apa ia belajar.
          </p>
        </div>

        <DataState
          loading={backtests.loading || diseases.loading}
          error={backtests.error ?? diseases.error}
          empty={!backtests.loading && activeMetric === null}
          emptyMessage="Belum ada hasil uji tersimpan untuk penyakit ini. Jalankan layanan machine learning lalu segarkan halaman."
          onRetry={backtests.reload}
        >
          {activeMetric && <ModelSummary metric={activeMetric} />}
        </DataState>
      </section>

      {/* 2 & 3. Performa per penyakit + backtest prediksi vs aktual */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="h-section text-foreground">Performa pada data uji</h2>
          <p className="text-body-sm text-paper-600">
            Setiap penyakit dinilai terpisah. Tidak ada satu angka gabungan — model
            yang bagus di satu penyakit tidak menebus model yang lemah di penyakit
            lain.
          </p>
        </div>

        <DataState
          loading={backtests.loading}
          error={backtests.error}
          empty={!backtests.loading && metrics.length === 0}
          emptyMessage="Belum ada hasil backtest tersimpan."
          onRetry={backtests.reload}
        >
          {selectedDisease && (
            <BacktestCard
              metrics={metrics}
              disease={selectedDisease}
              onSelectDisease={setSelectedDisease}
            />
          )}
        </DataState>
      </section>

      {/* 3b. Pembanding naif + kalibrasi rentang.

          Metrik di atas menjawab "seberapa meleset". Dua blok ini menjawab dua
          pertanyaan yang selalu menyusul dan sebelumnya tidak terjawab di mana
          pun: apakah melesetnya lebih kecil daripada tebakan tanpa model, dan
          apakah rentang yang ditampilkan benar-benar menampung kenyataan
          sesering yang diakuinya. */}
      {activeMetric && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="h-section text-foreground">Uji yang lebih keras</h2>
            <p className="text-body-sm text-paper-600">
              Angka bagus belum tentu angka berguna. Di sini model diadu dengan
              tebakan yang tidak butuh model, dan rentang prakiraannya
              diperiksa terhadap kenyataan.
            </p>
          </div>
          <ModelBenchmark metric={activeMetric} />
        </section>
      )}

      {/* Jembatan ke Mesin Waktu. Metrik agregat menjawab "seberapa meleset";
          rute itu menjawab "di kecamatan mana, bulan apa, dan seberapa awal". */}
      <Link
        href="/mesin-waktu"
        className="group flex items-start gap-4 rounded-2xl border border-brand-300/60 bg-brand-50/80 p-5 transition-colors hover:border-brand-500 hover:bg-brand-50"
      >
        <History
          className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-body font-semibold text-brand-900">
            Putar ulang periode uji di Mesin Waktu
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </p>
          <p className="text-body-sm leading-relaxed text-paper-700">
            Angka di atas menjawab seberapa meleset model secara keseluruhan.
            Mesin Waktu menjawab pertanyaan berikutnya: bulan itu, di kecamatan
            mana, prakiraannya sudah menandai lonjakannya lebih dulu — dan di
            mana ia terlewat.
          </p>
        </div>
      </Link>

      {/* 4. Cakupan data per kecamatan */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="h-section text-foreground">Cakupan data per kecamatan</h2>
          <p className="text-body-sm text-paper-600">
            Model yang sama tidak sama andalnya di setiap wilayah. Kecamatan dengan
            riwayat pendek menghasilkan prakiraan berinterval lebar, dan itu ditandai
            di seluruh antarmuka — bukan diam-diam dibulatkan jadi &ldquo;risiko
            rendah&rdquo;.
          </p>
        </div>

        <DataState
          loading={backtests.loading || kecamatan.loading}
          error={backtests.error ?? kecamatan.error}
          empty={!backtests.loading && activeMetric === null}
          emptyMessage="Cakupan data ikut hasil backtest; belum ada yang tersimpan untuk penyakit ini."
          onRetry={() => {
            backtests.reload();
            kecamatan.reload();
          }}
        >
          {activeMetric && (
            <ModelCoverage
              coverage={activeMetric.coverage_per_kecamatan}
              kecamatan={kecamatan.data ?? []}
              windowLabel={dataWindow.label}
              windowMonths={dataWindow.months}
            />
          )}
        </DataState>
      </section>

      {/* 5. Batasan */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="h-section text-foreground">Batasan yang berlaku</h2>
          <p className="text-body-sm text-paper-600">
            Daftar ini bagian dari produk, bukan penafian di kaki halaman.
          </p>
        </div>

        <DataState
          loading={backtests.loading}
          error={backtests.error}
          empty={!backtests.loading && limitations.length === 0}
          emptyMessage="Daftar batasan tidak terbaca dari gateway."
          onRetry={backtests.reload}
        >
          <Card className="p-6">
            <ul className="list-disc space-y-2.5 pl-5 text-body-sm text-paper-700">
              {limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </DataState>

        <div className="flex items-start gap-3 rounded-2xl border border-brand-300/60 bg-brand-50/80 p-4">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <div className="space-y-1 text-body-sm leading-relaxed text-paper-700">
            <p className="font-semibold text-brand-900">
              Prakira bukan alat diagnosis
            </p>
            <p>
              Keluarannya estimasi risiko wilayah untuk mendukung keputusan
              pencegahan, bukan pengganti surveilans resmi dan bukan penilaian
              kondisi seseorang. Kalau Anda sakit, periksakan diri ke fasilitas
              kesehatan.
            </p>
            <p className="pt-1">
              <Badge variant="outline" className="mr-2">
                Data mentah
              </Badge>
              Rekap iklim dan kasus bulanan bisa diunduh sebagai CSV di{" "}
              <Link href="/analitik" className="font-medium text-brand-700 underline">
                Analitik &amp; Riwayat
              </Link>{" "}
              (perlu akun petugas) atau lewat register terbuka di{" "}
              <Link href="/sistem" className="font-medium text-brand-700 underline">
                Halaman Layanan
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
