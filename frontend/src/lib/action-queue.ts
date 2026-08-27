/**
 * Antrean aksi dini — urutan dan ringkasan.
 *
 * `parsePopulation` yang dulu mengurai string `"148.200 warga"` kembali jadi
 * angka sudah tidak ada: gateway mengirim `target_population` sebagai bilangan,
 * karena ia menjumlahkannya dari tabel wilayah. Mengarang angka sebagai teks
 * lalu menguraikannya lagi adalah dua kesempatan untuk salah pada satu nilai.
 */

import type { ActionRecommendation } from "@/types";
import { describeDeadline, type Deadline } from "./period";

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
  penyuluhan: "Penyuluhan & edukasi",
};

export const COVERAGE_LABEL: Record<string, string> = {
  high: "Cakupan data tinggi",
  medium: "Cakupan data sedang",
  low: "Cakupan data rendah",
  insufficient: "Data tidak memadai",
};

export type QueuedAction = ActionRecommendation & {
  deadline: Deadline;
};

/** Melekatkan tenggat terhitung supaya komponen tidak menghitung ulang per render. */
export function toQueuedAction(
  rec: ActionRecommendation,
  systemToday: string | null,
): QueuedAction {
  return { ...rec, deadline: describeDeadline(rec.due_date, systemToday) };
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
    /* Kecamatan yang sama bisa muncul di dua tindakan; menjumlahkan populasi
       per tindakan akan menghitungnya dua kali. */
    populationPending: uniquePopulation(pending),
    districtsPending: Array.from(new Set(pending.flatMap((r) => r.target_kecamatan))),
    nextDeadline: withDeadline[0]?.deadline ?? null,
  };
}

/* Populasi per tindakan adalah jumlah kecamatannya, jadi tanpa deduplikasi
   dua instruksi untuk kota yang sama melaporkan dua kali penduduk kota. */
function uniquePopulation(list: QueuedAction[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const action of list) {
    const fresh = action.target_kecamatan.filter((n) => !seen.has(n));
    if (fresh.length === 0) continue;
    const share = action.target_population / Math.max(1, action.target_kecamatan.length);
    total += share * fresh.length;
    fresh.forEach((n) => seen.add(n));
  }
  return Math.round(total);
}
