"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn, CLIMATE_COLORS } from "@/lib/utils";
import type { ClimateCorrelationPoint, DiseaseType } from "@/types";

/**
 * Rekapitulasi cuaca vs kejadian penyakit.
 *
 * Tabel ini dulu mencetak ulang deret yang persis sama dengan grafik di
 * atasnya, tanpa urutan, tanpa penyaring, dan tanpa kaitan apa pun dengan
 * penyakit yang sedang dipilih — jadi ia hanya menambah gulir. Sebagai
 * *drill-down* ia baru berguna kalau bisa diurutkan: "bulan mana curah
 * hujannya tertinggi, dan apakah kasusnya ikut naik" adalah pertanyaan yang
 * tidak terjawab oleh grafik.
 *
 * Kolom penyakit aktif ditandai; dua lainnya tetap tampil karena
 * perbandingan antar penyakit adalah alasan tabel ini ada.
 */

type SortKey = keyof ClimateCorrelationPoint;
type Direction = "asc" | "desc";

const DISEASE_COLUMN: Record<DiseaseType, SortKey> = {
  DBD: "kasus_dbd",
  ISPA: "kasus_ispa",
  Diare: "kasus_diare",
};

const COLUMNS: {
  key: SortKey;
  label: string;
  unit?: string;
  /** Kolom angka rata kanan (§7.7). */
  numeric: boolean;
  swatch?: string;
}[] = [
  { key: "periode", label: "Periode", numeric: false },
  { key: "curah_hujan_mm", label: "Curah hujan", unit: "mm", numeric: true, swatch: CLIMATE_COLORS.rain },
  { key: "suhu_c", label: "Suhu", unit: "°C", numeric: true, swatch: CLIMATE_COLORS.temp },
  { key: "kelembaban_pct", label: "Kelembaban", unit: "%", numeric: true, swatch: CLIMATE_COLORS.humid },
  { key: "kasus_dbd", label: "Kasus DBD", numeric: true },
  { key: "kasus_ispa", label: "Kasus ISPA", numeric: true },
  { key: "kasus_diare", label: "Kasus Diare", numeric: true },
];

export function ClimateRecapTable({
  data,
  disease,
  className,
}: {
  data: ClimateCorrelationPoint[];
  disease: DiseaseType;
  className?: string;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("periode");
  const [direction, setDirection] = React.useState<Direction>("asc");

  const activeColumn = DISEASE_COLUMN[disease];

  const rows = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "id");
    });
    return direction === "asc" ? sorted : sorted.reverse();
  }, [data, sortKey, direction]);

  /* Skala bar dalam sel dihitung dari nilai maksimum kolom aktif, bukan dari
     angka tetap — kalau datanya berganti, barnya ikut benar. */
  const maxActive = React.useMemo(
    () => Math.max(...data.map((d) => Number(d[activeColumn])), 1),
    [data, activeColumn],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      /* Kolom teks mulai menaik, kolom angka mulai menurun: yang dicari orang
         dari kolom angka hampir selalu nilai terbesarnya. */
      setDirection(key === "periode" ? "asc" : "desc");
    }
  };

  if (data.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface p-8 text-center", className)}>
        <p className="text-body-sm text-paper-600">
          Belum ada rekapitulasi iklim untuk periode ini.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-surface", className)}>
      <table className="w-full text-left">
        <caption className="sr-only">
          Rekapitulasi curah hujan, suhu, kelembaban, dan jumlah kasus per periode. Kolom dapat
          diurutkan.
        </caption>
        <thead className="sticky top-0 z-10 bg-paper-100">
          <tr>
            {COLUMNS.map((col) => {
              const sorted = sortKey === col.key;
              const isActiveDisease = col.key === activeColumn;
              const SortIcon = !sorted ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sorted ? (direction === "asc" ? "ascending" : "descending") : "none"}
                  className={cn(
                    "border-b border-border px-3 py-2",
                    isActiveDisease && "bg-brand-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded text-overline uppercase transition-colors hover:text-foreground",
                      col.numeric && "justify-end",
                      sorted ? "text-foreground" : "text-paper-600",
                    )}
                  >
                    {col.swatch && (
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: col.swatch }}
                      />
                    )}
                    <span>
                      {col.label}
                      {col.unit ? ` (${col.unit})` : ""}
                    </span>
                    <SortIcon
                      className={cn("h-3 w-3 shrink-0", sorted ? "text-brand-700" : "text-paper-600")}
                      aria-hidden="true"
                    />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.periode} className="transition-colors hover:bg-paper-50">
              {COLUMNS.map((col) => {
                const isActiveDisease = col.key === activeColumn;
                const value = row[col.key];

                return (
                  <td
                    key={col.key}
                    className={cn(
                      "h-[var(--row-h)] px-3 text-body-sm",
                      col.numeric ? "text-right" : "font-medium text-foreground",
                      isActiveDisease ? "bg-brand-50/60 font-semibold text-foreground" : "text-paper-700",
                    )}
                  >
                    {isActiveDisease ? (
                      <span className="flex items-center justify-end gap-2">
                        <span
                          aria-hidden="true"
                          className="hidden h-1.5 rounded-full bg-brand-300 sm:block"
                          style={{ width: `${(Number(value) / maxActive) * 56}px` }}
                        />
                        <span className="tabular">{value}</span>
                      </span>
                    ) : (
                      <span className="tabular">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
