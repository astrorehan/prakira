import * as React from "react";
import { Bug, Wind, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiseaseType } from "@/types";

type DiseaseSelectorProps = {
  selected: DiseaseType;
  onSelect: (disease: DiseaseType) => void;
  className?: string;
};

export function DiseaseSelector({ selected, onSelect, className }: DiseaseSelectorProps) {
  const options: { id: DiseaseType; label: string; sub: string; icon: React.ReactNode; color: string; badge: string }[] = [
    {
      id: "DBD",
      label: "Demam Berdarah (DBD)",
      sub: "Vektor Nyamuk & Hujan",
      icon: <Bug className="h-4 w-4" />,
      color: "from-brand-500/20 to-brand-500/20 border-brand-500 text-brand-700",
      badge: "3 Wilayah Siaga",
    },
    {
      id: "ISPA",
      label: "Infeksi Pernapasan (ISPA)",
      sub: "Partikulat Udara & Debu",
      icon: <Wind className="h-4 w-4" />,
      color: "from-brand-500/20 to-brand-500/20 border-brand-500 text-brand-700",
      badge: "4 Wilayah Siaga",
    },
    {
      id: "Diare",
      label: "Diare & Saluran Cerna",
      sub: "Sanitasi & Banjir Rob",
      icon: <Droplets className="h-4 w-4" />,
      color: "from-brand-500/20 to-risk-low/20 border-brand-500 text-brand-700",
      badge: "3 Wilayah Siaga",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl p-1.5 liquid-glass border border-white/90 shadow-glass-sm",
        className,
      )}
    >
      {options.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "flex flex-1 min-w-[220px] items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-left transition-all duration-200",
              isSelected
                ? "bg-white shadow-card border border-brand-200 text-foreground ring-2 ring-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform",
                  isSelected
                    ? "bg-primary text-white shadow-sm scale-105"
                    : "bg-paper-100 text-paper-600",
                )}
              >
                {opt.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.sub}</span>
              </div>
            </div>

            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isSelected
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "bg-paper-100 text-paper-600",
              )}
            >
              {opt.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
