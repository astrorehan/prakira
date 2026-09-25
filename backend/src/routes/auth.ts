import { Router } from "express";
import { env } from "../env.js";
import { SESSION_COOKIE, signIn, signInDemo, signOut } from "../services/auth.js";
import { one } from "../db/index.js";
import {
  checkLogin,
  clearLoginFailures,
  loginKey,
  recordLoginFailure,
} from "../services/login-guard.js";
import { logAudit } from "../services/audit.js";
import { asyncRoute, HttpError } from "../middleware/error.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/",
  maxAge: env.sessionTtlHours * 3600_000,
};

/** "3 menit lagi" lebih berguna di layar daripada "168 detik lagi". */
function humanWait(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  return `${Math.ceil(seconds / 60)} menit`;
}

authRouter.post(
  "/login",
  asyncRoute(async (req, res) => {
    /* Pembatas diperiksa lebih dulu daripada apa pun. Baik kueri pengguna
       maupun KDF di baliknya adalah pekerjaan nyata, dan keduanya bisa dipicu
       tanpa memiliki satu pun kredensial yang sah — jadi urutannya penting,
       bukan sekadar rapi. */
    const key = loginKey(req.ip ?? req.socket?.remoteAddress ?? "unknown");
    const guard = checkLogin(key);
    if (guard.blocked) {
      res.setHeader("Retry-After", String(guard.retryAfterSeconds));
      throw new HttpError(
        429,
        `Terlalu banyak percobaan masuk dari perangkat ini. Coba lagi dalam ${humanWait(guard.retryAfterSeconds)}.`,
        {
          retryAfterSeconds: guard.retryAfterSeconds,
          max: guard.max,
          windowMinutes: guard.windowMinutes,
        },
      );
    }

    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      /* Tidak dihitung sebagai percobaan: ini bentuk permintaan yang salah,
         bukan tebakan, dan tidak menjalankan KDF apa pun. */
      throw new HttpError(400, "Email dan kata sandi wajib diisi.");
    }

    const result = await signIn(email, password);
    if (!result) {
      const after = recordLoginFailure(key);
      if (after.justBlocked) {
        /* Satu baris saat ambangnya tersentuh, bukan satu baris untuk tiap
           percobaan sesudahnya — jejak audit dibaca manusia, dan seratus baris
           identik menyembunyikan kejadian lain di sekitarnya. */
        await logAudit({
          actor: "(perangkat tak dikenal)",
          role: "Anonim",
          action: "Percobaan masuk diblokir",
          details: `Melewati ${after.max} percobaan gagal dalam ${after.windowMinutes} menit.`,
          status: "warning",
        });
      }
      /* Pesan yang sama untuk email tak dikenal dan kata sandi salah:
         memisahkan keduanya memberi tahu penebak bahwa sebuah email terdaftar.
         Lamanya jawaban juga disamakan — lihat `verifyDecoy`. */
      throw new HttpError(401, "Email atau kata sandi tidak cocok.", {
        remaining: after.remaining,
      });
    }

    clearLoginFailures(key);
    res.cookie(SESSION_COOKIE, result.token, cookieOptions);
    res.json({ data: result.user });
  }),
);

/* ── Akun demo ─────────────────────────────────────────────────────────── */

type DemoRole = keyof typeof env.demoAccounts;
const DEMO_ROLES = Object.keys(env.demoAccounts) as DemoRole[];

/**
 * Akun yang dipakai tombol demo sebuah peran: email terkonfigurasi pertama
 * yang ada dan memang berperan itu, atau akun tertua berperan itu. Perannya
 * selalu dicocokkan — `SEED_ADMIN_EMAIL` bisa saja menunjuk akun Dinkes, dan
 * tombol "Administrator" tidak boleh diam-diam membuka sesi peran lain.
 */
async function demoAccount(
  role: DemoRole,
): Promise<{ email: string; label: string; kecamatan: string | null } | null> {
  const configured = env.demoAccounts[role];
  const candidates = Array.isArray(configured) ? configured : [configured];
  const select = `SELECT u.email, u.label, k.nama AS kecamatan
         FROM users u LEFT JOIN kecamatan k ON k.id = u.kecamatan_id`;
  for (const email of candidates) {
    const row = await one<{ email: string; label: string; kecamatan: string | null }>(
      `${select} WHERE u.email = ? AND u.role = ?`,
      email.toLowerCase(),
      role,
    );
    if (row) return row;
  }
  return one<{ email: string; label: string; kecamatan: string | null }>(
    `${select} WHERE u.role = ? ORDER BY u.created_at LIMIT 1`,
    role,
  );
}

/** Daftar tombol akun demo. Kosong berarti fiturnya mati. */
authRouter.get(
  "/demo",
  asyncRoute(async (_req, res) => {
    if (!env.demoLogin) {
      res.json({ data: { enabled: false, accounts: [] } });
      return;
    }
    const accounts = [];
    for (const role of DEMO_ROLES) {
      const account = await demoAccount(role);
      if (account)
        accounts.push({ role, label: account.label, kecamatan: account.kecamatan });
    }
    res.json({ data: { enabled: accounts.length > 0, accounts } });
  }),
);

authRouter.post(
  "/demo",
  asyncRoute(async (req, res) => {
    if (!env.demoLogin) throw new HttpError(404, "Akun demo tidak diaktifkan.");

    const role = req.body?.role as DemoRole;
    if (!DEMO_ROLES.includes(role))
      throw new HttpError(400, "Peran akun demo tidak dikenal.");

    const account = await demoAccount(role);
    const result = account ? await signInDemo(account.email) : null;
    if (!result)
      throw new HttpError(404, "Akun demo untuk peran ini belum tersedia.");

    res.cookie(SESSION_COOKIE, result.token, cookieOptions);
    res.json({ data: result.user });
  }),
);

authRouter.post(
  "/logout",
  asyncRoute(async (req, res) => {
    await signOut(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  }),
);

authRouter.get("/session", (req, res) => {
  res.json({ data: req.session ?? null });
});
