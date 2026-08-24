"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Menu,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { RolePickerDialog } from "./role-picker-dialog";

const MARKETING_ITEMS = [
  { href: "/#risk-check", label: "Cek Risiko" },
  { href: "/#edukasi", label: "Edukasi" },
  { href: "/#lapor", label: "Laporkan" },
  { href: "/tentang", label: "Tentang" },
];

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm transition-transform group-hover:-rotate-6">
        <Activity className="h-5 w-5 text-white" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Prakira
        </span>
        <span className="mt-0.5 hidden text-[11px] uppercase tracking-wider text-muted-foreground sm:inline font-medium">
          Peringatan Dini Risiko Iklim
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? [
              "border-b shadow-lg",
              // Liquid glass base
              "bg-white/10 dark:bg-white/5",
              "backdrop-blur-2xl backdrop-saturate-200",
              // Shimmer border
              "border-white/30 dark:border-white/15",
              // Subtle inner glow
              "[box-shadow:0_0_0_1px_rgba(255,255,255,0.15)_inset,0_4px_32px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
            ].join(" ")
          : "border-b border-transparent bg-transparent",
      )}
      style={
        scrolled
          ? {
              // Extra liquid glass shimmer via CSS variable fallback
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.12) 100%)",
            }
          : undefined
      }
    >
      {/* Top shimmer highlight line */}
      {scrolled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
        />
      )}
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark />

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {MARKETING_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-paper-100 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="hidden items-center gap-2 md:flex">
          <RolePickerDialog>
            <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">
              <LogIn className="h-4 w-4 mr-1.5" />
              <span>Masuk</span>
            </Button>
          </RolePickerDialog>
        </div>

        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <div className="p-2 border-b border-border mb-4">
              <Wordmark />
            </div>
            <div className="flex flex-col gap-1">
              {MARKETING_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
              <RolePickerDialog>
                <Button variant="outline" className="w-full font-semibold">
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>Masuk / Pilih Peran</span>
                </Button>
              </RolePickerDialog>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
