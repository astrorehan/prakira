"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, string> = {
  up: "0px, 22px, 0px",
  down: "0px, -22px, 0px",
  left: "26px, 0px, 0px",
  right: "-26px, 0px, 0px",
  none: "0px, 0px, 0px",
};

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as a different tag so reveals never break document semantics. */
  as?: React.ElementType;
  delay?: number;
  direction?: Direction;
  /** Slight scale-in. Off by default — it reads as noise on text blocks. */
  scale?: boolean;
  threshold?: number;
  duration?: number;
}

/**
 * Scroll-triggered entrance. The animation lives in CSS ([data-reveal]); this
 * only flips the visibility flag, so a reader with reduced motion sees the
 * final state immediately.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  direction = "up",
  scale = false,
  threshold = 0.15,
  duration = 700,
  className,
  style,
  children,
  ...props
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-visible={inView ? "true" : "false"}
      className={cn(className)}
      style={
        {
          "--reveal-offset": OFFSET[direction],
          "--reveal-scale": scale ? "0.97" : "1",
          "--reveal-delay": `${delay}ms`,
          "--reveal-duration": `${duration}ms`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Tag>
  );
}
