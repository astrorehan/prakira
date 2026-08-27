"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Activity,
  BarChart3,
  ShieldCheck,
  Users,
  LogOut,
  LogIn,
  Home,
  Menu,
  Siren,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
import { AccessibilityMenu } from "@/components/accessibility-menu";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/auth";
import { useSessionContext } from "@/components/session-provider";
import { fetchActions, fetchReportQueue } from "@/lib/api";

/**
 * Sidebar konsol — chrome bersama seluruh rute nakes.
 *
 * Dua hal yang diperbaiki dari versi sebelumnya:
 *
 * 1. Portal warga dulu duduk sebaris dengan halaman konsol. Mengkliknya
 *    melempar petugas ke permukaan publik yang tidak punya sidebar, dan satu-
 *    satunya jalan pulang adalah tombol berlabel "Kembali ke Beranda" yang
 *    justru menghapus sesi. Sekarang tautan lintas-permukaan dipisah dan
 *    ditandai panah keluar.
 * 2. Tombol keluar diwarnai `risk-high`. Merah di produk ini berarti tingkat
 *    risiko penyakit (§1.1: "Warna adalah data"), bukan "tombol berbahaya".
 *    Keluar dari sesi bukan kedaruratan; kontrolnya kembali netral.
 * 3. Kedua lencana angka dulu menghitung array mock dan `localStorage`, jadi
 *    "3 laporan menunggu" adalah angka yang sama untuk setiap petugas di
 *    setiap perangkat. Sekarang keduanya ditarik dari gateway.
 */

type NavItem = {
  href: string;
  label: string;
  icon: typeof Activity;
  /** Angka kecil di kanan item — hanya untuk hal yang menunggu dikerjakan. */
  badge?: number;
  /** Dibacakan pembaca layar setelah angkanya. */
  badgeLabel?: string;
};

function Wordmark({ href = "/" }: { href?: string }) {
  return <BrandLockup href={href} subline="Konsol Nakes" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { session, signOut } = useSessionContext();
  const [pendingReports, setPendingReports] = React.useState<number | null>(null);
  const [pendingActions, setPendingActions] = React.useState<number | null>(null);

  /* Kedua angka berubah saat petugas memutuskan sesuatu di /verifikasi atau
     /tindakan, dan sidebar tetap terpasang selama itu. Ditarik ulang tiap kali
     rute berganti — cukup untuk lencana, tanpa menambah kanal antar-komponen.
     Kegagalan berarti lencananya tidak muncul, bukan lencana bernilai nol. */
  React.useEffect(() => {
    if (!session) {
      setPendingReports(null);
      setPendingActions(null);
      return;
    }

    let alive = true;

    fetchReportQueue()
      .then((result) => alive && setPendingReports(result.meta.menunggu))
      .catch(() => alive && setPendingReports(null));

    fetchActions()
      .then(
        (result) =>
          alive &&
          setPendingActions(result.data.filter((a) => a.status === "pending").length),
      )
      .catch(() => alive && setPendingActions(null));

    return () => {
      alive = false;
    };
  }, [pathname, session]);

  const consoleItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard Prediksi", icon: Activity },
    {
      href: "/tindakan",
      label: "Aksi Dini",
      icon: Siren,
      badge: pendingActions ?? undefined,
      badgeLabel: "menunggu instruksi",
    },
    {
      href: "/verifikasi",
      label: "Verifikasi Laporan",
      icon: ClipboardCheck,
      badge: pendingReports ?? undefined,
      badgeLabel: "laporan menunggu verifikasi",
    },
    { href: "/analitik", label: "Analitik & Riwayat", icon: BarChart3 },
    { href: "/admin", label: "Manajemen Data", icon: ShieldCheck },
  ];

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && Boolean(pathname?.startsWith(href)));

  const navLinks = (onClick?: () => void) =>
    consoleItems.map((item) => {
      const Icon = item.icon;
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-body-sm font-medium transition-colors duration-fast ease-out",
            active
              ? "bg-primary font-semibold text-white shadow-xs"
              : "text-paper-600 hover:bg-paper-100 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.badge ? (
            <span
              className={cn(
                "tabular rounded-full px-1.5 py-0.5 text-overline font-semibold",
                active
                  ? "bg-white/20 text-white"
                  : "bg-risk-high-bg text-risk-high",
              )}
            >
              {item.badge}
              <span className="sr-only">
                {" "}
                {item.badgeLabel ?? "menunggu tindakan"}
              </span>
            </span>
          ) : null}
        </Link>
      );
    });

  /* Permukaan publik hidup di luar konsol: chrome-nya berbeda dan tidak ada
     sidebar di sana. Ditandai panah keluar supaya kepindahannya disengaja. */
  const crossSurfaceLinks = (onClick?: () => void) => (
    <>
      <span className="overline block px-3.5 pb-1 pt-4">Permukaan publik</span>
      {[
        { href: "/warga", label: "Portal Warga", icon: Users },
        { href: "/sistem", label: "Halaman Layanan", icon: Home },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-body-sm text-paper-600 transition-colors duration-fast ease-out hover:bg-paper-100 hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 text-paper-600"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </>
  );

  const accountBlock = (onClick?: () => void) => (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-paper-50 p-3">
        <div className="text-caption font-semibold text-foreground">
          {session?.label ?? "Belum masuk"}
        </div>
        <div className="text-caption text-paper-600">
          {session
            ? `${session.email} · ${ROLE_LABEL[session.role] ?? session.role}`
            : "Masuk untuk mengubah data dan memutuskan laporan."}
        </div>
      </div>

      {session ? (
        <Button
          onClick={() => {
            onClick?.();
            handleSignOut();
          }}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-caption"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Keluar dari sesi</span>
        </Button>
      ) : (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-caption"
        >
          <Link href="/masuk" onClick={onClick}>
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Masuk ke konsol</span>
          </Link>
        </Button>
      )}

      {/* Foot of the rail: a preference, not a destination, so it sits below
          the account block rather than in the nav list. */}
      <AccessibilityMenu variant="inline" />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border p-6">
          <Wordmark href="/dashboard" />
        </div>

        <nav
          aria-label="Navigasi konsol"
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          <div className="space-y-1">{navLinks()}</div>
          <div className="space-y-0.5">{crossSurfaceLinks()}</div>
        </nav>

        <div className="border-t border-border p-4">{accountBlock()}</div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Wordmark href="/dashboard" />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu navigasi konsol</SheetTitle>
            <div className="mb-4 border-b border-border p-2">
              <Wordmark href="/dashboard" />
            </div>
            <nav aria-label="Navigasi konsol" className="flex flex-col gap-1">
              {navLinks(() => setMobileOpen(false))}
              {crossSurfaceLinks(() => setMobileOpen(false))}
            </nav>
            <div className="mt-8 border-t border-border pt-4">
              {accountBlock(() => setMobileOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
