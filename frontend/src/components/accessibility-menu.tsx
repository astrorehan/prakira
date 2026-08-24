"use client";

import { useEffect, useState } from "react";
import { Sliders, SunMedium, Eye, Type } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

export function AccessibilityMenu() {
  const [textSize, setTextSize] = useState<"normal" | "large" | "small">("normal");
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("a11y-small-text", "a11y-large-text");
    if (textSize === "small") root.classList.add("a11y-small-text");
    if (textSize === "large") root.classList.add("a11y-large-text");
  }, [textSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("a11y-contrast");
    } else {
      root.classList.remove("a11y-contrast");
    }
  }, [highContrast]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl liquid-glass text-paper-700 hover:text-primary transition-colors border border-white/80"
          aria-label="Aksesibilitas"
          title="Pengaturan Aksesibilitas"
        >
          <Sliders className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="liquid-glass-frost w-80">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold font-display text-foreground">
            Aksesibilitas & Tampilan
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-xs">
          {/* Ukuran Teks */}
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Type className="h-4 w-4 text-primary" />
              <span>Ukuran Teks</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["small", "normal", "large"] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setTextSize(sz)}
                  className={`rounded-xl border py-2 px-3 font-semibold capitalize transition-all ${
                    textSize === sz
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white/80 border-paper-200 text-paper-700 hover:bg-paper-100"
                  }`}
                >
                  {sz === "small" ? "Kecil" : sz === "normal" ? "Sedang" : "Besar"}
                </button>
              ))}
            </div>
          </div>

          {/* Kontras Tinggi */}
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <span>Mode Kontras Tinggi</span>
            </span>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`w-full rounded-xl border py-2.5 px-4 font-semibold transition-all ${
                highContrast
                  ? "bg-paper-900 text-white border-paper-900 shadow-sm"
                  : "bg-white/80 border-paper-200 text-paper-700 hover:bg-paper-100"
              }`}
            >
              {highContrast ? "✓ Kontras Tinggi Aktif" : "Aktifkan Kontras Tinggi"}
            </button>
          </div>

          <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-[11px] text-brand-800">
            Penyesuaian ini disimpan pada sesi peramban Anda untuk kemudahan keterbacaan data kesehatan.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
