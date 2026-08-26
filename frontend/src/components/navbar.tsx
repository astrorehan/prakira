"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogIn } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

/* "Lapor" adalah satu-satunya hal yang bisa warga berikan kembali ke sistem
   ini, dan sebelumnya hanya bisa dicapai dari halaman depan atau kaki halaman.
   Pembaca yang sedang berada di /tentang atau /warga/status tidak punya jalan
   ke sana sama sekali. */
const MARKETING_ITEMS = [
  { href: "/warga", label: "Lapor" },
  { href: "/tentang", label: "Tentang" },
];

function Wordmark({ inverted }: { inverted: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors duration-base",
          "bg-brand-700 text-white",
        )}
      >
        <BrandMark className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-base font-semibold tracking-tight transition-colors duration-base",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Prakira
        </span>
        <span
          className={cn(
            "mt-1 hidden font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-base sm:inline",
            inverted ? "text-white/50" : "text-paper-500",
          )}
        >
          Peringatan Dini Risiko Iklim
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  /* The bar sits flush on the hero's paper and only earns a rule and a shadow
     once content has scrolled under it. */
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const inverted = false;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-slow ease-out",
        scrolled
          ? "border-sand-200 bg-sand-50/90 shadow-[0_1px_0_rgba(14,34,37,.04),0_8px_24px_-16px_rgba(14,34,37,.25)] backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark inverted={inverted} />

        <nav className="hidden items-center gap-0.5 md:flex">
          {MARKETING_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-fast",
                inverted
                  ? "text-white/65 hover:bg-white/10 hover:text-white"
                  : "text-paper-600 hover:bg-paper-100 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            asChild
            size="sm"
            variant={inverted ? "ghost" : "outline"}
            className={cn(
              inverted &&
                "border border-white/20 text-white hover:bg-white/10 hover:text-white",
            )}
          >
            <Link href="/masuk">
              <LogIn className="mr-1.5 h-4 w-4" />
              <span>Masuk sebagai Petugas</span>
            </Link>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Buka menu"
              className={cn(inverted && "text-white hover:bg-white/10 hover:text-white")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <div className="mb-4 border-b border-border p-2">
              <Wordmark inverted={false} />
            </div>
            <div className="flex flex-col gap-1">
              {MARKETING_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
              <Button asChild variant="outline" className="w-full">
                <Link href="/masuk" onClick={() => setMobileOpen(false)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Masuk sebagai Petugas</span>
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
