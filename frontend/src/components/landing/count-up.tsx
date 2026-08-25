"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface CountUpProps {
  to: number;
  /** Decimals to keep — R² needs 2, a district count needs 0. */
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Ease-out cubic: fast start, settles gently. Linear counters look mechanical. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Number that counts up the first time it scrolls into view. The final value is
 * rendered immediately for reduced-motion readers and for no-JS/SSR output.
 */
export function CountUp({
  to,
  decimals = 0,
  duration = 1400,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(to);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(to * easeOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
