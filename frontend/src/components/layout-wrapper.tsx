"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { SistemMasthead } from "./sistem/masthead";
import { SistemFooter } from "./sistem/sistem-footer";

/** Routes that render the operational console: cool, dense, mono-heavy. */
export const CONSOLE_ROUTES = ["/dashboard", "/tindakan", "/analitik", "/admin", "/verifikasi"];

/** Routes that render the public-service treatment: same tokens, official chrome. */
export const SISTEM_ROUTES = ["/sistem"];

/** Routes that bring their own full-page chrome: no navbar, no footer. */
export const BARE_ROUTES = ["/masuk"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConsole = CONSOLE_ROUTES.some((r) => pathname?.startsWith(r));
  const isSistem = SISTEM_ROUTES.some((r) => pathname?.startsWith(r));
  const isBare = BARE_ROUTES.some((r) => pathname?.startsWith(r));
  const surface = isConsole ? "console" : "public";

  /* data-surface lives on <html> so body and every token override see it.
     The inline script in layout.tsx sets it before first paint; this keeps it
     correct across client-side navigation. Components never branch on it —
     see docs/DESIGN-SYSTEM.md §3. */
  useEffect(() => {
    document.documentElement.setAttribute("data-surface", surface);
  }, [surface]);

  /* The sign-in screen is its own composition — a navbar offering "Masuk"
     above a page that is the sign-in would be noise. */
  if (isBare) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isConsole) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="min-h-screen min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  /* The public-service surface brings its own masthead and footer: government
     identity strip, service navigation, and a live operational status line. */
  if (isSistem) {
    return (
      <div className="flex min-h-screen flex-col">
        <SistemMasthead />
        <main className="min-w-0 flex-1">{children}</main>
        <SistemFooter />
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
