"use client";

/**
 * Penjaga rute konsol.
 *
 * Halaman masuk dulu diakhiri kalimat "rute konsol belum dijaga" — dan itu
 * benar: `/dashboard` bisa dibuka siapa saja. Gateway kini menolak setiap
 * penulisan tanpa sesi, tapi menolak di server saja berarti petugas melihat
 * halaman penuh yang tombolnya semua gagal. Penjaga ini menutup jarak itu di
 * sisi tampilan; otoritasnya tetap ada di server.
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LogIn, ServerCrash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/components/session-provider";

export function ConsoleGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, error } = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !session && !error) {
      router.replace(`/masuk?lanjut=${encodeURIComponent(pathname ?? "/dashboard")}`);
    }
  }, [loading, session, error, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="flex items-center gap-2 text-body-sm text-paper-600">
          <Activity className="h-4 w-4 animate-spin" aria-hidden />
          Memeriksa sesi…
        </p>
      </div>
    );
  }

  /* Gateway padam bukan "belum masuk": mengarahkan ke halaman masuk di sini
     akan menyuruh petugas mengetik kata sandi ke layanan yang tidak menjawab. */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md space-y-3 text-center">
          <ServerCrash className="mx-auto h-8 w-8 text-risk-high" aria-hidden />
          <h1 className="text-h2 text-foreground">Gateway tidak menjawab</h1>
          <p className="text-body-sm text-paper-600">{error}</p>
          <Button onClick={() => window.location.reload()} size="sm">
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md space-y-3 text-center">
          <LogIn className="mx-auto h-8 w-8 text-paper-600" aria-hidden />
          <h1 className="text-h2 text-foreground">Perlu masuk</h1>
          <p className="text-body-sm text-paper-600">
            Halaman konsol hanya untuk petugas yang sudah masuk.
          </p>
          <Button asChild size="sm">
            <Link href="/masuk">Masuk ke konsol</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
