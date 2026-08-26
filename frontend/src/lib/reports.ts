/**
 * Laporan warga — satu sumber untuk kedua sisi loop.
 *
 * PRD §5.4 (M6) menuntut warga bisa mengirim laporan tanpa akun dan melacaknya
 * lewat kode; §5.5 (M7) menuntut petugas memutuskan Terima/Tolak. Keduanya
 * membaca berkas ini, sehingga kode yang terbit di `/warga/lapor` adalah kode
 * yang sama yang muncul di antrean `/verifikasi` dan yang dilacak di
 * `/warga/status`. Kalau dua sisi loop punya sumber berbeda, loop-nya palsu.
 *
 * Penyimpanan: `localStorage`. Belum ada backend di repo ini, dan menampilkan
 * antrean yang tidak pernah berubah lebih buruk daripada mengakui batasnya —
 * jadi state benar-benar berpindah, hanya di satu peramban. Batas itu tercetak
 * di UI, bukan disembunyikan.
 */

import { REPORTING_TODAY } from "./period";

/* ── Bentuk data ─────────────────────────────────────────────────────────── */

/** Dua keluarga laporan. §5.6b: pemicu lingkungan menghasilkan tiket ke unit
 *  kebersihan, bukan ke unit kesehatan — satu laporan, dua kemungkinan aksi. */
export type ReportFamily = "kesehatan" | "lingkungan";

export type ReportKind =
  | "gejala"
  | "jentik"
  | "genangan"
  | "sampah"
  | "saluran";

export type ReportStatus = "menunggu" | "terverifikasi" | "ditolak";

export type CitizenReport = {
  /** Kode lacak, mis. `PKR-8F42C1`. Sekaligus kunci primer. */
  id: string;
  kind: ReportKind;
  kecamatan: string;
  /** Bebas diisi: tidak ada daftar kelurahan di dataset, jadi tidak dikarang. */
  kelurahan?: string;
  /** Tanggal kejadian, `YYYY-MM-DD`. */
  occurredAt: string;
  description: string;
  /** ISO. Dipakai untuk urutan antrean dan rate limit. */
  submittedAt: string;
  /** Foto sudah dikecilkan dan di-encode ulang; EXIF tidak ikut. */
  photo?: string;
  status: ReportStatus;
  reviewedAt?: string;
  reviewer?: string;
  /** Wajib saat ditolak (§5.4: "Ditolak (+ alasan)"), opsional saat diterima. */
  reviewNote?: string;
};

export const REPORT_KIND: Record<
  ReportKind,
  { label: string; hint: string; family: ReportFamily }
> = {
  gejala: {
    label: "Gejala pada orang",
    hint: "Demam, batuk berkepanjangan, atau diare pada anggota keluarga/tetangga.",
    family: "kesehatan",
  },
  jentik: {
    label: "Temuan jentik nyamuk",
    hint: "Jentik di bak, ember, tandon, atau barang bekas penampung air.",
    family: "kesehatan",
  },
  genangan: {
    label: "Genangan air bertahan",
    hint: "Air yang tidak surut lebih dari tiga hari di jalan, lahan, atau halaman.",
    family: "lingkungan",
  },
  sampah: {
    label: "Timbunan sampah",
    hint: "Tumpukan yang menampung air hujan atau tidak terangkut berhari-hari.",
    family: "lingkungan",
  },
  saluran: {
    label: "Saluran tersumbat",
    hint: "Got atau drainase mampat sehingga air meluap saat hujan.",
    family: "lingkungan",
  },
};

export const REPORT_STATUS: Record<
  ReportStatus,
  { label: string; badge: "risk-medium" | "risk-low" | "risk-none"; blurb: string }
