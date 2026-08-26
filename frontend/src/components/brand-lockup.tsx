import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

/* The lockup: mark + wordmark, one component, six call sites.
   Spec: public/brand/README.md §"Lockup".

   Before this existed each surface hand-rolled its own — six tile sizes
   (28/36/40/40/44/48px), four radii, and two colour tokens for the same tile,
   with the mark filling only 45–57% of it. The mark read as small because it
   was small: the tile was doing the work the mark should have done.

   Two rules this encodes:

   1. The tile is a platform container, not part of the identity. It survives
      only where an OS or browser forces a square — favicon, apple-icon, PWA,
      maskable. In-app the mark is bare, which is also what DESIGN-SYSTEM.md §1
      principle 1 asks for: a solid bg-brand-700 tile is the most saturated
      thing on a console screen, and saturation is reserved for risk.

   2. The mark sizes to the wordmark block, not to a tile. Bare, it is roughly
      twice its old apparent size at zero layout cost.

   Stroke is held near 2px rendered at every size — the mark shares rows with
   lucide icons (default 2 on a 24 grid), so it behaves as an icon, not as a
   logo scaled uniformly. Hence strokeWidth falls as the mark grows. */

type LockupSize = "sm" | "md" | "lg";

/* Subline sits at ~62% of the title. `text-overline` (0.6875rem = 12.4px at the
   112.5% root) is too loud next to a 16px wordmark — it competes instead of
   labelling. Sized in rem, not the fixed px the old hand-rolled lockups used, so
   the a11y text-size classes still move it. */
const SIZES: Record<
  LockupSize,
  { mark: string; stroke: number; title: string; sub: string; gap: string }
> = {
  sm: { mark: "h-6 w-6", stroke: 2, title: "text-base", sub: "text-[0.5625rem]", gap: "gap-2" },
  md: { mark: "h-7 w-7", stroke: 1.75, title: "text-base", sub: "text-[0.5625rem]", gap: "gap-2" },
  lg: { mark: "h-9 w-9", stroke: 1.35, title: "text-xl", sub: "text-[0.625rem]", gap: "gap-2.5" },
};

export function BrandLockup({
  size = "md",
  subline,
  sublineClassName,
  inverted = false,
  href = "/",
  className,
}: {
  size?: LockupSize;
  /* Omit for the wordmark alone. The subline is the service name, not a
     tagline — it changes per surface, so it is never baked in here. */
  subline?: string;
  /* Responsive visibility only, e.g. "hidden sm:block". Colour and type scale
     stay under this component's control. */
  sublineClassName?: string;
  inverted?: boolean;
  href?: string;
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <Link href={href} className={cn("flex items-center", s.gap, className)}>
      <BrandMark
        strokeWidth={s.stroke}
        className={cn(s.mark, inverted ? "text-brand-50" : "text-brand-700")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            s.title,
            "font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Prakira
        </span>
        {subline ? (
          <span
            className={cn(
              s.sub,
              "mt-1 font-medium uppercase tracking-[0.08em]",
              inverted ? "text-white/55" : "text-paper-500",
              sublineClassName,
            )}
          >
            {subline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
