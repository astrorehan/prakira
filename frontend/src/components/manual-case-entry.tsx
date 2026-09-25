"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  FilePlus2,
  History,
  Loader2,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Thermometer,
  Droplets,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDateTime, formatMonth } from "@/lib/period";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  fetchDiseases,
  fetchKecamatanList,
  fetchPeriodReadiness,
  fetchRecapEntry,
  fetchRecentManualCases,
  markRecapChecked,
  submitManualCase,
  type KecamatanRef,
} from "@/lib/api";
import type {
  DiseaseSummary,
  ManualCaseRecord,
  PeriodReadiness,
  RecapEntryResponse,
} from "@/types";
import { useApi } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";
import { useSessionContext } from "@/components/session-provider";

export type ManualCaseEntryCardProps = {
  diseases?: DiseaseSummary[];
  onSaved?: () => void;
  className?: string;
};

const DEFAULT_DISEASES = [
  { disease: "DBD", label: "DBD (Demam Berdarah)" },
  { disease: "ISPA", label: "ISPA (Pernapasan)" },
  { disease: "LEPTOSPIROSIS", label: "Leptospirosis" },
];

export function ManualCaseEntryCard({
  diseases: propDiseases,
  onSaved,
  className,
}: ManualCaseEntryCardProps) {
  const fetchedDiseases = useApi(() => fetchDiseases(), []);
  const kecamatanApi = useApi(() => fetchKecamatanList(), []);
  const recentCasesApi = useApi(() => fetchRecentManualCases(), []);

  const diseasesList = React.useMemo(
    () =>
      propDiseases && propDiseases.length > 0
        ? propDiseases
        : fetchedDiseases.data && fetchedDiseases.data.length > 0
          ? fetchedDiseases.data
          : DEFAULT_DISEASES,
    [propDiseases, fetchedDiseases.data],
  );

  const { session } = useSessionContext();
  const ownKecamatan = session?.kecamatanId ?? null;
  const kecamatanList = React.useMemo(
    () =>
      (kecamatanApi.data ?? []).filter((k) => !ownKecamatan || k.id === ownKecamatan),
    [kecamatanApi.data, ownKecamatan],
  );

  // Form states
  const [disease, setDisease] = React.useState<string>("DBD");
  const [kecamatanId, setKecamatanId] = React.useState<string>("");
  const [periodDate, setPeriodDate] = React.useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [casesCount, setCasesCount] = React.useState<string>("");
  /* F13: alasan koreksi wajib ketika angka tersimpan diganti angka lain.
     Rekap adalah angka yang dipertanggungjawabkan seseorang, bukan catatan
     yang boleh berubah diam-diam. */
  const [reason, setReason] = React.useState<string>("");
  const [existing, setExisting] = React.useState<RecapEntryResponse | null>(null);
  /* F18: setelah menyimpan, operator berhak tahu apakah layanannya sudah siap
     dipakai — bukan hanya bahwa barisnya masuk. */
  const [readiness, setReadiness] = React.useState<PeriodReadiness | null>(null);
  const [checking, setChecking] = React.useState(false);

  // Optional climate toggles
  const [showClimate, setShowClimate] = React.useState(false);
  const [rainfall, setRainfall] = React.useState<string>("");
  const [temp, setTemp] = React.useState<string>("");
  const [humidity, setHumidity] = React.useState<string>("");

  // Submission feedback
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  // Set default kecamatan when loaded
  React.useEffect(() => {
    if (!kecamatanId && kecamatanList.length > 0) {
      setKecamatanId(kecamatanList[0].id);
    }
  }, [kecamatanList, kecamatanId]);

  /* Nilai tersimpan dibaca sebelum menyimpan, bukan sesudah. Operator yang
     tidak melihat angka yang akan ia ganti tidak sedang mengoreksi apa pun —
     ia menimpa. */
  React.useEffect(() => {
    if (!kecamatanId || !disease || !periodDate) return;
    let cancelled = false;
    setExisting(null);
    setReason("");
    fetchRecapEntry(kecamatanId, disease, `${periodDate}-01`)
      .then((response) => {
        if (!cancelled) setExisting(response.data);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [kecamatanId, disease, periodDate]);

  const previousCases = existing?.entry?.cases ?? null;
  const parsedPreview = casesCount === "" ? null : Number(casesCount);
  const replacing =
    previousCases !== null &&
    parsedPreview !== null &&
    Number.isInteger(parsedPreview) &&
    parsedPreview !== previousCases;

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validation
    if (!kecamatanId) {
      setFeedback({
        type: "error",
        message: "Silakan pilih kecamatan terlebih dahulu.",
      });
      return;
    }

    if (!disease) {
      setFeedback({
        type: "error",
        message: "Silakan pilih jenis penyakit.",
      });
      return;
    }

    if (!periodDate) {
      setFeedback({
        type: "error",
        message: "Silakan tentukan periode pelaporan (bulan/tanggal).",
      });
      return;
    }

    const parsedCases = Number(casesCount);
    if (casesCount === "" || isNaN(parsedCases) || parsedCases < 0 || !Number.isInteger(parsedCases)) {
      setFeedback({
        type: "error",
        message: "Jumlah kasus harus berupa angka bulat positif atau 0.",
      });
      return;
    }

    if (
      previousCases !== null &&
      parsedCases !== previousCases &&
      reason.trim().length < 8
    ) {
      setFeedback({
        type: "error",
        message: `Periode ini sudah berisi ${previousCases}. Sebutkan alasan koreksinya sebelum menggantinya.`,
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitManualCase({
        kecamatan_id: kecamatanId,
        disease,
        month_start: periodDate,
        cases: parsedCases,
        rainfall_mm: rainfall ? Number(rainfall) : null,
        temp_mean_c: temp ? Number(temp) : null,
        humidity_pct: humidity ? Number(humidity) : null,
        reason: reason.trim() || undefined,
      });

      const kecNama =
        kecamatanList.find((k) => k.id === kecamatanId)?.nama ?? kecamatanId;

      /* Kalimatnya menyebut penggantian secara utuh — nilai lama, nilai baru —
         karena akibat koreksi tidak berhenti di layar ini. */
      setFeedback({
        type: "success",
        message: response.data.replaced
          ? `Total rekap ${disease.toUpperCase()} ${kecNama} diperbarui dari ${response.data.previous_cases} menjadi ${parsedCases}.`
          : `Total rekap ${disease.toUpperCase()} ${kecNama} ditetapkan ${parsedCases}.`,
        details: `Periode ${response.data.month_start}, atas nama ${response.data.recorded_by ?? "petugas yang masuk"}. Angka ini menjadi dasar prakiraan periode berikutnya.`,
      });

      setCasesCount("");
      setReason("");
      invalidatePeriod();
      recentCasesApi.reload();
      fetchRecapEntry(kecamatanId, disease, `${periodDate}-01`)
        .then((next) => setExisting(next.data))
        .catch(() => undefined);
      fetchPeriodReadiness(disease, `${periodDate}-01`)
        .then((next) => setReadiness(next.data))
        .catch(() => setReadiness(null));
      if (onSaved) onSaved();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan entri kasus manual.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const recentRows = recentCasesApi.data?.data ?? [];

  return (
    <Card className={cn("flex flex-col gap-5 p-5 sm:p-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-heading-sm text-foreground">
              Total rekap kecamatan
            </h3>
            <Badge variant="risk-low" className="text-overline uppercase">
              Resmi Faskes
            </Badge>
          </div>
          {/* F13: yang disimpan adalah total satu kecamatan untuk satu periode,
              bukan tambahan kasus. Nama lamanya ("entri kasus") membuat operator
              mengira angkanya dijumlahkan dengan yang sudah ada. */}
          <p className="text-body-sm text-paper-600">
            Total kasus terkonfirmasi satu kecamatan untuk satu periode. Nilai
            baru menggantikan nilai lama, bukan menambahnya.
          </p>
        </div>

        <div className="flex items-center gap-2 text-caption text-paper-500">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <span>Langsung tercatat di audit trail</span>
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Penyakit */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-disease-select"
              className="flex items-center gap-1.5 text-caption font-semibold text-foreground"
            >
              <Activity className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Jenis Penyakit
            </label>
            <div className="relative">
              <select
                id="manual-disease-select"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 pr-8 text-body-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {diseasesList.map((d) => (
                  <option key={d.disease} value={d.disease}>
                    {d.disease.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-paper-400" />
            </div>
          </div>

          {/* Kecamatan */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-kecamatan-select"
              className="flex items-center gap-1.5 text-caption font-semibold text-foreground"
            >
              <Building2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Kecamatan (Semarang)
            </label>
            <div className="relative">
              <select
                id="manual-kecamatan-select"
                value={kecamatanId}
                onChange={(e) => setKecamatanId(e.target.value)}
                disabled={kecamatanApi.loading}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3.5 pr-8 text-body-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
              >
                {kecamatanList.length === 0 ? (
                  <option value="">Memuat kecamatan…</option>
                ) : (
                  kecamatanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-paper-400" />
            </div>
          </div>

          {/* Periode Bulan / Tanggal */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-period-input"
              className="flex items-center gap-1.5 text-caption font-semibold text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Periode Kasus
            </label>
            <Input
              id="manual-period-input"
              type="month"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="h-11 text-body-sm"
              required
            />
          </div>

          {/* Jumlah Kasus Terkonfirmasi */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-cases-count"
              className="flex items-center gap-1.5 text-caption font-semibold text-foreground"
            >
              <PlusCircle className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Total kasus periode ini
            </label>
            <Input
              id="manual-cases-count"
              type="number"
              min="0"
              step="1"
              placeholder="Contoh: 12"
              value={casesCount}
              onChange={(e) => setCasesCount(e.target.value)}
              className="h-11 text-body-sm font-semibold tabular"
              required
            />
          </div>
        </div>

        {/* Collapsible Optional Climate Inputs */}
        <div className="border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => setShowClimate(!showClimate)}
            className="flex items-center gap-2 text-caption font-medium text-brand-700 hover:text-brand-800 transition-colors"
          >
            {showClimate ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span>Parameter Cuaca Pendukung (Opsional)</span>
          </button>

          {showClimate && (
            <div className="mt-3 grid grid-cols-1 gap-4 rounded-xl bg-paper-50 p-3.5 sm:grid-cols-3 border border-border/50 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="manual-rainfall"
                  className="flex items-center gap-1.5 text-overline font-semibold text-paper-600 uppercase"
                >
                  <CloudRain className="h-3.5 w-3.5 text-teal-600" />
                  Curah Hujan (mm)
                </label>
                <Input
                  id="manual-rainfall"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Opsional (mis. 245.5)"
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  className="h-9 text-caption bg-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="manual-temp"
                  className="flex items-center gap-1.5 text-overline font-semibold text-paper-600 uppercase"
                >
                  <Thermometer className="h-3.5 w-3.5 text-amber-600" />
                  Suhu Rata-rata (°C)
                </label>
                <Input
                  id="manual-temp"
                  type="number"
                  step="0.1"
                  placeholder="Opsional (mis. 28.4)"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="h-9 text-caption bg-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="manual-humidity"
                  className="flex items-center gap-1.5 text-overline font-semibold text-paper-600 uppercase"
                >
                  <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                  Kelembaban Udara (%)
                </label>
                <Input
                  id="manual-humidity"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="Opsional (mis. 82)"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  className="h-9 text-caption bg-surface"
                />
              </div>
            </div>
          )}
        </div>

        {/* Nilai yang sedang berlaku, pemiliknya, dan riwayat koreksinya. */}
        {existing && (
          <div className="rounded-xl border border-border bg-paper-50 p-3.5 text-caption leading-relaxed text-paper-700">
            {existing.entry ? (
              <>
                <p>
                  <span className="font-semibold text-foreground">
                    Tersimpan: {formatNumber(existing.entry.cases)} kasus
                  </span>{" "}
                  — dicatat {existing.entry.recorded_by ?? "petugas"} pada{" "}
                  {formatDateTime(existing.entry.recorded_at)}.{" "}
                  {existing.entry.recap_state === "diperiksa"
                    ? "Sudah diperiksa pemilik rekap."
                    : "Belum diperiksa pemilik rekap."}
                </p>
                {replacing && (
                  <p className="mt-1.5 font-medium text-risk-medium">
                    Akan diganti: {formatNumber(existing.entry.cases)} →{" "}
                    {formatNumber(parsedPreview as number)}.
                  </p>
                )}
                {existing.revisions.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-paper-600">
                    {existing.revisions.slice(0, 3).map((rev) => (
                      <li key={rev.recorded_at}>
                        {formatDateTime(rev.recorded_at)} · {rev.previous_cases ?? "—"} →{" "}
                        {rev.new_cases} · {rev.actor} — {rev.reason}
                      </li>
                    ))}
                  </ul>
                )}
                {existing.entry.recap_state !== "diperiksa" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2.5"
                    disabled={checking}
                    onClick={async () => {
                      setChecking(true);
                      try {
                        await markRecapChecked({
                          kecamatanId,
                          disease,
                          monthStart: `${periodDate}-01`,
                        });
                        const next = await fetchRecapEntry(
                          kecamatanId,
                          disease,
                          `${periodDate}-01`,
                        );
                        setExisting(next.data);
                      } catch {
                        /* Kegagalan ditampilkan lewat keadaan yang tidak berubah. */
                      } finally {
                        setChecking(false);
                      }
                    }}
                  >
                    Tandai sudah diperiksa
                  </Button>
                )}
              </>
            ) : (
              <p>Periode ini belum pernah diisi untuk kecamatan tersebut.</p>
            )}
          </div>
        )}

        {previousCases !== null && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-reason"
              className="text-caption font-semibold text-foreground"
            >
              Alasan koreksi {replacing ? "" : "(bila angkanya diubah)"}
            </label>
            <Input
              id="manual-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mis. koreksi setelah verifikasi laboratorium."
              className="h-11 text-body-sm"
            />
          </div>
        )}

        {/* F18: perjalanan dari rekap tersimpan sampai prakiraan siap dipakai. */}
        {readiness && (
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <p className="text-caption font-semibold text-foreground">
              Kesiapan periode {formatMonth(readiness.month)} · {readiness.disease}
            </p>
            <p className="mt-0.5 text-caption text-paper-600">
              {readiness.saved} dari {readiness.totalDistricts} kecamatan tersimpan,{" "}
              {readiness.checked} diperiksa.
            </p>
            <ol className="mt-2.5 space-y-1.5">
              {readiness.stages.map((stage) => (
                <li key={stage.id} className="text-caption leading-relaxed">
                  <span
                    className={cn(
                      "font-medium",
                      stage.state === "selesai"
                        ? "text-teal-800"
                        : stage.state === "berjalan"
                          ? "text-risk-medium"
                          : "text-paper-600",
                    )}
                  >
                    {stage.label}
                  </span>
                  <span className="text-paper-600"> — {stage.detail}</span>
                  {stage.state !== "selesai" && (
                    <span className="text-paper-600"> Penanggung jawab: {stage.owner}.</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl p-3.5 text-body-sm transition-all animate-in fade-in",
              feedback.type === "success"
                ? "bg-teal-50 border border-teal-200 text-teal-900"
                : "bg-red-50 border border-red-200 text-red-900",
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{feedback.message}</span>
              {feedback.details && (
                <span className="text-caption text-teal-800/80">
                  {feedback.details}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-caption text-paper-500">
            * Menggantikan total yang tersimpan untuk kecamatan dan periode ini
          </span>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-700 font-medium text-white hover:bg-brand-800 sm:w-auto sm:min-w-[140px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : (
              <>
                <FilePlus2 className="mr-2 h-4 w-4" />
                {replacing ? "Simpan koreksi" : "Simpan total rekap"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Mini Table: Riwayat Entri Kasus Manual Terakhir */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-paper-500" />
            <h4 className="text-caption font-semibold uppercase tracking-wider text-paper-600">
              Riwayat Entri Manual Terbaru
            </h4>
          </div>

          <button
            type="button"
            onClick={() => recentCasesApi.reload()}
            disabled={recentCasesApi.loading}
            className="inline-flex items-center gap-1 text-caption text-brand-700 hover:text-brand-800 font-medium"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3",
                recentCasesApi.loading && "animate-spin",
              )}
            />
            Segarkan
          </button>
        </div>

        {recentCasesApi.loading && recentRows.length === 0 ? (
          <div className="py-4 text-center text-caption text-paper-500">
            Memuat riwayat entri manual…
          </div>
        ) : recentRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-4 text-center text-caption text-paper-500">
            Belum ada entri kasus manual tercatat. Isi formulir di atas untuk mencatat kasus resmi baru.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-paper-50 text-overline uppercase text-paper-600 border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-semibold">Waktu Entri</th>
                  <th className="px-3 py-2 font-semibold">Penyakit</th>
                  <th className="px-3 py-2 font-semibold">Kecamatan</th>
                  <th className="px-3 py-2 font-semibold">Periode Bulan</th>
                  <th className="px-3 py-2 font-semibold text-right">Kasus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRows.slice(0, 5).map((row, idx) => (
                  <tr key={`${row.kecamatan_id}-${row.disease}-${row.month_start}-${idx}`} className="hover:bg-paper-50/50">
                    <td className="px-3 py-2 text-caption text-paper-500 whitespace-nowrap">
                      {formatDateTime(row.recorded_at)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-caption font-semibold text-brand-800">
                        {row.disease.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.kecamatan_nama}
                    </td>
                    <td className="px-3 py-2 text-caption text-paper-600">
                      {formatMonth(row.month_start)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular text-foreground">
                      {formatNumber(row.cases)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
