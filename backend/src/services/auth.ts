/**
 * Sesi petugas.
 *
 * PRD §4 menaruh "login sungguhan dengan JWT + RBAC penuh" di daftar WON'T
 * untuk babak penyisihan, tapi yang ada sebelumnya bukan login sederhana —
 * ia sepasang email dan kata sandi tertulis di dalam bundel JavaScript yang
 * dikirim ke setiap pengunjung. Yang dipakai di sini: kata sandi ter-hash di
 * server, token sesi acak dalam cookie httpOnly, dan tabel `sessions` yang
 * bisa dicabut. Tanpa JWT, tanpa refresh token — cukup untuk melindungi rute
 * konsol tanpa berpura-pura menjadi sistem identitas.
 */
import crypto from "node:crypto";
import { one, run } from "../db/index.js";
import { env } from "../env.js";
import { verifyPassword } from "./password.js";
import { logAudit } from "./audit.js";

export const SESSION_COOKIE = "prakira_session";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: string;
  label: string;
  home: string;
  created_at: string;
};

export type SessionUser = {
  email: string;
  role: string;
  label: string;
  home: string;
  signedInAt: string;
};

export async function signIn(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const normalized = email.trim().toLowerCase();
  const user = await one<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    normalized,
  );

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    await logAudit({
      actor: normalized || "(kosong)",
      role: "Anonim",
      action: "Percobaan masuk gagal",
      details: "Email atau kata sandi tidak cocok.",
      status: "warning",
    });
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + env.sessionTtlHours * 3600_000,
  );

  await run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    token,
    user.id,
    createdAt.toISOString(),
    expiresAt.toISOString(),
  );

  await logAudit({
    actor: user.label,
    role: user.role,
    action: "Masuk konsol",
    details: `${user.email} memulai sesi.`,
    status: "success",
  });

  return {
    token,
    user: {
      email: user.email,
      role: user.role,
      label: user.label,
      home: user.home,
      signedInAt: createdAt.toISOString(),
    },
  };
}

export async function resolveSession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const row = await one<{
    email: string;
    role: string;
    label: string;
    home: string;
    created_at: string;
    expires_at: string;
  }>(
    `SELECT u.email, u.role, u.label, u.home, s.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    token,
  );

  if (!row) return null;

  if (Date.parse(row.expires_at) < Date.now()) {
    await run("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }

  return {
    email: row.email,
    role: row.role,
    label: row.label,
    home: row.home,
    signedInAt: row.created_at,
  };
}

export async function signOut(token: string | undefined): Promise<void> {
  if (!token) return;
  const session = await resolveSession(token);
  await run("DELETE FROM sessions WHERE token = ?", token);
  if (session) {
    await logAudit({
      actor: session.label,
      role: session.role,
      action: "Keluar konsol",
      details: `${session.email} mengakhiri sesi.`,
      status: "info",
    });
  }
}

/** Membersihkan sesi kedaluwarsa. Dipanggil saat gateway dinyalakan. */
export async function purgeExpiredSessions(): Promise<void> {
  await run(
    "DELETE FROM sessions WHERE expires_at < ?",
    new Date().toISOString(),
  );
}
