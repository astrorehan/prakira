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
export const BARE_ROUTES = ["/masuk", "/buletin", "/tindakan/nota"] as const;

export function isBareRoute(pathname: string): boolean {
  return BARE_ROUTES.some((r) => pathname.startsWith(r));
}

/**
 * A bare route wins over its console prefix.
 *
 * `/tindakan/nota/[id]` starts with `/tindakan`, so without this the pre-paint
 * script would stamp the console canvas on a sheet of A4 that is about to be
 * printed white — and the server layout would disagree with the client wrapper,
 * which already resolves bare first.
 */
export function isConsoleRoute(pathname: string): boolean {
  if (isBareRoute(pathname)) return false;
  return CONSOLE_ROUTES.some((r) => pathname.startsWith(r));
}
