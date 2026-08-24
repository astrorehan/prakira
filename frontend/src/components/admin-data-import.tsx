"use client";

import * as React from "react";
import { useState } from "react";
import { UploadCloud, RefreshCw, CheckCircle2, Shield, FileSpreadsheet, Server, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditLog, BmkgSyncStatus } from "@/types";
import { BMKG_SYNC_STATUS, AUDIT_LOGS } from "@/lib/mock-data";
import { LiquidGlassCard } from "./ui/liquid-glass-card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function AdminDataImport({ className }: { className?: string }) {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>(AUDIT_LOGS);

  const handleTriggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(true);
      const newLog: AuditLog = {
        id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleString("id-ID"),
        user: "Admin (Manual Trigger)",
        role: "Admin Dinkes",
        action: "BMKG API Sync Manual",
        details: "Berhasil menarik data iklim 4 stasiun cuaca Kota Semarang (RR, T, RH).",
        status: "success",
      };
      setLogs((prev) => [newLog, ...prev]);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1800);
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const fileName = e.target.files[0].name;
      setTimeout(() => {
        setUploading(false);
        setUploadSuccess(true);
        const newLog: AuditLog = {
          id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp: new Date().toLocaleString("id-ID"),
          user: "Admin Dinkes",
          role: "Data Manager",
          action: "Upload Dataset CSV",
          details: `Validasi skema berhasil untuk file '${fileName}' (16 record kecamatan terverifikasi).`,
          status: "success",
        };
        setLogs((prev) => [newLog, ...prev]);
        setTimeout(() => setUploadSuccess(false), 4000);
      }, 1500);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Top Grid: CSV Dropzone + BMKG Sync Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CSV Dropzone */}
        <LiquidGlassCard variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import Dataset Kasus Penyakit</span>
              </span>
              <Badge variant="secondary">Format CSV / Excel</Badge>
            </div>

            <h4 className="font-display text-lg font-semibold text-foreground mt-2">
              Upload Laporan Epidemiologi Periodik
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Data kasus mingguan per kecamatan akan otomatis diproses oleh ETL pipeline dan memicu inferensi ulang model ML.
            </p>

            <label className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-50 transition-colors p-6 cursor-pointer text-center">
              <UploadCloud className="h-9 w-9 text-primary mb-2" />
              <span className="text-xs font-medium text-foreground">
                Klik untuk memilih file atau seret file CSV ke sini
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">
                Template standar: kode_bps, kecamatan, periode_minggu, jumlah_dbd, jumlah_ispa, jumlah_diare
              </span>
              <input
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={handleSimulateUpload}
              />
            </label>
          </div>

          {uploadSuccess && (
            <div className="mt-3 rounded-xl bg-risk-low-bg border border-risk-low-br p-2.5 text-xs text-risk-low font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
              <span>Dataset berhasil diunggah & diverifikasi oleh sistem!</span>
            </div>
          )}
        </LiquidGlassCard>

        {/* BMKG Connector Live Monitor */}
        <LiquidGlassCard variant="blue" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-primary-deep flex items-center gap-1.5">
                <Server className="h-4 w-4" />
                <span>BMKG Open Data API Connector</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-low-bg px-2.5 py-0.5 text-[10px] font-semibold text-risk-low">
                <span className="h-2 w-2 rounded-full bg-risk-low animate-pulse" />
                API Connected
              </span>
            </div>

            <h4 className="font-display text-lg font-semibold text-foreground mt-2">
              Status Sinkronisasi Iklim Otomatis
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Cron job terjadwal menarik observasi cuaca tiap jam dari 4 Automatic Weather Stations (AWS) BMKG.
            </p>

            <div className="mt-4 space-y-2 rounded-xl bg-white/80 p-3.5 border border-white text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sinkronisasi Terakhir:</span>
                <span className="font-semibold text-foreground">{BMKG_SYNC_STATUS.last_sync}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stasiun Pengamatan Aktif:</span>
                <span className="font-semibold text-foreground">{BMKG_SYNC_STATUS.stations_active} Stasiun (Semarang)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Latency:</span>
                <span className="font-semibold text-risk-low">{BMKG_SYNC_STATUS.latency_ms} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fitur Iklim Tersinkron:</span>
                <span className="font-semibold text-brand-700">RR, T_mean, RH, ff, SS</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-paper-200/60">
            <span className="text-[11px] text-muted-foreground">
              Sync berkala otomatis tiap 60 menit.
            </span>

            <Button
              size="sm"
              variant="default"
              loading={syncing}
              onClick={handleTriggerSync}
              className="text-xs text-white font-semibold"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-white", syncing && "animate-spin")} />
              <span className="text-white">Sinkronkan Sekarang</span>
            </Button>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Immutable Audit Trail Log */}
      <LiquidGlassCard variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Log & Audit Trail Integritas Data</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Setiap pembaruan data kasus dan eksekusi model dicatat secara kronologis untuk kepatuhan & transparansi publik.
            </p>
          </div>
          <Badge variant="outline">Audit Log Aktif</Badge>
        </div>

        <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white/90">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-50 border-b border-paper-200 text-[10px] uppercase font-medium text-muted-foreground tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Log ID & Waktu</th>
                <th className="py-2.5 px-3">Pengguna / Agen</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3.5">Rincian Perubahan</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-paper-50/70">
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-foreground">{log.id}</div>
                    <div className="text-[10px] text-muted-foreground">{log.timestamp}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-foreground">{log.user}</div>
                    <div className="text-[10px] text-muted-foreground">{log.role}</div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-primary">{log.action}</td>
                  <td className="py-2.5 px-3.5 text-muted-foreground max-w-md">{log.details}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-risk-low-bg border border-risk-low-br px-2 py-0.5 text-[10px] font-semibold text-risk-low">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
