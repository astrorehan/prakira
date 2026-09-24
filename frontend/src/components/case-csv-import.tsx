"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { diseaseLabel } from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import type { DiseaseSummary } from "@/types";
import {
  commitImport,
  fetchDiseases,
  fetchKecamatanList,
  previewImport,
  type ImportPreview,
  type ImportResult,
} from "@/lib/api";
import { downloadCsv, toCsv } from "@/lib/export";
import { useApi } from "@/lib/use-api";
import { invalidatePeriod } from "@/lib/use-period";
import { useSessionContext } from "./session-provider";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export type ImportState =
  | { kind: "idle" }
  | { kind: "reading"; fileName: string }
  | { kind: "preview"; fileName: string; csv: string; preview: ImportPreview }
  | { kind: "committing"; fileName: string }
  | {
      kind: "done";
      fileName: string;
      imported: number;
      rejected: number;
      /* F13: jumlah angka lama yang diganti disebut terpisah dari jumlah baris
         baru, karena penggantian punya akibat yang berbeda bagi pembaca rekap. */
      replaced: number;
      /* F18: jawaban "lalu apa" setelah berkas masuk. */
      readiness: ImportResult["readiness"];
    }
  | { kind: "error"; fileName: string; reason: string };

export type CaseCsvImportCardProps = {
  diseases?: DiseaseSummary[];
  onImported?: () => void;
  className?: string;
};

