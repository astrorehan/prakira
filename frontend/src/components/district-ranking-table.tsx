"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { ArrowUpDown, Search, AlertTriangle, ShieldCheck, ChevronRight, Filter } from "lucide-react";
import { cn, formatIncidence, RISK_CONFIG } from "@/lib/utils";
import type { KecamatanData, RiskLevel } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type DistrictRankingTableProps = {
  districts: KecamatanData[];
  onSelectDistrict?: (id: string) => void;
  className?: string;
};

export function DistrictRankingTable({
  districts,
  onSelectDistrict,
  className,
}: DistrictRankingTableProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [sortField, setSortField] = useState<"skor_risiko" | "kasus_aktif" | "incidence_rate">("skor_risiko");
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

  const toggleSort = (field: typeof sortField) => {
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kecamatan (mis: Banyumanik, Genuk)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-paper-200 bg-white/80 pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Risk Level Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "tinggi", "sedang", "rendah"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all capitalize",
                riskFilter === lvl
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white/80 border border-paper-200/80 text-muted-foreground hover:bg-paper-100",
              )}
            >
              {lvl === "all" ? "Semua Zona" : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Table Surface */}
      <div className="overflow-x-auto rounded-2xl border border-paper-200/90 bg-white/90 shadow-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-paper-50/80 border-b border-paper-200 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
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
              <th className="py-3.5 px-3">Proyeksi 2-4 Mgg</th>
              <th
                className="py-3.5 px-3 cursor-pointer hover:text-primary transition-colors"
                onClick={() => toggleSort("incidence_rate")}
              >
                <div className="flex items-center gap-1">
                  <span>Incidence Rate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">Cuaca & Iklim BMKG</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-paper-100">
            {filteredAndSorted.map((kec, index) => {
              const riskCfg = RISK_CONFIG[kec.tingkat_risiko];
              return (
                <tr
                  key={kec.id}
                  className="hover:bg-brand-50/50 transition-colors group cursor-pointer"
                  onClick={() => onSelectDistrict && onSelectDistrict(kec.id)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-100 text-[11px] font-semibold text-paper-700">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {kec.nama}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          BPS: {kec.kode_bps} · {(kec.populasi / 1000).toFixed(0)}k jiwa
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm" style={{ color: riskCfg.color }}>
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
                        {riskCfg.label.split(" ")[1] || kec.tingkat_risiko}
                      </Badge>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">{kec.kasus_aktif} kasus</div>
                    <div className="text-[10px] text-muted-foreground">
                      3 mgg: {kec.historical_cases_3w.join(" → ")}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-semibold text-risk-high">
                      {kec.kasus_prediksi} kasus
                    </div>
                    <div className="text-[10px] text-risk-high/80 font-medium">
                      +{kec.delta_mingguan}% proyeksi
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-paper-700">
                      {formatIncidence(kec.incidence_rate)}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="text-brand-700 font-medium">
                      {kec.cuaca.curah_hujan_mm} mm
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {kec.cuaca.suhu_c}°C · {kec.cuaca.kelembaban_pct}% RH
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-primary hover:bg-brand-100"
                    >
                      <span>Detail</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
