"use client";

import * as React from "react";
import { Check, Loader2, Mail, MapPin, Repeat, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DispositionEmailModal } from "@/components/disposition-email-modal";
import { forwardReport, sendReportEmail } from "@/lib/api";
import { formatDateTime } from "@/lib/period";
import { REPORT_KIND } from "@/lib/reports";
import { diseaseLabel } from "@/lib/utils";
import type { CitizenReport, ReportRiskContext } from "@/types";

/**
 * Penerusan laporan lingkungan ke instansi penerima (audit F08, F10, §7.E).
 *
 * Dinkes tidak mengelola pekerjaan instansi lain; yang dicatat hanya
 * penyampaiannya. Nilai yang ditambahkan Dinkes di sini adalah konteks risiko
 * penyakit, supaya instansi penerima tahu lokasi mana yang didahulukan.
 * Dua langkah: kirim ringkasan ke inbox pengelola, lalu catat penerusannya
 * ke instansi. Email saja tidak membuat laporan keluar dari antrean.
 */

const RISK_BADGE = {
  tinggi: "risk-high",
  sedang: "risk-medium",
  rendah: "risk-low",
} as const;

export function RiskChip({ risk }: { risk: ReportRiskContext | null | undefined }) {
  if (!risk) return null;
  return (
    <Badge variant={RISK_BADGE[risk.riskClass]}>
      Risiko {diseaseLabel(risk.disease)} {risk.riskClass}
    </Badge>
  );
}

function PatternChip({ count }: { count: number | null | undefined }) {
  if (!count) return null;
  return (
    <Badge variant="outline" className="gap-1">
      <Repeat className="h-3 w-3" aria-hidden />
      {count} laporan serupa
    </Badge>
  );
}

/** Urutan penerusan: risiko tinggi dan pola berulang didahulukan. */
function urgency(report: CitizenReport): number {
  const risk = { tinggi: 3, sedang: 2, rendah: 1 }[report.risk?.riskClass ?? "rendah"] ?? 0;
  return risk * 10 + (report.forwarding?.pattern ? 5 : 0);
}

function ForwardCard({
  report,
  onChanged,
}: {
  report: CitizenReport;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draftOpen, setDraftOpen] = React.useState(false);

  const agency = report.routing.agency;
  const target = report.forwarding?.target ?? agency?.name ?? "instansi penerima";
  const failed = report.forwarding?.state === "gagal";
  const emailed =
    report.forwarding?.state === "perlu_diteruskan" &&
    report.forwarding.channel === "Email internal";
  /* Laporan simulasi tidak pernah dikirim lewat email; langsung ke langkah kedua. */
  const readyToForward = emailed || report.simulated;
  const [channel, setChannel] = React.useState("Email");

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-teal-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-semibold text-foreground">
          {REPORT_KIND[report.kind].label}
        </span>
        <span className="flex items-center gap-1 text-body-sm text-paper-700">
          <MapPin className="h-3.5 w-3.5 text-paper-600" aria-hidden />
          {report.kecamatan}
          {report.kelurahan ? ` · ${report.kelurahan}` : ""}
        </span>
        <span className="text-caption text-paper-600">→ {agency?.short ?? target}</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <RiskChip risk={report.risk} />
          <PatternChip count={report.forwarding?.pattern} />
          {emailed && <Badge variant="secondary">Email terkirim</Badge>}
          {failed && <Badge variant="risk-high">Belum berhasil</Badge>}
        </span>
      </div>

      {failed && report.forwarding?.note && (
        <p className="mt-2 text-caption text-risk-high">{report.forwarding.note}</p>
      )}

      <DispositionEmailModal
        open={draftOpen}
        onOpenChange={setDraftOpen}
        report={report}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setDraftOpen(true)}
        >
          <Mail className="h-4 w-4" aria-hidden />
          Surat
        </Button>
        {readyToForward ? (
          <>
            <input
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              aria-label="Kanal penerusan"
              className="w-32 min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={busy || channel.trim().length === 0}
              onClick={() =>
                run(() =>
                  forwardReport(report.id, { delivered: true, channel: channel.trim() }),
                )
              }
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              Sudah diteruskan ke {agency?.short ?? "instansi"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => run(() => sendReportEmail(report.id))}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Kirim email
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-caption text-risk-high">
          {error}
        </p>
      )}
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

  const pending = (reports ?? [])
    .filter(
      (r) =>
        r.forwarding &&
        (r.forwarding.state === "perlu_diteruskan" || r.forwarding.state === "gagal"),
    )
    .sort((a, b) => urgency(b) - urgency(a));
  const forwarded = (reports ?? []).filter(
    (r) => r.forwarding?.state === "diteruskan",
  );

  return (
    <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">Penerusan ke instansi</h2>
        <span className="text-caption text-paper-700">
          {pending.length} perlu diteruskan · {forwarded.length} sudah
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-teal-200 bg-white/60 px-3.5 py-3 text-body-sm text-paper-700">
          Tidak ada yang menunggu diteruskan.
        </p>
      ) : (
        <div className="space-y-2">
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
            {showArchive ? "Sembunyikan" : "Lihat"} arsip ({forwarded.length})
          </Button>
          {showArchive && (
            <ul className="space-y-1.5">
              {forwarded.map((report) => (
                <ArchiveRow key={report.id} report={report} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** Satu baris arsip; suratnya tetap bisa dibuka kembali setelah disampaikan. */
function ArchiveRow({ report }: { report: CitizenReport }) {
  const [open, setOpen] = React.useState(false);

  return (
    <li className="flex flex-wrap items-center gap-x-2 rounded-xl border border-border bg-white px-3 py-2 text-caption text-paper-700">
      <span className="font-mono uppercase">{report.id}</span>
      <span>
        {report.kecamatan} → {report.routing.agency?.short ?? report.forwarding?.target}
        {report.forwarding?.channel ? ` · ${report.forwarding.channel}` : ""}
        {report.forwarding?.forwardedAt
          ? ` · ${formatDateTime(report.forwarding.forwardedAt)}`
          : ""}
        {report.forwarding?.reference ? ` · ${report.forwarding.reference}` : ""}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto font-medium text-brand-700 hover:underline"
      >
        Ringkasan
      </button>
      <DispositionEmailModal open={open} onOpenChange={setOpen} report={report} />
    </li>
  );
}
