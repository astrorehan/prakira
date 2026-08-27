"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn, CLIMATE_COLORS, formatMaybeNumber } from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import type { ClimatePoint, DiseaseType } from "@/types";

/**
 * Rekapitulasi iklim vs kejadian penyakit.
 *
 * Tabel ini dulu mencetak ulang deret yang persis sama dengan grafik di
 * atasnya, tanpa urutan dan tanpa kaitan dengan penyakit yang sedang dipilih.
 * Sebagai *drill-down* ia baru berguna kalau bisa diurutkan: "bulan mana curah
 * hujannya tertinggi, dan apakah kasusnya ikut naik" tidak terjawab grafik.
 *
 * Kolom penyakit tidak lagi tiga kolom tetap. Daftarnya dibentuk dari penyakit
 * yang benar-benar ada di deret, sehingga kolom "Kasus Diare" tidak lagi
 * berdiri kosong hanya karena pernah ditulis di sini.
 */

type Direction = "asc" | "desc";

type Column = {
  key: string;
  label: string;
  unit?: string;
  /** Kolom angka rata kanan (§7.7). */
  numeric: boolean;
  swatch?: string;
  value: (row: ClimatePoint) => number | string | null;
};

const BASE_COLUMNS: Column[] = [
  {
    key: "periode",
    label: "Periode",
    numeric: false,
    value: (row) => row.periode,
  },
  {
    key: "curah_hujan_mm",
    label: "Curah hujan",
    unit: "mm",
    numeric: true,
    swatch: CLIMATE_COLORS.rain,
    value: (row) => row.curah_hujan_mm,
  },
  {
    key: "suhu_c",
    label: "Suhu",
    unit: "°C",
    numeric: true,
    swatch: CLIMATE_COLORS.temp,
    value: (row) => row.suhu_c,
  },
  {
    key: "kelembaban_pct",
    label: "Kelembaban",
    unit: "%",
    numeric: true,
    swatch: CLIMATE_COLORS.humid,
    value: (row) => row.kelembaban_pct,
  },
];

export function ClimateRecapTable({
  data,
  disease,
  diseases,
  className,
}: {
  data: ClimatePoint[];
  disease: DiseaseType;
  /** Penyakit yang punya data. Menentukan kolom kasus yang ditampilkan. */
  diseases: DiseaseType[];
  className?: string;
}) {
  const columns = React.useMemo<Column[]>(
    () => [
      ...BASE_COLUMNS,
      ...diseases.map((name) => ({
        key: `kasus:${name}`,
        label: `Kasus ${name}`,
        numeric: true,
        value: (row: ClimatePoint) => row.kasus[name] ?? null,
      })),
    ],
    [diseases],
  );

  const activeKey = `kasus:${disease}`;
  const [sortKey, setSortKey] = React.useState("periode");
  const [direction, setDirection] = React.useState<Direction>("asc");

  const column = (key: string) => columns.find((c) => c.key === key) ?? columns[0];

  const rows = React.useMemo(() => {
    const accessor = column(sortKey).value;
    const sorted = [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      /* Nilai kosong selalu di bawah, apa pun arah pengurutannya. */
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv), "id");
    });
    return direction === "asc" ? sorted : sorted.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, direction, columns]);

  /* Skala bar dalam sel dihitung dari nilai maksimum kolom aktif, bukan dari
     angka tetap — kalau datanya berganti, barnya ikut benar. */
  const maxActive = React.useMemo(() => {
    const accessor = column(activeKey).value;
    return Math.max(
      ...data.map((d) => {
        const v = accessor(d);
        return typeof v === "number" ? v : 0;
      }),
      1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeKey, columns]);

  const toggleSort = (key: string) => {
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
          Rekapitulasi curah hujan, suhu, kelembaban, dan jumlah kasus per bulan. Kolom
          dapat diurutkan.
        </caption>
        <thead className="sticky top-0 z-10 bg-paper-100">
          <tr>
            {columns.map((col) => {
              const sorted = sortKey === col.key;
              const isActiveDisease = col.key === activeKey;
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
              {columns.map((col) => {
                const isActiveDisease = col.key === activeKey;
                const raw = col.value(row);
                const display =
                  col.key === "periode"
                    ? formatMonth(row.periode)
                    : typeof raw === "number"
                      ? formatMaybeNumber(raw)
                      : (raw ?? "—");

                return (
                  <td
                    key={col.key}
                    className={cn(
                      "h-[var(--row-h)] px-3 text-body-sm",
                      col.numeric ? "text-right" : "font-medium text-foreground",
                      isActiveDisease
                        ? "bg-brand-50/60 font-semibold text-foreground"
                        : "text-paper-700",
                    )}
                  >
                    {isActiveDisease && typeof raw === "number" ? (
                      <span className="flex items-center justify-end gap-2">
                        <span
                          aria-hidden="true"
                          className="hidden h-1.5 rounded-full bg-brand-300 sm:block"
                          style={{ width: `${(raw / maxActive) * 56}px` }}
                        />
                        <span className="tabular">{display}</span>
                      </span>
                    ) : (
                      <span className="tabular">{display}</span>
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
