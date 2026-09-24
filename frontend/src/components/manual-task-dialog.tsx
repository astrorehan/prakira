"use client";

import * as React from "react";
import { ClipboardPlus } from "lucide-react";
import type { ActionAssignee, ActionRecommendation } from "@/types";
import { createManualAction } from "@/lib/api";
import { ACTION_TYPE_LABEL, PRIORITY_LABEL, puskesmasLabel } from "@/lib/action-queue";
import { diseaseLabel } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/**
 * Tugas manual Dinkes.
 *
 * Tidak semua pekerjaan lahir dari prakiraan: laporan lapangan, surat edaran,
 * atau permintaan camat juga menuntut tindakan. Tugas ini masuk ke antrean
 * yang sama dan langsung ditugaskan ke puskesmas yang dipilih. Dasar
 * penugasan wajib, sama seperti saran sistem wajib membawa "Dasar:".
 */

interface ManualTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: ActionAssignee[];
  diseases: string[];
  /** Hari acuan konsol, untuk tenggat bawaan. */
  systemToday: string | null;
  onCreated: (message: string) => void;
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ACTION_TYPES = Object.keys(ACTION_TYPE_LABEL) as ActionRecommendation["action_type"][];
const PRIORITIES: ActionRecommendation["priority"][] = ["high", "medium", "low"];

export function ManualTaskDialog({
  open,
  onOpenChange,
  assignees,
  diseases,
  systemToday,
  onCreated,
}: ManualTaskDialogProps) {
  const [title, setTitle] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [disease, setDisease] = React.useState("");
  const [actionType, setActionType] =
    React.useState<ActionRecommendation["action_type"]>("lainnya");
  const [priority, setPriority] = React.useState<ActionRecommendation["priority"]>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [sop, setSop] = React.useState("");
  const [chosen, setChosen] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* Formulir dibuka bersih setiap kali, supaya tugas kedua tidak mewarisi
     puskesmas pilihan tugas pertama tanpa disadari. */
  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setReason("");
    setDescription("");
    setDisease(diseases[0] ?? "");
    setActionType("lainnya");
    setPriority("medium");
    setDueDate(systemToday ?? "");
    setSop("");
    setChosen({});
    setError(null);
  }, [open, diseases, systemToday]);

  const kecamatan = assignees.filter((a) => chosen[a.kecamatan]).map((a) => a.kecamatan);
  const ready =
    title.trim() !== "" &&
    reason.trim() !== "" &&
    disease !== "" &&
    dueDate !== "" &&
    kecamatan.length > 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createManualAction({
        title: title.trim(),
        reason: reason.trim(),
        description: description.trim() || undefined,
        disease,
        actionType,
        priority,
        kecamatan,
        dueDate,
        sopChecklist: sop
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
      onCreated(`Tugas "${title.trim()}" ditugaskan ke ${kecamatan.length} puskesmas.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-paper-50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700">
              <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-h3">Buat tugas</DialogTitle>
              <DialogDescription className="text-caption">
                Tugas di luar saran sistem, langsung ditugaskan ke puskesmas pilihan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <label className="block space-y-1 text-caption font-medium text-paper-700">
            <span>Judul tugas</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Penyelidikan epidemiologi kasus DBD RW 03"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1 text-caption font-medium text-paper-700">
            <span>Dasar penugasan</span>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mengapa tugas ini perlu: laporan, surat, atau temuan lapangan"
              className={inputClass}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-caption font-medium text-paper-700">
              <span>Penyakit</span>
              <select
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className={inputClass}
              >
                {diseases.map((d) => (
                  <option key={d} value={d}>
                    {diseaseLabel(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-caption font-medium text-paper-700">
              <span>Jenis tindakan</span>
              <select
                value={actionType}
                onChange={(e) =>
                  setActionType(e.target.value as ActionRecommendation["action_type"])
                }
                className={inputClass}
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACTION_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-caption font-medium text-paper-700">
              <span>Prioritas</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ActionRecommendation["priority"])}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-caption font-medium text-paper-700">
            <span>Tenggat</span>
            <input
              type="date"
              value={dueDate}
              min={systemToday ?? undefined}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-caption font-medium text-paper-700">
              Puskesmas pelaksana ({kecamatan.length} dipilih)
            </legend>
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-2.5 sm:grid-cols-2">
              {assignees.map((a) => (
                <label
                  key={a.kecamatan}
                  className="flex cursor-pointer items-start gap-2 text-body-sm text-paper-800"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(chosen[a.kecamatan])}
                    onChange={() =>
                      setChosen((current) => ({ ...current, [a.kecamatan]: !current[a.kecamatan] }))
                    }
                    className="mt-1 accent-brand-700"
                  />
                  <span>{puskesmasLabel(a.kecamatan, assignees)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1 text-caption font-medium text-paper-700">
            <span>Uraian (opsional)</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1 text-caption font-medium text-paper-700">
            <span>Langkah SOP (opsional, satu per baris)</span>
            <textarea
              rows={3}
              value={sop}
              onChange={(e) => setSop(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="shrink-0 border-t border-border bg-risk-high-bg px-5 py-2.5 text-caption font-medium text-risk-high"
          >
            {error}
          </p>
        )}

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-paper-50 px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button size="sm" loading={submitting} disabled={submitting || !ready} onClick={submit}>
            {kecamatan.length > 0 ? `Tugaskan ke ${kecamatan.length} puskesmas` : "Tugaskan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
