"use client";

import * as React from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  Info,
  Layers,
  RefreshCw,
  Search,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import type { AuditLog, IngestStatus } from "@/types";
import {
  fetchAuditLog,
  fetchBacktests,
  fetchDiseases,
  fetchIngestStatus,
  refreshPredictions,
} from "@/lib/api";
import { useApi, type AsyncState } from "@/lib/use-api";
import { DataState } from "./data-state";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { AdminModelRetrainCard } from "./admin-model-retrain";

/**
 * Tata kelola sistem: retraining model AI, status ingest, dan jejak audit.
 *
 * Fitur impor CSV sudah dipindahkan ke ruang kerja Tenaga Kesehatan
 * di halaman /kasus (komponen CaseCsvImportCard). Admin cukup memantau
 * integritas data yang masuk dan menjalankan retraining model.
 *
 * Susunannya dari yang paling sering dibaca ke yang paling jarang: ringkasan
 * empat angka di atas supaya kesehatan sistem terbaca sekilas, lalu kendali
 * model dan data, lalu jejak audit lengkap.
 */

const AUDIT_STATUS: Record<
  AuditLog["status"],
  { label: string; variant: "risk-low" | "risk-medium" | "outline"; icon: typeof CheckCircle2 }
> = {
  success: { label: "Berhasil", variant: "risk-low", icon: CheckCircle2 },
  warning: { label: "Peringatan", variant: "risk-medium", icon: AlertTriangle },
  info: { label: "Informasi", variant: "outline", icon: Info },
};

/* ── Ringkasan ──────────────────────────────────────────────────────────── */

type Tone = "ok" | "warn" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-risk-low-bg text-risk-low",
  warn: "bg-risk-medium-bg text-risk-medium",
  neutral: "bg-brand-50 text-brand-700",
};

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  loading,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  loading?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASS[tone],
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="overline truncate">{label}</span>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-20" />
        ) : (
          <span className="truncate text-h3 tabular text-foreground">{value}</span>
        )}
        {hint && !loading && (
          <span className="truncate text-caption text-paper-600">{hint}</span>
        )}
      </span>
    </>
  );

  const className =
    "flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-card sm:p-4";

  return href ? (
    <a
      href={href}
      className={cn(
        className,
        "transition-colors duration-fast ease-out hover:border-border-strong hover:bg-paper-50",
      )}
    >
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

function SystemSummary({
  ingest,
  backtestCount,
  backtestsLoading,
  latestTrainedAt,
  logs,
  auditLoading,
}: {
  ingest: AsyncState<IngestStatus>;
  backtestCount: number;
  backtestsLoading: boolean;
  latestTrainedAt: string | null;
  logs: AuditLog[];
  auditLoading: boolean;
}) {
  const job = ingest.data?.lastJob ?? null;
  const ingestOk = job?.status === "success";
  const warnings = logs.filter((l) => l.status === "warning").length;
  const coverage = ingest.data?.coverage ?? [];
  const totalRows = coverage.reduce((sum, c) => sum + c.rows, 0);

  return (
    <section
      aria-label="Ringkasan kesehatan sistem"
      className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4"
    >
      <SummaryTile
        icon={Database}
        label="Ingest terakhir"
        loading={ingest.loading}
        tone={!job ? "neutral" : ingestOk ? "ok" : "warn"}
        value={!job ? "Belum ada" : ingestOk ? "Berhasil" : "Gagal"}
        hint={job ? formatDateTime(job.finishedAt) : "Belum ada pekerjaan tercatat"}
        href="#data"
      />
      <SummaryTile
        icon={BrainCircuit}
        label="Model terlatih"
        loading={backtestsLoading}
        tone={backtestCount > 0 ? "ok" : "warn"}
        value={`${backtestCount} model`}
        hint={latestTrainedAt ? `Terbaru ${formatDateTime(latestTrainedAt)}` : "Belum ada histori latih"}
        href="#model"
      />
      <SummaryTile
        icon={Layers}
        label="Baris dataset"
        loading={ingest.loading}
        value={formatNumber(totalRows)}
        hint={`${coverage.length} penyakit tercakup`}
        href="#data"
      />
      <SummaryTile
        icon={warnings > 0 ? AlertTriangle : Shield}
        label="Peringatan audit"
        loading={auditLoading}
        tone={warnings > 0 ? "warn" : "ok"}
        value={formatNumber(warnings)}
        hint={`dari ${formatNumber(logs.length)} entri terakhir`}
        href="#audit"
      />
    </section>
  );
}

/* ── Status ingest ──────────────────────────────────────────────────────── */

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-paper-600">{label}</dt>
      <dd className="min-w-0 truncate text-right text-caption font-semibold text-foreground">
        {children}
      </dd>
    </div>
  );
}

