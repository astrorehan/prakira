"use client";

import * as React from "react";
import { Check, Copy, Paperclip, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportPhoto } from "@/components/report-photo";
import { REPORT_KIND, mapLink } from "@/lib/reports";
import { formatDateTime, formatMonth } from "@/lib/period";
import { diseaseLabel } from "@/lib/utils";
import type { CitizenReport } from "@/types";

/** Surat ini bahan penerusan. Penyampaian tetap dicatat dari antrean. */
function LetterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-body-sm leading-relaxed sm:grid-cols-[7rem_minmax(0,1fr)]">
      <span className="text-paper-700">{label}</span>
      <span className="min-w-0 break-words text-foreground">: {children}</span>
    </div>
  );
}

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
  const [copyError, setCopyError] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyError(false);
    }
  }, [open]);

  if (!report) return null;

  const kindLabel = REPORT_KIND[report.kind]?.label ?? report.kind;
  const target = report.forwarding?.target ?? report.routing.agency?.name ?? "Instansi terkait";
  const shortTarget = report.routing.agency?.short ?? target;
  const delivered = report.forwarding?.state === "diteruskan";
  const where = [
    `Kec. ${report.kecamatan}`,
    report.kelurahan ? `Kel. ${report.kelurahan}` : null,
    report.rtRw,
  ].filter(Boolean).join(", ");
  const mapUrl = report.location ? mapLink(report.location) : null;
  const point = mapUrl
    ? mapUrl + (report.location?.accuracyM ? ` (akurasi ±${report.location.accuracyM} m)` : "")
    : null;
  const riskLine = report.risk
    ? `Prakiraan risiko ${diseaseLabel(report.risk.disease)} di Kec. ${report.kecamatan} untuk ${formatMonth(report.risk.month)} berada pada kelas ${report.risk.riskClass}.`
    : null;
  const patternLine = report.forwarding?.pattern
    ? `Terdapat ${report.forwarding.pattern} laporan serupa di kecamatan ini dalam 14 hari terakhir.`
    : null;
  const contextLines = [riskLine, patternLine].filter((line): line is string => Boolean(line));
  const subject = `Penerusan laporan ${kindLabel} di ${where}`;
  const missing = report.completeness.missing.length
    ? `Informasi yang belum tersedia dari pelapor: ${report.completeness.missing.join(", ")}.`
    : null;

  const letterText = [
    "DRAF SURAT PENGANTAR LAPORAN LINGKUNGAN",
    "DINAS KESEHATAN KOTA SEMARANG",
    "",
    "Nomor    : [diisi unit tata usaha]",
    "Tanggal  : [diisi unit tata usaha]",
    `Kepada   : Yth. Pimpinan ${target}`,
    `Hal      : ${subject}`,
    `Lampiran : ${report.hasPhoto ? "Foto bukti laporan (dilampirkan terpisah)" : "—"}`,
    "",
    `Yth. Pimpinan ${target},`,
    "",
    "Berdasarkan laporan masyarakat yang telah diperiksa petugas melalui PRAKIRA, kami menyampaikan temuan berikut untuk ditelaah sesuai kewenangan instansi Bapak/Ibu.",
    "",
    `Kode laporan   : ${report.id}`,
    `Jenis temuan   : ${kindLabel}`,
    `Lokasi         : ${where}`,
    `Waktu kejadian : ${formatDateTime(report.occurredAt)}`,
    report.landmark ? `Patokan lokasi : ${report.landmark}` : null,
    point ? `Titik peta     : ${point}` : null,
    `Uraian warga   : ${report.description}`,
    missing,
    "",
    ...(contextLines.length ? ["Konteks kesehatan:", ...contextLines, ""] : []),
    "Mohon pemeriksaan dan tindak lanjut sesuai kewenangan instansi penerima. Penanganan teknis di lapangan menjadi kewenangan instansi penerima.",
    "",
    "Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami mengucapkan terima kasih.",
    "",
    "Dinas Kesehatan Kota Semarang",
    "[nama, jabatan, dan tanda tangan pejabat berwenang]",
  ].filter((line): line is string => line !== null).join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="forward-letter-print flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[92dvh]">
        <div className="forward-letter-controls shrink-0 border-b border-border bg-surface px-5 py-4 pr-12 sm:px-7 sm:py-5 sm:pr-12">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={delivered ? "risk-low" : "risk-medium"}>
              {delivered ? "Penyampaian tercatat" : "Draf · belum disampaikan"}
            </Badge>
            <span className="font-mono text-caption text-paper-600">{report.id}</span>
          </div>
          <DialogTitle className="text-h3 text-foreground sm:text-h2">
            Surat pengantar untuk {shortTarget}
          </DialogTitle>
          <DialogDescription className="mt-1.5 max-w-2xl text-body-sm leading-relaxed text-paper-700">
            {delivered
              ? `Penyampaian dicatat${report.forwarding?.channel ? ` melalui ${report.forwarding.channel}` : ""}${report.forwarding?.forwardedAt ? ` pada ${formatDateTime(report.forwarding.forwardedAt)}` : ""}. Pratinjau ini tetap dapat disalin atau dicetak.`
              : "Periksa isi, lengkapi nomor, tanggal, dan penanda tangan melalui tata usaha, lalu sampaikan lewat kanal resmi. Setelah itu, catat penyampaiannya di antrean."}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-paper-100 px-3 py-4 sm:px-7 sm:py-6">
          <article className="forward-letter-sheet mx-auto max-w-[210mm] rounded-lg border border-paper-200 bg-white px-5 py-7 text-paper-800 shadow-card sm:px-12 sm:py-11">
            <header className="border-b-2 border-paper-900 pb-4 text-center">
              <p className="text-caption uppercase tracking-[0.12em] text-paper-700">Pemerintah Kota Semarang</p>
              <p className="mt-1 text-h3 font-semibold uppercase tracking-[0.06em] text-foreground">Dinas Kesehatan</p>
              <p className="mt-1 text-caption text-paper-600">Draf pengantar laporan masyarakat dari PRAKIRA</p>
            </header>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-body-sm font-semibold uppercase tracking-[0.08em] text-foreground">
                Surat pengantar laporan lingkungan
              </h2>
              <span className="rounded border border-risk-medium-br bg-risk-medium-bg px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.08em] text-risk-medium">
                Draf
              </span>
            </div>

            <div className="mt-5 space-y-1.5 border-b border-paper-200 pb-5">
              <LetterField label="Nomor"><span className="italic text-paper-600">Diisi unit tata usaha</span></LetterField>
              <LetterField label="Tanggal"><span className="italic text-paper-600">Diisi unit tata usaha</span></LetterField>
              <LetterField label="Kepada">Yth. Pimpinan {target}</LetterField>
              <LetterField label="Hal">{subject}</LetterField>
              <LetterField label="Lampiran">{report.hasPhoto ? "1 foto bukti · dilampirkan terpisah" : "—"}</LetterField>
            </div>

            <div className="mt-6 space-y-4 text-body-sm leading-[1.75]">
              <p>Yth. Pimpinan {target},</p>
              <p>
                Berdasarkan laporan masyarakat yang telah diperiksa petugas melalui
                PRAKIRA, kami menyampaikan temuan berikut untuk ditelaah sesuai
                kewenangan instansi Bapak/Ibu.
              </p>

              <section aria-label="Rincian laporan" className="rounded-md border border-paper-200 bg-paper-50 px-4 py-4 sm:px-5">
                <h3 className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-paper-700">Rincian temuan</h3>
                <div className="space-y-1.5">
                  <LetterField label="Kode laporan"><span className="font-mono">{report.id}</span></LetterField>
                  <LetterField label="Jenis temuan">{kindLabel}</LetterField>
                  <LetterField label="Lokasi">{where}</LetterField>
                  <LetterField label="Waktu kejadian">{formatDateTime(report.occurredAt)}</LetterField>
                  {report.landmark && <LetterField label="Patokan">{report.landmark}</LetterField>}
                  {point && mapUrl && (
                    <LetterField label="Titik peta">
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-700 underline underline-offset-2">{point}</a>
                    </LetterField>
                  )}
                </div>
                <div className="mt-3 border-t border-paper-200 pt-3">
                  <p className="text-caption font-semibold text-paper-700">Uraian warga</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{report.description}</p>
                </div>
                {missing && <p className="mt-3 text-caption text-paper-700">{missing}</p>}
              </section>

              {contextLines.length > 0 && (
                <section aria-label="Konteks kesehatan" className="border-l-[3px] border-brand-700 pl-4">
                  <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-paper-700">Konteks kesehatan</h3>
                  {contextLines.map((line) => <p key={line} className="mt-1">{line}</p>)}
                </section>
              )}

              <p>
                Mohon pemeriksaan dan tindak lanjut sesuai kewenangan instansi
                penerima. Penanganan teknis di lapangan menjadi kewenangan
                instansi penerima.
              </p>
              <p>
                Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu,
                kami mengucapkan terima kasih.
              </p>

              <div className="forward-letter-signature ml-auto w-full max-w-[16rem] pt-4 text-center">
                <p>Dinas Kesehatan Kota Semarang</p>
                <div className="h-16" aria-hidden="true" />
                <p className="border-b border-paper-700 pb-1 text-caption italic text-paper-600">Nama dan tanda tangan pejabat</p>
                <p className="mt-1 text-caption text-paper-600">Jabatan diisi unit tata usaha</p>
              </div>
            </div>

            {report.hasPhoto && (
              <section className="forward-letter-attachment mt-9 border-t border-paper-200 pt-5" aria-label="Lampiran foto bukti">
                <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.08em] text-paper-700">
                  <Paperclip className="h-4 w-4" aria-hidden="true" /> Lampiran foto bukti
                </h3>
                <p className="print-hide mt-1 text-caption text-paper-600">Saat menyalin teks, lampirkan foto ini secara terpisah.</p>
                <ReportPhoto id={report.id} />
              </section>
            )}
          </article>
        </div>

        <div className="forward-letter-controls flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3 sm:px-7">
          <p className="max-w-md text-caption leading-relaxed text-paper-600" aria-live="polite">
            {copyError
              ? "Gagal menyalin. Coba lagi atau gunakan Cetak / simpan PDF."
              : copied
                ? report.hasPhoto
                  ? "Teks surat tersalin. Foto bukti perlu dilampirkan terpisah."
                  : "Teks surat tersalin dan siap ditempel ke kanal resmi."
                : "Menyalin atau mencetak tidak mencatat surat sebagai sudah disampaikan."}
          </p>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" aria-hidden="true" /> Cetak / simpan PDF
            </Button>
            <Button type="button" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Tersalin" : "Salin teks surat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
