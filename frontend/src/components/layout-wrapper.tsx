"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { SistemMasthead } from "./sistem/masthead";
import { SistemFooter } from "./sistem/sistem-footer";
import { SessionProvider } from "./session-provider";
import { ConsoleGuard } from "./console-guard";
import { BARE_ROUTES, CONSOLE_ROUTES, SISTEM_ROUTES } from "@/lib/routes";

/* WCAG 2.4.1. The /sistem masthead alone puts a government strip, six service
   links and a status line ahead of the content — a keyboard or screen-reader
   reader should not walk all of it on every page. Invisible until focused,
   then it is the first stop of the tab order.

   The target carries tabIndex={-1} because a browser moves the viewport to a
   fragment but not always the focus; without it the next Tab would resume
   inside the nav the reader just skipped. */
function SkipLink() {
  return (
    <a
      href="#konten"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:border focus:border-brand-700 focus:bg-surface focus:px-4 focus:py-2.5 focus:text-body-sm focus:font-medium focus:text-brand-700 focus:shadow-pop"
    >
      Lewati ke konten utama
    </a>
  );
}

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
    return (
      <SessionProvider>
        <main id="konten" tabIndex={-1} className="min-h-screen">
          {children}
        </main>
      </SessionProvider>
    );
  }

  /* Konsol dijaga: tanpa sesi, rute ini mengalihkan ke /masuk alih-alih
     menampilkan halaman penuh yang setiap tombolnya akan ditolak gateway. */
  if (isConsole) {
    return (
      <SessionProvider>
        <div className="flex min-h-screen flex-col md:flex-row">
          <SkipLink />
          <Sidebar />
          <main
            id="konten"
            tabIndex={-1}
            className="min-h-screen min-w-0 flex-1 overflow-y-auto"
          >
            <ConsoleGuard>{children}</ConsoleGuard>
          </main>
        </div>
      </SessionProvider>
    );
  }

  /* The public-service surface brings its own masthead and footer: government
     identity strip, service navigation, and a live operational status line. */
  if (isSistem) {
    return (
      <div className="flex min-h-screen flex-col">
        <SkipLink />
        <SistemMasthead />
        <main id="konten" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
        <SistemFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <Navbar />
      <main
        id="konten"
        tabIndex={-1}
        className="min-h-[calc(100vh-140px)] flex-1"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
