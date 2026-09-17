"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeftRight,
  BellOff,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Equal,
  Gauge,
  History,
  Info,
  Pause,
  Play,
  Siren,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/data-state";
import { DiseaseSelector } from "@/components/disease-selector";
import { fetchDiseases, fetchGeoJson, fetchRewind } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, diseaseLabel, formatNumber, riskConfigOf } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import { formatPeriodRange } from "@/lib/stats";
import type {
  DiseaseType,
  RewindCell,
  RewindVerdict,
  RiskLevel,
} from "@/types";

/**
 * Mesin Waktu — putar ulang periode uji model.
 *
 * Halaman `/model` menjawab pertanyaan statistik: berapa MAE, berapa R².
 * Halaman ini menjawab pertanyaan yang benar-benar diajukan orang dinas:
 * "bulan itu, di kecamatan saya, apakah sistem ini sudah mengatakannya lebih
 * dulu?" Bahannya sama — periode uji yang tidak pernah dilihat model saat
 * dilatih — tapi dirinci per bulan × kecamatan, lengkap dengan yang terlewat
 * dan yang berbunyi tanpa sebab.
 *
 * Tiga keputusan tampilan yang penting:
 *
 * 1. **Dua peta, bukan satu peta bertombol.** Prakiraan dan kejadian
 *    sebenarnya berdampingan pada bingkai yang sama. Menyembunyikan salah satu
 *    di balik tombol membuat perbandingan bergantung pada ingatan pemirsa.
 * 2. **Yang meleset ditampilkan sekeras yang tepat.** Sensitivitas berdiri
 *    bersebelahan dengan alarm palsu, dan tabel bulan aktif menaruh kecamatan
 *    yang terlewat di baris teratas — bukan di dasar tabel.
 * 3. **Keunggulan waktu bukan angka pemasaran.** Nilainya sepanjang bulan yang
 *    diprakirakan, karena itulah jarak sesungguhnya antara prakiraan terbit
 *    dan rekap bulan yang sama tersedia. Alasannya ikut ditampilkan.
 */

const RewindMap = dynamic(() => import("@/components/rewind-map"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[340px] w-full animate-pulse rounded-xl border border-border bg-paper-100"
      aria-hidden
    />
  ),
});

/* ── Kosakata putusan ──────────────────────────────────────────────────────
   Ramp risiko dipakai pada dua putusan yang memang didefinisikan oleh kelas
   Siaga itu sendiri — terlewat dan alarm palsu — bukan sebagai warna kategori
   sembarang (docs/DESIGN-SYSTEM.md §2.5). Sisanya netral. Setiap putusan
   membawa ikon dan label teks; tak satu pun dibedakan hanya oleh warna. */
const VERDICT: Record<
  RewindVerdict,
  {
    label: string;
    badge: "secondary" | "muted" | "outline" | "risk-high" | "risk-medium";
    Icon: typeof Siren;
    meaning: string;
    /* Urutan baca tabel: kesalahan yang paling mahal lebih dulu. */
    rank: number;
  }
> = {
  terlewat: {
    label: "Terlewat",
    badge: "risk-high",
    Icon: Siren,
    meaning:
      "Bulan itu benar-benar masuk kelas Siaga, tapi model tidak menandainya. Tidak ada instruksi yang terbit.",
    rank: 0,
  },
  tertandai: {
    label: "Tertandai lebih dulu",
    badge: "secondary",
    Icon: CircleCheck,
    meaning:
      "Kelas Siaga yang benar terjadi dan sudah ditandai sebelum bulannya berjalan.",
    rank: 1,
  },
  alarm_palsu: {
    label: "Alarm palsu",
    badge: "risk-medium",
    Icon: BellOff,
    meaning:
      "Model menandai Siaga, lonjakannya tidak datang. Sumber daya bergerak untuk sesuatu yang tidak terjadi.",
    rank: 2,
  },
  meleset: {
    label: "Kelas meleset",
    badge: "outline",
    Icon: ArrowLeftRight,
    meaning:
      "Kelas prakiraan berbeda dari kelas kejadian, tanpa melibatkan kelas Siaga.",
    rank: 3,
  },
  sepadan: {
    label: "Kelas sama",
    badge: "muted",
    Icon: Equal,
    meaning: "Kelas prakiraan sama dengan kelas kejadian, di luar kelas Siaga.",
    rank: 4,
  },
};

