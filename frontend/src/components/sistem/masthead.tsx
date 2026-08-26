"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, LogIn, Landmark, Radio, ShieldCheck, X } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

import { cn } from "@/lib/utils";
import { BMKG_SYNC_STATUS } from "@/lib/mock-data";

/* The service menu is the spine of a public system site: it names services,
   not marketing sections. Order follows how a citizen actually arrives —
   status first, then the notices, then the things they can do. */
const SERVICE_NAV = [
  { href: "#status", label: "Status Kota", code: "01" },
  { href: "#peringatan", label: "Peringatan Resmi", code: "02" },
  { href: "#register", label: "Data Kecamatan", code: "03" },
  { href: "#layanan", label: "Layanan Publik", code: "04" },
  { href: "#pengumuman", label: "Pengumuman", code: "05" },
  { href: "#informasi", label: "Informasi Publik", code: "06" },
];

/** Scrollspy over the section ids above. Purely presentational. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(ids[0]);

  React.useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // Band sits just under the sticky nav, so a section becomes "current"
      // when it reaches reading position, not when it first peeks in.
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function Wordmark() {
  return (
    <BrandLockup
      href="/sistem"
      size="lg"
      subline="Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim"
      // The full service name is the legal identity of the site; on a phone it
      // costs four lines next to the buttons, so it steps aside.
      sublineClassName="hidden sm:block"
    />
  );
}

export function SistemMasthead() {
  const ids = React.useMemo(() => SERVICE_NAV.map((s) => s.href.slice(1)), []);
  const active = useActiveSection(ids);
  const [menuOpen, setMenuOpen] = React.useState(false);

  /* The identity block and the service bar are siblings, not nest-mates: a
     sticky element only travels as far as its own parent, so the service bar
     has to sit directly in the page column to survive the whole scroll. */
  return (
    <>
      <header className="relative z-40">
        {/* Government identity strip. Every public system site opens by saying
            whose it is: ink bar, small type, statutory links only. */}
        <div className="bg-brand-900 text-white">
          <div className="container flex h-9 items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-white/70">
              <Landmark className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                Situs resmi Pemerintah Kota Semarang
                <span className="hidden sm:inline"> · Dinas Kesehatan Kota Semarang</span>
              </span>
            </p>
            <nav aria-label="Tautan resmi" className="hidden items-center gap-5 sm:flex">
              {["PPID", "Kebijakan Privasi", "Bantuan"].map((label) => (
                <a
                  key={label}
                  href="#informasi"
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/60 transition-colors duration-fast hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Identity row */}
        <div className="border-b border-sand-200 bg-sand-50">
          <div className="container flex h-20 items-center justify-between gap-6">
            <Wordmark />

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 py-2 lg:flex">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
                <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-paper-500">
                  Layanan gratis
                  <br />
                  tanpa pendaftaran
                </span>
              </div>

              <Link
                href="/masuk"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-700 bg-brand-700 px-4 text-sm font-medium text-white transition-colors duration-fast hover:bg-brand-600"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Masuk Petugas</span>
                <span className="sm:hidden">Masuk</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Service navigation — sticks under the viewport edge for the whole page. */}
      <div className="sticky top-0 z-50 border-b border-sand-200 bg-white/95 backdrop-blur-md">
        <nav aria-label="Navigasi layanan" className="container hidden md:block">
          <ul className="-mb-px flex items-stretch gap-1 overflow-x-auto">
            {SERVICE_NAV.map((item) => {
              const isActive = active === item.href.slice(1);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-sm transition-colors duration-fast",
                      isActive
                        ? "border-brand-700 font-medium text-brand-700"
                        : "border-transparent text-paper-600 hover:border-sand-300 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular",
                        isActive ? "text-brand-500" : "text-paper-400",
                      )}
                    >
                      {item.code}
                    </span>
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <nav aria-label="Navigasi layanan" className="container flex h-12 items-center justify-between md:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
            Menu layanan
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu layanan" : "Buka menu layanan"}
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-brand-700"
          >
            {menuOpen ? "Tutup" : "Buka"}
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {menuOpen ? (
          <div className="container pb-2 md:hidden">
            <ul className="flex flex-col">
              {SERVICE_NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 border-t border-sand-100 py-3 text-sm text-foreground"
                  >
                    <span className="font-mono text-[10px] tabular text-paper-400">
                      {item.code}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Operational status strip — the line that separates a live system from
          a brochure: what the machine is doing, right now. */}
      <div className="border-b border-sand-200 bg-sand-100/70">
        <div className="container flex h-10 items-center gap-x-6 overflow-x-auto whitespace-nowrap">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-risk-low">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-beacon rounded-full bg-risk-low-fill" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-risk-low" />
            </span>
            Sistem beroperasi normal
          </span>

          <span className="hidden h-3 w-px bg-sand-300 sm:block" />

          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 sm:flex">
            <Radio className="h-3 w-3" aria-hidden />
            Sinkron BMKG {BMKG_SYNC_STATUS.last_sync}
          </span>

          <span className="hidden h-3 w-px bg-sand-300 lg:block" />

          <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 lg:inline">
            {BMKG_SYNC_STATUS.stations_active} stasiun aktif · latensi{" "}
            <span className="tabular">{BMKG_SYNC_STATUS.latency_ms}</span> ms
          </span>

          <span className="hidden h-3 w-px bg-sand-300 lg:block" />

          <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 lg:inline">
            Pembaruan berikutnya {BMKG_SYNC_STATUS.next_sync_in}
          </span>
        </div>
      </div>
    </>
  );
}
