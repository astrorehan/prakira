import type { NextFunction, Request, Response } from "express";

/** Galat yang pesannya memang untuk dibaca pengguna. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /* Keterangan terstruktur yang menyertai pesan — angka-angka yang membuat
       sebuah penolakan bisa ditindaklanjuti alih-alih hanya dibaca. Isinya
       ikut dikirim ke klien, jadi hanya boleh berisi yang memang untuk dibaca
       pengguna; jangan pernah jalur berkas atau potongan SQL. */
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json(
      error.detail
        ? { error: error.message, detail: error.detail }
        : { error: error.message },
    );
    return;
  }

  /* Pesan galat tak terduga tidak diteruskan ke klien: isinya bisa memuat
     jalur berkas atau potongan SQL. Log tetap lengkap di sisi server. */
  console.error("[gateway]", error);
  res.status(500).json({ error: "Terjadi kesalahan internal pada gateway." });
}

/** Pembungkus handler async supaya `throw` tidak lolos jadi unhandled rejection. */
export function asyncRoute(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
