"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toast konsol.
 *
 * Tiga halaman menyalin blok `fixed bottom-6 right-6` yang sama, dan satu di
 * antaranya masih memakai `alert()` bawaan peramban. Selain tampilannya, yang
 * hilang di semua salinan adalah `aria-live` — konfirmasi "instruksi terkirim"
 * yang tidak dibacakan pembaca layar sama saja dengan tidak ada konfirmasi.
 */
export function ConsoleToast({
  message,
  onDismiss,
  className,
}: {
  message: string | null;
  onDismiss: () => void;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex max-w-md animate-fade-in items-center gap-3 rounded-xl border border-paper-700 bg-paper-900 p-4 text-white shadow-pop",
        className,
      )}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-risk-low" aria-hidden="true" />
      <p className="text-body-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="ml-auto shrink-0 rounded-md p-1 text-paper-600 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Toast yang menutup sendiri. Mengembalikan pesan aktif + pemicunya. */
export function useConsoleToast(timeoutMs = 4500) {
  const [message, setMessage] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(null);
  }, []);

  const show = React.useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      timer.current = setTimeout(() => setMessage(null), timeoutMs);
    },
    [timeoutMs],
  );

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, show, dismiss };
}
