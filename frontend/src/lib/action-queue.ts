/**
 * Antrean aksi dini — urutan, ringkasan, dan pembacaan angka.
 *
 * Logika ini dulu tersebar di dalam komponen: pengurutan tidak ada sama sekali
 * (kartu tampil sesuai urutan berkas mock), dan angka populasi diurai ulang di
 * dua tempat. Antrean triase yang tidak diurutkan bukan antrean — ia daftar.
 */

import type { ActionRecommendation } from "@/types";
import { describeDeadline, type Deadline } from "./period";

/** "148.200 warga" -> 148200. 0 kalau bidangnya kosong. */
export function parsePopulation(value?: string): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

const STATUS_RANK: Record<ActionRecommendation["status"], number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
};

const PRIORITY_RANK: Record<ActionRecommendation["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const STATUS_LABEL: Record<ActionRecommendation["status"], string> = {
  pending: "Menunggu instruksi",
  in_progress: "Sedang berjalan",
  completed: "Selesai",
};

export const PRIORITY_LABEL: Record<ActionRecommendation["priority"], string> = {
  high: "Prioritas tinggi",
  medium: "Prioritas sedang",
  low: "Prioritas rendah",
};

export const ACTION_TYPE_LABEL: Record<ActionRecommendation["action_type"], string> = {
  fogging: "Fogging & PSN",
  psn: "PSN 3M Plus",
  masker: "Sanitasi udara",
  klorinasi: "Klorinasi air",
  logistik_obat: "Buffer stock obat",
  penyuluhan: "Penyuluhan & broadcast",
};

export type QueuedAction = ActionRecommendation & {
  deadline: Deadline;
  population: number;
};

/** Melekatkan tenggat terhitung supaya komponen tidak menghitung ulang per render. */
export function toQueuedAction(rec: ActionRecommendation): QueuedAction {
  return {
    ...rec,
    deadline: describeDeadline(rec.due_date),
    population: parsePopulation(rec.target_population),
  };
}

/**
 * Urutan antrean: yang belum dikerjakan dulu, lalu yang tenggatnya paling
 * dekat, lalu prioritasnya. Tenggat mendahului prioritas dengan sengaja —
 * tindakan "prioritas sedang" yang sudah terlambat lebih mendesak daripada
 * tindakan "prioritas tinggi" yang tenggatnya dua minggu lagi.
 */
export function sortQueue(list: QueuedAction[]): QueuedAction[] {
  return [...list].sort((a, b) => {
    const status = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (status !== 0) return status;

    /* Tenggat tak terbaca tidak boleh menyamar sebagai "paling mendesak". */
    const aDays = a.deadline.days ?? Number.POSITIVE_INFINITY;
    const bDays = b.deadline.days ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;

    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;

    return a.id.localeCompare(b.id);
  });
}

export type QueueSummary = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  /** Sudah lewat tenggat dan belum selesai. */
  overdue: number;
  /** Jatuh tempo dalam 3 hari dan belum selesai. */
  dueSoon: number;
  /** Jiwa di wilayah yang tindakannya belum diinstruksikan. */
  populationPending: number;
  districtsPending: string[];
  /** Tenggat terdekat di antara yang belum selesai. */
  nextDeadline: Deadline | null;
};

export function summarizeQueue(list: QueuedAction[]): QueueSummary {
  const open = list.filter((r) => r.status !== "completed");
  const pending = list.filter((r) => r.status === "pending");

  const withDeadline = open
    .filter((r) => r.deadline.days !== null)
    .sort((a, b) => (a.deadline.days as number) - (b.deadline.days as number));

  return {
    total: list.length,
    pending: pending.length,
    inProgress: list.filter((r) => r.status === "in_progress").length,
    completed: list.filter((r) => r.status === "completed").length,
    overdue: open.filter((r) => r.deadline.urgency === "overdue").length,
    dueSoon: open.filter(
      (r) => r.deadline.urgency === "today" || r.deadline.urgency === "soon",
    ).length,
    populationPending: pending.reduce((sum, r) => sum + r.population, 0),
    districtsPending: Array.from(new Set(pending.flatMap((r) => r.target_kecamatan))),
    nextDeadline: withDeadline[0]?.deadline ?? null,
  };
}
