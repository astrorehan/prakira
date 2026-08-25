import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — docs/DESIGN-SYSTEM.md §7.1
 *
 * Full pill, 40/48/56/64px, label weight 600. This departs from the v1.0 spec
 * (10px radius, 44px cap, weight 500) on purpose: the controls are read from
 * across a room and tapped on phones, and the taller pill won both tests.
 * What still holds: one primary button per screen, and no `active:scale-*` —
 * presses shift background, they don't shrink geometry.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-fast ease-out focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-current",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-700 text-white shadow-xs hover:bg-brand-600 hover:text-white active:bg-brand-800 active:text-white",
        secondary:
          "bg-paper-100 text-paper-800 shadow-hairline hover:bg-paper-200 hover:text-paper-900 active:bg-paper-300",
        outline:
          "border border-paper-300 bg-surface text-paper-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        ghost: "text-paper-700 hover:bg-paper-100 hover:text-brand-700",
        danger: "bg-risk-high text-white shadow-xs hover:bg-risk-critical hover:text-white active:bg-risk-critical active:text-white",
        link: "h-auto p-0 text-brand-500 underline-offset-4 hover:underline",

        /* Aliases — with guaranteed high contrast text on dark backgrounds */
        default:
          "bg-brand-700 text-white shadow-xs hover:bg-brand-600 hover:text-white active:bg-brand-800 active:text-white",
        blue: "bg-brand-700 text-white shadow-xs hover:bg-brand-600 hover:text-white active:bg-brand-800 active:text-white",
        glass:
          "border border-paper-300 bg-surface text-paper-800 hover:border-brand-300 hover:bg-brand-50",
        "glass-blue": "bg-brand-100 text-brand-700 hover:bg-brand-300/40 hover:text-brand-800",
        destructive: "bg-risk-high text-white shadow-xs hover:bg-risk-critical hover:text-white active:bg-risk-critical active:text-white",
        "risk-low": "bg-risk-low text-white shadow-xs hover:brightness-95 hover:text-white",
        "risk-medium": "bg-risk-medium text-white shadow-xs hover:brightness-95 hover:text-white",
      },
      size: {
        sm: "h-10 px-5 text-xs rounded-full",
        default: "h-12 px-6 text-sm rounded-full",
        md: "h-12 px-6 text-sm rounded-full",
        lg: "h-14 px-7 text-base rounded-full",
        xl: "h-16 px-8 text-lg rounded-full",
        icon: "h-12 w-12 p-0 rounded-full",
        "icon-sm": "h-10 w-10 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Memproses…</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
