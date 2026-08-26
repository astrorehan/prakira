"use client";

import { useEffect, useState } from "react";
import { Eye, Sliders, Type } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { cn } from "@/lib/utils";

/* The two knobs a public health surface owes its readers: text size and
   contrast. Both work by toggling a class on <html>; globals.css redefines
   tokens under those classes rather than patching utilities, so every surface
   follows without per-component work.

   These keys are a contract with the inline script in app/layout.tsx, which
   restores the classes before first paint so the page never flashes at the
   wrong size. Writing them is this component's job — until it was mounted,
   that script restored a value nothing ever set. */
const FONT_KEY = "prakira.a11y.font";
const CONTRAST_KEY = "prakira.a11y.contrast";

type TextSize = "small" | "normal" | "large";

const SIZES: { id: TextSize; label: string }[] = [
  { id: "small", label: "Kecil" },
  { id: "normal", label: "Sedang" },
  { id: "large", label: "Besar" },
];

/* Two triggers for two homes. `icon` is for a dense chrome row; `inline` is a
   labelled full-width row for the foot of a sidebar or a page footer, where the
   control is looked for deliberately rather than stumbled on.

   It is deliberately absent from the marketing navbar: that bar sells, and a
   slider icon between "Lapor" and "Masuk" taxes every reader for a control a
   small minority wants. Readers who need it look in the footer, which is also
   where public-service sites in Indonesia put it. */
export function AccessibilityMenu({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "inline";
  className?: string;
}) {
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [highContrast, setHighContrast] = useState(false);

  /* Read the live state off <html> rather than defaulting to "normal": the
     inline script may already have restored a preference, and a control that
     disagrees with the page it controls is worse than no control. `hydrated`
     keeps the write-back effects from firing on that first read. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setTextSize(
      root.classList.contains("a11y-large-text")
        ? "large"
        : root.classList.contains("a11y-small-text")
          ? "small"
          : "normal",
    );
    setHighContrast(root.classList.contains("a11y-contrast"));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.remove("a11y-small-text", "a11y-large-text");
    if (textSize === "small") root.classList.add("a11y-small-text");
    if (textSize === "large") root.classList.add("a11y-large-text");
    try {
      if (textSize === "normal") localStorage.removeItem(FONT_KEY);
      else localStorage.setItem(FONT_KEY, textSize === "large" ? "lg" : "sm");
    } catch {
      /* Private mode or blocked storage: the class still applies, only the
         preference fails to outlive the tab. */
    }
  }, [textSize, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("a11y-contrast", highContrast);
    try {
      if (highContrast) localStorage.setItem(CONTRAST_KEY, "1");
      else localStorage.removeItem(CONTRAST_KEY);
    } catch {
      /* See above. */
    }
  }, [highContrast, hydrated]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {variant === "inline" ? (
          <button
            type="button"
            className={cn(
              "inline-flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-caption font-medium text-paper-700 transition-colors duration-fast hover:bg-paper-100 hover:text-foreground",
              className,
            )}
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden />
            <span>Aksesibilitas</span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Pengaturan aksesibilitas"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-paper-600 transition-colors duration-fast hover:bg-paper-100 hover:text-foreground",
              className,
            )}
          >
            <Sliders className="h-4 w-4" aria-hidden />
          </button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-xs">
        <SheetHeader>
          <SheetTitle className="text-h3">
            Aksesibilitas &amp; Tampilan
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div role="group" aria-labelledby="a11y-size-label">
            <span
              id="a11y-size-label"
              className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-foreground"
            >
              <Type className="h-4 w-4 text-brand-600" aria-hidden />
              Ukuran Teks
            </span>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={textSize === s.id}
                  onClick={() => setTextSize(s.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-body-sm font-medium transition-colors duration-fast",
                    textSize === s.id
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-border bg-surface text-paper-700 hover:bg-paper-100",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
              <Eye className="h-4 w-4 text-brand-600" aria-hidden />
              Mode Kontras Tinggi
            </span>
            <button
              type="button"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((v) => !v)}
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-body-sm font-medium transition-colors duration-fast",
                highContrast
                  ? "border-paper-900 bg-paper-900 text-white"
                  : "border-border bg-surface text-paper-700 hover:bg-paper-100",
              )}
            >
              {highContrast
                ? "Kontras tinggi aktif"
                : "Aktifkan kontras tinggi"}
            </button>
          </div>

          <p className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-caption text-brand-800">
            Penyesuaian disimpan di peramban Anda dan tetap berlaku saat membuka
            halaman lain.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
