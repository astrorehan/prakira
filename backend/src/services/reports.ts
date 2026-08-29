/**
 * Laporan warga — satu sumber untuk kedua sisi loop (PRD §5.4 & §5.5).
 *
 * Kode lacak yang terbit di `/warga/lapor` adalah baris yang sama yang muncul
 * di antrean `/verifikasi` dan yang dicari di `/warga/status`. Sebelumnya
 * ketiganya berbagi `localStorage`, artinya laporan warga tidak pernah sampai
 * ke petugas mana pun kecuali petugas itu memakai peramban yang sama. Di sini
 * state benar-benar berpindah antar-pengguna.
 */
import crypto from "node:crypto";
import { all, one, run } from "../db/index.js";
import { env } from "../env.js";
import { logAudit } from "./audit.js";
import { listKecamatan } from "./districts.js";

export type ReportKind =
  "gejala" | "jentik" | "genangan" | "sampah" | "saluran";
export type ReportStatus = "menunggu" | "terverifikasi" | "ditolak";

export const REPORT_KINDS: ReportKind[] = [
  "gejala",
  "jentik",
  "genangan",
  "sampah",
  "saluran",
];

/** Keluarga laporan menentukan unit tujuan tiketnya (PRD §5.6b). */
export const REPORT_FAMILY: Record<ReportKind, "kesehatan" | "lingkungan"> = {
  gejala: "kesehatan",
  jentik: "kesehatan",
  genangan: "lingkungan",
  sampah: "lingkungan",
  saluran: "lingkungan",
};

export type ReportRow = {
  id: string;
  kind: ReportKind;
  kecamatan: string;
  kelurahan: string | null;
  occurred_at: string;
  description: string;
  submitted_at: string;
  photo: string | null;
  status: ReportStatus;
  reviewed_at: string | null;
  reviewer: string | null;
  review_note: string | null;
  device_hash: string;
};

/* Tanpa 0/O dan 1/I/L: kode ini diketik ulang orang dari layar ponsel, dan
   satu karakter ambigu mengubah "laporan saya hilang" jadi keluhan. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateTrackingCode(): string {
  const bytes = crypto.randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i += 1)
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `PKR-${body}`;
}

export function normalizeTrackingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = cleaned.startsWith("PKR") ? cleaned.slice(3) : cleaned;
  return body ? `PKR-${body}` : "";
}

/** Sidik jari perangkat untuk rate limit. Bukan identitas: alamat IP dan
 *  user-agent di-hash bersama garam server dan tidak pernah disimpan mentah. */
export function deviceHash(ip: string, userAgent: string): string {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

export type RateLimitState = {
  max: number;
  windowHours: number;
  remaining: number;
  blocked: boolean;
  resetsAt: string | null;
};

export async function checkRateLimit(hash: string): Promise<RateLimitState> {
  const { max, windowHours } = env.reportRateLimit;
  const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString();

  const rows = await all<{ submitted_at: string }>(
    "SELECT submitted_at FROM laporan_warga WHERE device_hash = ? AND submitted_at > ? ORDER BY submitted_at",
    hash,
    cutoff,
  );

  const oldest = rows[0]?.submitted_at ?? null;
  return {
    max,
    windowHours,
    remaining: Math.max(0, max - rows.length),
    blocked: rows.length >= max,
    resetsAt: oldest
      ? new Date(Date.parse(oldest) + windowHours * 3600_000).toISOString()
      : null,
  };
}

export type NewReport = {
  kind: ReportKind;
  kecamatan: string;
  kelurahan?: string;
  occurredAt: string;
  description: string;
  photo?: string;
};

export async function createReport(
  input: NewReport,
  hash: string,
): Promise<ReportRow> {
  const id = generateTrackingCode();
  const submittedAt = new Date().toISOString();

  await run(
    `INSERT INTO laporan_warga
       (id, kind, kecamatan, kelurahan, occurred_at, description, submitted_at, photo, status, device_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?)`,
    id,
    input.kind,
    input.kecamatan,
    input.kelurahan?.trim() || null,
    input.occurredAt,
    input.description.trim(),
    submittedAt,
    input.photo ?? null,
    hash,
  );

  await logAudit({
    actor: "Warga",
    role: "Publik",
    action: "Laporan warga masuk",
    details: `${id} — ${input.kind} di ${input.kecamatan}.`,
    status: "info",
  });

  return (await findReport(id)) as ReportRow;
}

export async function findReport(code: string): Promise<ReportRow | null> {
  const id = normalizeTrackingCode(code);
  if (!id) return null;
  return one<ReportRow>("SELECT * FROM laporan_warga WHERE id = ?", id);
}

export function listReports(filter?: {
  kecamatan?: string;
  status?: ReportStatus;
}): Promise<ReportRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.kecamatan) {
    clauses.push("kecamatan = ?");
    params.push(filter.kecamatan);
  }
  if (filter?.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return all<ReportRow>(
    `SELECT * FROM laporan_warga ${where}
      ORDER BY CASE status WHEN 'menunggu' THEN 0 WHEN 'terverifikasi' THEN 1 ELSE 2 END,
               submitted_at ASC`,
    ...params,
  );
}

