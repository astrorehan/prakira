"use client";

/**
 * Empat keadaan satu permukaan data, di satu tempat.
 *
 * PRD §8 mewajibkan setiap tampilan data punya keadaan kosong, memuat, gagal,
 * dan "data tidak memadai" — dengan catatan tegas bahwa juri akan mengklik
 * hal-hal yang belum ada datanya. Selama data masih mock, tiga dari empat
 * keadaan itu mustahil terjadi sehingga tidak pernah ditulis. Sekarang
 * keempatnya nyata, dan menuliskannya ulang di setiap halaman adalah cara
 * paling pasti agar salah satunya terlupa.
 */

import * as React from "react";
import { Activity, Inbox, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataStateProps = {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  onRetry?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function DataState({
  loading,
  error,
  empty = false,
  emptyMessage = "Belum ada data untuk ditampilkan.",
  loadingMessage = "Memuat data…",
  onRetry,
  className,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div
        role="status"
        className={cn(
          "flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 p-8 text-center",
          className,
        )}
      >
        <Activity className="h-5 w-5 animate-spin text-brand-700" aria-hidden />
        <p className="text-body-sm text-paper-600">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          "flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-risk-high-br bg-risk-high-bg/50 p-8 text-center",
          className,
        )}
      >
        <ServerCrash className="h-6 w-6 text-risk-high" aria-hidden />
        <div className="space-y-1">
          <p className="text-body font-semibold text-foreground">Data gagal dimuat</p>
          <p className="mx-auto max-w-md text-body-sm text-paper-700">{error}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className={cn(
          "flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center",
          className,
        )}
      >
        <Inbox className="h-6 w-6 text-paper-600" aria-hidden />
        <p className="max-w-md text-body-sm text-paper-600">{emptyMessage}</p>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            Muat ulang
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
