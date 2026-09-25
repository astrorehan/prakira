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

/**
 * Kecamatan yang boleh disentuh sesi ini: wilayah akun puskesmas, atau
 * `undefined` untuk peran lintas wilayah.
 */
export function sessionScope(req: Request): string | undefined {
  return req.session?.role === "puskesmas" && req.session.kecamatan
    ? req.session.kecamatan
    : undefined;
}

export function sessionScopeId(req: Request): string | undefined {
  return req.session?.role === "puskesmas" && req.session.kecamatanId
    ? req.session.kecamatanId
    : undefined;
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

/**
 * Menolak aksi yang mengubah data secara permanen dari sesi akun demo.
 *
 * Akun demo dibagi beberapa penilai sekaligus. Verifikasi laporan atau
 * penugasan boleh — itu yang ingin diperagakan dan bisa dikembalikan dengan
 * `npm run demo:prep`. Impor CSV dan retraining tidak: keduanya menulis ulang
 * data kasus atau mengganti model aktif untuk semua orang.
 */
export function rejectDemo(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.session?.demo) {
      res.status(403).json({
        error: `${action} dinonaktifkan untuk akun demo karena mengubah data semua pengguna.`,
      });
      return;
    }
    next();
  };
}
