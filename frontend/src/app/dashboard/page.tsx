"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ChevronDown,
  CloudOff,
  RefreshCw,
  Printer,
  ShieldAlert,
} from "lucide-react";
import {
  aggregateCoverage,
  cn,
  diseaseLabel,
  formatMaybeNumber,
  formatNumber,
} from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import { Button } from "@/components/ui/button";
import { ConsolePageHeader } from "@/components/console/page-header";
import { DiseaseSelector } from "@/components/disease-selector";
import { DistrictDetailPanel } from "@/components/district-detail-panel";
import { DistrictPriorityList } from "@/components/district-priority-list";
import { DistrictRankingTable } from "@/components/district-ranking-table";
import { DataState } from "@/components/data-state";
import { DashboardDataSkeleton } from "@/components/console/console-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart } from "@/components/trend-chart";
import {
  fetchActions,
  fetchAllDistricts,
  fetchDiseases,
  fetchDistricts,
  fetchGeoJson,
  fetchTrend,
  fetchTriggerSummary,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  pickInitialDisease,
  readWorkParams,
  rememberWorkContext,
} from "@/lib/work-context";
import type { DiseaseType } from "@/types";

const MAP_HEIGHT = "h-[420px] lg:h-[560px]";

const ChoroplethMap = dynamic(() => import("@/components/choropleth-map"), {
  ssr: false,
  loading: () => (
    <div role="status" aria-label="Memuat peta Kota Semarang">
      <Skeleton className={cn(MAP_HEIGHT, "w-full rounded-2xl")} />
    </div>
  ),
});

const LEGEND = [
  { label: "Rendah", className: "bg-risk-low" },
  { label: "Waspada", className: "bg-risk-medium" },
  { label: "Siaga", className: "bg-risk-high" },
  /* Kelas keempat, karena kekosongan bukan "rendah". */
  { label: "Tanpa prediksi", className: "bg-paper-300" },
];

/**
 * Beranda konsol.
 *
 * Inti halaman muat di satu layar: pilihan penyakit menempel di atas peta,
 * tiga angka ringkas di sebelahnya, dan panel kanan yang berganti antara lima
 * wilayah prioritas dan detail wilayah terpilih. Tren kota dan peringkat
 * lengkap ada di bawah lipatan untuk yang ingin menelusuri.
 *
 * Versi sebelumnya membuka dengan daftar perhatian lintas penyakit setinggi
 * 1.300 px, sehingga tab penyakit dan petanya terpisah jauh dan isi daftar
 * tidak mengikuti tab yang aktif.
 */
