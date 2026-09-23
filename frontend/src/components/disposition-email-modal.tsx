"use client";

import * as React from "react";
import { Check, Copy, Mail, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REPORT_KIND, mapLink } from "@/lib/reports";
import { formatDateTime, formatMonth } from "@/lib/period";
import { diseaseLabel } from "@/lib/utils";
import type { CitizenReport } from "@/types";

/**
 * Draf surat rujukan lintas instansi — bahan untuk disampaikan, bukan bukti
 * penyampaian (audit F08, F10, §7.E).
 *
 * Bentuk suratnya berasal dari simulasi disposisi email resmi; yang berubah
 * adalah klaimnya. Aplikasi ini tidak punya sambungan ke kanal surat DLH, jadi
 * layar ini tidak boleh menyatakan "disposisi terkirim" atau "tersimpan di
 * jejak audit" pada saat petugas baru membuka drafnya. Yang benar terjadi pada
 * titik ini hanyalah: teks suratnya siap disalin.
 *
 * Nomor surat pun tidak dikarang. Nomor yang dibentuk sendiri di peramban
 * akan tercetak seperti nomor resmi yang tidak pernah diterbitkan siapa pun;
 * nomornya baru muncul setelah instansi penerima memberi rujukan dan petugas
 * mencatatnya lewat "Catat sudah diteruskan".
 */

