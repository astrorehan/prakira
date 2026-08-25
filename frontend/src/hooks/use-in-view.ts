"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fraction of the element that must be visible before it counts as in view. */
  threshold?: number;
  /** Shrinks the viewport so the reveal fires slightly before the edge. */
  rootMargin?: string;
  /** Reveal once and stay revealed. Scroll-jitter re-animation reads as broken. */
  once?: boolean;
};

/**
 * Viewport-entry observer for scroll-driven reveals.
 *
 * Falls back to "always visible" when IntersectionObserver is missing or the
 * reader asked for reduced motion — content must never depend on animation to
 * become readable.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    /* Belt and braces: if the element is already on screen at mount, reveal it
       without waiting for the first observer callback. Content that is visible
       must never depend on a callback arriving. */
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      if (once) return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
