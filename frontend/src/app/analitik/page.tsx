"use client";

import * as React from "react";
import { Download, FileText, Table as TableIcon } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DiseaseSelector } from "@/components/disease-selector";
import { ClimateCorrelationChart } from "@/components/climate-correlation-chart";
import { ClimateRecapTable } from "@/components/climate-recap-table";
import { BacktestCard } from "@/components/backtest-card";
import { CLIMATE_CORRELATION_DATA, BACKTEST_METRICS } from "@/lib/mock-data";
import { REPORTING_PERIOD } from "@/lib/period";
import { climateCorrelations, isSignificant, strongestCorrelation } from "@/lib/stats";
import type { DiseaseType } from "@/types";

/**
 * Analitik & Riwayat.
 *
 * Judulnya dulu sebuah kalimat — "Analisis Korelasi Iklim & Evaluasi
 * Backtesting Model" — sementara sidebar menyebut halaman ini "Analitik &
 * Riwayat". Judul halaman adalah janji navigasi; dua nama untuk satu tempat
 * membuat petugas ragu sudah sampai di mana.
 *
 * Yang juga diperbaiki: pemilih penyakit dulu hanya mengendalikan grafik.
 * Lencana signifikansi, angka korelasi, dan seluruh grid backtesting tidak
 * ikut berubah, jadi memilih ISPA menampilkan grafik ISPA di bawah klaim
 * statistik DBD.
 */
export default function AnalitikPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType>("DBD");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const toast = useConsoleToast();

  const diseaseKey =
    selectedDisease === "DBD"
      ? "kasus_dbd"
      : selectedDisease === "ISPA"
        ? "kasus_ispa"
        : "kasus_diare";

  const correlations = React.useMemo(
    () =>
      climateCorrelations(
        CLIMATE_CORRELATION_DATA,
        CLIMATE_CORRELATION_DATA.map((d) => d[diseaseKey]),
      ),
    [diseaseKey],
  );

  const strongest = React.useMemo(() => strongestCorrelation(correlations), [correlations]);

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportOpen(false);
      /* Dulu `alert()` bawaan peramban: memblokir, tidak bisa ditata, dan
         terbaca sebagai galat sistem, bukan konfirmasi. */
      toast.show(`Laporan analitik ${selectedDisease} (${format}) berhasil diunduh.`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        <ConsolePageHeader
          title="Analitik & Riwayat"
          description="Hubungan antara cuaca BMKG dan kejadian penyakit, plus hasil uji model terhadap data historis. Semua angka di halaman ini dihitung dari deret yang sedang ditampilkan."
          actions={
            <Button size="sm" onClick={() => setExportOpen(true)} className="gap-1.5">
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Ekspor laporan</span>
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body-sm text-paper-600">Penyakit yang dianalisis:</span>
            <DiseaseSelector selected={selectedDisease} onSelect={setSelectedDisease} />
          </div>
        </ConsolePageHeader>

        {/* 1. Korelasi iklim */}
        <section className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <h2 className="text-h3 text-foreground">
                  Korelasi iklim vs kasus {selectedDisease}
                </h2>
                <p className="text-caption text-paper-600">
                  {CLIMATE_CORRELATION_DATA.length} periode observasi ·{" "}
                  {REPORTING_PERIOD.historyMonths} bulan terakhir.
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

            <ClimateCorrelationChart
              data={CLIMATE_CORRELATION_DATA}
              disease={selectedDisease}
            />
          </Card>
        </section>

        {/* 2. Backtesting */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-h2 text-foreground">Akurasi prediksi vs aktual</h2>
              <p className="text-caption text-paper-600">
                Pengujian walk-forward pada deret waktu {REPORTING_PERIOD.backtestWeeks} minggu
                di Kota Semarang.
              </p>
            </div>
            <Badge variant="outline">{REPORTING_PERIOD.backtestWeeks} minggu evaluasi</Badge>
          </div>

          <BacktestCard metrics={BACKTEST_METRICS} disease={selectedDisease} />
        </section>

        {/* 3. Rekapitulasi */}
        <section className="space-y-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-foreground">Rekapitulasi cuaca & kejadian penyakit</h2>
            <p className="text-caption text-paper-600">
              Klik kepala kolom untuk mengurutkan. Kolom {selectedDisease} ditandai mengikuti
              penyakit yang dipilih.
            </p>
          </div>

          <ClimateRecapTable data={CLIMATE_CORRELATION_DATA} disease={selectedDisease} />
        </section>
      </div>

      {/* Ekspor */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-h3">Ekspor laporan epidemiologi</DialogTitle>
            <DialogDescription className="text-caption">
              Rekapitulasi {selectedDisease}, {REPORTING_PERIOD.weekLabel}{" "}
              {REPORTING_PERIOD.monthYear} — untuk rapat koordinasi dinas dan puskesmas wilayah.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              loading={exporting}
              onClick={() => handleExport("PDF")}
              className="h-auto flex-col gap-1.5 rounded-2xl py-4"
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              <span>PDF</span>
            </Button>
            <Button
              variant="outline"
              loading={exporting}
              onClick={() => handleExport("Excel")}
              className="h-auto flex-col gap-1.5 rounded-2xl py-4"
            >
              <TableIcon className="h-5 w-5 text-brand-700" aria-hidden="true" />
              <span>Excel</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
