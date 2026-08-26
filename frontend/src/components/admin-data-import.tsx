"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  Server,
  Shield,
  UploadCloud,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { AuditLog } from "@/types";
import { BMKG_SYNC_STATUS, AUDIT_LOGS } from "@/lib/mock-data";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

/**
 * Tata kelola data: impor CSV, konektor BMKG, dan jejak audit.
 *
 * Tiga hal yang diperbaiki:
 *
 * 1. Lencana status di tabel audit selalu hijau dan mencetak kata Inggris
 *    mentah dari datanya (`success`). Entri berstatus `info` dan `warning`
 *    karena itu tampil sebagai keberhasilan — jejak audit yang salah warna
 *    lebih buruk daripada tidak ada jejak audit.
 * 2. Panel BMKG mencetak "API Connected" sebagai teks tetap, dan menuliskan
 *    ulang "tiap 60 menit" serta daftar fitur iklim sebagai konstanta di
 *    markup, padahal `BMKG_SYNC_STATUS` sudah memuat `status`, `next_sync_in`,
 *    dan `synced_features`. Layar dan data harus membaca sumber yang sama.
 * 3. Unggah CSV hanya punya jalur berhasil. Sekarang berkas yang formatnya
 *    tidak dikenali ditolak dan ikut tercatat di audit sebagai peringatan
 *    (§7.10: empat keadaan, bukan satu).
 */

/* ── Kamus status ───────────────────────────────────────────────────────── */

const AUDIT_STATUS: Record<
  AuditLog["status"],
  { label: string; variant: "risk-low" | "risk-medium" | "outline"; icon: typeof CheckCircle2 }
> = {
  success: { label: "Berhasil", variant: "risk-low", icon: CheckCircle2 },
  warning: { label: "Peringatan", variant: "risk-medium", icon: AlertTriangle },
  info: { label: "Informasi", variant: "outline", icon: Info },
};

const CONNECTOR_STATUS: Record<
  (typeof BMKG_SYNC_STATUS)["status"],
  { label: string; variant: "risk-low" | "secondary" | "risk-none"; live: boolean }
> = {
  online: { label: "Terhubung", variant: "risk-low", live: true },
  syncing: { label: "Menyinkronkan", variant: "secondary", live: true },
  idle: { label: "Tidak aktif", variant: "risk-none", live: false },
};

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"];

function nowStamp(): string {
  return new Date().toLocaleString("id-ID");
}

function makeLogId(): string {
  return `LOG_${Math.floor(1000 + Math.random() * 9000)}`;
}

/* ── Baris fakta ────────────────────────────────────────────────────────── */

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-paper-600">{label}</dt>
      <dd className="text-caption font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/* ── Impor CSV ──────────────────────────────────────────────────────────── */

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "success"; fileName: string }
  | { kind: "error"; fileName: string; reason: string };

