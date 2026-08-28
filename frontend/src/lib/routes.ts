/**
 * Route groups that decide chrome and surface temperature.
 *
 * Kept in a plain module — not in `layout-wrapper.tsx` — because the server
 * layout reads them too. Values exported from a `"use client"` file arrive at
 * the server as client references, not as data: the pre-paint script silently
 * serialised `{}` and every console route flashed the warm canvas first.
 *
 * See docs/DESIGN-SYSTEM.md §3.
 */

/** Routes that render the operational console: cool, dense, mono-heavy. */
export const CONSOLE_ROUTES = [
  "/dashboard",
  "/tindakan",
  "/analitik",
  "/admin",
  "/verifikasi",
] as const;

/** Routes that render the public-service treatment: same tokens, official chrome. */
export const SISTEM_ROUTES = ["/sistem"] as const;

/** Routes that bring their own full-page chrome: no navbar, no footer. */
export const BARE_ROUTES = ["/masuk", "/buletin"] as const;

export function isConsoleRoute(pathname: string): boolean {
  return CONSOLE_ROUTES.some((r) => pathname.startsWith(r));
}
