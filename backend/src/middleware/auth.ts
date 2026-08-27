import type { NextFunction, Request, Response } from "express";
import {
  SESSION_COOKIE,
  resolveSession,
  type SessionUser,
} from "../services/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionUser;
    }
  }
}

/**
 * Melekatkan sesi bila ada. Tidak menolak — itu tugas `requireAuth`.
 *
 * Pencarian sesi sekarang menyentuh basis data lewat jaringan, jadi middleware
 * ini asinkron. Kegagalannya diteruskan ke `next` alih-alih dibiarkan menjadi
 * unhandled rejection, yang di Express 4 membuat permintaan menggantung.
 */
export function attachSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  resolveSession(req.cookies?.[SESSION_COOKIE])
    .then((session) => {
      req.session = session ?? undefined;
      next();
    })
    .catch(next);
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session) {
    res
      .status(401)
      .json({ error: "Sesi tidak ditemukan. Masuk terlebih dahulu." });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res
        .status(401)
        .json({ error: "Sesi tidak ditemukan. Masuk terlebih dahulu." });
      return;
    }
    if (!roles.includes(req.session.role)) {
      res
        .status(403)
        .json({ error: "Peran Anda tidak berwenang untuk tindakan ini." });
      return;
    }
    next();
  };
}
