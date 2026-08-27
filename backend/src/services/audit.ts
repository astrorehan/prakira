/**
 * Jejak audit.
 *
 * Setiap baris di sini adalah peristiwa yang benar-benar terjadi di gateway:
 * seseorang masuk, sebuah CSV diunggah, sebuah laporan diputuskan, model
 * dipanggil. Halaman admin membacanya apa adanya. Tidak ada baris contoh yang
 * ditanam saat seeding — daftar kosong pada pemasangan baru adalah keadaan
 * yang benar.
 */
import { all, run } from "../db/index.js";

export type AuditStatus = "success" | "warning" | "info";

export type AuditEntry = {
  actor: string;
  role: string;
  action: string;
  details: string;
  status: AuditStatus;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  await run(
    "INSERT INTO audit_log (ts, actor, role, action, details, status) VALUES (?, ?, ?, ?, ?, ?)",
    new Date().toISOString(),
    entry.actor,
    entry.role,
    entry.action,
    entry.details,
    entry.status,
  );
}

export type AuditRow = {
  id: number;
  ts: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  status: AuditStatus;
};

export function recentAudit(limit = 25): Promise<AuditRow[]> {
  return all<AuditRow>(
    "SELECT * FROM audit_log ORDER BY id DESC LIMIT ?",
    limit,
  );
}
