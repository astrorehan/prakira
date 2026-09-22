"use client";

import * as React from "react";
import { Loader2, MapPin, Send, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { forwardReport } from "@/lib/api";
import { formatDateTime } from "@/lib/period";
import { REPORT_KIND } from "@/lib/reports";
import type { CitizenReport } from "@/types";

/**
 * Penerusan laporan lingkungan ke instansi penerima (audit F08, F10, §7.E).
 *
 * Menggantikan antrean tiket DLH yang dulu ada di ruang kerja Dinkes. Antrean
 * itu menampilkan tombol "Terima", "Mulai tangani", dan "Tandai selesai" atas
 * nama unit lain — pekerjaan yang tidak pernah tercatat di aplikasi ini dan
 * tidak berada dalam kewenangan siapa pun yang membuka layar ini. Yang tersisa
 * adalah satu kejadian yang benar-benar dilakukan Dinkes: menyampaikan laporan
 * dan mencatat penyampaiannya.
 *
 * Karena itu tidak ada kolom progres, PIC instansi penerima, atau penyelesaian
 * di sini. Yang diminta hanyalah kanal yang dipakai — supaya catatan ini bisa
 * diperiksa kembali — dan nomor rujukan bila instansi penerima memberikannya.
 */

function summaryLine(report: CitizenReport): string {
  const kind = REPORT_KIND[report.kind].label;
  const where = report.kelurahan
    ? `${report.kecamatan} · ${report.kelurahan}`
    : report.kecamatan;
  const landmark = report.landmark ? ` (patokan: ${report.landmark})` : "";
  return `${kind} di ${where}${landmark}. ${report.description}`;
}

function ForwardCard({
  report,
  onChanged,
}: {
  report: CitizenReport;
  onChanged: () => void;
}) {
  const [channel, setChannel] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [failing, setFailing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const target = report.forwarding?.target ?? "Dinas Lingkungan Hidup";
  const summary = summaryLine(report);
  const failed = report.forwarding?.state === "gagal";

  const submit = async (delivered: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await forwardReport(report.id, {
        delivered,
        channel: channel.trim() || undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Catatan tidak tersimpan.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-teal-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-overline uppercase text-paper-600">
              {report.id}
            </span>
            <Badge variant={failed ? "risk-high" : "risk-medium"}>
              {failed ? "Penyampaian belum berhasil" : "Perlu diteruskan"}
            </Badge>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-paper-600" aria-hidden />
            {report.kecamatan}
            {report.kelurahan ? ` · ${report.kelurahan}` : ""}
          </p>
          <p className="mt-1 text-caption text-paper-600">
            {REPORT_KIND[report.kind].label} · diterima{" "}
            {report.reviewedAt ? formatDateTime(report.reviewedAt) : "—"} · tujuan{" "}
            {target}
          </p>
        </div>
      </div>

      {/* "Siapkan ringkasan" menyalin teks yang akan dikirim lewat kanal
          instansi penerima. Aplikasi ini tidak punya sambungan ke kanal itu,
          jadi ia tidak berpura-pura mengirimkannya sendiri. */}
      <div className="mt-3 rounded-xl border border-border bg-paper-50 p-3">
        <p className="text-caption font-medium text-paper-700">
          Ringkasan untuk disampaikan
        </p>
        <p className="mt-1.5 text-body-sm leading-relaxed text-paper-700">
          {summary}
        </p>
        {report.completeness.missing.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-caption leading-relaxed text-paper-600">
            <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Belum ada: {report.completeness.missing.join(", ")}.
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${report.id} — ${summary}`);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Ringkasan tersalin" : "Siapkan ringkasan"}
        </Button>
      </div>

      {failed && report.forwarding?.note && (
        <p className="mt-3 text-caption leading-relaxed text-risk-high">
          Percobaan sebelumnya: {report.forwarding.note}
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <Label htmlFor={`kanal-${report.id}`} className="text-caption">
          Kanal penyampaian
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            id={`kanal-${report.id}`}
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            placeholder="Mis. surat dinas, WhatsApp piket DLH, rapat koordinasi"
            className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Nomor rujukan dari instansi (bila ada)"
            className="min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {failing && (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Alasan penyampaian belum berhasil — mis. kanal tidak menjawab, berkas kurang."
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}

        {error && (
          <p role="alert" className="text-caption text-risk-high">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {failing ? (
            <>
              <Button
                size="sm"
                variant="danger"
                disabled={busy || note.trim().length < 8}
                onClick={() => submit(false)}
              >
                Simpan catatan kegagalan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFailing(false)}>
                Batal
              </Button>
              <span className="text-caption text-paper-600">
                Laporan tetap berada di daftar ini sampai penyampaiannya tercatat.
              </span>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={busy || channel.trim().length === 0}
                onClick={() => submit(true)}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Catat sudah diteruskan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFailing(true)}>
                Belum berhasil disampaikan
              </Button>
              {channel.trim().length === 0 && (
                <span className="text-caption text-paper-600">
                  Sebutkan kanalnya supaya catatan ini dapat diperiksa kembali.
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ForwardingQueue({
  reports,
  onChanged,
}: {
  reports: CitizenReport[] | null;
  onChanged: () => void;
}) {
  const [showArchive, setShowArchive] = React.useState(false);

  const pending = (reports ?? []).filter(
    (r) =>
      r.forwarding &&
      (r.forwarding.state === "perlu_diteruskan" || r.forwarding.state === "gagal"),
  );
  const forwarded = (reports ?? []).filter(
    (r) => r.forwarding?.state === "diteruskan",
  );

  return (
    <section className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-foreground">Penerusan ke instansi</h2>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-paper-700">
            Laporan yang sudah diperiksa dan diputuskan perlu diteruskan. Yang
            dicatat di sini adalah penyampaiannya; penanganan di lapangan menjadi
            kewenangan instansi penerima dan tidak dilacak dari layar ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-caption">
          <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1">
            {pending.length} perlu diteruskan
          </span>
          <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1">
            {forwarded.length} sudah diteruskan
          </span>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-teal-200 bg-white/60 px-3.5 py-3 text-body-sm text-paper-700">
          Tidak ada laporan yang menunggu diteruskan.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((report) => (
            <ForwardCard key={report.id} report={report} onChanged={onChanged} />
          ))}
        </div>
      )}

      {forwarded.length > 0 && (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowArchive((value) => !value)}
          >
            {showArchive ? "Sembunyikan" : "Lihat"} arsip penerusan (
            {forwarded.length})
          </Button>
          {showArchive && (
            <ul className="space-y-1.5">
              {forwarded.map((report) => (
                <li
                  key={report.id}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-caption leading-relaxed text-paper-700"
                >
                  <span className="font-mono uppercase">{report.id}</span> ·{" "}
                  {report.kecamatan} · diteruskan ke{" "}
                  {report.forwarding?.target ?? "instansi penerima"}
                  {report.forwarding?.channel
                    ? ` lewat ${report.forwarding.channel}`
                    : ""}
                  {report.forwarding?.forwardedAt
                    ? ` · ${formatDateTime(report.forwarding.forwardedAt)}`
                    : ""}
                  {report.forwarding?.reference
                    ? ` · rujukan ${report.forwarding.reference}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