export function DispositionEmailModal({
  open,
  onOpenChange,
  report,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: CitizenReport | null;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!report) return null;

  const kindLabel = REPORT_KIND[report.kind]?.label ?? report.kind;
  const target =
    report.forwarding?.target ?? report.routing.agency?.name ?? "Instansi terkait";
  const delivered = report.forwarding?.state === "diteruskan";
  /* ID pesan email internal bukan nomor rujukan instansi. */
  const reference =
    report.forwarding?.channel === "Email internal"
      ? null
      : report.forwarding?.reference ?? null;
  const pattern = report.forwarding?.pattern ?? null;

  /* Inti rujukan dari Dinkes: kenapa lokasi ini perlu didahulukan. */
  const riskLine = report.risk
    ? `Prakiraan risiko ${diseaseLabel(report.risk.disease)} di Kec. ${report.kecamatan} periode ${formatMonth(report.risk.month)}: ${report.risk.riskClass.toUpperCase()}.`
    : null;
  const patternLine = pattern
    ? `Temuan serupa dilaporkan ${pattern} kali di kecamatan ini dalam 14 hari terakhir.`
    : null;
  const contextText = [riskLine, patternLine].filter(Boolean).join(" ");

  const where = [
    `Kec. ${report.kecamatan}`,
    report.kelurahan ? `Kel. ${report.kelurahan}` : null,
    report.rtRw,
  ]
    .filter(Boolean)
    .join(", ");
  const point = report.location
    ? mapLink(report.location) +
      (report.location.accuracyM ? ` (akurasi ±${report.location.accuracyM} m)` : "")
    : null;
  /* Butir bernomor dari baris yang benar-benar ada, supaya nomor tidak loncat. */
  const details = [
    `Kode lacak warga : ${report.id}`,
    `Lokasi kejadian  : ${where}`,
    report.landmark ? `Patokan          : ${report.landmark}` : null,
    point ? `Titik peta       : ${point}` : null,
    `Kategori temuan  : ${kindLabel}`,
    `Keterangan warga : "${report.description}"`,
  ]
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  const emailText = `
SURAT RUJUKAN LINTAS INSTANSI (DRAF)
Sistem Peringatan Dini PRAKIRA Kota Semarang

${reference ? `No. Rujukan   : ${reference}` : "No. Rujukan   : (diisi sesuai penomoran kanal resmi)"}
Pengirim      : Tim Surveilans Dinas Kesehatan Kota Semarang
Kepada        : ${target}
Perihal       : [PRAKIRA] Rujukan temuan ${kindLabel} — ${where}

Yth. Pimpinan ${target},

Berdasarkan pemeriksaan petugas atas laporan masyarakat di sistem PRAKIRA, kami meneruskan temuan pemicu lingkungan berikut:

${details}

${contextText ? `Konteks kesehatan: ${contextText}\n\n` : ""}Temuan ini dapat menjadi habitat vektor atau sumber penularan penyakit berbasis lingkungan. Kami mohon bantuan penjadwalan pemeriksaan dan penanganan di lokasi tersebut.

Penanganan teknis di lapangan sepenuhnya menjadi kewenangan instansi penerima.

Dinas Kesehatan Kota Semarang
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {/* Lencana menyebut keadaan yang tercatat, bukan yang diharapkan. */}
            <Badge variant={delivered ? "risk-low" : "risk-medium"}>
              {delivered ? "Sudah disampaikan" : "Draf — belum disampaikan"}
            </Badge>
            {reference && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {reference}
              </Badge>
            )}
          </div>
          <DialogTitle className="flex items-center gap-2 text-h3 text-foreground">
            <Mail className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Draf surat rujukan ke {target}
          </DialogTitle>
          <DialogDescription className="text-body-sm text-paper-600">
            {delivered
              ? `Disampaikan${report.forwarding?.channel ? ` lewat ${report.forwarding.channel}` : ""}${
                  report.forwarding?.forwardedAt
                    ? ` pada ${formatDateTime(report.forwarding.forwardedAt)}`
                    : ""
                }.`
              : "Salin teks ini ke kanal resmi instansi penerima, lalu catat penyampaiannya di antrean penerusan. Aplikasi ini tidak mengirim surat sendiri."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 rounded-xl border border-sand-300 bg-sand-50/70 p-4 font-sans text-body-sm text-paper-800">
          <div className="grid gap-1.5 border-b border-sand-200 pb-3 text-caption">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="w-20 shrink-0 font-semibold text-paper-600">Pengirim:</span>
              <span className="text-foreground">
                Tim Surveilans Dinas Kesehatan Kota Semarang
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="w-20 shrink-0 font-semibold text-paper-600">Kepada:</span>
              <span className="font-medium text-teal-900">{target}</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="w-20 shrink-0 font-semibold text-paper-600">Perihal:</span>
              <span className="font-medium text-foreground">
                [PRAKIRA] Rujukan temuan {kindLabel} — {where}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-body-sm leading-relaxed text-paper-800">
            <p>
              Yth. Pimpinan <strong>{target}</strong>,
            </p>
            <p>
              Berdasarkan pemeriksaan petugas atas laporan masyarakat di sistem
              PRAKIRA, kami meneruskan temuan pemicu lingkungan berikut:
            </p>

            <div className="space-y-1 rounded-lg border border-sand-300/80 bg-white p-3 text-caption">
              <p>
                <strong className="text-paper-700">Kode lacak:</strong>{" "}
                <span className="font-mono">{report.id}</span>
              </p>
              <p>
                <strong className="text-paper-700">Lokasi:</strong> {where}
              </p>
              {report.landmark && (
                <p>
                  <strong className="text-paper-700">Patokan:</strong> {report.landmark}
                </p>
              )}
              {report.location && (
                <p>
                  <strong className="text-paper-700">Titik:</strong>{" "}
                  <a
                    href={mapLink(report.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    buka di peta
                  </a>
                </p>
              )}
              <p>
                <strong className="text-paper-700">Kategori:</strong> {kindLabel}
              </p>
              <p className="border-t border-sand-200 pt-1 italic text-paper-800">
                &ldquo;{report.description}&rdquo;
              </p>
            </div>

            {report.completeness.missing.length > 0 && (
              <p className="text-caption text-paper-600">
                Belum tersedia dari pelapor: {report.completeness.missing.join(", ")}.
              </p>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-teal-200/80 bg-teal-50/70 p-3 text-caption text-teal-950">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <div>
                {contextText && (
                  <p className="mb-1">
                    <strong>Konteks kesehatan:</strong> {contextText}
                  </p>
                )}
                Temuan ini dapat menjadi habitat vektor atau sumber penularan
                penyakit berbasis lingkungan. Mohon bantuan penjadwalan
                pemeriksaan dan penanganan di lokasi tersebut.
              </div>
            </div>

            <p className="pt-1 text-caption text-paper-600">
              Penanganan teknis di lapangan sepenuhnya menjadi kewenangan instansi
              penerima; sistem ini hanya mencatat penyampaiannya.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-caption text-paper-600">
            {delivered
              ? "Penyampaian surat ini sudah tercatat."
              : "Penyampaian belum tercatat."}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-risk-low" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Tersalin" : "Salin surat"}
            </Button>
            <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
