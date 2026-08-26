/**
 * Periode pelaporan — satu sumber.
 *
 * Empat berkas pernah menulis sendiri `week="Minggu 34"` dan
 * `monthYear="Agustus 2026"`. Begitu satu halaman maju seminggu, halaman lain
 * diam-diam berbohong. Konsol operasional tidak boleh punya dua "hari ini".
 *
 * Modul biasa (bukan `"use client"`) supaya layout server ikut membacanya —
 * alasan yang sama dengan `lib/routes.ts`, lihat docs/DESIGN-SYSTEM.md §3.
 */

/** Hari acuan build ini. Ganti satu baris ini saat data maju. */
export const REPORTING_TODAY = new Date(2026, 7, 26); // 26 Agustus 2026

export const REPORTING_PERIOD = {
  week: 34,
  weekLabel: "Minggu 34",
  monthYear: "Agustus 2026",
  /** Rentang riwayat yang benar-benar tersedia di dataset. */
  historyMonths: 12,
  /** Panjang jendela backtest, dalam minggu. */
  backtestWeeks: 156,
} as const;

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/**
 * "28 Agustus 2026" -> Date. Mengembalikan `null` kalau formatnya tak dikenal,
 * supaya pemanggil bisa menampilkan tanggalnya apa adanya dan bukan menebak.
 */
export function parseIndonesianDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const [, day, monthName, year] = match;
  const monthIndex = MONTHS_ID.findIndex(
    (m) => m.toLowerCase() === monthName.toLowerCase(),
  );
  if (monthIndex === -1) return null;

  return new Date(Number(year), monthIndex, Number(day));
}

/** Selisih hari kalender, mengabaikan jam. Negatif berarti sudah lewat. */
export function daysUntil(target: Date, from: Date = REPORTING_TODAY): number {
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a - b) / 86_400_000);
}

export type DeadlineUrgency = "overdue" | "today" | "soon" | "ahead" | "unknown";

export type Deadline = {
  urgency: DeadlineUrgency;
  /** Sisa hari; `null` kalau tanggalnya tidak terbaca. */
  days: number | null;
  /** Label pendek untuk lencana: "Terlambat 2 hari", "H-3", "Hari ini". */
  label: string;
  /** Tanggal asli, selalu ikut tampil supaya lencana tidak menggantikan fakta. */
  date: string;
};

/**
 * Menerjemahkan tanggal tenggat jadi tekanan waktu.
 *
 * "Tenggat: 28 Agustus 2026" tidak memberi tahu petugas apa pun tanpa dia
 * menghitung sendiri. Angka yang sudah dihitung adalah alasan halaman ini ada.
 */
export function describeDeadline(dueDate: string): Deadline {
  const parsed = parseIndonesianDate(dueDate);
  if (!parsed) {
    return { urgency: "unknown", days: null, label: "Tanpa tenggat", date: dueDate };
  }

  const days = daysUntil(parsed);

  if (days < 0) {
    return {
      urgency: "overdue",
      days,
      label: `Terlambat ${Math.abs(days)} hari`,
      date: dueDate,
    };
  }
  if (days === 0) return { urgency: "today", days, label: "Jatuh tempo hari ini", date: dueDate };
  if (days <= 3) return { urgency: "soon", days, label: `H-${days}`, date: dueDate };
  return { urgency: "ahead", days, label: `H-${days}`, date: dueDate };
}
