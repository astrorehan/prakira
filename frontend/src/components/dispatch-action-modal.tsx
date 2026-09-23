"use client";

import * as React from "react";
import { AlertTriangle, Check, Clock, Copy, MapPin, Megaphone, Printer } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BroadcastKit } from "@/components/broadcast-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionAssignee, ActionPart, ActionRecommendation } from "@/types";
import { useSessionContext } from "@/components/session-provider";
import { cn, formatNumber } from "@/lib/utils";
import { describeDeadline, formatDateTime } from "@/lib/period";
import {
  awaitingKecamatan,
  effectiveDueDate,
  PRIORITY_LABEL,
  puskesmasLabel,
} from "@/lib/action-queue";
import {
  acknowledgeAction,
  assignAction,
  completeAction,
  recordActionBlocker,
  recordActionProgress,
  reopenAction,
  setActionPublication,
} from "@/lib/api";

/**
 * Satu tindakan, satu langkah berikutnya.
 *
 * Versi sebelumnya membagi isi ke tiga tab dan menumpuk enam formulir di tab
 * "Pelaksanaan" untuk semua peran sekaligus, sementara centang SOP di tab
 * pertama baru tersimpan saat tombol di tab lain ditekan. Sekarang modal
 * menampilkan tahapnya (ditugaskan → diterima → selesai) dan hanya formulir
 * untuk tahap itu, sesuai peran pembukanya. Bahan pendukung jadi tombol di
 * kaki modal, bukan lipatan, supaya tinggi modal tidak berubah saat dibuka.
 */

