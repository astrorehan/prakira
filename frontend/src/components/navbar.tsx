"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Menu,
  Sparkles,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { RolePickerDialog } from "./role-picker-dialog";
import { AccessibilityMenu } from "./accessibility-menu";

const MARKETING_ITEMS = [
  { href: "/#features", label: "Fitur" },
  { href: "/tentang", label: "Tentang" },
  { href: "/hubungi-kami", label: "Hubungi Kami" },
  { href: "/warga", label: "Portal Warga" },
];

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
        <Activity className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Prakira
        </span>
        <span className="mt-0.5 hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline font-medium">
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
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "border-b border-border bg-background/90 shadow-xs"
          : "border-b border-transparent bg-background/0",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark />

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {MARKETING_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-paper-100 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="hidden items-center gap-2 md:flex">
          <AccessibilityMenu />
          <RolePickerDialog>
            <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">
              <LogIn className="h-4 w-4 mr-1.5" />
              <span>Masuk</span>
            </Button>
          </RolePickerDialog>
          <Button asChild size="sm" variant="blue" className="shadow-xs font-semibold">
            <Link href="/dashboard">Buka Dashboard</Link>
          </Button>
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
              <Button asChild onClick={() => setMobileOpen(false)} variant="blue" className="w-full font-semibold">
                <Link href="/dashboard">Buka Dashboard</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
