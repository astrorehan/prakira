"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  Activity,
  BarChart3,
  ShieldCheck,
  LogOut,
  LogIn,
  Home,
  Menu,
  Siren,
  ClipboardCheck,
  ArrowUpRight,
  History,
  Microscope,
  Scale,
  SlidersHorizontal,
  FilePlus2,
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
import { SidebarSkeleton } from "@/components/console/console-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchActions, fetchReportQueue } from "@/lib/api";
import { useReportStream } from "@/hooks/use-report-stream";
import { readWorkContext, withWorkParams } from "@/lib/work-context";

/**
 * Sidebar konsol — chrome bersama seluruh rute nakes dan administrator.
 *
 * Yang diperbaiki dari versi sebelumnya:
 *
 * 1. Portal warga dulu duduk sebaris dengan halaman konsol, lalu sempat
 *    menjadi daftar lima permukaan publik sekaligus. Keduanya membuat keluar
 *    dari konsol terasa seperti pindah produk. Sekarang rel ini hanya punya
 *    satu pintu publik, dan alat evaluasi berdiri sebagai kelompoknya sendiri
 *    di dalam konsol karena itu memang pekerjaan petugas (F14).
 * 2. Tombol keluar diwarnai `risk-high`. Merah di produk ini berarti tingkat
 *    risiko penyakit (§1.1: "Warna adalah data"), bukan "tombol berbahaya".
 *    Keluar dari sesi bukan kedaruratan; kontrolnya kembali netral.
 * 3. Kedua lencana angka dulu menghitung array mock dan `localStorage`, jadi
 *    "3 laporan menunggu" adalah angka yang sama untuk setiap petugas di
 *    setiap perangkat. Sekarang keduanya ditarik dari gateway.
 * 4. Pemisahan peran nakes & admin (PKR-GATE-02): Petugas Puskesmas hanya
 *    melihat entri kasus (/kasus) dan menu /admin disembunyikan. Admin & Dinas
 *    melihat keduanya untuk kontrol penuh sistem surveilans dan AI.
 */

type NavItem = {
  href: string;
  label: string;
  icon: typeof Activity;
  /** Hanya aktif di route ini, bukan di subroute modul lain. */
  exact?: boolean;
  /** Angka kecil di kanan item — hanya untuk hal yang menunggu dikerjakan. */
  badge?: number;
  /** Dibacakan pembaca layar setelah angkanya. */
  badgeLabel?: string;
};

