import * as React from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

interface SectionHeadingProps {
  /** Mono kicker. Doubles as the section's number in the page's running order. */
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Slot for a control that belongs to the section, e.g. a disease switcher. */
  aside?: React.ReactNode;
}

/**
 * One heading treatment for every section, so the page reads as a single
 * publication instead of five stacked templates. A hairline rule carries the
 * kicker — the sections below never repeat a coloured pill badge.
 */
export function SectionHeading({
  kicker,
  title,
  lead,
  align = "left",
  className,
  aside,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <Reveal
      className={cn(
        "w-full",
        centered && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-baseline gap-4 border-t border-ocean-100 pt-4",
          centered && "justify-center",
        )}
      >
        {/* The rule keeps its hairline; a short ocean-to-violet stroke on top
            is the one splash of colour every section shares. */}
        <span
          aria-hidden
          className={cn(
            "absolute -top-px h-[3px] w-16 rounded-full bg-grad-ink",
            centered ? "left-1/2 -translate-x-1/2" : "left-0",
          )}
        />
        <span className="font-mono text-overline uppercase text-ocean-600">
          {kicker}
        </span>
      </div>

      <div
        className={cn(
          "mt-6 gap-8 md:flex md:items-end md:justify-between",
          centered && "md:block",
        )}
      >
        <div className={cn(centered ? "mx-auto max-w-2xl" : "max-w-2xl")}>
          <h2 className="text-h2 text-balance text-foreground md:text-h1">{title}</h2>
          {lead ? (
            <p
              className={cn(
                "mt-4 text-body-lg text-paper-600",
                centered ? "mx-auto max-w-xl" : "max-w-xl",
              )}
            >
              {lead}
            </p>
          ) : null}
        </div>

        {aside ? <div className="mt-6 shrink-0 md:mt-0">{aside}</div> : null}
      </div>
    </Reveal>
  );
}
