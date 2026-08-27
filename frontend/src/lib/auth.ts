"use client";

/**
 * Sesi petugas — sekarang milik server.
 *
 * Versi sebelumnya menyimpan `DEMO_ACCOUNT` beserta kata sandinya sebagai
 * konstanta yang ikut terkirim ke setiap pengunjung, lalu menaruh "sesi" di
 * `localStorage`. Yang tersisa di sini hanyalah pemanggil `/api/auth/*`:
 * kata sandi diperiksa di server, tokennya ada di cookie httpOnly yang tidak
 * bisa dibaca JavaScript, dan keluar berarti sesinya benar-benar dihapus.
 */

import * as React from "react";
import { ApiError, fetchSession, signIn as apiSignIn, signOut as apiSignOut } from "@/lib/api";
import type { Session } from "@/types";

export type { Session };

export type SessionState = {
  session: Session | null;
  /** `true` sampai jawaban pertama dari gateway tiba. */
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
  reload: () => void;
};

export function useSession(): SessionState {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchSession()
      .then((result) => {
        if (alive) {
          setSession(result.data);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        setSession(null);
        /* Gateway mati bukan "belum masuk": bedanya menentukan apakah layar
           menawarkan formulir masuk atau memberi tahu backend sedang padam. */
        setError(caught instanceof ApiError && caught.status === 0 ? caught.message : null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [nonce]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const result = await apiSignIn(email, password);
    setSession(result.data);
    setError(null);
    return result.data;
  }, []);

  const signOut = React.useCallback(async () => {
    await apiSignOut();
    setSession(null);
  }, []);

  return {
    session,
    loading,
    error,
    signIn,
    signOut,
    reload: React.useCallback(() => setNonce((n) => n + 1), []),
  };
}

export const ROLE_LABEL: Record<string, string> = {
  dinas: "Dinas Kesehatan",
  analis: "Analis",
  admin: "Administrator",
  puskesmas: "Petugas Puskesmas",
};