> = {
  menunggu: {
    label: "Menunggu verifikasi",
    badge: "risk-medium",
    blurb: "Petugas puskesmas wilayah Anda akan memeriksa laporan ini.",
  },
  terverifikasi: {
    label: "Terverifikasi",
    badge: "risk-low",
    blurb:
      "Petugas membenarkan laporan ini. Laporan ikut memperkaya prakiraan minggu berikutnya dengan bobot lebih rendah daripada data resmi.",
  },
  ditolak: {
    label: "Ditolak",
    badge: "risk-none",
    blurb: "Petugas tidak dapat membenarkan laporan ini. Alasannya tercantum di bawah.",
  },
};

export const FAMILY_ROUTING: Record<ReportFamily, string> = {
  kesehatan: "Puskesmas wilayah",
  lingkungan: "Dinas Lingkungan Hidup",
};

/* ── Kode lacak ──────────────────────────────────────────────────────────── */

/* Tanpa 0/O dan 1/I/L: kode ini diketik ulang oleh orang dari layar ponsel,
   dan satu karakter ambigu mengubah "laporan saya hilang" jadi keluhan. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateTrackingCode(): string {
  let body = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : null;
  for (let i = 0; i < 6; i += 1) {
    const n = bytes ? bytes[i] : Math.floor(Math.random() * 256);
    body += CODE_ALPHABET[n % CODE_ALPHABET.length];
  }
  return `PKR-${body}`;
}

/** Menerima ketikan longgar: spasi, huruf kecil, prefiks yang lupa ditulis. */
export function normalizeTrackingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = cleaned.startsWith("PKR") ? cleaned.slice(3) : cleaned;
  return body ? `PKR-${body}` : "";
}

/* ── Penyimpanan ─────────────────────────────────────────────────────────── */

const STORAGE_KEY = "prakira.reports.v1";
const SUBMIT_LOG_KEY = "prakira.reports.submits.v1";

/** §5.4: maksimal 3 laporan per perangkat per 24 jam. */
export const RATE_LIMIT = { max: 3, windowHours: 24 } as const;

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw(): CitizenReport[] | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CitizenReport[]) : null;
  } catch {
    return null;
  }
}

