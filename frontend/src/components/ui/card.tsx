import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card — docs/DESIGN-SYSTEM.md §7.2
 *
 * Padding follows --card-pad, so the same component is dense on the console
 * and roomy on the public surface without a prop.
 * `nested` drops the shadow: stacked shadows are what make a UI look foamy.
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  nested?: boolean;
  interactive?: boolean;
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, nested = false, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border text-foreground",
        nested
          ? "border-border bg-paper-100"
          : "border-border bg-surface shadow-card",
        interactive &&
          "transition-colors duration-base ease-out hover:border-border-strong hover:bg-paper-50",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 p-[var(--card-pad)]", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-h3 text-foreground", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-caption text-paper-600", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-[var(--card-pad)] pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 border-t border-border px-[var(--card-pad)] py-3",
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