interface DispatchActionModalProps {
  recommendation: ActionRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil setelah satu kejadian tercatat, supaya antrean menarik data segar. */
  onChanged: (message: string) => void;
  /** Hari acuan konsol dari `/api/meta/period`. */
  systemToday: string | null;
  /** Nama petugas yang sedang masuk. */
  operator: string | null;
  /** Menugaskan, menerbitkan, dan membuka kembali adalah wewenang Dinkes. */
  canAssign?: boolean;
  /** Menerima, mengerjakan, dan melaporkan hasil adalah pekerjaan puskesmas. */
  canWork?: boolean;
  /** Puskesmas yang bisa ditugasi, untuk nama di daftar pilihan. */
  assignees?: ActionAssignee[];
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const PART_STATUS: Record<ActionPart["status"], string> = {
  assigned: "Belum diterima",
  in_progress: "Dikerjakan",
  completed: "Selesai",
};

/**
 * Kemajuan tiap kecamatan untuk Dinkes. Satu tindakan kota dikerjakan banyak
 * puskesmas; Dinkes perlu melihat wilayah mana yang belum bergerak, bukan satu
 * status yang menyamarkan semuanya.
 */
function PartsProgress({
  parts,
  onReopen,
}: {
  parts: ActionPart[];
  onReopen?: (kecamatan: string) => void;
}) {
  const done = parts.filter((part) => part.status === "completed").length;
  return (
    <div className="space-y-2">
      <p className="text-caption font-semibold text-foreground">
        {done} dari {parts.length} kecamatan selesai
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {parts.map((part) => (
          <li key={part.kecamatan} className="space-y-1 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body-sm font-medium text-foreground">{part.kecamatan}</span>
              <span className="flex items-center gap-2">
                <Badge variant={part.status === "completed" ? "risk-low" : "outline"}>
                  {PART_STATUS[part.status]}
                </Badge>
                {onReopen && part.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => onReopen(part.kecamatan)}
                    className="text-caption font-medium text-brand-700 hover:underline"
                  >
                    Buka kembali
                  </button>
                )}
              </span>
            </div>
            {part.blocker && (
              <p className="flex items-start gap-1.5 text-caption text-risk-high">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {part.blocker.note}
              </p>
            )}
            {part.result && (
              <p className="text-caption text-paper-700">{part.result.note}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const steps = ["Ditugaskan", "Diterima", "Selesai"];
  return (
    <ol className="flex items-center gap-2 text-caption">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn("h-px w-6", done || active ? "bg-brand-700" : "bg-paper-300")}
              />
            )}
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                done
                  ? "bg-brand-700 text-white"
                  : active
                    ? "border-2 border-brand-700 text-brand-700"
                    : "border border-paper-300 text-paper-500",
              )}
            >
              {done ? <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                "font-medium",
                done || active ? "text-foreground" : "text-paper-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DispatchActionModal({
  recommendation,
  open,
  onOpenChange,
  onChanged,
  systemToday,
  canAssign = true,
  canWork = false,
  assignees = [],
}: DispatchActionModalProps) {
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  const [editingAssignment, setEditingAssignment] = React.useState(false);
  /* Puskesmas yang akan ditugasi. Kecamatan yang belum ditugaskan tercentang
     semua sejak awal; Dinkes mencabut yang belum perlu bergerak. */
  const [chosen, setChosen] = React.useState<Record<string, boolean>>({});
  const [agreedDue, setAgreedDue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [reopening, setReopening] = React.useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = React.useState(false);

  const id = recommendation?.id;
  const { session } = useSessionContext();
  const workArea = session?.role === "puskesmas" ? session.kecamatan : null;

  React.useEffect(() => {
    setIsSubmitting(false);
    setError(null);
    setCopyState("idle");
    setEditingAssignment(false);
    setNote("");
    setReopening(null);
  }, [id]);

  const awaitingKey = recommendation ? awaitingKecamatan(recommendation).join("|") : "";
  React.useEffect(() => {
    setChosen(
      Object.fromEntries(awaitingKey.split("|").filter(Boolean).map((name) => [name, true])),
    );
  }, [id, awaitingKey]);

  React.useEffect(() => {
    setAgreedDue(recommendation?.assignment?.agreedDueDate ?? "");
  }, [id, recommendation?.assignment?.agreedDueDate]);

  /* Centang SOP dibaca dari yang tersimpan, supaya petugas berikutnya tahu
     butir mana yang sudah dikerjakan. */
  React.useEffect(() => {
    const saved = recommendation?.result?.sopCompleted ?? [];
    setCheckedItems(Object.fromEntries(saved.map((item) => [item, true])));
  }, [id, recommendation?.result]);

  if (!recommendation) return null;

  const action = recommendation;
  const checklist = action.sop_checklist;
  const deadline = describeDeadline(effectiveDueDate(action), systemToday);
  const noteText = note.trim();
  const completed = action.status === "completed";
  const step = completed ? 3 : action.acknowledgement ? 2 : action.assignment ? 1 : 0;
  const lastEvent = action.history.reduce<(typeof action.history)[number] | null>(
    (latest, entry) => (!latest || entry.ts > latest.ts ? entry : latest),
    null,
  );
  const parts = action.parts;
  const awaiting = awaitingKecamatan(action);
  const selectedAreas = awaiting.filter((name) => chosen[name]);
  /* Formulir tampil selama masih ada kecamatan yang belum diserahkan ke
     puskesmasnya, atau saat Dinkes mengubah tenggat. */
  const showAssignForm =
    canAssign && (awaiting.length > 0 || (editingAssignment && !completed));
  const otherAreas = parts.length - 1;
  const reopenForm = reopening && (
    <div className="flex gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`Alasan membuka kembali ${reopening}`}
        aria-label="Alasan membuka kembali"
        className={inputClass}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={isSubmitting || noteText.length === 0}
        onClick={() =>
          record(
            () => reopenAction(action.id, noteText, reopening),
            `${reopening} dibuka kembali.`,
          )
        }
      >
        Buka
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setReopening(null)}>
        Batal
      </Button>
    </div>
  );

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(action.broadcast_draft);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2400);
  };

  /** Menjalankan satu kejadian dan melaporkan apa yang tercatat, bukan lebih. */
  const record = async (
    run: () => Promise<unknown>,
    message: string,
    { close = false } = {},
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await run();
      setNote("");
      setEditingAssignment(false);
      setReopening(null);
      onChanged(message);
      if (close) onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Kepala: apa, di mana, kapan. */}
        <div className="shrink-0 space-y-2.5 border-b border-border bg-paper-50 p-5">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            {action.source === "manual" && <Badge variant="muted">Tugas manual</Badge>}
            <Badge variant="outline">{action.disease}</Badge>
            <Badge variant={action.priority === "high" ? "risk-high" : "risk-medium"}>
              {PRIORITY_LABEL[action.priority]}
            </Badge>
          </div>
          <DialogTitle className="text-h3 leading-tight text-foreground">
            {action.title}
          </DialogTitle>
          <div className="space-y-1 text-caption text-paper-700">
            <p className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
              <span>
                {action.target_kecamatan.join(", ")} ·{" "}
                {formatNumber(action.target_population)} jiwa
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
              <span className="tabular">
                Tenggat {deadline.date} ({deadline.label})
              </span>
            </p>
          </div>
          <div className="pt-1">
            <Steps current={step} />
          </div>
          {lastEvent && (
            <p className="truncate text-caption text-paper-600">
              Terakhir: {lastEvent.event} · {lastEvent.actor} · {formatDateTime(lastEvent.ts)}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Langkah sekarang. */}
          <section className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
            {action.assignment && !showAssignForm && (
              <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-foreground">
                <span>
                  Pelaksana: <strong>{action.assignment.unit}</strong>
                  {action.assignment.agreedDueDate &&
                    ` · tenggat ${action.assignment.agreedDueDate}`}
                </span>
                {canAssign && !completed && awaiting.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(true)}
                    className="text-caption font-medium text-brand-700 hover:underline"
                  >
                    Ubah tenggat
                  </button>
                )}
              </p>
            )}

            {canWork && workArea && action.assignment && (
              <p className="text-caption text-paper-700">
                Bagian Anda: <strong className="text-foreground">{workArea}</strong>
                {otherAreas > 0 &&
                  ` · ${otherAreas} kecamatan lain dikerjakan puskesmas masing-masing.`}
              </p>
            )}

            {!canWork ? (
              /* Dinkes memantau, bukan mengerjakan: tiap kecamatan dikerjakan
                 puskesmasnya sendiri, dan Dinkes melihat kemajuannya satu per
                 satu. Kecamatan yang belum ditugaskan diputuskan di bawahnya. */
              <>
                {parts.length > 0 && (
                  <PartsProgress
                    parts={parts}
                    onReopen={canAssign ? (kecamatan) => setReopening(kecamatan) : undefined}
                  />
                )}
                {reopenForm}
                {showAssignForm ? (
                  <div className="space-y-2.5">
                    {awaiting.length > 0 && (
                      <fieldset className="space-y-1.5">
                        <legend className="mb-1 text-caption font-semibold text-foreground">
                          {parts.length > 0
                            ? "Belum ditugaskan"
                            : "Tugaskan ke puskesmas"}
                        </legend>
                        {awaiting.map((name) => (
                          <label
                            key={name}
                            className="flex cursor-pointer items-start gap-2.5 text-body-sm text-paper-800"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(chosen[name])}
                              onChange={() =>
                                setChosen((current) => ({ ...current, [name]: !current[name] }))
                              }
                              className="mt-1 accent-brand-700"
                            />
                            <span>{puskesmasLabel(name, assignees)}</span>
                          </label>
                        ))}
                      </fieldset>
                    )}
                    <label className="block max-w-[12rem] space-y-1 text-caption font-medium text-paper-700">
                      <span>Tenggat</span>
                      <input
                        type="date"
                        value={agreedDue}
                        onChange={(e) => setAgreedDue(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={
                          isSubmitting || (awaiting.length > 0 && selectedAreas.length === 0)
                        }
                        onClick={() =>
                          record(
                            () =>
                              assignAction(action.id, {
                                kecamatan: selectedAreas.length > 0 ? selectedAreas : undefined,
                                dueDate: agreedDue || undefined,
                              }),
                            selectedAreas.length > 0
                              ? `Ditugaskan ke ${selectedAreas.length} puskesmas.`
                              : "Tenggat diperbarui.",
                          )
                        }
                      >
                        {selectedAreas.length > 0
                          ? `Tugaskan ${selectedAreas.length} puskesmas`
                          : "Simpan tenggat"}
                      </Button>
                      {editingAssignment && (
                        <Button size="sm" variant="ghost" onClick={() => setEditingAssignment(false)}>
                          Batal
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  !action.assignment && (
                    <p className="text-body-sm text-paper-700">Menunggu penugasan dari Dinkes.</p>
                  )
                )}
              </>
            ) : !action.acknowledgement && !completed ? (
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() =>
                  record(
                    () => acknowledgeAction(action.id, { source: "Konsol PRAKIRA" }),
                    "Tugas diterima.",
                  )
                }
              >
                Terima tugas
              </Button>
            ) : !completed ? (
              <>
                {action.blocker && (
                  <p className="flex items-start gap-2 rounded-lg border border-risk-high-br bg-risk-high-bg px-3 py-2 text-caption text-risk-high">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {action.blocker.note}
                  </p>
                )}
                {checklist.length > 0 && (
                  <fieldset className="space-y-1.5">
                    <legend className="mb-1.5 text-caption font-semibold text-foreground">
                      Langkah SOP
                    </legend>
                    {checklist.map((item) => (
                      <label
                        key={item}
                        className="flex cursor-pointer items-start gap-2.5 text-body-sm text-paper-800"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedItems[item])}
                          onChange={() =>
                            setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }))
                          }
                          className="mt-1 accent-brand-700"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan: apa yang dikerjakan, kendala, atau hasil"
                  aria-label="Catatan pelaksanaan"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isSubmitting || noteText.length === 0}
                    onClick={() =>
                      record(
                        () =>
                          completeAction(action.id, {
                            resultNote: noteText,
                            sopCompleted: checklist.filter((i) => checkedItems[i]),
                          }),
                        otherAreas > 0 ? `Bagian ${workArea ?? "wilayah Anda"} selesai.` : "Tindakan selesai.",
                        { close: true },
                      )
                    }
                  >
                    Selesai
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting || noteText.length === 0}
                    onClick={() =>
                      record(() => recordActionProgress(action.id, noteText), "Catatan tersimpan.")
                    }
                  >
                    Simpan catatan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isSubmitting || noteText.length === 0}
                    onClick={() =>
                      record(() => recordActionBlocker(action.id, noteText), "Kendala tercatat.")
                    }
                  >
                    Laporkan kendala
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="whitespace-pre-line text-body-sm text-paper-800">
                  {action.result?.note}
                </p>
                {canWork && otherAreas > 0 && (
                  <p className="text-caption text-paper-600">
                    Bagian Anda selesai. Tindakan ditutup setelah semua kecamatan selesai.
                  </p>
                )}
              </>
            )}
          </section>

          {canAssign && action.assignment && (
            <label className="flex cursor-pointer items-center gap-2.5 px-1 text-body-sm text-paper-700">
              <input
                type="checkbox"
                checked={Boolean(action.publication)}
                disabled={isSubmitting}
                onChange={() =>
                  record(
                    () => setActionPublication(action.id, !action.publication),
                    action.publication ? "Ditarik dari halaman warga." : "Tampil di halaman warga.",
                  )
                }
                className="accent-brand-700"
              />
              Tampilkan di halaman warga
            </label>
          )}

        </div>

        {error && (
          <p
            role="alert"
            className="shrink-0 border-t border-border bg-risk-high-bg px-5 py-2.5 text-caption font-medium text-risk-high"
          >
            {error}
          </p>
        )}

        {/* Bahan pendukung sebagai tombol tetap, bukan lipatan: membukanya tidak
            mengubah tinggi modal. Dasar prakiraan ada di nota dinas. */}
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-paper-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={handleCopyDraft} className="gap-1.5">
            {copyState === "copied" ? (
              <Check className="h-3.5 w-3.5 text-risk-low" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copyState === "copied"
              ? "Tersalin"
              : copyState === "failed"
                ? "Gagal menyalin"
                : "Salin instruksi"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBroadcastOpen(true)}
            className="gap-1.5"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            Pesan warga
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link
              href={`/tindakan/nota/${encodeURIComponent(action.id)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Nota dinas
            </Link>
          </Button>
        </div>

        <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
          <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
            <DialogTitle className="text-h3">Pesan warga</DialogTitle>
            <BroadcastKit action={action} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