function writeRaw(list: CitizenReport[]): boolean {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    /* Kuota penuh — hampir selalu karena foto. Coba sekali lagi tanpa foto
       pada laporan terlama, supaya laporan barunya tetap tersimpan. */
    try {
      const trimmed = list.map((r, i) =>
        i < list.length - 1 ? { ...r, photo: undefined } : r,
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch {
      return false;
    }
  }
}

/* ── Benih ───────────────────────────────────────────────────────────────── */

/* Antrean kosong pada demo pertama tidak membuktikan apa pun. Enam laporan
   benih memberi petugas sesuatu untuk diputuskan sejak detik pertama; laporan
   yang dikirim pengguna menempel di atasnya dan tidak bisa dibedakan dari
   laporan benih oleh mesinnya sendiri — hanya oleh tanggalnya. */
function iso(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date(REPORTING_TODAY);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function ymd(daysAgo: number): string {
  const d = new Date(REPORTING_TODAY);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const SEED: CitizenReport[] = [
  {
    id: "PKR-8F42C1",
    kind: "jentik",
    kecamatan: "Pedurungan",
    kelurahan: "Tlogosari Kulon RW 04",
    occurredAt: ymd(1),
    description:
      "Jentik di tiga bak mandi rumah kosong sebelah masjid. Sudah lama tidak ditempati, airnya tidak pernah dikuras.",
    submittedAt: iso(1, 8, 20),
    status: "menunggu",
  },
  {
    id: "PKR-QW7M3D",
    kind: "genangan",
    kecamatan: "Genuk",
    kelurahan: "Trimulyo RW 02",
    occurredAt: ymd(2),
    description:
      "Genangan rob di depan gang belum surut sejak Sabtu. Tinggi sekitar semata kaki, menutup separuh jalan.",
    submittedAt: iso(1, 19, 5),
    status: "menunggu",
  },
  {
    id: "PKR-4KX9RB",
    kind: "gejala",
    kecamatan: "Banyumanik",
    kelurahan: "Srondol Wetan",
    occurredAt: ymd(2),
    description:
      "Tiga anak satu RT demam tinggi bersamaan sejak Minggu. Dua sudah dibawa ke puskesmas.",
    submittedAt: iso(2, 7, 45),
    status: "menunggu",
  },
  {
    id: "PKR-H2NP5T",
    kind: "sampah",
    kecamatan: "Semarang Utara",
    kelurahan: "Bandarharjo RW 08",
    occurredAt: ymd(4),
    description:
      "Tumpukan sampah di pinggir tanggul tidak terangkut seminggu. Banyak wadah bekas yang menampung air hujan.",
    submittedAt: iso(4, 16, 30),
    status: "terverifikasi",
    reviewedAt: iso(3, 9, 12),
    reviewer: "Puskesmas Bandarharjo",
    reviewNote: "Dicek petugas kesling. Tiket pengangkutan diteruskan ke DLH.",
  },
  {
    id: "PKR-5RJ8VC",
    kind: "jentik",
    kecamatan: "Tembalang",
    kelurahan: "Bulusan RW 03",
    occurredAt: ymd(5),
    description: "Jentik di penampungan air belakang kos-kosan mahasiswa.",
    submittedAt: iso(5, 11, 0),
    status: "terverifikasi",
    reviewedAt: iso(4, 8, 40),
    reviewer: "Puskesmas Rowosari",
    reviewNote: "ABJ RW 03 turun ke 78%. Dijadwalkan PSN serentak Sabtu.",
  },
  {
    id: "PKR-T6BW2Y",
    kind: "gejala",
    kecamatan: "Mijen",
    occurredAt: ymd(7),
    description: "Katanya banyak yang sakit di kampung sebelah.",
    submittedAt: iso(7, 21, 15),
    status: "ditolak",
    reviewedAt: iso(6, 10, 5),
    reviewer: "Puskesmas Mijen",
    reviewNote:
      "Tidak ada lokasi dan jumlah kasus yang bisa ditelusuri. Silakan lapor ulang dengan RT/RW dan perkiraan jumlah orang.",
  },
];

/** Membaca semua laporan, menanam benih pada kunjungan pertama. */
export function loadReports(): CitizenReport[] {
  const stored = readRaw();
  if (stored) return stored;
  writeRaw(SEED);
  return [...SEED];
}

export function saveReports(list: CitizenReport[]): boolean {
  return writeRaw(list);
}

/** Mengembalikan penyimpanan ke enam laporan benih. Dipakai tombol demo. */
export function resetReports(): CitizenReport[] {
  writeRaw(SEED);
  try {
    if (canUseStorage()) window.localStorage.removeItem(SUBMIT_LOG_KEY);
  } catch {
    /* Reset gagal bukan alasan menghentikan halaman. */
  }
  return [...SEED];
}

/* ── Rate limit ──────────────────────────────────────────────────────────── */

function readSubmitLog(): number[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(SUBMIT_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function recentSubmits(now = Date.now()): number[] {
  const cutoff = now - RATE_LIMIT.windowHours * 3600_000;
  return readSubmitLog().filter((t) => t > cutoff);
}

export type RateLimitState = {
  remaining: number;
  blocked: boolean;
  /** Kapan kuota berikutnya terbuka. `null` bila belum terpakai. */
  resetsAt: Date | null;
};

export function checkRateLimit(now = Date.now()): RateLimitState {
  const recent = recentSubmits(now);
  const oldest = recent.length > 0 ? Math.min(...recent) : null;
  return {
    remaining: Math.max(0, RATE_LIMIT.max - recent.length),
    blocked: recent.length >= RATE_LIMIT.max,
    resetsAt: oldest ? new Date(oldest + RATE_LIMIT.windowHours * 3600_000) : null,
  };
}

function noteSubmit(now = Date.now()): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      SUBMIT_LOG_KEY,
      JSON.stringify([...recentSubmits(now), now]),
    );
  } catch {
    /* Kehilangan catatan rate limit tidak boleh membatalkan laporannya. */
  }
}

/* ── Aksi ────────────────────────────────────────────────────────────────── */

export type NewReport = {
  kind: ReportKind;
  kecamatan: string;
  kelurahan?: string;
  occurredAt: string;
  description: string;
  photo?: string;
};

export type SubmitResult =
  | { ok: true; report: CitizenReport; persisted: boolean }
  | { ok: false; reason: "rate-limit"; state: RateLimitState };

export function submitReport(input: NewReport): SubmitResult {
  const now = Date.now();
  const state = checkRateLimit(now);
  if (state.blocked) return { ok: false, reason: "rate-limit", state };

  const report: CitizenReport = {
    id: generateTrackingCode(),
    kind: input.kind,
    kecamatan: input.kecamatan,
    kelurahan: input.kelurahan?.trim() || undefined,
    occurredAt: input.occurredAt,
    description: input.description.trim(),
    photo: input.photo,
    submittedAt: new Date(now).toISOString(),
    status: "menunggu",
  };

  const persisted = saveReports([report, ...loadReports()]);
  noteSubmit(now);
  return { ok: true, report, persisted };
}

export function findReport(code: string): CitizenReport | null {
  const id = normalizeTrackingCode(code);
  if (!id) return null;
  return loadReports().find((r) => r.id === id) ?? null;
}

export type ReviewDecision = { status: "terverifikasi" | "ditolak"; note?: string };

export function reviewReport(
  id: string,
  decision: ReviewDecision,
  reviewer: string,
): CitizenReport[] {
  const next = loadReports().map((r) =>
    r.id === id
      ? {
          ...r,
          status: decision.status,
          reviewedAt: new Date().toISOString(),
          reviewer,
          reviewNote: decision.note?.trim() || undefined,
        }
      : r,
  );
  saveReports(next);
  return next;
}

/* ── Urutan & ringkasan ──────────────────────────────────────────────────── */

const STATUS_RANK: Record<ReportStatus, number> = {
  menunggu: 0,
  terverifikasi: 1,
  ditolak: 2,
};

/** Yang belum diputuskan lebih dulu, lalu yang paling lama menunggu. */
export function sortForQueue(list: CitizenReport[]): CitizenReport[] {
  return [...list].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    return a.submittedAt.localeCompare(b.submittedAt);
  });
}

