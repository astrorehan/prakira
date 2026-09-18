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
  fetchRecentManualCases,
  submitManualCase,
  type KecamatanRef,
} from "@/lib/api";
import type { DiseaseSummary, ManualCaseRecord } from "@/types";
import { useApi } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";

export type ManualCaseEntryCardProps = {
  diseases?: DiseaseSummary[];
  onSaved?: () => void;
  className?: string;
};

const DEFAULT_DISEASES = [
  { disease: "DBD", label: "DBD (Demam Berdarah)" },
  { disease: "ISPA", label: "ISPA (Pernapasan)" },
  { disease: "LEPTOSPIROSIS", label: "Leptospirosis" },
  { disease: "DIARE", label: "Diare" },
];

export function ManualCaseEntryCard({
  diseases: propDiseases,
  onSaved,
  className,
}: ManualCaseEntryCardProps) {
  const fetchedDiseases = useApi(() => fetchDiseases(), []);
  const kecamatanApi = useApi(() => fetchKecamatanList(), []);
  const recentCasesApi = useApi(() => fetchRecentManualCases(), []);

  const diseasesList =
    propDiseases && propDiseases.length > 0
      ? propDiseases
      : fetchedDiseases.data && fetchedDiseases.data.length > 0
        ? fetchedDiseases.data
        : DEFAULT_DISEASES;

  const kecamatanList = kecamatanApi.data ?? [];

  // Form states
  const [disease, setDisease] = React.useState<string>("DBD");
  const [kecamatanId, setKecamatanId] = React.useState<string>("");
  const [periodDate, setPeriodDate] = React.useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [casesCount, setCasesCount] = React.useState<string>("");

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
      });

      const kecNama =
        kecamatanList.find((k) => k.id === kecamatanId)?.nama ?? kecamatanId;

      setFeedback({
        type: "success",
        message: `Berhasil mencatat ${parsedCases} kasus ${disease.toUpperCase()} di ${kecNama}.`,
        details: `Tersimpan di tabel observasi resmi untuk periode ${response.data.month_start}. Data ini akan langsung mempengaruhi model saat retraining berikutnya.`,
      });

      // Reset cases count for fast next entry
      setCasesCount("");
      invalidatePeriod();
      recentCasesApi.reload();
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
              Entri Kasus Manual (Nakes)
            </h3>
            <Badge variant="risk-low" className="text-overline uppercase">
              Resmi Faskes
            </Badge>
          </div>
          <p className="text-body-sm text-paper-600">
            Input data kasus konfirmasi resmi dari fasilitas kesehatan langsung ke sistem observasi.
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
              Jumlah Kasus (Positif)
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
            <span>Parameter Cuaca Pendukung (Opsional / BMKG)</span>
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
        <div className="flex items-center justify-between pt-1">
          <span className="text-caption text-paper-500">
            * Data akan disimpan langsung ke tabel observasi resmi
          </span>

          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[140px] bg-brand-700 hover:bg-brand-800 text-white font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan…
              </>
            ) : (
              <>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Simpan Kasus
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