function Wordmark({
  href = "/",
  subline = "Konsol Nakes",
}: {
  href?: string;
  subline?: string;
}) {
  return <BrandLockup href={href} subline={subline} />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { session, loading, signOut } = useSessionContext();
  const [pendingReports, setPendingReports] = React.useState<number | null>(null);
  const [pendingActions, setPendingActions] = React.useState<number | null>(null);

  const userRole = session?.role;
  const isAdmin = userRole === "admin";
  /* F09: dua peran yang pekerjaannya berbeda tidak boleh membuka menu yang
     sama. Petugas puskesmas membuka tugas dan wilayahnya sendiri; koordinator
     dinas membuka pekerjaan lintas wilayah; admin mengelola sistem.
     Petugas puskesmas mengerjakan tugas wilayahnya; alat evaluasi model bukan
     pekerjaannya, jadi kelompok Evaluasi tidak ikut tampil di relnya. */
  const canEvaluate = !!session && userRole !== "puskesmas";
  const consoleSubline = isAdmin
    ? "Konsol Administrator"
    : userRole === "puskesmas"
      ? "Konsol Petugas Puskesmas"
      : userRole === "dinas"
        ? "Konsol Dinas Kesehatan"
        : "Konsol";

  /* Kedua angka berubah saat petugas memutuskan sesuatu di /verifikasi atau
     /tindakan, dan sidebar tetap terpasang selama itu. Ditarik ulang tiap kali
     rute berganti — cukup untuk lencana, tanpa menambah kanal antar-komponen.
     Hanya dijalankan untuk nakes/petugas lapangan, bukan admin IT. */
  React.useEffect(() => {
    if (loading || !session || isAdmin) {
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
          setPendingActions(
            /* Puskesmas menghitung tugas yang sudah ditugaskan kepadanya;
               rekomendasi yang belum ditugaskan adalah antrean Dinkes. */
            result.data.filter((a) =>
              userRole === "puskesmas"
                ? a.assignment !== null && a.status !== "completed"
                : a.status === "pending",
            ).length,
          ),
      )
      .catch(() => alive && setPendingActions(null));

    return () => {
      alive = false;
    };
  }, [pathname, session, loading, isAdmin, userRole]);

  useReportStream({
    enabled: !loading && !!session && !isAdmin,
    onReportCreated: (report) => {
      if (
        userRole === "puskesmas" &&
        session?.kecamatan &&
        report.kecamatan.toLowerCase() !== session.kecamatan.toLowerCase()
      ) {
        return;
      }
      setPendingReports((prev) => (prev !== null ? prev + 1 : 1));
    },
    onReportReviewed: () => {
      fetchReportQueue()
        .then((result) => setPendingReports(result.meta.menunggu))
        .catch(() => {});
    },
  });

  const consoleItems: NavItem[] = React.useMemo(() => {
    /* F06/F08: satu pintu keputusan untuk semua peran, dan namanya menyebut
       pekerjaan — bukan "dashboard prediksi", yang menjanjikan bahan analisis. */
    const home: NavItem = {
      href: "/dashboard",
      label: userRole === "dinas" ? "Prioritas" : "Beranda / Prioritas",
      icon: Home,
    };

    /* F07: papan bobot terdampak adalah bukti pendukung urutan, bukan pintu
       keputusan kedua. Dinas bisa membukanya sejak dulu tanpa punya menunya;
       sekarang menunya ada di setiap peran yang berwenang, dengan nama yang
       tidak bersaing dengan beranda. */
    const weighting: NavItem = {
      href: "/admin/prioritas",
      label: "Bobot penduduk terdampak",
      icon: Scale,
    };

    if (isAdmin) {
      return [
        {
          href: "/admin",
          label: "Manajemen Sistem & AI",
          icon: ShieldCheck,
          exact: true,
        },
        home,
        weighting,
        { href: "/analitik", label: "Analitik & Evaluasi", icon: BarChart3 },
      ];
    }

    if (userRole === "puskesmas") {
      // Petugas lapangan: tugasnya sendiri, wilayahnya sendiri, rekapnya sendiri.
      return [
        home,
        {
          href: "/tindakan",
          label: "Tugas saya",
          icon: Siren,
          badge: pendingActions ?? undefined,
          badgeLabel: "tugas menunggu",
        },
        {
          href: "/verifikasi",
          label: "Laporan wilayah",
          icon: ClipboardCheck,
          badge: pendingReports ?? undefined,
          badgeLabel: "laporan perlu diperiksa",
        },
        { href: "/kasus", label: "Rekap kasus", icon: FilePlus2 },
      ];
    }

    // Koordinator dinas: pekerjaan lintas wilayah dan lintas penyakit.
    return [
      home,
      {
        href: "/tindakan",
        label: "Rekomendasi aksi",
        icon: Siren,
        badge: pendingActions ?? undefined,
        badgeLabel: "belum ditugaskan",
      },
      {
        href: "/verifikasi",
        label: "Verifikasi Laporan",
        icon: ClipboardCheck,
        badge: pendingReports ?? undefined,
        badgeLabel: "laporan perlu diperiksa",
      },
      weighting,
      { href: "/analitik", label: "Analitik & Evaluasi", icon: BarChart3 },
      { href: "/kasus", label: "Rekap kasus", icon: FilePlus2 },
    ];
  }, [pendingActions, pendingReports, isAdmin, userRole]);

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (!item.exact &&
      item.href !== "/dashboard" &&
      Boolean(pathname?.startsWith(`${item.href}/`)));

  const navLinks = (onClick?: () => void) =>
    consoleItems.map((item) => {
      const Icon = item.icon;
      const active = isActive(item);
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

  /* F14: alat evaluasi bukan "halaman publik" bagi petugas.
     Simulator, uji historis, dan transparansi model memang terbuka untuk
     siapa pun — itu disengaja — tetapi petugas membukanya di tengah pekerjaan,
     untuk memeriksa apakah angka yang sedang ia pegang layak dipercaya. Jadi
     ketiganya tampil sebagai kelompok "Evaluasi" di dalam konsol, membawa
     penyakit/wilayah/periode yang sedang dikerjakan, dan halaman tujuannya
     menyediakan jalan pulang ke pekerjaan itu.

     Rute publiknya sendiri tinggal satu pintu: beranda. Sebelumnya rel ini
     mendaftar lima permukaan publik sekaligus, yang membuat keluar dari konsol
     terasa seperti pindah produk dan meninggalkan petugas mencari jalan
     kembali. */
  const EVALUATION_ITEMS = [
    {
      href: "/model",
      label: "Transparansi Model",
      icon: Microscope,
      hint: "Seberapa sering prakiraan ini benar",
    },
    {
      href: "/mesin-waktu",
      label: "Uji Historis",
      icon: History,
      hint: "Peringatan yang terlewat dan alarm palsu",
    },
    {
      href: "/simulasi",
      label: "Simulator Cuaca",
      icon: SlidersHorizontal,
      hint: "Reaksi model terhadap cuaca lain",
    },
  ];

  /* Tautan tetap `href` biasa supaya bisa dibuka di tab baru; konteks kerja
     ditempelkan saat diklik, dari nilai terbaru — bukan dari salinan yang
     dibekukan saat rel ini dirender. */
  const openWithContext =
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        return;
      }
      const ctx = readWorkContext();
      if (!ctx) return;
      event.preventDefault();
      router.push(
        withWorkParams(href, {
          disease: ctx.disease,
          kecamatan: ctx.kecamatan,
          periode: ctx.periode,
        }),
      );
    };

  const evaluationLinks = (onClick?: () => void) => (
    <div className="mt-4 space-y-0.5">
      <p className="px-3.5 pb-1 overline">Evaluasi</p>
      {EVALUATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => {
              onClick?.();
              openWithContext(item.href)(event);
            }}
            aria-current={active ? "page" : undefined}
            title={item.hint}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-body-sm font-medium transition-colors duration-fast ease-out",
              active
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-paper-600 hover:bg-paper-100 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  /* Satu pintu publik. Portal warga, halaman layanan, dan transparansi semua
     dicapai dari sana, jadi rel ini tidak perlu menyalin daftarnya. */
  const publicDoor = (onClick?: () => void) => (
    <div className="mt-4 space-y-0.5">
      <p className="px-3.5 pb-1 overline">Di luar konsol</p>
      <Link
        href="/"
        onClick={onClick}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-body-sm text-paper-600 transition-colors duration-fast ease-out hover:bg-paper-100 hover:text-foreground"
      >
        <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">Halaman publik Prakira</span>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-paper-600"
          aria-hidden="true"
        />
      </Link>
    </div>
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

  const accountSkeleton = () => (
    <div role="status" aria-label="Memuat akun" aria-busy="true" className="space-y-2">
      <div className="space-y-2 rounded-xl border border-border bg-paper-50 p-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border p-6">
          <Wordmark href="/dashboard" subline={consoleSubline} />
        </div>

        <nav
          aria-label="Navigasi konsol"
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {loading ? <SidebarSkeleton /> : session ? (
            <>
              <div className="space-y-1">{navLinks()}</div>
              {canEvaluate && evaluationLinks()}
              {publicDoor()}
            </>
          ) : null}
        </nav>

        <div className="border-t border-border p-4">{loading ? accountSkeleton() : accountBlock()}</div>
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Wordmark href="/dashboard" subline={consoleSubline} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu navigasi konsol</SheetTitle>
            <div className="mb-4 border-b border-border p-2">
              <Wordmark href="/dashboard" subline={consoleSubline} />
            </div>
            <nav aria-label="Navigasi konsol" className="flex flex-col gap-1">
              {loading ? <SidebarSkeleton /> : session ? (
                <>
                  {navLinks(() => setMobileOpen(false))}
                  {canEvaluate && evaluationLinks(() => setMobileOpen(false))}
                  {publicDoor(() => setMobileOpen(false))}
                </>
              ) : null}
            </nav>
            <div className="mt-8 border-t border-border pt-4">
              {loading ? accountSkeleton() : accountBlock(() => setMobileOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