function IngestStatusCard({
  status,
  onRefreshed,
  className,
}: {
  status: AsyncState<IngestStatus>;
  onRefreshed: () => void;
  className?: string;
}) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const job = status.data?.lastJob ?? null;

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshPredictions();
      status.reload();
      onRefreshed();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className={cn("flex flex-col p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-h3 text-foreground">
            <Database className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span>Status data</span>
          </h3>
          <p className="text-caption leading-relaxed text-paper-600">
            Sumber iklim saat ini berkas dataset di repositori, bukan tarikan langsung BMKG.
          </p>
        </div>
        {job && (
          <Badge variant={job.status === "success" ? "risk-low" : "risk-medium"} className="shrink-0">
            {job.status === "success" ? "Berhasil" : "Gagal"}
          </Badge>
        )}
      </div>

      <DataState
        loading={status.loading}
        error={status.error}
        onRetry={status.reload}
        className="mb-4 mt-4 min-h-[120px]"
      >
        <div className="mb-4 mt-4 space-y-4">
          <div>
            <span className="overline">Ingest terakhir</span>
            <dl className="mt-1.5 space-y-2 rounded-xl border border-border bg-paper-50 p-3.5">
              <DataRow label="Sumber">
                <span title={job?.source}>{job?.source ?? "—"}</span>
              </DataRow>
              <DataRow label="Selesai">
                <span className="tabular">{formatDateTime(job?.finishedAt)}</span>
              </DataRow>
              <DataRow label="Baris diproses">
                <span className="tabular">{formatNumber(job?.rows ?? 0)}</span>
              </DataRow>
              <DataRow label="Durasi">
                <span className="tabular">
                  {job?.latencyMs === null || job?.latencyMs === undefined
                    ? "—"
                    : `${formatNumber(job.latencyMs)} ms`}
                </span>
              </DataRow>
            </dl>
            {job?.detail && (
              <p className="mt-2 break-words text-caption leading-relaxed text-paper-600">
                {job.detail}
              </p>
            )}
          </div>

          <div>
            <span className="overline">Cakupan dataset</span>
            <ul className="mt-1.5 divide-y divide-border rounded-xl border border-border">
              {(status.data?.coverage ?? []).map((c) => (
                <li
                  key={c.disease}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 py-2 text-caption"
                >
                  <span className="font-semibold text-foreground">{c.disease}</span>
                  <span className="tabular text-paper-600">
                    {c.months} bln · {formatNumber(c.rows)} baris · s.d. {c.latestLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="overline">Variabel iklim tersimpan</span>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {(status.data?.climateVariables ?? []).map((feature) => (
                <li key={feature}>
                  <Badge variant="muted">{feature}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DataState>

      <div className="mt-auto space-y-2 border-t border-border pt-3">
        {error && (
          <p role="alert" className="text-caption font-medium text-risk-high">
            {error}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          loading={refreshing}
          onClick={handleRefresh}
          className="w-full gap-1.5 sm:w-auto"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            aria-hidden="true"
          />
          <span>{refreshing ? "Menghitung ulang…" : "Hitung ulang prediksi"}</span>
        </Button>
      </div>
    </Card>
  );
}

/* ── Jejak audit ────────────────────────────────────────────────────────── */

type AuditFilter = "all" | AuditLog["status"];

const FILTERS: { id: AuditFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "success", label: "Berhasil" },
  { id: "warning", label: "Peringatan" },
  { id: "info", label: "Informasi" },
];

function StatusBadge({ status }: { status: AuditLog["status"] }) {
  const meta = AUDIT_STATUS[status];
  const StatusIcon = meta.icon;
  return (
    <Badge variant={meta.variant} className="shrink-0">
      <StatusIcon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

function AuditTrailCard({
  logs,
  loading,
  error,
  onRetry,
}: {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [filter, setFilter] = React.useState<AuditFilter>("all");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filter !== "all" && log.status !== filter) return false;
      if (!needle) return true;
      return [log.id, log.actor, log.role, log.action, log.details]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [logs, filter, query]);

  const counts = React.useMemo(
    () => ({
      all: logs.length,
      success: logs.filter((l) => l.status === "success").length,
      warning: logs.filter((l) => l.status === "warning").length,
      info: logs.filter((l) => l.status === "info").length,
    }),
    [logs],
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-h3 text-foreground">
            <Shield className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span>Jejak audit</span>
          </h3>
          <p className="text-caption leading-relaxed text-paper-600">
            Sesi masuk-keluar, impor data, keputusan verifikasi, dan eksekusi model, tercatat
            kronologis di server.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {formatNumber(logs.length)} entri
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Saring status audit"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-body-sm font-medium transition-colors duration-fast ease-out",
                  active
                    ? "border-paper-300 bg-surface text-foreground shadow-xs"
                    : "border-transparent text-paper-600 hover:bg-paper-100 hover:text-foreground",
                )}
              >
                <span>{f.label}</span>
                <span className="tabular rounded-full bg-paper-200 px-1.5 text-overline font-semibold text-paper-600">
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative flex items-center lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-600"
            aria-hidden="true"
          />
          <span className="sr-only">Cari entri audit</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pengguna, aksi, rincian…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-body-sm text-foreground placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          />
        </label>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!loading && filtered.length === 0}
        emptyMessage={
          logs.length === 0
            ? "Belum ada peristiwa tercatat. Jejak audit terisi saat seseorang masuk, mengimpor data, atau memutuskan laporan."
            : "Tidak ada entri yang cocok. Ubah kata kunci atau pilih status lain."
        }
        onRetry={onRetry}
        className="mt-4"
      >
        {/* Layar sempit: kartu bertumpuk, tidak ada tabel yang harus digeser. */}
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border md:hidden">
          {filtered.map((log) => (
            <li key={log.id} className="space-y-1.5 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-body-sm font-semibold text-brand-700">
                  {log.action}
                </span>
                <StatusBadge status={log.status} />
              </div>
              <p className="break-words text-caption leading-relaxed text-paper-700">
                {log.details}
              </p>
              <p className="flex flex-wrap gap-x-1.5 text-caption text-paper-500">
                <span className="font-medium text-foreground">{log.actor}</span>
                <span aria-hidden="true">·</span>
                <span>{log.role}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular">{formatDateTime(log.ts)}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 hidden max-h-[560px] overflow-auto rounded-xl border border-border md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Jejak audit pembaruan data dan eksekusi model</caption>
            <thead className="sticky top-0 z-10 bg-paper-100">
              <tr>
                {[
                  ["Waktu", "w-40"],
                  ["Pengguna", "w-44"],
                  ["Aksi", "w-48"],
                  ["Rincian", ""],
                  ["Status", "w-32 text-right"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      "border-b border-border px-3.5 py-2 text-overline uppercase text-paper-600",
                      cls,
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-paper-50">
                  <td className="px-3.5 py-3 align-top">
                    <div className="tabular text-caption font-medium text-foreground">
                      {formatDateTime(log.ts)}
                    </div>
                    <div className="tabular text-caption text-paper-500">#{log.id}</div>
                  </td>
                  <td className="px-3.5 py-3 align-top">
                    <div className="text-body-sm font-medium text-foreground">{log.actor}</div>
                    <div className="text-caption text-paper-600">{log.role}</div>
                  </td>
                  <td className="px-3.5 py-3 align-top text-body-sm font-medium text-brand-700">
                    {log.action}
                  </td>
                  <td className="px-3.5 py-3 align-top text-caption leading-relaxed text-paper-600">
                    {log.details}
                  </td>
                  <td className="px-3.5 py-3 text-right align-top">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </Card>
  );
}

/* ── Komposisi ──────────────────────────────────────────────────────────── */

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-overline font-semibold uppercase tracking-[0.1em] text-paper-600">
      {title}
    </h2>
  );
}

export function AdminDataImport({ className }: { className?: string }) {
  const diseases = useApi(() => fetchDiseases(), []);
  const audit = useApi(() => fetchAuditLog(50), []);
  const ingest = useApi(() => fetchIngestStatus(), []);
  const backtests = useApi(() => fetchBacktests(), []);

  const backtestRows = backtests.data?.data ?? [];
  const latestTrainedAt =
    backtestRows
      .map((r) => r.trained_at)
      .filter((t): t is string => Boolean(t))
      .sort()
      .pop() ?? null;

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <SystemSummary
        ingest={ingest}
        backtestCount={backtestRows.length}
        backtestsLoading={backtests.loading}
        latestTrainedAt={latestTrainedAt}
        logs={audit.data?.data ?? []}
        auditLoading={audit.loading}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <section aria-labelledby="model" className="flex flex-col gap-3 xl:col-span-3">
          <SectionHeading id="model" title="Model prediksi" />
          <AdminModelRetrainCard
            diseases={diseases.data ?? []}
            backtests={backtests}
            onRetrained={audit.reload}
            className="flex-1"
          />
        </section>
        <section aria-labelledby="data" className="flex flex-col gap-3 xl:col-span-2">
          <SectionHeading id="data" title="Data masuk" />
          <IngestStatusCard
            status={ingest}
            onRefreshed={() => {
              audit.reload();
              backtests.reload();
            }}
            className="flex-1"
          />
        </section>
      </div>

      <section aria-labelledby="audit" className="flex flex-col gap-3">
        <SectionHeading id="audit" title="Akuntabilitas" />
        <AuditTrailCard
          logs={audit.data?.data ?? []}
          loading={audit.loading}
          error={audit.error}
          onRetry={audit.reload}
        />
      </section>
    </div>
  );
}
