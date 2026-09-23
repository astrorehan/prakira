"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ConsolePageSkeleton } from "@/components/console/console-skeleton";
import { isConsoleRoute } from "@/lib/routes";

export default function Loading() {
  const pathname = usePathname();
  if (isConsoleRoute(pathname ?? "")) return <ConsolePageSkeleton />;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-transparent">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-14 w-14 rounded-full bg-brand-500/10 animate-ping" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 shadow-sm text-brand-700">
          <BrandMark className="h-6 w-6 animate-pulse" />
        </div>
      </div>
      <span className="font-mono text-2xs uppercase tracking-widest text-paper-600">
        Memuat data Prakira…
      </span>
    </div>
  );
}

