"use client";

import * as React from "react";
import { Bug, Wind, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiseaseType } from "@/types";

/**
 * DiseaseSelector — segmented control.
 *
 * Three options do not need three cards. The previous card layout spent 224px
 * of vertical space and pushed the map below the fold; a segmented control
 * spends 40px and reads as a filter, which is what it is.
 *
 * Diseases carry an icon + label, never a colour: colour belongs to risk
 * (docs/DESIGN-SYSTEM.md §2.4).
 */

type DiseaseSelectorProps = {
  selected: DiseaseType;
  onSelect: (disease: DiseaseType) => void;
  className?: string;
};

const OPTIONS: { id: DiseaseType; label: string; icon: React.ReactNode }[] = [
  { id: "DBD", label: "DBD", icon: <Bug className="h-3.5 w-3.5" /> },
  { id: "ISPA", label: "ISPA", icon: <Wind className="h-3.5 w-3.5" /> },
  { id: "Diare", label: "Diare", icon: <Droplets className="h-3.5 w-3.5" /> },
];

export function DiseaseSelector({ selected, onSelect, className }: DiseaseSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Jenis penyakit"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-paper-100 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-body-sm font-medium",
              "transition-colors duration-fast ease-out",
              isSelected
                ? "bg-surface text-foreground shadow-xs"
                : "text-paper-600 hover:text-foreground",
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
