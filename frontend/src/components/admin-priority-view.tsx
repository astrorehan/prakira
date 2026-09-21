"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PriorityBoard } from "@/components/priority-board";
import { useSessionContext } from "@/components/session-provider";
import { Button } from "@/components/ui/button";

/**
 * Prioritas terdampak hidup di konsol administrator, bukan di permukaan
 * publik. Pengecekan ini melengkapi `requireRole` pada endpoint gateway agar
 * petugas yang tidak berwenang mendapat jalan keluar yang jelas di UI.
 */
export function AdminPriorityView() {
  const { session, loading } = useSessionContext();
  const router = useRouter();

  const isAuthorized =
    session?.role === "admin" || session?.role === "dinas";

  React.useEffect(() => {
    if (!loading && session && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [loading, session, isAuthorized, router]);

  if (!loading && session && !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-risk-high" aria-hidden />
          <h1 className="text-h2 text-foreground">Akses Terbatas</h1>
          <p className="text-body-sm text-paper-600">
            Prioritas Terdampak dikhususkan untuk Administrator Sistem dan Dinas
            Kesehatan. Anda sedang dialihkan ke Dashboard Prediksi…
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard">Buka Dashboard Prediksi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PriorityBoard />;
}
