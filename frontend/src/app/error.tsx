"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log unexpected runtime client error for observability
    console.error("Prakira Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 bg-grad-paper">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-risk-high-bg border border-risk-high-br text-risk-high shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-risk-high font-semibold">
            Terjadi Kendala Sistem
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Maaf, halaman mengalami kesalahan
          </h1>
          <p className="text-xs text-paper-600 max-w-sm mx-auto leading-relaxed">
            Terjadi masalah saat memproses data tampilan. Data Anda tetap aman. Silakan muat ulang komponen atau kembali ke beranda.
          </p>
          {error.digest && (
            <p className="font-mono text-3xs text-paper-600">
              Kode Galat: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="primary" size="default" className="w-full sm:w-auto gap-2">
            <RotateCcw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </Button>
          <Button asChild variant="outline" size="default" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-sand-200">
          <Link
            href="/hubungi-kami"
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:underline font-medium"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>Laporkan kendala ke Tim Teknis</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

