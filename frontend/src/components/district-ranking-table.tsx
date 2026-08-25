"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Siren,
  CloudRain,
  MapPin,
} from "lucide-react";
import { cn, formatIncidence, formatNumber, RISK_CONFIG } from "@/lib/utils";
import type { KecamatanData, RiskLevel } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface DistrictRankingTableProps {
  districts: KecamatanData[];
  selectedId?: string | null;
  onSelectDistrict?: (id: string) => void;
  className?: string;
}

type SortField = "skor_risiko" | "kasus_aktif" | "kasus_prediksi" | "incidence_rate";

export function DistrictRankingTable({
  districts,
  selectedId,
  onSelectDistrict,
  className,
}: DistrictRankingTableProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [sortField, setSortField] = useState<SortField>("skor_risiko");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSorted = useMemo(() => {
    let result = [...districts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.nama.toLowerCase().includes(q) ||
          d.kode_bps.includes(q),
      );
    }

    if (riskFilter !== "all") {
      result = result.filter((d) => d.tingkat_risiko === riskFilter);
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortOrder === "desc" ? valB - valA : valA - valB;
    });

    return result;
  }, [districts, search, riskFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kecamatan (mis: Pedurungan, Banyumanik)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-paper-200 bg-white/90 pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Risk Level Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "tinggi", "sedang", "rendah"] as const).map((lvl) => {
            const isActive = riskFilter === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs",
                  isActive
                    ? "bg-primary text-white shadow-sm font-bold"
                    : "bg-white/80 border border-paper-200/80 text-muted-foreground hover:bg-paper-100 hover:text-foreground",
                )}
              >
                {lvl === "all"
                  ? "Semua Zona"
                  : lvl === "tinggi"
                  ? "Zona Siaga (Tinggi)"
                  : lvl === "sedang"
                  ? "Zona Waspada (Sedang)"
                  : "Zona Rendah (Aman)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Surface */}
      <div className="overflow-x-auto rounded-2xl border border-paper-200/90 bg-white/90 shadow-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-paper-50/90 border-b border-paper-200 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Peringkat & Kecamatan</th>
              <th
                className="py-3.5 px-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => toggleSort("skor_risiko")}
              >
                <div className="flex items-center gap-1">
                  <span>Skor Risiko</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3.5 px-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => toggleSort("kasus_aktif")}
              >
                <div className="flex items-center gap-1">
                  <span>Kasus Aktif</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">Proyeksi 2–4 Mgg</th>
              <th
                className="py-3.5 px-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => toggleSort("incidence_rate")}
              >
                <div className="flex items-center gap-1">
                  <span>Incidence Rate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">Cuaca BMKG</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-paper-100">
            {filteredAndSorted.map((kec, index) => {
              const riskCfg = RISK_CONFIG[kec.tingkat_risiko];
              const isSelected = kec.id === selectedId;

              return (
                <tr
                  key={kec.id}
                  onClick={() => onSelectDistrict && onSelectDistrict(kec.id)}
                  className={cn(
                    "transition-colors group cursor-pointer",
                    isSelected
                      ? "bg-brand-50/80 font-medium"
                      : "hover:bg-brand-50/40",
                  )}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                          index < 3
                            ? "bg-risk-high-bg text-risk-high border border-risk-high-br/60"
                            : "bg-paper-100 text-paper-700",
                        )}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span>{kec.nama}</span>
                          {isSelected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          BPS: <span className="font-mono">{kec.kode_bps}</span> ·{" "}
                          {(kec.populasi / 1000).toFixed(0)}k jiwa · {kec.luas_km2} km²
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-display font-bold text-sm"
                        style={{ color: riskCfg.color }}
                      >
                        {kec.skor_risiko}
                      </span>
                      <Badge
                        variant={
                          kec.tingkat_risiko === "tinggi"
                            ? "risk-high"
                            : kec.tingkat_risiko === "sedang"
                            ? "risk-medium"
                            : "risk-low"
                        }
                        size="sm"
                      >
                        {riskCfg.label}
                      </Badge>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-foreground">
                      {formatNumber(kec.kasus_aktif)} kasus
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      3 mgg: {kec.historical_cases_3w.join(" → ")}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-risk-high">
                      {formatNumber(kec.kasus_prediksi)} kasus
                    </div>
                    <div className="text-[10px] text-risk-high font-semibold">
                      +{kec.delta_mingguan}% potensi lonjakan
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-paper-700">
                      {formatIncidence(kec.incidence_rate)}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="text-brand-700 font-semibold flex items-center gap-1">
                      <CloudRain className="h-3 w-3" />
                      <span>{kec.cuaca.curah_hujan_mm} mm</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {kec.cuaca.suhu_c}°C · {kec.cuaca.kelembaban_pct}% RH
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3 rounded-xl text-xs font-semibold"
                    >
                      <span>{isSelected ? "Terpilih" : "Detail"}</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}

            {filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  Tidak ada kecamatan yang cocok dengan kriteria pencarian & filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