function CsvImportCard({ onLog }: { onLog: (log: AuditLog) => void }) {
  const [state, setState] = React.useState<UploadState>({ kind: "idle" });

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const extension = name.slice(name.lastIndexOf(".")).toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      const reason = `Format ${extension || "tanpa ekstensi"} tidak didukung. Gunakan .csv atau .xlsx.`;
      setState({ kind: "error", fileName: name, reason });
      onLog({
        id: makeLogId(),
        timestamp: nowStamp(),
        user: "Admin Dinkes",
        role: "Data Manager",
        action: "Upload Dataset Ditolak",
        details: `Berkas '${name}' ditolak validasi skema. ${reason}`,
        status: "warning",
      });
      event.target.value = "";
      return;
    }

    setState({ kind: "uploading", fileName: name });
    setTimeout(() => {
      setState({ kind: "success", fileName: name });
      onLog({
        id: makeLogId(),
        timestamp: nowStamp(),
        user: "Admin Dinkes",
        role: "Data Manager",
        action: "Upload Dataset CSV",
        details: `Validasi skema berhasil untuk '${name}' (16 record kecamatan terverifikasi).`,
        status: "success",
      });
    }, 1500);

    event.target.value = "";
  };

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span className="overline">Impor dataset kasus</span>
          </span>
          <Badge variant="outline">CSV / XLSX</Badge>
        </div>

        <h3 className="mt-2 text-h3 text-foreground">Unggah laporan epidemiologi</h3>
        <p className="mt-1 text-caption leading-relaxed text-paper-600">
          Data kasus mingguan per kecamatan diproses pipeline ETL dan memicu inferensi ulang
          model.
        </p>

        <label
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            state.kind === "error"
              ? "border-risk-medium-br bg-risk-medium-bg"
              : "border-brand-300 bg-brand-50/50 hover:bg-brand-50",
          )}
        >
          <UploadCloud className="mb-2 h-8 w-8 text-brand-700" aria-hidden="true" />
          <span className="text-body-sm font-medium text-foreground">
            {state.kind === "uploading"
              ? `Memvalidasi ${state.fileName}…`
              : "Klik untuk memilih berkas atau seret ke sini"}
          </span>
          <span className="mt-1 text-caption text-paper-600">
            Kolom wajib: kode_bps, kecamatan, periode_minggu, jumlah_dbd, jumlah_ispa,
            jumlah_diare
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={handleFile}
            disabled={state.kind === "uploading"}
          />
        </label>
      </div>

      {/* Keadaan hasil — berhasil dan gagal punya tampilan berbeda. */}
      <div aria-live="polite" className="mt-3 empty:mt-0">
        {state.kind === "success" && (
          <p className="flex items-center gap-2 rounded-xl border border-risk-low-br bg-risk-low-bg p-2.5 text-caption font-medium text-risk-low">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Dataset {state.fileName} terverifikasi dan masuk antrean inferensi.</span>
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

/* ── Konektor BMKG ──────────────────────────────────────────────────────── */

function BmkgConnectorCard({ onLog }: { onLog: (log: AuditLog) => void }) {
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(BMKG_SYNC_STATUS.last_sync);

  const connector = CONNECTOR_STATUS[BMKG_SYNC_STATUS.status];

  const handleTriggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(nowStamp() + " WIB");
      onLog({
        id: makeLogId(),
        timestamp: nowStamp(),
        user: "Admin (Manual Trigger)",
        role: "Admin Dinkes",
        action: "BMKG API Sync Manual",
        details: `Berhasil menarik data iklim ${BMKG_SYNC_STATUS.stations_active} stasiun cuaca Kota Semarang.`,
        status: "success",
      });
    }, 1800);
  };

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <Server className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span className="overline">Konektor BMKG Open Data</span>
          </span>
          {/* Status dibaca dari data, bukan ditulis di markup. `pulse` pada
              Badge memakai animate-pulse-dot — animate-pulse disediakan untuk
              skeleton (§6.3). */}
          <Badge variant={connector.variant} pulse={connector.live}>
            {connector.label}
          </Badge>
        </div>

        <h3 className="mt-2 text-h3 text-foreground">Sinkronisasi iklim otomatis</h3>
        <p className="mt-1 text-caption leading-relaxed text-paper-600">
          Cron menarik observasi cuaca dari {BMKG_SYNC_STATUS.stations_active} Automatic Weather
          Station BMKG di wilayah Semarang.
        </p>

        <dl className="mt-4 space-y-2 rounded-xl border border-border bg-paper-50 p-3.5">
          <DataRow label="Sinkronisasi terakhir">
            <span className="tabular">{lastSync}</span>
          </DataRow>
          <DataRow label="Sinkronisasi berikutnya">{BMKG_SYNC_STATUS.next_sync_in}</DataRow>
          <DataRow label="Stasiun aktif">
            <span className="tabular">{BMKG_SYNC_STATUS.stations_active} stasiun</span>
          </DataRow>
          <DataRow label="Latensi API">
            <span
              className={cn(
                "tabular",
                BMKG_SYNC_STATUS.latency_ms > 1000 ? "text-risk-medium" : "text-risk-low",
              )}
            >
              {formatNumber(BMKG_SYNC_STATUS.latency_ms)} ms
            </span>
          </DataRow>
        </dl>

        <div className="mt-3">
          <span className="overline">Fitur iklim tersinkron</span>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {BMKG_SYNC_STATUS.synced_features.map((feature) => (
              <li key={feature}>
                <Badge variant="muted">{feature}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
        <Button size="sm" loading={syncing} onClick={handleTriggerSync} className="gap-1.5">
          <RefreshCw
            className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
            aria-hidden="true"
          />
          <span>{syncing ? "Menyinkronkan…" : "Sinkronkan sekarang"}</span>
        </Button>
      </div>
    </Card>
  );
}

/* ── Jejak audit ────────────────────────────────────────────────────────── */

type AuditFilter = "all" | AuditLog["status"];

function AuditTrailCard({ logs }: { logs: AuditLog[] }) {
  const [filter, setFilter] = React.useState<AuditFilter>("all");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filter !== "all" && log.status !== filter) return false;
      if (!needle) return true;
      return [log.id, log.user, log.role, log.action, log.details]
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
            Setiap pembaruan data kasus dan eksekusi model tercatat kronologis untuk kepatuhan
            dan transparansi publik.
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
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-paper-400"
            aria-hidden="true"
          />
          <span className="sr-only">Cari entri audit</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pengguna, aksi, rincian…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-body-sm text-foreground placeholder:text-paper-400 focus-visible:outline-none"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-paper-50 p-8 text-center">
          <Info className="mx-auto h-5 w-5 text-paper-400" aria-hidden="true" />
          <p className="mt-2 text-body-sm font-medium text-foreground">
            Tidak ada entri yang cocok
          </p>
          <p className="text-caption text-paper-600">
            Ubah kata kunci atau pilih status lain.
          </p>
        </div>
      ) : (
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
                        {log.id}
                      </div>
                      <div className="tabular text-caption text-paper-600">{log.timestamp}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-body-sm font-medium text-foreground">{log.user}</div>
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
      )}
    </Card>
  );
}

/* ── Komposisi ──────────────────────────────────────────────────────────── */

export function AdminDataImport({ className }: { className?: string }) {
  const [logs, setLogs] = React.useState<AuditLog[]>(AUDIT_LOGS);

  const prependLog = React.useCallback((log: AuditLog) => {
    setLogs((prev) => [log, ...prev]);
  }, []);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <CsvImportCard onLog={prependLog} />
        <BmkgConnectorCard onLog={prependLog} />
      </div>

      <AuditTrailCard logs={logs} />
    </div>
  );
}
