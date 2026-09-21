"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogIn } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

/* "Lapor" adalah satu-satunya hal yang bisa warga berikan kembali ke sistem
   ini, dan sebelumnya hanya bisa dicapai dari halaman depan atau kaki halaman.
   Pembaca yang sedang berada di /tentang atau /warga/status tidak punya jalan
   ke sana sama sekali. */
/* The header is a wayfinding aid, not a directory of every route. The first
   three items answer the questions most visitors actually have: check risk,
   report something, and understand the number. Secondary explorations remain
   available from the footer and their own pages without competing with the
   primary task above the fold. */
const MARKETING_ITEMS = [
  { href: "/#risk-check", label: "Cek Risiko" },
  { href: "/warga", label: "Lapor" },
  { href: "/model", label: "Akurasi Model" },
  { href: "/tentang", label: "Tentang" },
];

function Wordmark({ inverted }: { inverted: boolean }) {
  return (
    <BrandLockup
      inverted={inverted}
      subline="Peringatan Dini Risiko Iklim"
      sublineClassName="hidden sm:inline"
    />
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
        "apple-edge-fade sticky top-0 z-50 w-full border-b border-transparent transition-[background-color,border-color,box-shadow,backdrop-filter] duration-slow ease-out",
        scrolled
          ? "apple-material border-sand-200/80 bg-sand-50/80 shadow-lift"
          : "bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark inverted={inverted} />

        <nav className="hidden items-center gap-0.5 md:flex">
          {MARKETING_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href === "/#risk-check"
                  ? pathname === "/"
                    ? "page"
                    : undefined
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    ? "page"
                    : undefined
              }
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-[background-color,color] duration-fast active:bg-brand-100",
                inverted
                  ? "text-white/65 hover:bg-white/10 hover:text-white"
                  : (item.href === "/#risk-check" && pathname === "/") ||
                      pathname === item.href ||
                      pathname?.startsWith(`${item.href}/`)
                    ? "bg-brand-50 text-brand-700"
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
          <SheetContent
            side="right"
            className="apple-material-strong w-full max-w-xs border-sand-200/80 bg-sand-50/80"
          >
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
