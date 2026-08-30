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
export default function AnalitikPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);
  const toast = useConsoleToast();

  const diseases = useApi(() => fetchDiseases(), []);
  const climate = useApi(() => fetchClimateSeries(60), []);

  React.useEffect(() => {
    if (!selectedDisease && diseases.data && diseases.data.length > 0) {
      setSelectedDisease(diseases.data[0].disease);
    }
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
          title="Analitik & Riwayat"
          description="Hubungan antara data iklim dan kejadian penyakit per kecamatan. Semua angka di halaman ini dihitung dari deret yang sedang ditampilkan; hasil uji modelnya ada di halaman Transparansi Model."
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
                  <h2 className="text-h3 text-foreground">
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

        {/* 2. Akurasi model — isinya di /model, bukan disalin ulang di sini.
            Dua salinan metrik yang sama pada akhirnya akan berbeda, dan yang
            keliru selalu yang tidak sedang dilihat penulisnya. */}
        <section>
          <Card className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 space-y-1">
              <h2 className="text-h3 text-foreground">Akurasi prediksi vs aktual</h2>
              <p className="text-body-sm text-paper-600">
                Metrik uji tiap model, grafik backtest, cakupan data per kecamatan, dan
                daftar batasan tinggal di halaman Transparansi Model — terbuka tanpa
                perlu masuk, supaya bisa dirujuk ke luar dinas.
              </p>
            </div>

            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
              <Link href="/model">
                <span>Buka Transparansi Model</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Card>
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
