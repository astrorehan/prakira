/**
 * Tindak lanjut laporan lingkungan.
 *
 * Laporan warga dan pekerjaan unit lingkungan sengaja dipisahkan: keputusan
 * verifikasi menjawab "apakah laporan ini layak dipakai", sedangkan tiket
 * menjawab "siapa yang menerima dan apa yang sudah dikerjakan".
 */
import crypto from "node:crypto";
import { all, one, transaction, type Tx } from "../db/index.js";
import { logAudit } from "./audit.js";

export type EnvironmentalKind = "genangan" | "sampah" | "saluran";
export type EnvironmentTicketStatus =
  | "baru"
  | "diterima"
  | "dikerjakan"
  | "selesai"
  | "ditutup";
export type EnvironmentTicketPriority = "normal" | "tinggi";

export type EnvironmentTicket = {
  id: string;
  report_id: string;
  kind: EnvironmentalKind;
  destination_unit: string;
  status: EnvironmentTicketStatus;
  priority: EnvironmentTicketPriority;
  kecamatan: string;
  kelurahan: string | null;
  summary: string;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

export type PublicEnvironmentTicket = {
  id: string;
  destinationUnit: string;
  status: EnvironmentTicketStatus;
  priority: EnvironmentTicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

const ENVIRONMENTAL_KINDS = new Set<EnvironmentalKind>([
  "genangan",
  "sampah",
  "saluran",
]);
const TICKET_COLUMNS = `id, laporan_id, jenis AS kind, tujuan_unit AS destination_unit,
  status, prioritas AS priority, kecamatan, kelurahan,
  ringkasan AS summary, created_at, updated_at, acknowledged_at,
  assigned_to, resolved_at, resolution_note`;
const DESTINATION_UNIT = "Dinas Lingkungan Hidup";

const STATUS_ORDER: Record<EnvironmentTicketStatus, number> = {
  baru: 0,
  diterima: 1,
  dikerjakan: 2,
  selesai: 3,
  ditutup: 4,
};

export function isEnvironmentalKind(kind: string): kind is EnvironmentalKind {
  return ENVIRONMENTAL_KINDS.has(kind as EnvironmentalKind);
}

function fromRow(row: EnvironmentTicket): EnvironmentTicket {
  return row;
}

function makeTicketId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `DLH-${date}-${suffix}`;
}

export function toPublicEnvironmentTicket(
  ticket: EnvironmentTicket | null | undefined,
): PublicEnvironmentTicket | null {
  if (!ticket) return null;
  return {
    id: ticket.id,
    destinationUnit: ticket.destination_unit,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    resolvedAt: ticket.resolved_at,
    resolutionNote: ticket.resolution_note,
  };
}

export type TicketSource = {
  id: string;
  kind: string;
  kecamatan: string;
  kelurahan: string | null;
  description: string;
  simulated?: boolean;
};

/** Dipakai di dalam transaksi review agar keputusan dan tiket atomik. */
export async function ensureEnvironmentTicketTx(
  tx: Tx,
  report: TicketSource,
  now = new Date().toISOString(),
): Promise<EnvironmentTicket | null> {
  if (!isEnvironmentalKind(report.kind) || report.simulated) return null;

  const existing = await tx.one<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE laporan_id = ?`,
    report.id,
  );
  if (existing) return fromRow(existing);

  await tx.run(
    `INSERT INTO tiket_lingkungan
       (id, laporan_id, jenis, tujuan_unit, status, prioritas, kecamatan,
        kelurahan, ringkasan, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'baru', 'normal', ?, ?, ?, ?, ?)
     ON CONFLICT (laporan_id) DO NOTHING`,
    makeTicketId(),
    report.id,
    report.kind,
    DESTINATION_UNIT,
    report.kecamatan,
    report.kelurahan,
    report.description.trim(),
    now,
    now,
  );

  const created = await tx.one<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE laporan_id = ?`,
    report.id,
  );
  return created ? fromRow(created) : null;
}

export async function ensureEnvironmentTicket(
  report: TicketSource,
): Promise<EnvironmentTicket | null> {
  return transaction((tx) => ensureEnvironmentTicketTx(tx, report));
}

/**
 * Membuat tiket untuk laporan lingkungan lama yang sudah terverifikasi sebelum
 * fitur tiket tersedia. Idempotent: aman dijalankan setiap gateway mulai.
 */
export async function backfillEnvironmentTickets(): Promise<number> {
  return transaction(async (tx) => {
    /* Sebelum pilihan rute tersedia, semua laporan lingkungan terverifikasi
       memang otomatis dibuatkan tiket. Pertahankan keputusan historis itu. */
    await tx.run(
      `UPDATE laporan_warga
          SET handling_mode = 'dlh'
        WHERE handling_mode IS NULL
          AND status = 'terverifikasi'
          AND kind IN ('genangan', 'sampah', 'saluran')
          AND device_hash <> 'simulasi-peragaan'
          AND description NOT LIKE '[SIMULASI]%'`,
    );

    const reports = await tx.all<TicketSource>(
      `SELECT l.id, l.kind, l.kecamatan, l.kelurahan, l.description
         FROM laporan_warga l
        WHERE l.status = 'terverifikasi'
          AND l.kind IN ('genangan', 'sampah', 'saluran')
          AND l.handling_mode = 'dlh'
          AND l.device_hash <> 'simulasi-peragaan'
          AND l.description NOT LIKE '[SIMULASI]%'
          AND NOT EXISTS (
            SELECT 1 FROM tiket_lingkungan t WHERE t.laporan_id = l.id
          )`,
    );

    let created = 0;
    for (const report of reports) {
      const ticket = await ensureEnvironmentTicketTx(tx, report);
      if (ticket) created += 1;
    }
    return created;
  });
}

