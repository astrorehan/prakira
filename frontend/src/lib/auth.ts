/**
 * Mock authentication — docs/DESIGN-SYSTEM.md §3
 *
 * There is no auth backend yet. Console routes are not protected; this module
 * only records who is looking, so the shell can name the role and the demo
 * account has somewhere to land. Swap `findDemoAccount` for a Supabase call
 * when the backend exists — nothing else here has to change.
 */

export type AuthRole = "dinas" | "analis" | "admin";

export type DemoAccount = {
  role: AuthRole;
  label: string;
  email: string;
  password: string;
  /** Where a successful sign-in lands. */
  home: string;
};

/* A fixture, printed on the sign-in page on purpose: this build is a review
   artifact, not a deployment. */
export const DEMO_ACCOUNT: DemoAccount = {
  role: "dinas",
  label: "Dinas Kesehatan Kota Semarang",
  email: "dinkes@prakira.id",
  password: "prakira2026",
  home: "/dashboard",
};

export type Session = {
  email: string;
  role: AuthRole;
  label: string;
  home: string;
  /** True when the session came from the fixture above. */
  demo: boolean;
  signedInAt: string;
};

const STORAGE_KEY = "prakira.auth";

export function findDemoAccount(email: string, password: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase();
  return normalized === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password
    ? DEMO_ACCOUNT
    : null;
}

export function sessionFromAccount(account: DemoAccount): Session {
  return {
    email: account.email,
    role: account.role,
    label: account.label,
    home: account.home,
    demo: true,
    signedInAt: new Date().toISOString(),
  };
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* Private mode or a full quota — the session is a convenience, not a gate. */
  }
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}
