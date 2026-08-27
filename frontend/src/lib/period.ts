/**
 * Format dan hitung waktu — tanpa satu pun tanggal tertanam.
 *
 * Versi sebelumnya memulai berkas ini dengan `REPORTING_TODAY = 26 Agustus
 * 2026` dan `weekLabel: "Minggu 34"`. Dataset yang benar-benar ada di repo
 * berhenti di Desember 2025 dan bergranularitas bulanan, jadi setiap halaman
 * mencetak periode yang tidak pernah ada. Periode kini datang dari gateway
 * (`/api/meta/period`); yang tersisa di sini murni fungsi pemformatan.
 */

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

const MONTHS_SHORT_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
] as const;

/** `2025-12-01` -> "Desember 2025". Mengembalikan "—" untuk masukan kosong. */
export function formatMonth(monthStart: string | null | undefined): string {
  if (!monthStart) return "—";
  const [year, month] = monthStart.split("-");
  const index = Number(month) - 1;
  return index >= 0 && index < 12 ? `${MONTHS_ID[index]} ${year}` : monthStart;
}

/** `2025-12-01` -> "Des 2025". Untuk sumbu grafik yang sempit. */
export function formatMonthShort(monthStart: string | null | undefined): string {
  if (!monthStart) return "—";
  const [year, month] = monthStart.split("-");
  const index = Number(month) - 1;
  return index >= 0 && index < 12 ? `${MONTHS_SHORT_ID[index]} ${year}` : monthStart;
}

/** `2026-01-01` -> "1 Januari 2026". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** ISO -> "3 Des 2025, 14:20 WIB". Dipakai jejak audit dan antrean laporan. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${date.getDate()} ${MONTHS_SHORT_ID[date.getMonth()]} ${date.getFullYear()}, ${time} WIB`;
}

/** "3 jam lalu" / "2 hari lalu" — antrean dibaca berdasarkan usia, bukan jam. */
export function relativeAge(value: string, now = Date.now()): string {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return "—";
  const hours = Math.floor((now - t) / 3600_000);
  if (hours < 1) return "baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/* ── Tenggat ─────────────────────────────────────────────────────────────── */

export type DeadlineUrgency = "overdue" | "today" | "soon" | "ahead" | "unknown";

export type Deadline = {
  urgency: DeadlineUrgency;
  /** Sisa hari; `null` kalau tanggalnya tidak terbaca. */
  days: number | null;
  label: string;
  /** Tanggal asli dalam bahasa Indonesia, selalu ikut tampil. */
  date: string;
};

/** Selisih hari kalender, mengabaikan jam. Negatif berarti sudah lewat. */
export function daysBetween(target: Date, from: Date): number {
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a - b) / 86_400_000);
}

/**
 * Menerjemahkan tenggat jadi tekanan waktu, **relatif terhadap periode data**.
 *
 * `systemToday` adalah hari terakhir bulan observasi terakhir, dikirim gateway.
 * Memakai jam peramban akan salah: data berhenti di satu bulan tertentu, dan
 * instruksi untuk bulan berikutnya akan selalu terbaca "terlambat delapan
 * bulan" hanya karena kalender nyata sudah berjalan.
 */
export function describeDeadline(
  dueDate: string | null | undefined,
  systemToday: string | null | undefined,
): Deadline {
  if (!dueDate) {
    return { urgency: "unknown", days: null, label: "Tanpa tenggat", date: "—" };
  }

  const target = new Date(dueDate);
  const reference = systemToday ? new Date(systemToday) : null;

  if (Number.isNaN(target.getTime()) || !reference || Number.isNaN(reference.getTime())) {
    return { urgency: "unknown", days: null, label: "Tanpa tenggat", date: formatDate(dueDate) };
  }

  const days = daysBetween(target, reference);
  const date = formatDate(dueDate);

  if (days < 0) {
    return { urgency: "overdue", days, label: `Terlambat ${Math.abs(days)} hari`, date };
  }
  if (days === 0) return { urgency: "today", days, label: "Jatuh tempo hari ini", date };
  if (days <= 3) return { urgency: "soon", days, label: `H-${days}`, date };
  return { urgency: "ahead", days, label: `H-${days}`, date };
}
