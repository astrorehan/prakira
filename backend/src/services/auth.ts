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
import { verifyDecoy, verifyPassword } from "./password.js";
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
  kecamatan_id: string | null;
};

export type SessionUser = {
  email: string;
  role: string;
  label: string;
  home: string;
  signedInAt: string;
  /** Wilayah kerja akun puskesmas; null untuk peran lintas wilayah. */
  kecamatanId: string | null;
  kecamatan: string | null;
  /** Sesi dibuka lewat tombol akun demo, bukan kata sandi. */
  demo: boolean;
};

type SessionOwner = UserRow & { kecamatan: string | null };

const USER_QUERY = `SELECT u.*, k.nama AS kecamatan
       FROM users u LEFT JOIN kecamatan k ON k.id = u.kecamatan_id
      WHERE u.email = ?`;

export async function signIn(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const normalized = email.trim().toLowerCase();
  const user = await one<SessionOwner>(USER_QUERY, normalized);

  /* KDF dijalankan juga saat emailnya tidak terdaftar. `verifyDecoy` selalu
     gagal; gunanya hanya menghabiskan waktu yang sama, supaya lamanya jawaban
     tidak memberi tahu penebak bahwa sebuah email ada. */
  const matches = user
    ? await verifyPassword(password, user.password_hash, user.salt)
    : await verifyDecoy(password);

  if (!user || !matches) {
    await logAudit({
      actor: normalized || "(kosong)",
      role: "Anonim",
      action: "Percobaan masuk gagal",
      details: "Email atau kata sandi tidak cocok.",
      status: "warning",
    });
    return null;
  }

  return openSession(user, false);
}

/**
 * Masuk tanpa kata sandi lewat tombol akun demo.
 *
 * Hanya bisa dipanggil selama `DEMO_LOGIN` menyala; route-nya memeriksa itu.
 * Email diambil dari konfigurasi server, tidak pernah dari peramban.
 */
export async function signInDemo(
  email: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const user = await one<SessionOwner>(USER_QUERY, email.trim().toLowerCase());
  return user ? openSession(user, true) : null;
}

async function openSession(
  user: SessionOwner,
  demo: boolean,
): Promise<{ token: string; user: SessionUser }> {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + env.sessionTtlHours * 3600_000,
  );

  await run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at, demo) VALUES (?, ?, ?, ?, ?)",
    token,
    user.id,
    createdAt.toISOString(),
    expiresAt.toISOString(),
    demo,
  );

  await logAudit({
    actor: user.label,
    role: user.role,
    action: "Masuk konsol",
    details: demo
      ? `${user.email} memulai sesi lewat akun demo.`
      : `${user.email} memulai sesi.`,
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
      kecamatanId: user.kecamatan_id,
      kecamatan: user.kecamatan,
      demo,
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
    kecamatan_id: string | null;
    kecamatan: string | null;
    demo: boolean;
  }>(
    `SELECT u.email, u.role, u.label, u.home, s.created_at, s.expires_at,
            u.kecamatan_id, k.nama AS kecamatan, s.demo
       FROM sessions s JOIN users u ON u.id = s.user_id
       LEFT JOIN kecamatan k ON k.id = u.kecamatan_id
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
    kecamatanId: row.kecamatan_id,
    kecamatan: row.kecamatan,
    demo: row.demo === true,
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
