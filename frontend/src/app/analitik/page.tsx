"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiseaseSelector } from "@/components/disease-selector";
import { ClimateCorrelationChart } from "@/components/climate-correlation-chart";
import { ClimateRecapTable } from "@/components/climate-recap-table";
import { DataState } from "@/components/data-state";
import { fetchClimateSeries, fetchDiseases } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatMonth } from "@/lib/period";
import { downloadCsv, slugify, toCsv } from "@/lib/export";
import { diseaseLabel } from "@/lib/utils";
import { climateCorrelations, isSignificant, strongestCorrelation } from "@/lib/stats";
import {
  pickInitialDisease,
  readWorkParams,
  rememberWorkContext,
  withWorkParams,
} from "@/lib/work-context";
import type { DiseaseType } from "@/types";

/**
 * Analitik & Riwayat.
 *
 * Halaman ini dulu membaca dua konstanta: dua belas baris korelasi iklim yang
 * ditulis tangan, dan lima kartu backtest yang menyebut model yang tidak
 * pernah ada. Keduanya sekarang datang dari gateway. Ikutan yang ikut hilang:
 * lencana "156 minggu evaluasi" (data uji sebenarnya dihitung dalam bulan, dan
 * jumlahnya jauh lebih sedikit) dan tombol ekspor yang tidak mengunduh apa pun.
 *
 * Hasil uji model pindah ke `/model` (PRD §5.7). Ia dulu menumpang di sini,
 * artinya halaman yang menjelaskan seberapa jauh angka prakiraan boleh
 * dipercaya hanya bisa dibuka petugas yang punya akun. Yang tersisa di sini
 * adalah yang memang pekerjaan analis: hubungan iklim–kasus dan rekap deretnya.
 */
/* Tiga alat, tiga pertanyaan berbeda. Yang dituliskan di kartu adalah
   pertanyaannya, bukan nama tekniknya: "backtest" tidak memberi tahu petugas
   kapan ia perlu membukanya. */
const EVALUATION_TOOLS = [
  {
    href: "/model",
    title: "Transparansi model",
    question:
      "Algoritma, fitur, periode latih, hasil uji, cakupan data per kecamatan, dan batasan yang berlaku.",
    cta: "Buka transparansi model",
  },
  {
    href: "/mesin-waktu",
    title: "Uji historis",
    question:
      "Pada bulan-bulan yang sudah lewat, peringatan apa yang terlewat dan alarm apa yang tidak terbukti.",
    cta: "Buka uji historis",
  },
  {
    href: "/simulasi",
    title: "Simulator cuaca",
    question:
      "Bagaimana prakiraan bergerak bila curah hujan, suhu, atau kelembaban berbeda. Skenario, bukan prakiraan berjalan.",
    cta: "Buka simulator",
  },
] as const;

