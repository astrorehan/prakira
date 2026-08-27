"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  Shield,
  UploadCloud,
} from "lucide-react";
import { cn, diseaseLabel, formatNumber } from "@/lib/utils";
import { formatDateTime, formatMonth } from "@/lib/period";
import type { AuditLog, DiseaseSummary } from "@/types";
import {
  commitImport,
  fetchAuditLog,
  fetchDiseases,
  fetchIngestStatus,
  previewImport,
  refreshPredictions,
  type ImportPreview,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";
import { DataState } from "./data-state";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

/**
 * Tata kelola data: impor CSV, status ingest, dan jejak audit.
 *
 * Yang berubah bersamaan dengan masuknya gateway:
 *
 * 1. **Panel "Konektor BMKG Open Data" hilang.** Ia melaporkan 4 stasiun aktif,
 *    latensi 184 ms, "sinkronisasi berikutnya 15 menit lagi", dan lima variabel
 *    iklim termasuk radiasi matahari dan kecepatan angin. Tidak ada satu pun
 *    yang berasal dari pekerjaan yang benar-benar berjalan, dan dua variabel
 *    terakhir tidak punya kolom di dataset mana pun. Penggantinya melaporkan
 *    pekerjaan ingest yang sungguh tercatat: kapan, berapa lama, berapa baris.
 * 2. **Unggah CSV benar-benar mengunggah.** Sebelumnya berkasnya hanya diperiksa
 *    ekstensinya, lalu `setTimeout(1500)` menampilkan "16 record kecamatan
 *    terverifikasi" — angka yang sama untuk berkas apa pun, termasuk berkas
 *    kosong. Sekarang isinya diurai gateway, sepuluh baris pertama ditampilkan
 *    sebagai pratinjau, dan barisnya baru masuk basis data setelah dikonfirmasi.
 * 3. **Jejak audit dibaca, bukan ditulis.** `AUDIT_LOGS` berisi empat entri
 *    beserta nama petugasnya; entri baru dibuat di peramban dengan id acak dan
 *    hilang saat halaman disegarkan. Sekarang isinya peristiwa yang terjadi di
 *    server.
 */

const AUDIT_STATUS: Record<
  AuditLog["status"],
  { label: string; variant: "risk-low" | "risk-medium" | "outline"; icon: typeof CheckCircle2 }
> = {
  success: { label: "Berhasil", variant: "risk-low", icon: CheckCircle2 },
  warning: { label: "Peringatan", variant: "risk-medium", icon: AlertTriangle },
  info: { label: "Informasi", variant: "outline", icon: Info },
};

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-paper-600">{label}</dt>
      <dd className="text-caption font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/* ── Impor CSV ──────────────────────────────────────────────────────────── */

type ImportState =
  | { kind: "idle" }
  | { kind: "reading"; fileName: string }
  | { kind: "preview"; fileName: string; csv: string; preview: ImportPreview }
  | { kind: "committing"; fileName: string }
  | { kind: "done"; fileName: string; imported: number; rejected: number }
  | { kind: "error"; fileName: string; reason: string };

function CsvImportCard({
  diseases,
  onImported,
}: {
  diseases: DiseaseSummary[];
  onImported: () => void;
}) {
  const [disease, setDisease] = React.useState<string>("");
  const [state, setState] = React.useState<ImportState>({ kind: "idle" });
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!disease && diseases.length > 0) setDisease(diseases[0].disease);
  }, [diseases, disease]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !disease) return;

    setState({ kind: "reading", fileName: file.name });

    try {
      const csv = await file.text();
      const preview = await previewImport(disease, csv);
      setState({ kind: "preview", fileName: file.name, csv, preview });
    } catch (caught) {
      setState({
        kind: "error",
        fileName: file.name,
        reason: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  const commit = async () => {
    if (state.kind !== "preview") return;
    const { fileName, csv, preview } = state;
    setState({ kind: "committing", fileName });

    try {
      const result = await commitImport(preview.disease, csv);
      setState({
        kind: "done",
        fileName,
        imported: result.imported,
        rejected: result.problems.length,
      });
      /* Bulan terakhir bisa berubah setelah impor; chip periode di seluruh
         konsol membaca nilai yang di-memo, jadi memonya harus dibuang. */
      invalidatePeriod();
      onImported();
    } catch (caught) {
      setState({
        kind: "error",
        fileName,
        reason: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span className="overline">Impor dataset kasus</span>
          </span>
          <Badge variant="outline">CSV</Badge>
        </div>

        <h3 className="mt-2 text-h3 text-foreground">Unggah rekapitulasi kasus</h3>
        <p className="mt-1 text-caption leading-relaxed text-paper-600">
          Satu baris per kecamatan per bulan. Berkas diurai dan divalidasi lebih
          dulu; tidak ada baris yang masuk sebelum Anda mengonfirmasi pratinjaunya.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="import-disease" className="text-caption text-paper-600">
            Penyakit
          </label>
          <select
            id="import-disease"
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-body-sm text-foreground"
          >
            {diseases.map((d) => (
              <option key={d.disease} value={d.disease}>
                {diseaseLabel(d.disease)}
              </option>
            ))}
          </select>
        </div>

        <label
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            state.kind === "error"
              ? "border-risk-medium-br bg-risk-medium-bg"
              : "border-brand-300 bg-brand-50/50 hover:bg-brand-50",
          )}
        >
          <UploadCloud className="mb-2 h-8 w-8 text-brand-700" aria-hidden="true" />
          <span className="text-body-sm font-medium text-foreground">
            {state.kind === "reading"
              ? `Memvalidasi ${state.fileName}…`
              : "Klik untuk memilih berkas CSV"}
          </span>
          {/* Kolom yang benar-benar dibaca gateway, bukan daftar karangan.
              Versi sebelumnya menyebut `periode_minggu` dan `jumlah_diare`,
              dua kolom yang tidak pernah ada di pengurai mana pun. */}
          <span className="mt-1 text-caption text-paper-600">
            Kolom wajib: kecamatan_nama, month_start, cases. Opsional:
            rainfall_mm, temp_mean_c, humidity_pct.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
            disabled={state.kind === "reading" || state.kind === "committing" || !disease}
          />
        </label>
      </div>

      <div aria-live="polite" className="mt-3 space-y-3 empty:mt-0">
        {state.kind === "preview" && (
          <div className="rounded-xl border border-border bg-paper-50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body-sm font-semibold text-foreground">
                {state.preview.validRows} dari {state.preview.totalRows} baris lolos
                validasi
              </span>
              <Badge variant={state.preview.problems.length > 0 ? "risk-medium" : "risk-low"}>
                {state.preview.problems.length} baris ditolak
              </Badge>
            </div>

            {state.preview.preview.length > 0 && (
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-left text-caption">
                  <thead className="text-overline uppercase text-paper-600">
                    <tr>
                      <th className="py-1 pr-3">Kecamatan</th>
                      <th className="py-1 pr-3">Bulan</th>
                      <th className="py-1 pr-3 text-right">Kasus</th>
                      <th className="py-1 pr-3 text-right">Hujan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.preview.preview.map((row) => (
                      <tr key={`${row.nama}-${row.month}`}>
                        <td className="py-1 pr-3 text-foreground">{row.nama}</td>
                        <td className="py-1 pr-3 text-paper-700">{formatMonth(row.month)}</td>
                        <td className="tabular py-1 pr-3 text-right text-foreground">
                          {row.cases}
                        </td>
                        <td className="tabular py-1 pr-3 text-right text-paper-700">
                          {row.rainfall === null ? "—" : `${row.rainfall} mm`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {state.preview.problems.length > 0 && (
              <ul className="mt-2.5 max-h-28 space-y-0.5 overflow-y-auto text-caption text-risk-medium">
                {state.preview.problems.slice(0, 8).map((p) => (
                  <li key={`${p.line}-${p.message}`}>Baris {p.line}: {p.message}</li>
                ))}
                {state.preview.problems.length > 8 && (
                  <li>…dan {state.preview.problems.length - 8} baris lain.</li>
                )}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              <Button
                size="sm"
                onClick={commit}
                disabled={state.preview.validRows === 0}
                className="gap-1.5"
              >
                Impor {state.preview.validRows} baris
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setState({ kind: "idle" })}>
                Batal
              </Button>
            </div>
          </div>
        )}

        {state.kind === "committing" && (
          <p className="text-caption text-paper-600">Menyimpan {state.fileName}…</p>
        )}

        {state.kind === "done" && (
          <p className="flex items-start gap-2 rounded-xl border border-risk-low-br bg-risk-low-bg p-2.5 text-caption font-medium text-risk-low">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {state.imported} baris dari {state.fileName} masuk basis data
              {state.rejected > 0 ? `, ${state.rejected} baris ditolak` : ""}.
            </span>
          </p>
        )}

        {state.kind === "error" && (
          <p className="flex items-start gap-2 rounded-xl border border-risk-medium-br bg-risk-medium-bg p-2.5 text-caption font-medium text-risk-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{state.reason}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

/* ── Status ingest ──────────────────────────────────────────────────────── */

function IngestStatusCard({ onRefreshed }: { onRefreshed: () => void }) {
  const status = useApi(() => fetchIngestStatus(), []);
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
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <Database className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span className="overline">Status data & model</span>
          </span>
          {job && (
            <Badge variant={job.status === "success" ? "risk-low" : "risk-medium"}>
              {job.status === "success" ? "Berhasil" : "Gagal"}
            </Badge>
          )}
        </div>

        <h3 className="mt-2 text-h3 text-foreground">Ingest terakhir</h3>
        <p className="mt-1 text-caption leading-relaxed text-paper-600">
          Sumber data iklim saat ini adalah berkas dataset di repositori, bukan
          tarikan langsung dari layanan BMKG. Yang dilaporkan di bawah adalah
          pekerjaan ingest yang benar-benar dijalankan.
        </p>

        <DataState
          loading={status.loading}
          error={status.error}
          onRetry={status.reload}
          className="mt-4 min-h-[120px]"
        >
          <dl className="mt-4 space-y-2 rounded-xl border border-border bg-paper-50 p-3.5">
            <DataRow label="Sumber">{job?.source ?? "—"}</DataRow>
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
            <p className="mt-2 text-caption leading-relaxed text-paper-600">{job.detail}</p>
          )}

          <div className="mt-3">
            <span className="overline">Cakupan dataset</span>
            <ul className="mt-1.5 space-y-1">
              {(status.data?.coverage ?? []).map((c) => (
                <li key={c.disease} className="flex justify-between gap-3 text-caption">
                  <span className="font-medium text-foreground">{c.disease}</span>
                  <span className="text-paper-600">
                    {c.months} bulan · {formatNumber(c.rows)} baris · s.d. {c.latestLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3">
            <span className="overline">Variabel iklim tersimpan</span>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {(status.data?.climateVariables ?? []).map((feature) => (
                <li key={feature}>
                  <Badge variant="muted">{feature}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </DataState>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        {error && (
          <p role="alert" className="text-caption font-medium text-risk-high">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end">
          <Button size="sm" loading={refreshing} onClick={handleRefresh} className="gap-1.5">
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              aria-hidden="true"
            />
            <span>{refreshing ? "Menghitung ulang…" : "Hitung ulang prediksi"}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Jejak audit ────────────────────────────────────────────────────────── */

type AuditFilter = "all" | AuditLog["status"];

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

  const filters: { id: AuditFilter; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "success", label: "Berhasil" },
    { id: "warning", label: "Peringatan" },
    { id: "info", label: "Informasi" },
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-h3 text-foreground">
            <Shield className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span>Jejak audit integritas data</span>
          </h3>
          <p className="mt-0.5 text-caption text-paper-600">
            Setiap masuk-keluar sesi, impor data, keputusan verifikasi, dan eksekusi
            model tercatat kronologis di server.
          </p>
        </div>
        <Badge variant="outline">{formatNumber(logs.length)} entri</Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Saring status audit" className="flex flex-wrap gap-1">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-body-sm font-medium transition-colors duration-fast ease-out",
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

        <label className="relative flex items-center sm:w-64">
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
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-body-sm text-foreground placeholder:text-paper-600 focus-visible:outline-none"
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
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <caption className="sr-only">Jejak audit pembaruan data dan eksekusi model</caption>
            <thead className="sticky top-0 z-10 bg-paper-100">
              <tr>
                <th scope="col" className="border-b border-border px-3.5 py-2 text-overline uppercase text-paper-600">
                  Log &amp; waktu
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                  Pengguna / agen
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                  Aksi
                </th>
                <th scope="col" className="border-b border-border px-3.5 py-2 text-overline uppercase text-paper-600">
                  Rincian
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-right text-overline uppercase text-paper-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => {
                const meta = AUDIT_STATUS[log.status];
                const StatusIcon = meta.icon;
                return (
                  <tr key={log.id} className="transition-colors hover:bg-paper-50">
                    <td className="px-3.5 py-3 align-top">
                      <div className="tabular text-body-sm font-semibold text-foreground">
                        #{log.id}
                      </div>
                      <div className="tabular text-caption text-paper-600">
                        {formatDateTime(log.ts)}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-body-sm font-medium text-foreground">{log.actor}</div>
                      <div className="text-caption text-paper-600">{log.role}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-body-sm font-medium text-brand-700">
                      {log.action}
                    </td>
                    <td className="max-w-md px-3.5 py-3 align-top text-caption text-paper-600">
                      {log.details}
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <Badge variant={meta.variant}>
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>
    </Card>
  );
}

/* ── Komposisi ──────────────────────────────────────────────────────────── */

export function AdminDataImport({ className }: { className?: string }) {
  const diseases = useApi(() => fetchDiseases(), []);
  const audit = useApi(() => fetchAuditLog(50), []);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <CsvImportCard diseases={diseases.data ?? []} onImported={audit.reload} />
        <IngestStatusCard onRefreshed={audit.reload} />
      </div>

      <AuditTrailCard
        logs={audit.data?.data ?? []}
        loading={audit.loading}
        error={audit.error}
        onRetry={audit.reload}
      />
    </div>
  );
}
