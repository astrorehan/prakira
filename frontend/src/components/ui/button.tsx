import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — docs/DESIGN-SYSTEM.md §7.1
 *
 * Radius is `lg` (10px), not a full pill: full-round controls at 44px+ read as
 * a consumer app, not a public-sector instrument. Label weight stops at 500.
 * No `active:scale-*` — presses shift background, they don't shrink geometry.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-700 text-brand-foreground shadow-xs hover:bg-brand-600 active:bg-brand-800",
        secondary:
          "bg-paper-100 text-paper-800 shadow-hairline hover:bg-paper-200 active:bg-paper-300",
        outline:
          "border border-paper-300 bg-surface text-paper-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700",
        ghost: "text-paper-700 hover:bg-paper-100 hover:text-brand-700",
        danger: "bg-risk-high text-white shadow-xs hover:bg-risk-critical",
        link: "h-auto p-0 text-brand-500 underline-offset-4 hover:underline",

        /* Legacy aliases — kept so existing call sites keep compiling.
           Deprecated: use primary / secondary / outline / ghost / danger. */
        default:
          "bg-brand-700 text-brand-foreground shadow-xs hover:bg-brand-600 active:bg-brand-800",
        blue: "bg-brand-700 text-brand-foreground shadow-xs hover:bg-brand-600 active:bg-brand-800",
        glass:
          "border border-paper-300 bg-surface text-paper-800 hover:border-brand-300 hover:bg-brand-50",
        "glass-blue": "bg-brand-100 text-brand-700 hover:bg-brand-300/40",
        destructive: "bg-risk-high text-white shadow-xs hover:bg-risk-critical",
        "risk-low": "bg-risk-low text-white shadow-xs hover:brightness-95",
        "risk-medium": "bg-risk-medium text-white shadow-xs hover:brightness-95",
      },
      size: {
        sm: "h-8 px-3 text-caption",
        default: "h-[38px] px-4 text-body-sm",
        md: "h-[38px] px-4 text-body-sm",
        lg: "h-11 px-5 text-body",
        icon: "h-[38px] w-[38px] p-0",
        "icon-sm": "h-8 w-8 p-0",
        // Legacy: xl collapses onto lg. 56px buttons don't exist in this system.
        xl: "h-11 px-5 text-body",
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
