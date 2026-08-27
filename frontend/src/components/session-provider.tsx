"use client";

/**
 * Satu sesi untuk seluruh konsol.
 *
 * Sidebar, penjaga rute, dan halaman verifikasi sama-sama butuh tahu siapa
 * yang sedang masuk. Tanpa konteks, ketiganya memanggil `/api/auth/session`
 * sendiri-sendiri dan bisa berbeda pendapat selama beberapa ratus milidetik —
 * cukup lama untuk melempar petugas ke halaman masuk padahal sesinya sah.
 */

import * as React from "react";
import { useSession, type SessionState } from "@/lib/auth";

const SessionContext = React.createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const value = useSession();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionState {
  const context = React.useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext harus dipakai di dalam <SessionProvider>.");
  }
  return context;
}
