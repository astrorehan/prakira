"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { clearSession } from "@/lib/auth";

const APP_ITEMS = [
  { href: "/dashboard", label: "Dashboard Prediksi", icon: Activity },
  { href: "/tindakan", label: "Aksi Dini", icon: Siren },
  { href: "/analitik", label: "Analitik & Riwayat", icon: BarChart3 },
  { href: "/admin", label: "Manajemen Data BMKG", icon: ShieldCheck },
  { href: "/warga", label: "Portal Publik Warga", icon: Users },
];

function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
        <Activity className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Prakira
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Dinas Kesehatan & Puskesmas
        </span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  const navLinks = (onClick?: () => void) =>
    APP_ITEMS.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
            active
              ? "bg-primary text-white shadow-xs font-semibold"
              : "text-muted-foreground hover:bg-paper-100 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-white/95 md:flex">
        <div className="p-6 border-b border-border/70">
          <Wordmark href="/dashboard" />
        </div>

        <nav className="flex-1 space-y-1 px-4 py-3">{navLinks()}</nav>

        <div className="border-t border-border p-4 space-y-2">
          <div className="rounded-xl bg-paper-50 border border-paper-200 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <div className="font-semibold text-foreground">Kota Semarang</div>
            <div>16 Kecamatan Terpantau</div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium text-risk-high hover:bg-risk-high-bg hover:text-risk-critical border-risk-high-br"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Sticky Top Header for App */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 md:hidden">
        <Wordmark href="/dashboard" />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <div className="p-2 border-b border-border mb-4">
              <Wordmark href="/dashboard" />
            </div>
            <nav className="flex flex-col gap-1.5">
              {navLinks(() => setMobileOpen(false))}
            </nav>
            <div className="mt-8 border-t border-border pt-4">
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                variant="outline"
                className="w-full justify-start gap-2 text-risk-high hover:bg-risk-high-bg"
              >
                <LogOut className="h-4 w-4" />
                <span>Kembali ke Beranda</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </> 
  );
}