import { Router } from "express";
import { env } from "../env.js";
import { SESSION_COOKIE, signIn, signOut } from "../services/auth.js";
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