export default function DashboardPrediksiPage() {
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = React.useState<string | null>(null);
  const [showRanking, setShowRanking] = React.useState(false);

  const diseases = useApi(() => fetchDiseases(), []);
  /* Hanya untuk memilih penyakit pembuka: yang zona siaganya paling banyak. */
  const overview = useApi(() => fetchAllDistricts(), []);

  /* Pilihan awal: penyakit yang dibawa pulang dari alat evaluasi (F14) bila
     ada; kalau tidak, penyakit dengan zona siaga terbanyak — halaman harus
     dibuka dari yang paling butuh perhatian, bukan dari urutan abjad. */
  React.useEffect(() => {
    if (selectedDisease || !diseases.data || diseases.data.length === 0) return;
    const list = diseases.data.map((d) => d.disease);
    const wanted = readWorkParams().disease;
    if (wanted) {
      setSelectedDisease(pickInitialDisease(list, wanted));
      return;
    }
    if (overview.loading) return;
    const byDisease = overview.data?.data ?? {};
    const siagaOf = (d: DiseaseType) =>
      (byDisease[d] ?? []).filter((r) => r.tingkat_risiko === "tinggi").length;
    const best = [...list].sort((a, b) => siagaOf(b) - siagaOf(a))[0];
    setSelectedDisease(best ?? list[0]);
  }, [diseases.data, overview.loading, overview.data, selectedDisease]);

  const districts = useApi(
    () =>
      selectedDisease
        ? fetchDistricts(selectedDisease)
        : Promise.resolve(null as never),
    [selectedDisease],
    { cacheKey: selectedDisease ? `dashboard:districts:${selectedDisease}` : "", cacheTimeMs: 60 * 60 * 1000 },
  );

  const trend = useApi(
    () => (selectedDisease ? fetchTrend(selectedDisease, 12) : Promise.resolve(null as never)),
    [selectedDisease],
    { cacheKey: selectedDisease ? `dashboard:trend:${selectedDisease}` : "", cacheTimeMs: 60 * 60 * 1000 },
  );

  const geo = useApi(() => fetchGeoJson(), []);
  /* Semua penyakit: panel prioritas memakai yang aktif, strip tugas memakai
     seluruhnya. */
  const actions = useApi(() => fetchActions(), []);
  const triggers = useApi(() => fetchTriggerSummary(), []);

  const rows = React.useMemo(() => districts.data?.data ?? [], [districts.data]);
  const meta = districts.data?.meta ?? null;

  const selectedDistrict = React.useMemo(
    () => rows.find((d) => d.id === selectedDistrictId),
    [rows, selectedDistrictId],
  );

  /* F14: wilayah yang tadi dibuka ikut kembali bersama petugas. Sekali saja. */
  const restoredDistrict = React.useRef(false);
  React.useEffect(() => {
    if (restoredDistrict.current || rows.length === 0) return;
    restoredDistrict.current = true;
    const wanted = readWorkParams().kecamatan;
    if (!wanted) return;
    const match = rows.find((d) => d.nama.toLowerCase() === wanted.toLowerCase());
    if (match) setSelectedDistrictId(match.id);
  }, [rows]);

  const selectedTrigger = React.useMemo(() => {
    if (!selectedDistrict || !triggers.data?.data) return undefined;
    return triggers.data.data.find(
      (t) => t.kecamatan.toLowerCase() === selectedDistrict.nama.toLowerCase(),
    );
  }, [selectedDistrict, triggers.data]);

  const totals = React.useMemo(() => {
    const observed = rows.filter((d) => d.kasus_aktif !== null);
    const predicted = rows.filter((d) => d.kasus_prediksi !== null);
    return {
      active: observed.reduce((s, d) => s + (d.kasus_aktif ?? 0), 0),
      pred: predicted.reduce((s, d) => s + (d.kasus_prediksi ?? 0), 0),
      lower: predicted.reduce((s, d) => s + (d.kasus_prediksi_lower ?? 0), 0),
      upper: predicted.reduce((s, d) => s + (d.kasus_prediksi_upper ?? 0), 0),
      predictedCount: predicted.length,
      high: rows.filter((d) => d.tingkat_risiko === "tinggi").length,
      /* Total kota mewarisi cakupan kecamatan paling tipis (PRD §7-H2). */
      coverage:
        rows.length > 0 ? aggregateCoverage(rows.map((d) => d.coverage)) : "insufficient",
    };
  }, [rows]);

  React.useEffect(() => {
    if (!selectedDisease) return;
    rememberWorkContext({
      href: "/dashboard",
      label: "Beranda / Prioritas",
      disease: selectedDisease,
      kecamatan: selectedDistrict?.nama ?? null,
      periode: meta?.monthYear ?? null,
    });
  }, [selectedDisease, selectedDistrict?.nama, meta?.monthYear]);

  const allActions = React.useMemo(() => actions.data?.data ?? [], [actions.data]);
  const diseaseActions = React.useMemo(
    () => allActions.filter((a) => a.disease === selectedDisease),
    [allActions, selectedDisease],
  );
  const pendingActions = allActions.filter((a) => a.status === "pending").length;

  const forecastHidden = totals.predictedCount === 0 || totals.coverage === "insufficient";
  const initialDataLoading = diseases.loading || (!selectedDisease && !!diseases.data?.length);
  const districtLoading = districts.loading || initialDataLoading;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-6">
        <ConsolePageHeader
          title="Beranda / Prioritas"
          description="Peta risiko per kecamatan dan wilayah yang perlu didahulukan."
          actions={
            <>
              {/* Utilitas, bukan ajakan: ghost kecil, tanpa isian warna.
                  Perhatian di halaman ini milik peta dan daftar prioritas. */}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  districts.reload();
                  trend.reload();
                  actions.reload();
                  triggers.reload();
                }}
                disabled={districts.refreshing}
                title="Segarkan data"
                aria-label="Segarkan data"
                className="h-9 w-9 text-paper-500"
              >
                <RefreshCw
                  className={districts.refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  aria-hidden
                />
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-9 gap-1.5 px-3 font-medium text-paper-600"
              >
                <Link href={`/buletin?disease=${encodeURIComponent(selectedDisease ?? "DBD")}`}>
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  <span>Draf Buletin</span>
                </Link>
              </Button>
            </>
          }
        />

        {/* Prediksi basi harus tertulis, bukan disembunyikan. */}
        {meta?.stale && (
          <div className="flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
            <p className="text-body-sm text-foreground">
              <span className="font-semibold">Prediksi belum diperbarui.</span>{" "}
              <span className="text-paper-700">
                Layanan model tidak terhubung; angka prakiraan memakai perhitungan
                terakhir yang tersimpan.
              </span>
            </p>
          </div>
        )}

        {/* Kendali + angka ringkas, tepat di atas peta. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {initialDataLoading ? (
            <div role="status" aria-label="Memuat pilihan penyakit" className="flex gap-2">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-24 rounded-xl" />)}
            </div>
          ) : (
            <DiseaseSelector
              className="max-w-full overflow-x-auto"
              options={(diseases.data ?? []).map((d) => d.disease)}
              selected={selectedDisease}
              onSelect={(d) => {
                setSelectedDisease(d);
                setSelectedDistrictId(null);
              }}
            />
          )}
          {rows.length > 0 && (
            <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface shadow-xs">
              <Stat
                label={`Kasus ${formatMonth(meta?.latestObserved)}`}
                value={formatNumber(totals.active)}
              />
              <Stat
                label={`Prakiraan ${formatMonth(meta?.predictionMonth)}`}
                value={forecastHidden ? "—" : formatMaybeNumber(totals.pred)}
                sub={
                  forecastHidden
                    ? undefined
                    : `${formatNumber(totals.lower)}–${formatNumber(totals.upper)}`
                }
              />
              <Stat
                label="Zona siaga"
                value={String(totals.high)}
                sub={`dari ${rows.length}`}
                tone={totals.high > 0 ? "danger" : undefined}
              />
            </dl>
          )}
          {districtLoading && rows.length === 0 && (
            <Skeleton className="h-[76px] w-full rounded-xl lg:w-96" />
          )}
        </div>

        <DataState
          loading={districtLoading}
          loadingFallback={<DashboardDataSkeleton />}
          error={districts.error ?? diseases.error}
          empty={!districts.loading && (diseases.data?.length === 0 || (!!selectedDisease && rows.length === 0))}
          emptyMessage="Belum ada kecamatan yang terdaftar di gateway."
          onRetry={() => {
            diseases.reload();
            districts.reload();
          }}
        >
          {/* Peta + panel kanan */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="relative lg:col-span-8">
              <div className={cn(MAP_HEIGHT, "overflow-hidden rounded-2xl border border-border shadow-card")}>
                {geo.data ? (
                  <ChoroplethMap
                    geojson={geo.data}
                    districts={rows}
                    disease={selectedDisease ?? ""}
                    selectedId={selectedDistrictId}
                    onSelect={(id) => setSelectedDistrictId(id)}
                    triggers={triggers.data?.data ?? []}
                    height="100%"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-paper-100 text-xs text-paper-600">
                    {geo.error ?? "Memuat batas wilayah…"}
                  </div>
                )}
              </div>
              {/* Legenda menempel di peta: kunci baca, bukan catatan kaki. */}
              <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface/95 px-3 py-2 text-caption shadow-xs backdrop-blur">
                {LEGEND.map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", l.className)} />
                    <span className="font-medium text-paper-700">{l.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className={cn("lg:col-span-4 lg:h-[560px]", "min-h-0")}>
              {selectedDistrict ? (
                <DistrictDetailPanel
                  district={selectedDistrict}
                  disease={selectedDisease ?? ""}
                  trigger={selectedTrigger}
                  onBack={() => setSelectedDistrictId(null)}
                  className="h-full min-h-0 overflow-y-auto"
                />
              ) : (
                <DistrictPriorityList
                  districts={rows}
                  actions={diseaseActions}
                  disease={selectedDisease ?? ""}
                  onSelect={(id) => setSelectedDistrictId(id)}
                />
              )}
            </div>
          </div>

          {/* Tugas lintas penyakit — satu baris; alurnya hidup di /tindakan. */}
          {pendingActions > 0 && (
            <Link
              href="/tindakan"
              className="group mt-5 flex items-center justify-between gap-3 rounded-2xl border border-risk-high-br/70 bg-risk-high-bg/60 px-5 py-3 shadow-xs transition-colors hover:bg-risk-high-bg"
            >
              <span className="flex items-center gap-2.5 text-body-sm font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0 text-risk-high" aria-hidden />
                {pendingActions} tindakan menunggu keputusan
              </span>
              <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-risk-high">
                Buka Tugas
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )}

          {/* Tren kota */}
          <section className="mt-8 space-y-3">
            <h2 className="text-h3 text-foreground">
              Tren kasus kota · {diseaseLabel(selectedDisease)}
            </h2>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <TrendChart
                data={trend.data?.data ?? []}
                disease={selectedDisease ?? "DBD"}
                showClimateOverlay={false}
                chartHeightClass="h-[240px] w-full"
              />
            </div>
          </section>

          {/* Peringkat lengkap — disembunyikan; lima teratas sudah di panel. */}
          <section className="mt-6">
            <button
              type="button"
              onClick={() => setShowRanking((v) => !v)}
              aria-expanded={showRanking}
              className="flex items-center gap-1.5 text-body-sm font-semibold text-brand-700 hover:underline"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showRanking && "rotate-180")}
                aria-hidden
              />
              {showRanking
                ? "Sembunyikan peringkat kecamatan"
                : `Lihat peringkat semua ${rows.length} kecamatan`}
            </button>
            {showRanking && (
              <DistrictRankingTable
                className="mt-3"
                districts={rows}
                selectedId={selectedDistrictId}
                onSelectDistrict={(id) => {
                  setSelectedDistrictId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </section>
        </DataState>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "danger";
}) {
  return (
    <div className="min-w-0 px-3 py-2 sm:px-4">
      <dt className="truncate text-caption text-paper-600">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            "text-h3 tabular font-semibold",
            tone === "danger" ? "text-risk-high" : "text-foreground",
          )}
        >
          {value}
        </span>
        {sub && <span className="text-caption tabular text-paper-600">{sub}</span>}
      </dd>
    </div>
  );
}
