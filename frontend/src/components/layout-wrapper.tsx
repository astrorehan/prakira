"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";

/** Routes that render the operational console: cool, dense, mono-heavy. */
export const CONSOLE_ROUTES = ["/dashboard", "/analitik", "/admin", "/verifikasi"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConsole = CONSOLE_ROUTES.some((r) => pathname?.startsWith(r));
  const surface = isConsole ? "console" : "public";

  /* data-surface lives on <html> so body and every token override see it.
     The inline script in layout.tsx sets it before first paint; this keeps it
     correct across client-side navigation. Components never branch on it —
     see docs/DESIGN-SYSTEM.md §3. */
  useEffect(() => {
    document.documentElement.setAttribute("data-surface", surface);
  }, [surface]);

  if (isConsole) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="min-h-screen min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="min-h-[calc(100vh-140px)] flex-1">{children}</main>
      <Footer />
    </div>
  );
}