export function CaseCsvImportCard({
  diseases: propDiseases,
  onImported,
  className,
}: CaseCsvImportCardProps) {
  const fetchedDiseases = useApi(() => fetchDiseases(), []);
  const diseases = React.useMemo(
    () => propDiseases ?? fetchedDiseases.data ?? [],
    [propDiseases, fetchedDiseases.data],
  );

  const [disease, setDisease] = React.useState<string>("");
  const [state, setState] = React.useState<ImportState>({ kind: "idle" });
  const inputRef = React.useRef<HTMLInputElement>(null);

  const kecamatan = useApi(() => fetchKecamatanList(), []);
  const { session } = useSessionContext();

  React.useEffect(() => {
    if (!disease && diseases.length > 0) setDisease(diseases[0].disease);
  }, [diseases, disease]);

  const downloadTemplate = () => {
    /* Akun puskesmas hanya boleh mengimpor wilayahnya; template berisi 16
       kecamatan akan ditolak 15 barisnya. */
    const rows = (kecamatan.data ?? []).filter(
      (row) => !session?.kecamatanId || row.id === session.kecamatanId,
    );
    if (rows.length === 0) return;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const csv = toCsv(rows, [
      { header: "kecamatan_nama", value: (row) => row.nama },
      { header: "month_start", value: () => month },
      { header: "cases", value: () => "" },
      { header: "rainfall_mm", value: () => "" },
      { header: "temp_mean_c", value: () => "" },
      { header: "humidity_pct", value: () => "" },
    ]);

    downloadCsv(`template-rekapitulasi-kasus-${disease.toLowerCase() || "penyakit"}`, csv);
  };

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
        replaced: result.replaced,
        readiness: result.readiness,
      });
      invalidatePeriod();
      onImported?.();
    } catch (caught) {
      setState({
        kind: "error",
        fileName,
        reason: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };

  return (
    <Card className={className ?? "flex flex-col justify-between p-6"}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <span className="overline">Impor Rekapitulasi Berkas</span>
          </span>
          <Badge variant="outline">Format CSV</Badge>
        </div>

        <h3 className="mt-2 text-h3 text-foreground">Unggah Berkas Rekapitulasi Kasus</h3>
        <p className="mt-1 text-body-sm leading-relaxed text-paper-600">
          Gunakan opsi ini bila Anda memiliki dokumen rekapitulasi seluruh 16 kecamatan Kota Semarang
          dalam format CSV. Data yang diunggah akan divalidasi dan disimpan langsung ke basis data
          observasi untuk selanjutnya dilatih ulang (*retraining*) oleh Administrator sistem.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label htmlFor="import-disease" className="text-caption font-medium text-paper-600">
            Penyakit Sasaran:
          </label>
          <select
            id="import-disease"
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            className="h-9.5 rounded-lg border border-border bg-surface px-3 text-body-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-700"
          >
            {diseases.map((d) => (
              <option key={d.disease} value={d.disease}>
                {diseaseLabel(d.disease)}
              </option>
            ))}
          </select>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadTemplate}
            disabled={(kecamatan.data ?? []).length === 0}
            className="ml-auto gap-1.5 text-caption font-medium"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Unduh Template CSV</span>
          </Button>
        </div>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="sr-only"
            id="csv-file-input"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!disease || state.kind === "reading" || state.kind === "committing"}
            className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-paper-50/70 p-7 text-center transition hover:border-brand-700 hover:bg-paper-100/60 focus:outline-none focus:ring-2 focus:ring-brand-700"
          >
            <UploadCloud className="h-9 w-9 text-paper-400 transition group-hover:text-brand-700" aria-hidden="true" />
            <p className="mt-2 text-body-sm font-semibold text-foreground">
              Klik untuk memilih berkas CSV
            </p>
            <p className="mt-1 text-caption text-paper-600">
              Kolom wajib: <code className="rounded bg-paper-100 px-1 py-0.5 font-mono text-[11px]">kecamatan_nama</code>,{" "}
              <code className="rounded bg-paper-100 px-1 py-0.5 font-mono text-[11px]">month_start</code>,{" "}
              <code className="rounded bg-paper-100 px-1 py-0.5 font-mono text-[11px]">cases</code>. Kolom opsional: iklim.
            </p>
          </button>
        </div>

        {state.kind === "reading" && (
          <p className="mt-3 text-caption text-paper-600">Membaca dan memvalidasi {state.fileName}…</p>
        )}

        {state.kind === "preview" && (
          <div className="mt-4 rounded-xl border border-border bg-paper-50 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
              <div>
                <p className="text-body-sm font-semibold text-foreground">{state.fileName}</p>
                <p className="text-caption text-paper-600">
                  {state.preview.newRows} periode baru
                  {state.preview.replacedRows > 0
                    ? `, ${state.preview.replacedRows} angka lama akan diganti`
                    : ", tidak ada angka lama yang diganti"}
                  {state.preview.problems.length > 0
                    ? `, ${state.preview.problems.length} baris ditolak`
                    : ""}
                </p>
              </div>
              <Badge variant={state.preview.validRows > 0 ? "risk-low" : "risk-high"}>
                {state.preview.validRows > 0 ? "Valid" : "Format Salah"}
              </Badge>
            </div>

            {state.preview.preview.length > 0 && (
              <div className="mt-2.5 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-caption">
                  <thead>
                    <tr className="border-b border-border text-paper-600">
                      <th className="py-1 pr-3 font-medium">Kecamatan</th>
                      <th className="py-1 pr-3 font-medium">Bulan</th>
                      <th className="py-1 pr-3 text-right font-medium">Kasus</th>
                      <th className="py-1 pr-3 text-right font-medium">Hujan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.preview.preview.map((row) => (
                      <tr key={`${row.nama}-${row.month}`} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 pr-3 text-foreground">{row.nama}</td>
                        <td className="py-1.5 pr-3 text-paper-700">{formatMonth(row.month)}</td>
                        <td className="tabular py-1.5 pr-3 text-right font-medium text-foreground">
                          {row.cases}
                        </td>
                        <td className="tabular py-1.5 pr-3 text-right text-paper-700">
                          {row.rainfall === null ? "—" : `${row.rainfall} mm`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {state.preview.replacements.length > 0 && (
              <div className="mt-3 rounded-lg border border-risk-medium-br bg-risk-medium-bg/50 p-2.5">
                <p className="text-caption font-semibold text-risk-medium">
                  Angka yang akan diganti
                </p>
                <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-caption text-paper-700">
                  {state.preview.replacements.slice(0, 8).map((row) => (
                    <li key={`${row.nama}-${row.month}`}>
                      • {row.nama} · {formatMonth(row.month)}:{" "}
                      {row.previousCases ?? "—"} → {row.cases}
                    </li>
                  ))}
                  {state.preview.replacements.length > 8 && (
                    <li>…dan {state.preview.replacements.length - 8} periode lainnya.</li>
                  )}
                </ul>
              </div>
            )}

            {state.preview.problems.length > 0 && (
              <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto rounded-lg bg-risk-medium-bg/60 p-2 text-caption text-risk-medium">
                {state.preview.problems.slice(0, 8).map((p) => (
                  <li key={`${p.line}-${p.message}`}>• Baris {p.line}: {p.message}</li>
                ))}
                {state.preview.problems.length > 8 && (
                  <li>…dan {state.preview.problems.length - 8} baris lainnya.</li>
                )}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                onClick={commit}
                disabled={state.preview.validRows === 0}
                className="gap-1.5"
              >
                {state.preview.replacedRows > 0
                  ? `Simpan ${state.preview.validRows} baris & ganti ${state.preview.replacedRows} angka`
                  : `Konfirmasi & Simpan ${state.preview.validRows} Baris`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setState({ kind: "idle" })}>
                Batalkan
              </Button>
            </div>
          </div>
        )}

        {state.kind === "committing" && (
          <p className="mt-3 text-caption text-paper-600">Menyimpan {state.fileName} ke basis data…</p>
        )}

        {state.kind === "done" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-risk-low-br bg-risk-low-bg p-3.5 text-body-sm font-medium text-risk-low">
            <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Rekap tersimpan</p>
              <p className="text-caption text-risk-low/90">
                {state.imported} baris dari {state.fileName} tersimpan
                {state.replaced > 0
                  ? `, ${state.replaced} di antaranya mengganti angka sebelumnya`
                  : ""}
                {state.rejected > 0 ? `, ${state.rejected} baris ditolak` : ""}.
              </p>
            </div>
          </div>
        )}

        {/* F18: perjalanan sampai prakiraan benar-benar bisa dipakai. */}
        {state.kind === "done" && (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3.5">
            <p className="text-caption font-semibold text-foreground">
              Kesiapan periode {formatMonth(state.readiness.month)} ·{" "}
              {state.readiness.disease}
            </p>
            <p className="mt-0.5 text-caption text-paper-600">
              {state.readiness.saved} dari {state.readiness.totalDistricts} kecamatan
              tersimpan, {state.readiness.checked} diperiksa.
            </p>
            <ol className="mt-2.5 space-y-1.5">
              {state.readiness.stages.map((stage) => (
                <li key={stage.id} className="text-caption leading-relaxed">
                  <span
                    className={
                      stage.state === "selesai"
                        ? "font-medium text-risk-low"
                        : stage.state === "berjalan"
                          ? "font-medium text-risk-medium"
                          : "font-medium text-paper-600"
                    }
                  >
                    {stage.label}
                  </span>
                  <span className="text-paper-600"> — {stage.detail}</span>
                  {stage.state !== "selesai" && (
                    <span className="text-paper-600">
                      {" "}
                      Penanggung jawab: {stage.owner}.
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {state.kind === "error" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg p-3.5 text-body-sm font-medium text-risk-medium">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Gagal Mengimpor Berkas</p>
              <p className="text-caption">{state.reason}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