const AUTOPLAY_MS = 1800;

function RiskChip({ level }: { level: RiskLevel | null }) {
  const config = riskConfigOf(level);
  return (
    <Badge variant={config.badgeVariant} size="sm">
      {config.label}
    </Badge>
  );
}

function VerdictChip({ verdict }: { verdict: RewindVerdict }) {
  const { label, badge, Icon } = VERDICT[verdict];
  return (
    <Badge variant={badge} size="sm" className="whitespace-nowrap">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  emphasis = false,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  unit?: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-4",
        emphasis
          ? "border-brand-300/50 bg-brand-50"
          : "border-border bg-paper-50",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            emphasis ? "text-brand-700" : "text-brand-600",
          )}
          aria-hidden="true"
        />
        <span className="overline">{label}</span>
      </div>
      <p className="text-h2 font-semibold tabular-nums text-foreground">
        {value}
        {unit && (
          <span className="ml-1 text-body-sm font-medium text-paper-600">
            {unit}
          </span>
        )}
      </p>
      <p className="text-caption leading-snug text-paper-600">{caption}</p>
    </div>
  );
}

export function TimeMachine() {
  const [selectedDisease, setSelectedDisease] =
    React.useState<DiseaseType | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [focusedDistrict, setFocusedDistrict] = React.useState<string | null>(
    null,
  );

  const diseases = useApi(() => fetchDiseases(), []);
  const geo = useApi(() => fetchGeoJson(), []);
  const rewind = useApi(
    () =>
      selectedDisease
        ? fetchRewind(selectedDisease)
        : Promise.resolve(null as never),
    [selectedDisease],
  );

  React.useEffect(() => {
    if (!selectedDisease && diseases.data && diseases.data.length > 0) {
      setSelectedDisease(diseases.data[0].disease);
    }
  }, [diseases.data, selectedDisease]);

  const payload = rewind.data?.data ?? null;
  const meta = rewind.data?.meta ?? null;
  const months = React.useMemo(() => payload?.months ?? [], [payload]);

  /* Ganti penyakit berarti ganti periode uji: indeks bulan lama bisa menunjuk
     ke bulan yang tidak ada pada penyakit baru. */
  React.useEffect(() => {
    setMonthIndex(0);
    setPlaying(false);
    setFocusedDistrict(null);
  }, [selectedDisease]);

  React.useEffect(() => {
    if (!playing || months.length === 0) return;

    const timer = window.setInterval(() => {
      setMonthIndex((current) => {
        if (current >= months.length - 1) {
          /* Berhenti di bulan terakhir alih-alih memutar dari awal: pemirsa
             yang berpaling sesaat tidak kehilangan ujung ceritanya. */
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [playing, months.length]);

  const activeMonth = months[Math.min(monthIndex, months.length - 1)] ?? null;

  const cellsOfMonth = React.useMemo(() => {
    if (!payload || !activeMonth) return [] as RewindCell[];
    return payload.cells.filter((c) => c.month_start === activeMonth.month_start);
  }, [payload, activeMonth]);

  const rankedCells = React.useMemo(
    () =>
      [...cellsOfMonth].sort(
        (a, b) =>
          VERDICT[a.verdict].rank - VERDICT[b.verdict].rank ||
          b.actual - a.actual ||
          a.nama.localeCompare(b.nama),
      ),
    [cellsOfMonth],
  );

  const predictedCells = React.useMemo(
    () =>
      cellsOfMonth.map((c) => ({
        id: c.kecamatan_id,
        nama: c.nama,
        riskClass: c.risk_class_predicted,
        score: c.risk_score_predicted,
        cases: c.predicted,
      })),
    [cellsOfMonth],
  );

  const actualCells = React.useMemo(
    () =>
      cellsOfMonth.map((c) => ({
        id: c.kecamatan_id,
        nama: c.nama,
        riskClass: c.risk_class_actual,
        score: c.risk_score_actual,
        cases: c.actual,
      })),
    [cellsOfMonth],
  );

  const focused = React.useMemo(
    () => cellsOfMonth.find((c) => c.kecamatan_id === focusedDistrict) ?? null,
    [cellsOfMonth, focusedDistrict],
  );

  const districtRecap = React.useMemo(
    () =>
      [...(payload?.districts ?? [])].sort(
        (a, b) =>
          b.tally.terlewat - a.tally.terlewat ||
          b.tally.alarm_palsu - a.tally.alarm_palsu ||
          a.nama.localeCompare(b.nama),
      ),
    [payload],
  );

  /* Skala bersama untuk pita bulan: aktual dan prakiraan harus diukur dengan
     penggaris yang sama, kalau tidak batangnya berbohong. */
  const stripMax = React.useMemo(
    () =>
      months.reduce(
        (max, m) => Math.max(max, m.actual, m.predicted),
        1,
      ),
    [months],
  );

  const summary = payload?.summary ?? null;
  const testWindow = formatPeriodRange(meta?.test_period ?? null);
  const trainWindow = formatPeriodRange(meta?.train_period ?? null);

  const diseaseNames = React.useMemo(
    () => (diseases.data ?? []).map((d) => d.disease),
    [diseases.data],
  );

  const stepMonth = (delta: number) => {
    setPlaying(false);
    setMonthIndex((current) =>
      Math.min(Math.max(current + delta, 0), Math.max(months.length - 1, 0)),
    );
  };

  return (
    <div className="container space-y-10 py-12 md:py-16">
      {/* ── Kepala halaman ────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-3xl space-y-5 text-center">
        <div className="eyebrow mx-auto">
          <History className="h-3 w-3" aria-hidden="true" />
          Mesin Waktu
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance text-foreground md:text-5xl">
          Putar ulang bulan yang sudah lewat
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Model dilatih sampai {trainWindow.endLabel}. Bulan-bulan di halaman
          ini tidak pernah dilihatnya. Geser waktunya, lalu bandingkan apa yang
          diprakirakan dengan apa yang benar-benar tercatat di rekap resmi —
          termasuk saat prakiraannya salah.
        </p>
        {meta && (
          <p className="text-caption text-paper-600">
            Model {meta.model_version} · disinkronkan{" "}
            {formatDateTime(meta.fetched_at)}
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-body-sm text-paper-600">Penyakit:</span>
        <DiseaseSelector
          options={diseaseNames}
          selected={selectedDisease}
          onSelect={setSelectedDisease}
        />
      </div>

      <DataState
        loading={rewind.loading || diseases.loading || !selectedDisease}
        error={rewind.error ?? diseases.error}
        empty={!rewind.loading && months.length === 0}
        emptyMessage="Periode uji penyakit ini belum punya hasil per kecamatan. Jalankan layanan ML lalu muat ulang halaman."
        onRetry={rewind.reload}
        loadingMessage="Menyusun ulang periode uji…"
      >
        {summary && activeMonth && (
          <div className="space-y-8">
            {/* ── Ringkasan periode uji ─────────────────────────────────── */}
            <section aria-labelledby="ringkasan-uji" className="space-y-3">
              <h2 id="ringkasan-uji" className="sr-only">
                Ringkasan periode uji
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  emphasis
                  icon={CalendarClock}
                  label="Keunggulan waktu"
                  value={
                    summary.leadTimeDays === null
                      ? "—"
                      : `±${summary.leadTimeDays}`
                  }
                  unit="hari"
                  caption="Satu siklus pelaporan: prakiraan terbit saat rekap bulan sebelumnya masuk, rekap bulan itu sendiri baru terbit sebulan kemudian."
                />
                <StatTile
                  icon={CircleCheck}
                  label="Lonjakan tertandai"
                  value={`${summary.tally.tertandai}/${summary.surges}`}
                  caption={
                    summary.sensitivityPct === null
                      ? "Tidak ada bulan-kecamatan berkelas Siaga di periode uji."
                      : `Sensitivitas ${summary.sensitivityPct}% — dari seluruh kelas Siaga yang benar terjadi.`
                  }
                />
                <StatTile
                  icon={BellOff}
                  label="Alarm palsu"
                  value={formatNumber(summary.tally.alarm_palsu)}
                  caption={
                    summary.precisionPct === null
                      ? "Tidak ada peringatan Siaga yang terbit di periode uji."
                      : `Presisi ${summary.precisionPct}% — dari ${summary.alarms} peringatan Siaga yang terbit.`
                  }
                />
                <StatTile
                  icon={Gauge}
                  label="Kelas tepat"
                  value={
                    summary.classAccuracyPct === null
                      ? "—"
                      : `${summary.classAccuracyPct}%`
                  }
                  caption={`${formatNumber(summary.evaluated)} pasangan bulan × kecamatan diuji, MAE ${summary.mae ?? "—"} kasus per kecamatan-bulan.`}
                />
              </div>
              <p className="text-caption text-paper-600">
                Periode uji {testWindow.startLabel} – {testWindow.endLabel} ·{" "}
                {summary.monthsCount} bulan × {summary.districtsCount} kecamatan
                · penyakit {diseaseLabel(meta?.disease ?? "")}.
              </p>
            </section>

            {/* ── Kendali waktu ─────────────────────────────────────────── */}
            <Card className="space-y-5 p-[var(--card-pad)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                  <span className="overline">Bulan yang diputar ulang</span>
                  <p className="text-h2 font-semibold text-foreground">
                    {activeMonth.label}
                  </p>
                  <p className="text-caption text-paper-600">
                    Bulan ke-{monthIndex + 1} dari {months.length} · rekap resmi{" "}
                    {formatNumber(activeMonth.actual)} kasus, prakiraan{" "}
                    {formatNumber(activeMonth.predicted)} kasus se-Kota Semarang.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stepMonth(-1)}
                    disabled={monthIndex === 0}
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      /* Menekan putar di ujung deret berarti mengulang dari
                         awal, bukan diam di tempat. */
                      if (monthIndex >= months.length - 1) setMonthIndex(0);
                      setPlaying((p) => !p);
                    }}
                    aria-pressed={playing}
                    className="gap-1.5"
                  >
                    {playing ? (
                      <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                    {playing ? "Jeda" : "Putar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stepMonth(1)}
                    disabled={monthIndex >= months.length - 1}
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="sr-only">Geser bulan periode uji</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(months.length - 1, 0)}
                  step={1}
                  value={monthIndex}
                  onChange={(event) => {
                    setPlaying(false);
                    setMonthIndex(Number(event.target.value));
                  }}
                  aria-valuetext={activeMonth.label}
                  className="w-full cursor-pointer accent-brand-700"
                />
              </label>

              {/* Pita bulan: batang = rekap resmi, garis = prakiraan. */}
              <div className="space-y-2">
                {/* Pita bulan menggeser sendiri di layar sempit. Pemusatan
                    dilakukan di lapisan dalam yang lebarnya `min-w-max`, bukan
                    dengan `justify-center` pada wadah yang menggeser: pada
                    wadah scroll, isi yang dipusatkan memotong ujung kirinya dan
                    Januari tidak bisa dicapai sama sekali. */}
                <div className="overflow-x-auto pb-1">
                  <div className="flex w-full min-w-max items-end justify-center gap-1">
                  {months.map((month, index) => {
                    const actualHeight = Math.max(
                      3,
                      Math.round((month.actual / stripMax) * 64),
                    );
                    const predictedOffset = Math.max(
                      2,
                      Math.round((month.predicted / stripMax) * 64),
                    );
                    const isActive = index === monthIndex;
                    return (
                      <button
                        key={month.month_start}
                        type="button"
                        onClick={() => {
                          setPlaying(false);
                          setMonthIndex(index);
                        }}
                        aria-current={isActive ? "true" : undefined}
                        title={`${month.label}: rekap ${formatNumber(month.actual)} kasus, prakiraan ${formatNumber(month.predicted)} kasus`}
                        className={cn(
                          /* Batas lebar menjaga bentuk pita saat periode uji
                             hanya tiga bulan: tanpa itu bulan aktif menjadi
                             kotak tersorot selebar dua ratus piksel. */
                          "group flex min-w-[38px] max-w-[76px] flex-1 flex-col items-center gap-1 rounded-lg px-1 pt-1 transition-colors",
                          isActive ? "bg-brand-50" : "hover:bg-paper-50",
                        )}
                      >
                        <span className="relative flex h-[68px] w-full items-end justify-center">
                          {/* Jalur pucat memberi batang sebuah dasar yang sama,
                              sehingga tinggi antarbulan bisa dibandingkan mata
                              tanpa menebak garis nolnya. */}
                          <span
                            className="absolute inset-x-0 bottom-0 mx-auto h-full w-5 rounded-sm bg-paper-100"
                            aria-hidden
                          />
                          {/* Batang memakai warna deret observasi (cat-1 =
                              brand-700, DESIGN-SYSTEM §2.5); bulan tak aktif
                              hanya diturunkan opasitasnya, bukan diganti abu
                              yang menghilang di atas jalurnya. */}
                          <span
                            className={cn(
                              "relative w-5 rounded-t-sm",
                              isActive ? "bg-brand-700" : "bg-brand-700/40",
                            )}
                            style={{ height: `${actualHeight}px` }}
                          />
                          <span
                            className="absolute left-1/2 w-7 -translate-x-1/2 border-t-2 border-dashed border-brand-500"
                            style={{ bottom: `${predictedOffset}px` }}
                          />
                        </span>
                        <span
                          className={cn(
                            "overline whitespace-nowrap",
                            isActive && "text-brand-700",
                          )}
                        >
                          {month.label.split(" ")[0].slice(0, 3)}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-paper-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-2 rounded-sm bg-brand-700/40" aria-hidden />
                    Rekap resmi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-0 w-4 border-t-2 border-dashed border-brand-500"
                      aria-hidden
                    />
                    Prakiraan model
                  </span>
                  <span>Klik satu bulan untuk melompat ke sana.</span>
                </p>
              </div>
            </Card>

            {/* ── Dua peta ──────────────────────────────────────────────── */}
            <section aria-labelledby="dua-peta" className="space-y-3">
              <h2 id="dua-peta" className="text-h3 text-foreground">
                Prakiraan berdampingan dengan kejadian sebenarnya
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    title: "Yang diprakirakan model",
                    caption: `Dihitung sebelum ${activeMonth.label} berjalan, dari rekap bulan sebelumnya dan data iklim.`,
                    cells: predictedCells,
                    source: "Prakiraan",
                  },
                  {
                    title: "Yang benar-benar terjadi",
                    caption: `Rekap kasus resmi ${activeMonth.label} — data yang tidak pernah dilihat model.`,
                    cells: actualCells,
                    source: "Rekap resmi",
                  },
                ].map((panel) => (
                  <Card key={panel.source} className="space-y-3 p-[var(--card-pad)]">
                    <div className="space-y-1">
                      <span className="overline">{panel.source}</span>
                      <h3 className="text-body font-semibold text-foreground">
                        {panel.title}
                      </h3>
                      <p className="text-caption text-paper-600">
                        {panel.caption}
                      </p>
                    </div>
                    {geo.data ? (
                      <RewindMap
                        geojson={geo.data}
                        cells={panel.cells}
                        monthKey={activeMonth.month_start}
                        sourceLabel={panel.source}
                        monthLabel={activeMonth.label}
                        selectedId={focusedDistrict}
                        onSelect={(id) =>
                          setFocusedDistrict((current) =>
                            current === id ? null : id,
                          )
                        }
                      />
                    ) : (
                      <div
                        className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-border text-caption text-paper-600"
                        role="status"
                      >
                        {geo.error ?? "Memuat batas wilayah…"}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {(["rendah", "sedang", "tinggi"] as RiskLevel[]).map((level) => {
                  const config = riskConfigOf(level);
                  return (
                    <span
                      key={level}
                      className="inline-flex items-center gap-1.5 text-caption text-paper-700"
                    >
                      <span
                        className="h-3 w-3 rounded-sm border border-paper-300"
                        style={{ backgroundColor: config.fill }}
                        aria-hidden
                      />
                      {config.label}
                    </span>
                  );
                })}
                <span className="text-caption text-paper-600">
                  Klik satu kecamatan untuk menguncinya di kedua peta.
                </span>
              </div>

              {focused && (
                <Card
                  nested
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4"
                >
                  <div className="min-w-[140px]">
                    <span className="overline">Kecamatan terpilih</span>
                    <p className="text-body font-semibold text-foreground">
                      {focused.nama}
                    </p>
                  </div>
                  <div>
                    <span className="overline">Prakiraan</span>
                    <p className="flex items-center gap-2 text-body-sm text-foreground">
                      <RiskChip level={focused.risk_class_predicted} />
                      <span className="tabular-nums font-semibold">
                        {formatNumber(focused.predicted)} kasus
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="overline">Rekap resmi</span>
                    <p className="flex items-center gap-2 text-body-sm text-foreground">
                      <RiskChip level={focused.risk_class_actual} />
                      <span className="tabular-nums font-semibold">
                        {formatNumber(focused.actual)} kasus
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="overline">Putusan</span>
                    <p className="text-body-sm">
                      <VerdictChip verdict={focused.verdict} />
                    </p>
                  </div>
                  <p className="max-w-md text-caption text-paper-600">
                    {VERDICT[focused.verdict].meaning}
                  </p>
                </Card>
              )}
            </section>

            {/* ── Tabel bulan aktif ─────────────────────────────────────── */}
            <section aria-labelledby="rincian-bulan" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="rincian-bulan" className="text-h3 text-foreground">
                  Rincian {activeMonth.label}
                </h2>
                <p className="text-caption text-paper-600">
                  Terurut: kesalahan yang paling mahal lebih dulu.
                </p>
              </div>

              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-body-sm">
                    <caption className="sr-only">
                      Perbandingan prakiraan dan rekap resmi per kecamatan pada{" "}
                      {activeMonth.label}
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-paper-100 text-left">
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Kecamatan
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Prakiraan
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Rekap resmi
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          Selisih
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Putusan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedCells.map((cell) => {
                        const diff = cell.predicted - cell.actual;
                        const isFocused = focusedDistrict === cell.kecamatan_id;
                        return (
                          <tr
                            key={cell.kecamatan_id}
                            onClick={() =>
                              setFocusedDistrict((current) =>
                                current === cell.kecamatan_id
                                  ? null
                                  : cell.kecamatan_id,
                              )
                            }
                            className={cn(
                              "cursor-pointer border-b border-border/70 transition-colors last:border-0",
                              isFocused ? "bg-brand-50" : "hover:bg-paper-50",
                            )}
                          >
                            <th
                              scope="row"
                              className="px-4 py-2.5 text-left font-medium text-foreground"
                            >
                              {cell.nama}
                            </th>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-2">
                                <RiskChip level={cell.risk_class_predicted} />
                                <span className="tabular-nums text-paper-700">
                                  {formatNumber(cell.predicted)}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-2">
                                <RiskChip level={cell.risk_class_actual} />
                                <span className="tabular-nums text-paper-700">
                                  {formatNumber(cell.actual)}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-paper-700">
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="px-4 py-2.5">
                              <VerdictChip verdict={cell.verdict} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ── Rekap per kecamatan ───────────────────────────────────── */}
            <section aria-labelledby="rekap-kecamatan" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="rekap-kecamatan" className="text-h3 text-foreground">
                  Rekap seluruh periode uji per kecamatan
                </h2>
                <p className="text-caption text-paper-600">
                  Kecamatan dengan peringatan terlewat terbanyak di atas.
                </p>
              </div>

              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-body-sm">
                    <caption className="sr-only">
                      Rekap putusan per kecamatan sepanjang periode uji
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-paper-100 text-left">
                        <th scope="col" className="px-4 py-2.5 font-semibold">
                          Kecamatan
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          Bulan diuji
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          Tertandai
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          Terlewat
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          Alarm palsu
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-semibold"
                        >
                          MAE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtRecap.map((district) => (
                        <tr
                          key={district.id}
                          className="border-b border-border/70 last:border-0"
                        >
                          <th
                            scope="row"
                            className="px-4 py-2.5 text-left font-medium text-foreground"
                          >
                            {district.nama}
                          </th>
                          <td className="px-4 py-2.5 text-right tabular-nums text-paper-700">
                            {district.evaluated}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-paper-700">
                            {district.tally.tertandai}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right tabular-nums",
                              district.tally.terlewat > 0
                                ? "font-semibold text-risk-high"
                                : "text-paper-700",
                            )}
                          >
                            {district.tally.terlewat}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right tabular-nums",
                              district.tally.alarm_palsu > 0
                                ? "font-semibold text-risk-medium"
                                : "text-paper-700",
                            )}
                          >
                            {district.tally.alarm_palsu}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-paper-700">
                            {district.mae ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ── Cara membaca & batasan ────────────────────────────────── */}
            <section aria-labelledby="cara-membaca" className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-[var(--card-pad)]">
                <div className="flex items-center gap-2">
                  <CalendarClock
                    className="h-4 w-4 text-brand-700"
                    aria-hidden="true"
                  />
                  <h2 id="cara-membaca" className="text-h3 text-foreground">
                    Dari mana angka keunggulan waktu
                  </h2>
                </div>
                <ol className="space-y-2">
                  {(meta?.leadTimeNote ?? []).map((note, index) => (
                    <li
                      key={note}
                      className="flex gap-2.5 text-body-sm leading-relaxed text-paper-700"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-caption font-semibold text-brand-700">
                        {index + 1}
                      </span>
                      {note}
                    </li>
                  ))}
                </ol>
              </Card>

              <Card className="space-y-3 p-[var(--card-pad)]">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h2 className="text-h3 text-foreground">Arti tiap putusan</h2>
                </div>
                <dl className="space-y-2.5">
                  {(
                    ["terlewat", "tertandai", "alarm_palsu", "meleset", "sepadan"] as RewindVerdict[]
                  ).map((verdict) => (
                    <div key={verdict} className="space-y-1">
                      <dt>
                        <VerdictChip verdict={verdict} />
                      </dt>
                      <dd className="text-caption leading-relaxed text-paper-600">
                        {VERDICT[verdict].meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </section>

            <Card nested className="space-y-2 p-[var(--card-pad)]">
              <h2 className="text-body font-semibold text-foreground">
                Batasan yang berlaku pada halaman ini
              </h2>
              <ul className="space-y-1.5">
                {(meta?.limitations ?? []).map((limitation) => (
                  <li
                    key={limitation}
                    className="flex gap-2 text-caption leading-relaxed text-paper-700"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-paper-500" aria-hidden />
                    {limitation}
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-caption text-paper-600">
                Metrik uji lengkap, cakupan data per kecamatan, dan daftar fitur
                model ada di{" "}
                <Link
                  href="/model"
                  className="inline-flex items-center gap-1 font-medium text-brand-700 underline underline-offset-2"
                >
                  Transparansi Model
                  <SquareArrowOutUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                .
              </p>
            </Card>
          </div>
        )}
      </DataState>
    </div>
  );
}
