"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, ClipboardList, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataState } from "@/components/data-state";
import {
  fetchEnvironmentTickets,
  updateEnvironmentTicket,
  type EnvironmentTicketMeta,
} from "@/lib/api";
import { formatDateTime } from "@/lib/period";
import { REPORT_KIND } from "@/lib/reports";
import { useApi } from "@/lib/use-api";
import type {
  EnvironmentTicket,
  EnvironmentTicketStatus,
} from "@/types";

const STATUS_LABEL: Record<EnvironmentTicketStatus, string> = {
  baru: "Baru",
  diterima: "Diterima",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  ditutup: "Ditutup",
};

const STATUS_BADGE: Record<EnvironmentTicketStatus, "risk-medium" | "risk-low" | "risk-none"> = {
  baru: "risk-medium",
  diterima: "risk-medium",
  dikerjakan: "risk-medium",
  selesai: "risk-low",
  ditutup: "risk-none",
};

const NEXT_STATUS: Partial<Record<EnvironmentTicketStatus, EnvironmentTicketStatus>> = {
  baru: "diterima",
  diterima: "dikerjakan",
  dikerjakan: "selesai",
  selesai: "ditutup",
};

const EMPTY_META: EnvironmentTicketMeta = {
  total: 0,
  baru: 0,
  diterima: 0,
  dikerjakan: 0,
  selesai: 0,
  ditutup: 0,
};

function nextAction(status: EnvironmentTicketStatus): string {
  if (status === "baru") return "Terima tiket";
  if (status === "diterima") return "Mulai tangani";
  if (status === "dikerjakan") return "Tandai selesai";
  return "Tutup tiket";
}

export function EnvironmentTicketQueue({ refreshToken = 0 }: { refreshToken?: number }) {
  const queue = useApi(() => fetchEnvironmentTickets(), [refreshToken]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [assigned, setAssigned] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const tickets = queue.data?.data ?? [];
  const meta = queue.data?.meta ?? EMPTY_META;

  const save = async (
    ticket: EnvironmentTicket,
    patch: { status?: EnvironmentTicketStatus; assignedTo?: string; resolutionNote?: string },
  ) => {
    setBusy(ticket.id);
    setError(null);
    try {
      await updateEnvironmentTicket(ticket.id, patch);
      queue.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tiket tidak dapat diperbarui.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-700" aria-hidden />
            <h2 className="text-h3 text-foreground">Tindak lanjut lingkungan</h2>
          </div>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-paper-700">
            Hanya laporan genangan, sampah, dan saluran yang dipilih petugas untuk diteruskan
            ke Dinas Lingkungan Hidup yang masuk ke antrean ini. Setiap perubahan status terlihat
            warga lewat kode lacak.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-caption">
          <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1">{meta.baru} baru</span>
          <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1">{meta.diterima} diterima</span>
          <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1">{meta.dikerjakan} dikerjakan</span>
        </div>
      </div>

      {error && <p className="rounded-xl border border-risk-high-br bg-risk-high-bg px-3 py-2 text-body-sm text-risk-high">{error}</p>}

      <DataState
        loading={queue.loading}
        error={queue.error}
        empty={!queue.loading && tickets.length === 0}
        emptyMessage="Belum ada laporan lingkungan yang dipilih untuk diteruskan ke DLH."
        loadingMessage="Memuat tiket lingkungan…"
        onRetry={queue.reload}
      >
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const next = NEXT_STATUS[ticket.status];
            const isBusy = busy === ticket.id;
            const needsNote = ticket.status === "dikerjakan";
            return (
              <Card key={ticket.id} className="border-teal-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-overline uppercase text-paper-600">{ticket.id}</span>
                      <Badge variant={STATUS_BADGE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
                      {ticket.priority === "tinggi" && <Badge variant="risk-high">Prioritas tinggi</Badge>}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-paper-600" aria-hidden />
                      {ticket.kecamatan}{ticket.kelurahan ? ` · ${ticket.kelurahan}` : ""}
                    </p>
                    <p className="mt-1 text-caption text-paper-600">
                      {REPORT_KIND[ticket.kind].label} · dibuat {formatDateTime(ticket.created_at)} · tujuan {ticket.destination_unit}
                    </p>
                  </div>
                  <p className="text-caption text-paper-600">Diperbarui {formatDateTime(ticket.updated_at)}</p>
                </div>

                <p className="mt-3 border-t border-border pt-3 text-body-sm leading-relaxed text-paper-700">
                  {ticket.summary}
                </p>

                {ticket.status !== "ditutup" && (
                  <div className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="block text-caption font-medium text-paper-700" htmlFor={`pic-${ticket.id}`}>
                        Penanggung jawab / unit pelaksana
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`pic-${ticket.id}`}
                          value={assigned[ticket.id] ?? ticket.assigned_to ?? ""}
                          onChange={(event) => setAssigned((current) => ({ ...current, [ticket.id]: event.target.value }))}
                          placeholder="Mis. UPT Kebersihan Semarang Selatan"
                          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => save(ticket, { assignedTo: assigned[ticket.id] ?? "" })}
                        >
                          Simpan PIC
                        </Button>
                      </div>
                      {needsNote && (
                        <textarea
                          value={notes[ticket.id] ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [ticket.id]: event.target.value }))}
                          placeholder="Catatan hasil penanganan wajib saat tiket diselesaikan."
                          rows={2}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      )}
                    </div>
                    {next && (
                      <Button
                        size="sm"
                        className="self-end gap-1.5"
                        disabled={isBusy || (needsNote && !(notes[ticket.id] ?? "").trim())}
                        onClick={() => save(ticket, {
                          status: next,
                          assignedTo: assigned[ticket.id] ?? ticket.assigned_to ?? "",
                          resolutionNote: needsNote ? notes[ticket.id] : undefined,
                        })}
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : next === "selesai" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                        {nextAction(ticket.status)}
                      </Button>
                    )}
                  </div>
                )}

                {ticket.resolution_note && (
                  <p className="mt-3 border-t border-border pt-3 text-caption leading-relaxed text-paper-600">
                    Catatan penyelesaian: {ticket.resolution_note}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </DataState>
    </section>
  );
}
