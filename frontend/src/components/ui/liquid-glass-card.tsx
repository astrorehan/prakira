import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassVariants = cva(
  "relative rounded-2xl transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "liquid-glass text-foreground",
        blue:
          "liquid-glass-blue text-foreground",
        frost:
          "liquid-glass-frost text-foreground",
        solid:
          "bg-surface border border-border text-foreground shadow-card",
        "risk-high":
          "liquid-glass-risk-high text-foreground",
        "risk-medium":
          "liquid-glass-risk-medium text-foreground",
        "risk-low":
          "liquid-glass-risk-low text-foreground",
      },
      elevation: {
        none: "",
        sm: "shadow-glass-sm",
        md: "shadow-glass-md",
        lg: "shadow-glass-lg",
      },
      interactive: {
        true: "liquid-glass-interactive cursor-pointer",
        false: "",
      },
      sheen: {
        true: "glass-sheen",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      elevation: "md",
      interactive: false,
      sheen: false,
    },
  },
);

export interface LiquidGlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassVariants> {
  glowBorder?: boolean;
}

const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  ({ className, variant, elevation, interactive, sheen, glowBorder = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glassVariants({ variant, elevation, interactive, sheen }),
          glowBorder && "hover:border-primary/40 hover:shadow-glow",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

LiquidGlassCard.displayName = "LiquidGlassCard";

const LiquidGlassHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  ),
);
LiquidGlassHeader.displayName = "LiquidGlassHeader";

const LiquidGlassTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-display text-lg font-semibold leading-tight tracking-tight text-foreground", className)}
      {...props}
    />
  ),
);
LiquidGlassTitle.displayName = "LiquidGlassTitle";

const LiquidGlassDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
LiquidGlassDescription.displayName = "LiquidGlassDescription";

const LiquidGlassContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
LiquidGlassContent.displayName = "LiquidGlassContent";

const LiquidGlassFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0 border-t border-white/40 mt-4", className)}
      {...props}
    />
  ),
);
LiquidGlassFooter.displayName = "LiquidGlassFooter";

export {
  LiquidGlassCard,
  LiquidGlassHeader,
  LiquidGlassTitle,
  LiquidGlassDescription,
  LiquidGlassContent,
  LiquidGlassFooter,
  glassVariants,
};