export default function AnalitikPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);
  const toast = useConsoleToast();

  const diseases = useApi(() => fetchDiseases(), []);
  const climate = useApi(() => fetchClimateSeries(60), []);

  /* F14: alat evaluasi dibuka dari sini, jadi pekerjaan yang ditinggalkan
     punya nama dan alamat kembali. */
  React.useEffect(() => {
    if (!selectedDisease) return;
    rememberWorkContext({
      href: "/analitik",
      label: "Analitik & Evaluasi",
      disease: selectedDisease,
    });
  }, [selectedDisease]);

  React.useEffect(() => {
    if (selectedDisease || !diseases.data || diseases.data.length === 0) return;
    setSelectedDisease(
      pickInitialDisease(
        diseases.data.map((d) => d.disease),
        readWorkParams().disease,
      ),
    );
  }, [diseases.data, selectedDisease]);

  const diseaseNames = React.useMemo(
    () => (diseases.data ?? []).map((d) => d.disease),
    [diseases.data],
  );

  const series = React.useMemo(() => climate.data?.data ?? [], [climate.data]);

  /* Hanya bulan yang lengkap ikut dihitung korelasinya — sama persis dengan
     baris yang digambar grafik, jadi angka `r` dan grafiknya tidak bisa
     bercerita tentang deret yang berbeda. */
  const usable = React.useMemo(
    () =>
      selectedDisease
        ? series.filter(
            (d) =>
              d.curah_hujan_mm !== null &&
              d.suhu_c !== null &&
              d.kelembaban_pct !== null &&
              typeof d.kasus[selectedDisease] === "number",
          )
        : [],
    [series, selectedDisease],
  );

  const correlations = React.useMemo(
    () =>
      selectedDisease
        ? climateCorrelations(
            usable.map((d) => ({
              curah_hujan_mm: d.curah_hujan_mm as number,
              suhu_c: d.suhu_c as number,
              kelembaban_pct: d.kelembaban_pct as number,
            })),
            usable.map((d) => d.kasus[selectedDisease]),
          )
        : [],
    [usable, selectedDisease],
  );

  const strongest = React.useMemo(
    () => strongestCorrelation(correlations),
    [correlations],
  );

  const handleExport = () => {
    if (!selectedDisease || usable.length === 0) return;

    const csv = toCsv(usable, [
      { header: "bulan", value: (row) => row.periode },
      { header: "curah_hujan_mm", value: (row) => row.curah_hujan_mm },
      { header: "suhu_mean_c", value: (row) => row.suhu_c },
      { header: "kelembaban_pct", value: (row) => row.kelembaban_pct },
      ...diseaseNames.map((name) => ({
        header: `kasus_${name.toLowerCase()}`,
        value: (row: (typeof usable)[number]) => row.kasus[name] ?? null,
      })),
    ]);

    const first = usable[0]?.periode?.slice(0, 7);
    const last = usable[usable.length - 1]?.periode?.slice(0, 7);
    downloadCsv(slugify("prakira-iklim-kasus", first, last), csv);
    toast.show(`Rekap ${usable.length} bulan diunduh sebagai CSV.`);
  };

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Analitik & Evaluasi"
          description="Hubungan antara data iklim dan kejadian penyakit per kecamatan, dan pintu ke alat yang menguji seberapa jauh prakiraan boleh dipercaya. Semua angka di halaman ini dihitung dari deret yang sedang ditampilkan."
          actions={
            <Button
              size="sm"
              onClick={handleExport}
              disabled={usable.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Unduh CSV</span>
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body-sm text-paper-600">Penyakit yang dianalisis:</span>
            <DiseaseSelector
              options={diseaseNames}
              selected={selectedDisease}
              onSelect={setSelectedDisease}
            />
          </div>
        </ConsolePageHeader>

        {/* 1. Korelasi iklim */}
        <section className="space-y-4">
          <DataState
            loading={climate.loading || diseases.loading}
            error={climate.error ?? diseases.error}
            empty={!climate.loading && usable.length === 0}
            emptyMessage="Belum ada bulan dengan data iklim dan kasus yang lengkap."
            onRetry={climate.reload}
          >
            <Card className="space-y-4 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h2 className="text-h2 text-foreground">
                    Korelasi iklim vs kasus {diseaseLabel(selectedDisease)}
                  </h2>
                  <p className="text-caption text-paper-600">
                    {usable.length} bulan observasi ·{" "}
                    {formatMonth(usable[0]?.periode)} –{" "}
                    {formatMonth(usable[usable.length - 1]?.periode)}.
                  </p>
                </div>

                {/* Lencana menyebut variabel mana yang paling menjelaskan, bukan
                    satu p-value tetap untuk semua penyakit. */}
                {strongest && (
                  <Badge
                    variant={isSignificant(strongest.significance) ? "secondary" : "risk-none"}
                    className="shrink-0"
                  >
                    {strongest.label} paling menjelaskan · r = {strongest.display} ·{" "}
                    {strongest.lagLabel} · {strongest.significance}
                  </Badge>
                )}
              </div>

              {selectedDisease && (
                <ClimateCorrelationChart data={series} disease={selectedDisease} />
              )}
            </Card>
          </DataState>
        </section>

        {/* 2. Alat evaluasi.
            F14: simulator, uji historis, dan transparansi model dulu hanya
            tercantum sebagai "halaman publik" di rel konsol — sederet tautan
            keluar tanpa keterangan kapan salah satunya berguna. Ketiganya
            menjawab pertanyaan yang berbeda, dan semuanya muncul di pekerjaan
            yang sama: apakah angka yang sedang saya pegang layak dipakai.
            Isinya tidak disalin ke sini; dua salinan metrik yang sama pada
            akhirnya akan berbeda, dan yang keliru selalu yang tidak sedang
            dilihat penulisnya. */}
        <section className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-foreground">Alat evaluasi</h2>
            <p className="mt-1 max-w-2xl text-body-sm text-paper-600">
              Ketiganya membuka pada penyakit yang sedang dipilih di halaman ini, dan
              menyediakan jalan kembali ke pekerjaan. Semuanya juga terbuka untuk
              publik tanpa perlu masuk, supaya bisa dirujuk ke luar dinas.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {EVALUATION_TOOLS.map((tool) => (
              <li key={tool.href}>
                <Card className="flex h-full flex-col justify-between gap-4 p-5">
                  <div className="min-w-0 space-y-1.5">
                    <h3 className="text-h3 text-foreground">{tool.title}</h3>
                    <p className="text-body-sm text-paper-600">{tool.question}</p>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-10 max-w-full gap-1.5 self-start whitespace-normal py-2 text-left"
                  >
                    <Link
                      href={withWorkParams(tool.href, {
                        disease: selectedDisease,
                      })}
                    >
                      <span>{tool.cta}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. Rekapitulasi */}
        <section className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-foreground">Rekapitulasi iklim & kejadian penyakit</h2>
            <p className="text-caption text-paper-600">
              Klik kepala kolom untuk mengurutkan. Kolom {diseaseLabel(selectedDisease)} ditandai
              mengikuti penyakit yang dipilih.
            </p>
          </div>

          {selectedDisease && (
            <ClimateRecapTable
              data={series}
              disease={selectedDisease}
              diseases={diseaseNames}
            />
          )}
        </section>
      </div>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
