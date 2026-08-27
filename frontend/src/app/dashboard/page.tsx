"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  Bug,
  ShieldAlert,
  MapPin,
  TrendingUp,
  ArrowRight,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { aggregateCoverage, formatNumber, formatMaybeNumber } from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { AppleGlassDate } from "@/components/ui/apple-glass-date";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { DiseaseSelector } from "@/components/disease-selector";
import { DistrictDetailPanel } from "@/components/district-detail-panel";
import { DistrictRankingTable } from "@/components/district-ranking-table";
import { DataState } from "@/components/data-state";
import {
  fetchActions,
  fetchDiseases,
  fetchDistricts,
  fetchGeoJson,
  fetchTrend,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { DiseaseType } from "@/types";

const ChoroplethMap = dynamic(() => import("@/components/choropleth-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full rounded-2xl border border-paper-200 bg-paper-100 flex flex-col items-center justify-center text-muted-foreground text-xs animate-pulse gap-2">
      <Activity className="h-6 w-6 text-primary animate-spin" />
      <span>Memuat peta spasial Kota Semarang…</span>
    </div>
  ),
});

/**
 * Dashboard prediksi.
 *
 * Sebelum ada gateway, halaman ini memanggil `getKecamatanDataList(disease)` —
 * sebuah fungsi yang menghitung "kasus" dari indeks array dan menempelkan
 * "Minggu 34 · Agustus 2026" di kepalanya. Sekarang setiap angka berasal dari
 * `/api/districts`, dan tiga keadaan yang dulu mustahil kini bisa muncul dan
 * harus terlihat: memuat, gateway gagal, dan prediksi basi karena layanan ML
 * sedang mati.
 */