export async function reviewReport(
  id: string,
  decision: { status: "terverifikasi" | "ditolak"; note?: string },
  reviewer: string,
  role: string,
): Promise<ReportRow | null> {
  const existing = await one<ReportRow>(
    "SELECT * FROM laporan_warga WHERE id = ?",
    id,
  );
  if (!existing) return null;

  await run(
    `UPDATE laporan_warga
        SET status = ?, reviewed_at = ?, reviewer = ?, review_note = ?
      WHERE id = ?`,
    decision.status,
    new Date().toISOString(),
    reviewer,
    decision.note?.trim() || null,
    id,
  );

  await logAudit({
    actor: reviewer,
    role,
    action: `Verifikasi laporan ${id}`,
    details: `Diputuskan ${decision.status}${decision.note ? ` — ${decision.note.trim()}` : ""}.`,
    status: decision.status === "terverifikasi" ? "success" : "warning",
  });

  return one<ReportRow>("SELECT * FROM laporan_warga WHERE id = ?", id);
}

export type QueueSummary = {
  total: number;
  menunggu: number;
  terverifikasi: number;
  ditolak: number;
  lingkunganMenunggu: number;
  oldestWaitHours: number | null;
};

export async function summarizeQueue(): Promise<QueueSummary> {
  const rows = await all<{
    status: ReportStatus;
    kind: ReportKind;
    submitted_at: string;
  }>("SELECT status, kind, submitted_at FROM laporan_warga");

  const pending = rows.filter((r) => r.status === "menunggu");
  const oldest = pending.reduce<number | null>((acc, r) => {
    const t = Date.parse(r.submitted_at);
    if (Number.isNaN(t)) return acc;
    return acc === null || t < acc ? t : acc;
  }, null);

  return {
    total: rows.length,
    menunggu: pending.length,
    terverifikasi: rows.filter((r) => r.status === "terverifikasi").length,
    ditolak: rows.filter((r) => r.status === "ditolak").length,
    lingkunganMenunggu: pending.filter(
      (r) => REPORT_FAMILY[r.kind] === "lingkungan",
    ).length,
    oldestWaitHours:
      oldest === null ? null : Math.floor((Date.now() - oldest) / 3600_000),
  };
}

/**
 * Sinyal warga per kecamatan per bulan — masukan `include_citizen` untuk
 * retraining (PRD §5.6a). Hanya laporan terverifikasi yang dihitung.
 */
export function citizenSignal(): Promise<
  { kecamatan: string; month: string; verified: number }[]
> {
  return all<{ kecamatan: string; month: string; verified: number }>(
    `SELECT kecamatan,
            substr(occurred_at, 1, 7) || '-01' AS month,
            COUNT(*)                           AS verified
       FROM laporan_warga
      WHERE status = 'terverifikasi'
      GROUP BY kecamatan, month
      ORDER BY month DESC, kecamatan`,
  );
}

export type DistrictTriggerSummary = {
  kecamatan: string;
  total: number;
  byKind: Record<ReportKind, number>;
  latestReportAt: string | null;
  environmentalCount: number;
  healthCount: number;
};

/**
 * Ringkasan agregat laporan terverifikasi per kecamatan.
 *
 * Mengelompokkan pemicu lingkungan (genangan, jentik, sampah, saluran) dan
 * gejala kesehatan tanpa mengekspos koordinat presisi atau identitas pelapor,
 * sesuai PRD §8 (privasi).
 */
export async function getTriggerSummaryByDistrict(
  kecamatanFilter?: string,
): Promise<DistrictTriggerSummary[]> {
  const allKec = await listKecamatan();
  const byDistrict = new Map<string, DistrictTriggerSummary>();

  for (const k of allKec) {
    if (!kecamatanFilter || k.nama.toLowerCase() === kecamatanFilter.toLowerCase()) {
      byDistrict.set(k.nama, {
        kecamatan: k.nama,
        total: 0,
        byKind: {
          gejala: 0,
          jentik: 0,
          genangan: 0,
          sampah: 0,
          saluran: 0,
        },
        latestReportAt: null,
        environmentalCount: 0,
        healthCount: 0,
      });
    }
  }

  const params: unknown[] = [];
  let where = "WHERE status = 'terverifikasi'";
  if (kecamatanFilter) {
    where += " AND LOWER(kecamatan) = LOWER(?)";
    params.push(kecamatanFilter);
  }

  const rows = await all<{
    kecamatan: string;
    kind: ReportKind;
    submitted_at: string;
  }>(
    `SELECT kecamatan, kind, submitted_at
       FROM laporan_warga
      ${where}
      ORDER BY submitted_at DESC`,
    ...params,
  );

  for (const row of rows) {
    const entry = byDistrict.get(row.kecamatan);
    if (entry) {
      entry.total += 1;
      if (entry.byKind[row.kind] !== undefined) {
        entry.byKind[row.kind] += 1;
      }
      if (REPORT_FAMILY[row.kind] === "lingkungan") {
        entry.environmentalCount += 1;
      } else {
        entry.healthCount += 1;
      }
      if (!entry.latestReportAt || row.submitted_at > entry.latestReportAt) {
        entry.latestReportAt = row.submitted_at;
      }
    }
  }

  return Array.from(byDistrict.values());
}