export type QueueSummary = {
  total: number;
  menunggu: number;
  terverifikasi: number;
  ditolak: number;
  /** Laporan pemicu lingkungan yang belum diputuskan (§5.6b). */
  lingkunganMenunggu: number;
  /** Jam menunggu laporan tertua yang belum diputuskan. */
  oldestWaitHours: number | null;
};

export function summarize(list: CitizenReport[], now = Date.now()): QueueSummary {
  const pending = list.filter((r) => r.status === "menunggu");
  const oldest = pending.reduce<number | null>((acc, r) => {
    const t = Date.parse(r.submittedAt);
    return Number.isNaN(t) ? acc : acc === null || t < acc ? t : acc;
  }, null);

  return {
    total: list.length,
    menunggu: pending.length,
    terverifikasi: list.filter((r) => r.status === "terverifikasi").length,
    ditolak: list.filter((r) => r.status === "ditolak").length,
    lingkunganMenunggu: pending.filter(
      (r) => REPORT_KIND[r.kind].family === "lingkungan",
    ).length,
    oldestWaitHours: oldest === null ? null : Math.floor((now - oldest) / 3600_000),
  };
}

/* ── Tampilan ────────────────────────────────────────────────────────────── */

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : DATE_FMT.format(d);
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : `${TIME_FMT.format(d)} WIB`;
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
