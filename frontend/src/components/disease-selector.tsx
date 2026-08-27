"use client";

import * as React from "react";
import { Activity, Bug, Droplets, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiseaseType } from "@/types";

/**
 * DiseaseSelector — segmented control.
 *
 * Tiga pilihan tidak butuh tiga kartu. Tata letak kartu sebelumnya memakan
 * 224px ruang vertikal dan mendorong peta ke bawah lipatan; segmented control
 * memakan 40px dan terbaca sebagai filter — memang itu fungsinya.
 *
 * Daftar penyakitnya kini dikirim pemanggil, yang mendapatkannya dari gateway.
 * Versi sebelumnya menuliskan tiga pilihan tetap termasuk "Diare", yang tidak
 * punya satu baris pun di dataset: memilihnya menampilkan dashboard penuh
 * angka untuk penyakit yang tidak pernah dilatih modelnya.
 *
 * Penyakit dibedakan ikon + label, tidak pernah warna: warna milik tingkat
 * risiko (docs/DESIGN-SYSTEM.md §2.4).
 */

type DiseaseSelectorProps = {
  options: DiseaseType[];
  selected: DiseaseType | null;
  onSelect: (disease: DiseaseType) => void;
  className?: string;
};

const ICONS: Record<string, React.ReactNode> = {
  DBD: <Bug className="h-3.5 w-3.5" />,
  ISPA: <Wind className="h-3.5 w-3.5" />,
  Diare: <Droplets className="h-3.5 w-3.5" />,
};

export function DiseaseSelector({
  options,
  selected,
  onSelect,
  className,
}: DiseaseSelectorProps) {
  if (options.length === 0) {
    return (
      <p className={cn("text-body-sm text-paper-600", className)}>
        Belum ada penyakit dengan data di sistem.
      </p>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Jenis penyakit"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-paper-100 p-0.5",
        className,
      )}
    >
      {options.map((id) => {
        const isSelected = selected === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(id)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-body-sm font-medium",
              "transition-colors duration-fast ease-out",
              isSelected
                ? "bg-surface text-foreground shadow-xs"
                : "text-paper-600 hover:text-foreground",
            )}
          >
            {ICONS[id] ?? <Activity className="h-3.5 w-3.5" />}
            <span>{id}</span>
          </button>
        );
      })}
    </div>
  );
}
