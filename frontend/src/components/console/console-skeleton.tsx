"use client";

import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <div role="status" aria-label="Memuat navigasi konsol" className="space-y-3" aria-busy="true">
      {["w-28", "w-36", "w-24"].map((width, index) => (
        <div key={index} className="flex h-10 items-center gap-3 px-3.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className={`h-3.5 ${width}`} />
        </div>
      ))}
    </div>
  );
}

export function DashboardDataSkeleton() {
  return (
    <div role="status" aria-label="Memuat peta dan prioritas wilayah" aria-busy="true" className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Skeleton className="h-[420px] w-full rounded-2xl lg:h-[560px]" />
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:col-span-4 lg:h-[560px]">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48 max-w-full" />
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3 border-t border-border py-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 pt-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[272px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function QueueSkeleton({ kind }: { kind: "actions" | "reports" }) {
  return (
    <div role="status" aria-label="Memuat antrean" aria-busy="true" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-3 w-28 max-w-full" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>
      <div className={kind === "actions" ? "flex flex-wrap gap-2 rounded-xl border border-border bg-paper-100/70 p-2.5" : "flex flex-wrap gap-2"}>
        {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-9 w-24 rounded-lg" />)}
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-48 max-w-[65%]" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
      <Skeleton className="h-5 w-56 max-w-full" />
      <Skeleton className="h-3 w-72 max-w-full" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  );
}

export function ConsolePageSkeleton() {
  const pathname = usePathname();
  const dashboard = pathname === "/dashboard";
  const queue = pathname === "/tindakan" || pathname === "/verifikasi";
  const analytics = pathname === "/analitik";

  return (
    <div role="status" aria-label="Memuat halaman konsol" aria-busy="true" className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-3.5 w-[500px] max-w-full" />
          </div>
          <Skeleton className="h-9 w-60 max-w-full shrink-0 rounded-full" />
        </div>
        {dashboard ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-24 rounded-xl" />)}
              </div>
              <Skeleton className="h-[76px] w-full rounded-xl lg:w-96" />
            </div>
            <DashboardDataSkeleton />
          </>
        ) : queue ? (
          <QueueSkeleton kind={pathname === "/verifikasi" ? "reports" : "actions"} />
        ) : analytics ? (
          <>
            <div className="flex gap-2">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-10 w-24 rounded-xl" />)}
            </div>
            <CardSkeleton />
          </>
        ) : pathname === "/kasus" ? (
          <>
            <div className="flex gap-3 border-b border-border pb-3">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-9 w-52" />
            </div>
            <CardSkeleton />
          </>
        ) : <CardSkeleton />}
      </div>
    </div>
  );
}