export default function DashboardPrediksiPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = React.useState<string | null>(null);

  const diseases = useApi(() => fetchDiseases(), []);

  /* Penyakit pertama dari gateway jadi pilihan awal. Tidak ada nilai bawaan
     "DBD" di berkas ini: kalau dataset hanya punya ISPA, dashboard harus
     membuka ISPA, bukan halaman kosong berlabel DBD. */
  React.useEffect(() => {
    if (!selectedDisease && diseases.data && diseases.data.length > 0) {
      setSelectedDisease(diseases.data[0].disease);
    }
  }, [diseases.data, selectedDisease]);

  const districts = useApi(
    () =>
      selectedDisease
        ? fetchDistricts(selectedDisease)
        : Promise.resolve(null as never),
    [selectedDisease],
  );

  const trend = useApi(
    () => (selectedDisease ? fetchTrend(selectedDisease, 12) : Promise.resolve(null as never)),
    [selectedDisease],
  );

  const geo = useApi(() => fetchGeoJson(), []);

  const actions = useApi(
    () => (selectedDisease ? fetchActions(selectedDisease) : Promise.resolve(null as never)),
    [selectedDisease],
  );

  /* `?? []` membuat array baru tiap render; tanpa memo, dua `useMemo` di bawah
     ikut dihitung ulang pada setiap render meskipun datanya tidak berubah. */
  const rows = React.useMemo(() => districts.data?.data ?? [], [districts.data]);
  const meta = districts.data?.meta ?? null;

  const selectedDistrict = React.useMemo(() => {
    if (rows.length === 0) return undefined;
    /* Sebelum petugas memilih, buka kecamatan dengan skor tertinggi untuk
       penyakit yang sedang aktif — dashboard operasional harus mulai dari yang
       butuh perhatian, dan harus berpindah saat filternya berganti. */
    return (
      rows.find((d) => d.id === selectedDistrictId) ??
      [...rows].sort((a, b) => (b.skor_risiko ?? -1) - (a.skor_risiko ?? -1))[0]
    );
  }, [rows, selectedDistrictId]);

  const totals = React.useMemo(() => {
    const observed = rows.filter((d) => d.kasus_aktif !== null);
    const predicted = rows.filter((d) => d.kasus_prediksi !== null);

    const active = observed.reduce((s, d) => s + (d.kasus_aktif ?? 0), 0);
    const pred = predicted.reduce((s, d) => s + (d.kasus_prediksi ?? 0), 0);
    const lower = predicted.reduce((s, d) => s + (d.kasus_prediksi_lower ?? 0), 0);
    const upper = predicted.reduce((s, d) => s + (d.kasus_prediksi_upper ?? 0), 0);

    const high = rows.filter((d) => d.tingkat_risiko === "tinggi").length;
    const medium = rows.filter((d) => d.tingkat_risiko === "sedang").length;
    const low = rows.filter((d) => d.tingkat_risiko === "rendah").length;
    const unknown = rows.filter((d) => d.tingkat_risiko === null).length;

    /* Riwayat kota dijumlahkan per posisi bulan, bukan per kecamatan: hanya
       kecamatan yang punya panjang riwayat sama yang boleh dijumlahkan. */
    const historyLength = Math.min(
      ...rows.map((d) => d.riwayat_periode.length).filter((n) => n > 0),
      3,
    );
    const history =
      Number.isFinite(historyLength) && historyLength > 0
        ? Array.from({ length: historyLength }, (_, i) =>
            rows.reduce((s, d) => {
              const series = d.riwayat_periode;
              return s + (series[series.length - historyLength + i] ?? 0);
            }, 0),
          )
        : [];

    const lastMonth = history.length >= 2 ? history[history.length - 2] : null;

    return {
      active,
      pred,
      lower,
      upper,
      high,
      medium,
      low,
      unknown,
      history,
      predictedCount: predicted.length,
      /* Total kota mewarisi cakupan kecamatan paling tipis — sebuah jumlah
         hanya sekuat masukannya yang paling lemah (PRD §7-H2). */
      coverage: rows.length > 0 ? aggregateCoverage(rows.map((d) => d.coverage)) : "insufficient",
      deltaMonthly:
        lastMonth === null || lastMonth === 0
          ? null
          : Math.round(((active - lastMonth) / lastMonth) * 100),
      deltaForecast: active === 0 ? null : Math.round(((pred - active) / active) * 100),
    };
  }, [rows]);

  const pendingActions = (actions.data?.data ?? []).filter(
    (a) => a.status === "pending",
  ).length;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        {/* 1. Kepala — judul, filter penyakit, periode */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pb-4 border-b border-paper-200/80">
          <div className="space-y-3">
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Prediksi Risiko Penyakit
            </h1>
            <DiseaseSelector
              options={(diseases.data ?? []).map((d) => d.disease)}
              selected={selectedDisease}
              onSelect={(d) => {
                setSelectedDisease(d);
                setSelectedDistrictId(null);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {meta && (
              <AppleGlassDate
                primary={`Data ${meta.monthYear}`}
                secondary={`Prakiraan ${meta.predictionLabel}`}
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                districts.reload();
                trend.reload();
                actions.reload();
              }}
              disabled={districts.refreshing}
              className="gap-1.5"
            >
              <RefreshCw
                className={districts.refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden
              />
              <span>Segarkan</span>
            </Button>
          </div>
        </div>

        {/* Prediksi basi harus tertulis, bukan disembunyikan. */}
        {meta?.stale && (
          <div className="flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
            <div className="text-body-sm text-foreground">
              <p className="font-semibold">Prediksi belum diperbarui.</p>
              <p className="text-paper-700">
                Layanan model tidak dapat dihubungi, jadi angka prakiraan di halaman
                ini berasal dari perhitungan terakhir yang tersimpan — atau belum ada
                sama sekali. Data observasi tetap mutakhir.
                {meta.error ? ` (${meta.error})` : ""}
              </p>
            </div>
          </div>
        )}

        <DataState
          loading={districts.loading || diseases.loading}
          error={districts.error ?? diseases.error}
          empty={!districts.loading && rows.length === 0}
          emptyMessage="Belum ada kecamatan yang terdaftar di gateway."
          onRetry={() => {
            diseases.reload();
            districts.reload();
          }}
        >
          {/* 2. Ringkasan KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Angka teramati — tidak punya interval prediksi. */}
            <KpiCard
              label={`Kasus ${selectedDisease ?? ""} · ${formatMonth(meta?.latestObserved)}`}
              value={formatNumber(totals.active)}
              unit="kasus"
              range={null}
              coverage={totals.coverage}
              delta={
                totals.deltaMonthly === null
                  ? null
                  : `${totals.deltaMonthly >= 0 ? "+" : ""}${totals.deltaMonthly}% vs bulan lalu`
              }
              positive={(totals.deltaMonthly ?? 0) <= 0}
              sparkline={totals.history}
              icon={<Bug className="h-4 w-4" />}
              index={0}
            />

            {/* Prakiraan — intervalnya ikut angka, tidak pernah di sebelahnya. */}
            <KpiCard
              label={`Prakiraan ${formatMonth(meta?.predictionMonth)}`}
              value={
                totals.predictedCount === 0 ? "—" : formatMaybeNumber(totals.pred)
              }
              unit={totals.predictedCount === 0 ? undefined : "kasus"}
              range={totals.predictedCount === 0 ? null : { lower: totals.lower, upper: totals.upper }}
              coverage={totals.predictedCount === 0 ? "insufficient" : totals.coverage}
              delta={
                totals.deltaForecast === null
                  ? null
                  : `${totals.deltaForecast >= 0 ? "+" : ""}${totals.deltaForecast}% vs bulan observasi`
              }
              positive={false}
              icon={<TrendingUp className="h-4 w-4 text-risk-high" />}
              index={1}
            />

            {/* Kecamatan terklasifikasi — hitungan hal yang sudah diputuskan. */}
            <KpiCard
              label="Kecamatan zona siaga"
              value={totals.high}
              unit={`dari ${rows.length}`}
              range={null}
              coverage={totals.coverage}
              description={
                `Waspada ${totals.medium} · Rendah ${totals.low}` +
                (totals.unknown > 0 ? ` · Tanpa prediksi ${totals.unknown}` : "")
              }
              icon={<ShieldAlert className="h-4 w-4 text-risk-high" />}
              index={2}
            />
          </div>

          {/* 3. Peta & detail kecamatan */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 flex flex-col h-full">
              <LiquidGlassCard
                variant="default"
                className="p-5 flex flex-col justify-between h-full space-y-3 min-h-[580px]"
              >
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 shrink-0">
                  <MapPin className="h-4 w-4 text-brand-700" />
                  <span>Peta zona risiko</span>
                </h3>

                <div className="flex-1 min-h-[440px] relative w-full">
                  {geo.data ? (
                    <ChoroplethMap
                      geojson={geo.data}
                      districts={rows}
                      disease={selectedDisease ?? ""}
                      selectedId={selectedDistrictId}
                      onSelect={(id) => setSelectedDistrictId(id)}
                      height="100%"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-paper-200 bg-paper-100 text-xs text-paper-600">
                      {geo.error ?? "Memuat batas wilayah…"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-muted-foreground pt-2 border-t border-paper-200/60 shrink-0">
                  <span>Klik kecamatan untuk detail</span>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-risk-low" />
                      <span className="text-paper-700 font-medium">Rendah</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-risk-medium" />
                      <span className="text-paper-700 font-medium">Waspada</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-risk-high" />
                      <span className="text-paper-700 font-medium">Siaga</span>
                    </span>
                    {/* Kelas keempat, karena kekosongan bukan "rendah". */}
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-paper-300" />
                      <span className="text-paper-700 font-medium">Tanpa prediksi</span>
                    </span>
                  </div>
                </div>
              </LiquidGlassCard>
            </div>

            <div className="lg:col-span-5 flex flex-col h-full">
              <DistrictDetailPanel
                district={selectedDistrict}
                disease={selectedDisease ?? ""}
                trend={trend.data?.data ?? []}
                className="h-full min-h-[580px]"
              />
            </div>
          </div>

          {/* 4. Strip aksi tertunda — alurnya sendiri hidup di /tindakan */}
          {pendingActions > 0 && (
            <Link
              href="/tindakan"
              className="group mt-8 flex items-center justify-between gap-3 rounded-2xl border border-risk-high-br/70 bg-risk-high-bg/60 px-5 py-3.5 shadow-xs transition-colors hover:bg-risk-high-bg"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-risk-high shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {pendingActions} tindakan menunggu instruksi
                </span>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-risk-high shrink-0">
                <span>Buka Aksi Dini</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}

          {/* 5. Peringkat kecamatan */}
          <div className="mt-8 space-y-4">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Peringkat prioritas kecamatan
            </h3>

            <DistrictRankingTable
              districts={rows}
              selectedId={selectedDistrictId}
              onSelectDistrict={(id) => setSelectedDistrictId(id)}
            />
          </div>
        </DataState>
      </div>
    </div>
  );
}