export function findEnvironmentTicketByReportId(
  reportId: string,
): Promise<EnvironmentTicket | null> {
  return one<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE laporan_id = ?`,
    reportId,
  );
}

export function findEnvironmentTicket(id: string): Promise<EnvironmentTicket | null> {
  return one<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE id = ?`,
    id,
  );
}

export function listEnvironmentTickets(filter: {
  status?: EnvironmentTicketStatus;
  kecamatan?: string;
} = {}): Promise<EnvironmentTicket[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }
  if (filter.kecamatan) {
    clauses.push("kecamatan = ?");
    params.push(filter.kecamatan);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan ${where}
     ORDER BY CASE status
       WHEN 'baru' THEN 0 WHEN 'diterima' THEN 1 WHEN 'dikerjakan' THEN 2
       WHEN 'selesai' THEN 3 ELSE 4 END, updated_at ASC`,
    ...params,
  );
}

export async function listEnvironmentTicketsByReportIds(
  reportIds: string[],
): Promise<EnvironmentTicket[]> {
  if (reportIds.length === 0) return [];
  return all<EnvironmentTicket>(
    `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE laporan_id = ANY(?::text[])`,
    reportIds,
  );
}

export type UpdateEnvironmentTicket = {
  status?: EnvironmentTicketStatus;
  priority?: EnvironmentTicketPriority;
  assignedTo?: string;
  resolutionNote?: string;
};

const ALLOWED_TRANSITIONS: Record<EnvironmentTicketStatus, EnvironmentTicketStatus[]> = {
  baru: ["diterima"],
  diterima: ["dikerjakan"],
  dikerjakan: ["selesai"],
  selesai: ["ditutup"],
  ditutup: [],
};

export class InvalidTicketTransitionError extends Error {
  constructor(from: EnvironmentTicketStatus, to: EnvironmentTicketStatus) {
    super(`Tiket tidak dapat berpindah dari ${from} ke ${to}.`);
    this.name = "InvalidTicketTransitionError";
  }
}

export class TicketResolutionNoteRequiredError extends Error {
  constructor() {
    super("Penyelesaian tiket wajib menyertakan catatan hasil penanganan.");
    this.name = "TicketResolutionNoteRequiredError";
  }
}

export async function updateEnvironmentTicket(
  id: string,
  patch: UpdateEnvironmentTicket,
  actor: string,
  role: string,
): Promise<EnvironmentTicket | null> {
  let updated: EnvironmentTicket | null = null;
  let previousStatus: EnvironmentTicketStatus | null = null;
  let finalStatus: EnvironmentTicketStatus | null = null;
  let finalNote: string | null = null;

  await transaction(async (tx) => {
    const existing = await tx.one<EnvironmentTicket>(
      `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE id = ? FOR UPDATE`,
      id,
    );
    if (!existing) return;

    const nextStatus = patch.status ?? existing.status;
    if (
      nextStatus !== existing.status &&
      !ALLOWED_TRANSITIONS[existing.status].includes(nextStatus)
    ) {
      throw new InvalidTicketTransitionError(existing.status, nextStatus);
    }
    if (
      nextStatus === "selesai" &&
      !(patch.resolutionNote?.trim() || existing.resolution_note)
    ) {
      throw new TicketResolutionNoteRequiredError();
    }

    const now = new Date().toISOString();
    const acknowledgedAt =
      existing.acknowledged_at ?? (nextStatus !== "baru" ? now : null);
    const resolvedAt =
      nextStatus === "selesai" || nextStatus === "ditutup"
        ? existing.resolved_at ?? now
        : existing.resolved_at;
    const note =
      patch.resolutionNote === undefined
        ? existing.resolution_note
        : patch.resolutionNote.trim() || null;
    const assignedTo =
      patch.assignedTo === undefined
        ? existing.assigned_to
        : patch.assignedTo.trim() || null;

    await tx.run(
      `UPDATE tiket_lingkungan
          SET status = ?, prioritas = ?, assigned_to = ?, resolution_note = ?,
              acknowledged_at = ?, resolved_at = ?, updated_at = ?
        WHERE id = ?`,
      nextStatus,
      patch.priority ?? existing.priority,
      assignedTo,
      note,
      acknowledgedAt,
      resolvedAt,
      now,
      id,
    );

    updated = await tx.one<EnvironmentTicket>(
      `SELECT ${TICKET_COLUMNS} FROM tiket_lingkungan WHERE id = ?`,
      id,
    );
    previousStatus = existing.status;
    finalStatus = nextStatus;
    finalNote = note;
  });

  if (!updated || !previousStatus || !finalStatus) return null;

  await logAudit({
    actor,
    role,
    action: `Tindak lanjut tiket lingkungan ${id}`,
    details: `Status ${previousStatus} -> ${finalStatus}${finalNote ? ` — ${finalNote}` : ""}.`,
    status:
      finalStatus === "selesai" || finalStatus === "ditutup"
        ? "success"
        : "info",
  });

  return updated;
}

export function ticketStatusRank(status: EnvironmentTicketStatus): number {
  return STATUS_ORDER[status];
}
