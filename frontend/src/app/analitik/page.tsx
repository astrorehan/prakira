"use client";

import * as React from "react";
import { Download, ShieldAlert } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiseaseSelector } from "@/components/disease-selector";
import { ClimateCorrelationChart } from "@/components/climate-correlation-chart";
import { ClimateRecapTable } from "@/components/climate-recap-table";
import { BacktestCard } from "@/components/backtest-card";
import { DataState } from "@/components/data-state";
import { fetchBacktests, fetchClimateSeries, fetchDiseases } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatMonth } from "@/lib/period";
import { downloadCsv, slugify, toCsv } from "@/lib/export";
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
 */
export default function AnalitikPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);
  const toast = useConsoleToast();

  const diseases = useApi(() => fetchDiseases(), []);
  const climate = useApi(() => fetchClimateSeries(24), []);
  const backtests = useApi(() => fetchBacktests(), []);

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
          description="Hubungan antara data iklim dan kejadian penyakit, plus hasil uji model terhadap data historis. Semua angka di halaman ini dihitung dari deret yang sedang ditampilkan."
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
                    Korelasi iklim vs kasus {selectedDisease}
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
                    {strongest.significance}
                  </Badge>
                )}
              </div>

              {selectedDisease && (
                <ClimateCorrelationChart data={series} disease={selectedDisease} />
              )}
            </Card>
          </DataState>
        </section>

        {/* 2. Backtesting */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-h2 text-foreground">Akurasi prediksi vs aktual</h2>
              <p className="text-caption text-paper-600">
                Pemisahan data berdasarkan waktu pada deret bulanan Kota Semarang.
              </p>
            </div>
          </div>

          {/* Kegagalan menarik backtest disebut, bukan disembunyikan di balik
              grid kosong yang terbaca seperti "modelnya memang belum ada". */}
          {backtests.data?.meta.errors && (
            <div className="flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
              <div className="text-body-sm text-paper-700">
                {Object.entries(backtests.data.meta.errors).map(([disease, message]) => (
                  <p key={disease}>
                    <span className="font-semibold text-foreground">{disease}:</span> {message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <DataState
            loading={backtests.loading}
            error={backtests.error}
            empty={false}
            onRetry={backtests.reload}
          >
            {selectedDisease && (
              <BacktestCard
                metrics={backtests.data?.data ?? []}
                disease={selectedDisease}
              />
            )}
          </DataState>
        </section>

        {/* 3. Batasan model — wajib tampil di UI, bukan hanya di proposal (§7) */}
        {backtests.data?.meta.limitations && (
          <section className="space-y-3">
            <h2 className="text-h2 text-foreground">Batasan yang berlaku</h2>
            <Card className="p-5">
              <ul className="list-disc space-y-2 pl-5 text-body-sm text-paper-700">
                {backtests.data.meta.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {/* 4. Rekapitulasi */}
        <section className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-foreground">Rekapitulasi iklim & kejadian penyakit</h2>
            <p className="text-caption text-paper-600">
              Klik kepala kolom untuk mengurutkan. Kolom {selectedDisease} ditandai
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
