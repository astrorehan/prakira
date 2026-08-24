import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — docs/DESIGN-SYSTEM.md §7.4
 *
 * Risk badges must always carry an icon and a text label: colour alone never
 * encodes risk (WCAG 1.4.1). `risk-none` is a first-class class, not a fallback
 * to "low" — a district with thin data is not a safe district.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-700 text-white font-semibold",
        secondary: "border-brand-300/40 bg-brand-100 text-brand-700 font-semibold",
        outline: "border-paper-300 bg-surface text-paper-700",
        muted: "border-transparent bg-paper-100 text-paper-600",

        "risk-low": "border-risk-low-br bg-risk-low-bg text-risk-low",
        "risk-medium": "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
        "risk-high": "border-risk-high-br bg-risk-high-bg text-risk-high",
        "risk-critical": "border-risk-critical-br bg-risk-critical-bg text-risk-critical",
        "risk-none": "border-risk-none-br bg-risk-none-bg text-risk-none",

        /* Provenance: verified citizen signal is visually distinct from
           official Dinkes data. Required by PRD §7-H4. */
        official: "border-brand-300/40 bg-brand-50 text-brand-700",
        citizen: "border-paper-300 border-dashed bg-paper-50 text-paper-600",

        /* Legacy aliases. */
        glass: "border-paper-300 bg-surface text-paper-700",
        "glass-blue": "border-brand-300/40 bg-brand-100 text-brand-700",
        "disease-dbd": "border-paper-300 bg-surface text-paper-700",
        "disease-ispa": "border-paper-300 bg-surface text-paper-700",
        "disease-diare": "border-paper-300 bg-surface text-paper-700",
      },
      size: {
        sm: "px-1.5 text-[0.6875rem]",
        default: "px-2 text-caption",
        lg: "px-2.5 py-1 text-body-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders a single slow-pulsing dot. Reserve for genuinely live status. */
  pulse?: boolean;
}

function Badge({ className, variant, size, pulse = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-current" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
