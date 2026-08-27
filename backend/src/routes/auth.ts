import { Router } from "express";
import { env } from "../env.js";
import { SESSION_COOKIE, signIn, signOut } from "../services/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";

export const authRouter = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  path: "/",
  maxAge: env.sessionTtlHours * 3600_000,
};

authRouter.post(
  "/login",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      throw new HttpError(400, "Email dan kata sandi wajib diisi.");
    }

    const result = await signIn(email, password);
    if (!result) {
      /* Pesan yang sama untuk email tak dikenal dan kata sandi salah: memisahkan
       keduanya memberi tahu penebak bahwa sebuah email terdaftar. */
      throw new HttpError(401, "Email atau kata sandi tidak cocok.");
    }

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
