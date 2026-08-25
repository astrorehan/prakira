"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Lock,
  RotateCw,
  MapPin,
  Bug,
  Wind,
  Droplets,
  Check,
  ArrowDown,
  Activity,
  X,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getKecamatanDataList } from "@/lib/mock-data";
import type { DiseaseType, RiskLevel } from "@/types";

interface MacRiskBrowserProps {
  /** `null` when the reader has not chosen — the browser opens on the top score. */
  selectedKecamatan: string | null;
  onSelectKecamatan: (name: string) => void;
  className?: string;
}

/** Top three kecamatan for a disease, by score. Derived rather than written
 *  down, so the label can never drift away from the data it describes. */
function hotspotsFor(disease: DiseaseType): string {
  return [...getKecamatanDataList(disease)]
    .sort((a, b) => b.skor_risiko - a.skor_risiko)
    .slice(0, 3)
    .map((k) => k.nama)
    .join(", ");
}

const DISEASE_CONFIG: Record<
  DiseaseType,
  {
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
    bgBadge: string;
  }
> = {
  DBD: {
    label: "Demam Berdarah (DBD)",
    shortLabel: "DBD",
    icon: Bug,
    color: "#A8442C",
    bgBadge: "bg-risk-high/10 text-risk-high border-risk-high/20",
  },
  ISPA: {
    label: "Infeksi Pernapasan (ISPA)",
    shortLabel: "ISPA",
    icon: Wind,
    color: "#2E6F8E",
    bgBadge: "bg-brand-50 text-brand-700 border-brand-200",
  },
  Diare: {
    label: "Diare & Pencernaan",
    shortLabel: "Diare",
    icon: Droplets,
    color: "#4E8C7E",
    bgBadge: "bg-risk-low-bg text-risk-low border-risk-low-br",
  },
};

export function MacRiskBrowser({
  selectedKecamatan,
  onSelectKecamatan,
  className,
}: MacRiskBrowserProps) {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>("DBD");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [isDiseaseDropdownOpen, setIsDiseaseDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [hoveredKecamatan, setHoveredKecamatan] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get live data list according to selected disease
  const kecamatanList = getKecamatanDataList(selectedDisease);

  // Find active kecamatan detail. With nothing hovered or chosen, fall back to
  // the highest score for the current disease rather than a fixed district.
  const activeDistrictData =
    kecamatanList.find((k) => k.nama === (hoveredKecamatan || selectedKecamatan)) ||
    [...kecamatanList].sort((a, b) => b.skor_risiko - a.skor_risiko)[0];

  // Count risk levels
  const siagaCount = kecamatanList.filter((k) => k.tingkat_risiko === "tinggi").length;
  const waspadaCount = kecamatanList.filter((k) => k.tingkat_risiko === "sedang").length;
  const rendahCount = kecamatanList.filter((k) => k.tingkat_risiko === "rendah").length;

  // Handle outside click for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDiseaseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const scrollToResults = () => {
    document.getElementById("risk-check")?.scrollIntoView({ behavior: "smooth" });
  };

  const getRiskColor = (level: RiskLevel) => {
    if (level === "tinggi") {
      return {
        bg: "linear-gradient(135deg, #A8442C 0%, #8D321D 100%)",
        border: "rgba(255, 255, 255, 0.2)",
        label: "SIAGA",
        badgeBg: "bg-risk-high/15 text-risk-high border-risk-high/30",
        dot: "#A8442C",
      };
    }
    if (level === "sedang") {
      return {
        bg: "linear-gradient(135deg, #D4933A 0%, #B77A23 100%)",
        border: "rgba(255, 255, 255, 0.2)",
        label: "WASPADA",
        badgeBg: "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
        dot: "#D4933A",
      };
    }
    return {
      bg: "linear-gradient(135deg, #1F5132 0%, #153D25 100%)",
      border: "rgba(255, 255, 255, 0.2)",
      label: "RENDAH",
      badgeBg: "bg-risk-low/15 text-risk-low border-risk-low/30",
      dot: "#1F5132",
    };
  };

  const currentDiseaseInfo = DISEASE_CONFIG[selectedDisease];
  const DiseaseIcon = currentDiseaseInfo.icon;

  return (
    <div className={cn("relative w-full max-w-[460px] group/browser select-none", className)}>
      {/* Ambient Backlight Glow (Apple Display effect) */}
      <div
        aria-hidden="true"
        className="absolute -inset-2.5 -z-10 rounded-[34px] bg-gradient-to-tr from-brand-700/15 via-brand-500/10 to-risk-medium/10 blur-xl opacity-70 group-hover/browser:opacity-95 transition-opacity duration-500"
      />

      {/* ── macOS Browser Window Outer Shell ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[26px] border border-white/90 bg-white/95 shadow-[0_20px_50px_-15px_rgba(14,34,37,0.18),0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300">
        
        {/* ── 1. macOS Chrome Title Bar ────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-paper-200/90 bg-gradient-to-b from-paper-50/90 to-paper-100/70 px-4 py-3 backdrop-blur-md">
          {/* macOS Traffic Lights */}
          <div className="flex items-center gap-2 group/lights">
            <button
              type="button"
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
              title="Tutup Drawer"
              onClick={() => setIsDrawerOpen(false)}
            >
              <span className="opacity-0 group-hover/lights:opacity-100 text-[8px] font-semibold text-black/60 leading-none">
                ×
              </span>
            </button>
            <button
              type="button"
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
              title="Toggle Drawer"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              <span className="opacity-0 group-hover/lights:opacity-100 text-[8px] font-semibold text-black/60 leading-none">
                –
              </span>
            </button>
            <button
              type="button"
              className="relative flex h-3 w-3 items-center justify-center rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
              title="Scroll ke Hasil Lengkap"
              onClick={scrollToResults}
            >
              <span className="opacity-0 group-hover/lights:opacity-100 text-[7px] font-semibold text-black/60 leading-none">
                +
              </span>
            </button>
          </div>

          {/* Safari / Arc Omnibar (Mac Address Bar) */}
          <div className="flex-1 max-w-[270px] mx-2">
            <div className="flex items-center justify-between gap-1.5 rounded-full bg-white/90 border border-paper-200/90 px-3 py-1 text-[11px] shadow-[0_1px_2px_rgba(14,34,37,0.04),inset_0_1px_1px_rgba(255,255,255,1)]">
              <div className="flex items-center gap-1.5 truncate text-paper-700">
                <Lock className="h-3 w-3 text-risk-low shrink-0" />
                <span className="font-semibold text-brand-900 tracking-tight">prakira.id</span>
                <span className="text-paper-400 font-light">/</span>
                <span className="text-paper-600 truncate font-mono text-[10.5px]">
                  semarang?p={selectedDisease.toLowerCase()}
                </span>
              </div>

              {/* BMKG Live Sync Dot */}
              <div className="flex items-center gap-1 shrink-0 pl-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-risk-low" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-risk-low" />
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 text-paper-500">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1 rounded-md hover:bg-paper-200/70 active:bg-paper-300 transition-all text-paper-600 cursor-pointer"
              title="Muat Ulang Data BMKG"
            >
              <RotateCw
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-500",
                  isRefreshing && "rotate-180 text-brand-700",
                )}
              />
            </button>
          </div>
        </div>

        {/* ── 2. Mac Browser Toolbar / Dropdown Bar ────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-200/70 bg-paper-50/50 px-4 py-2.5">
          {/* Dropdown Penyakit (Disease Selector) */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsDiseaseDropdownOpen(!isDiseaseDropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-paper-300/80 bg-white px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs hover:border-brand-500 hover:shadow-sm transition-all cursor-pointer"
              aria-label="Pilih Penyakit"
            >
              <DiseaseIcon className="h-3.5 w-3.5 text-brand-700" />
              <span>{currentDiseaseInfo.shortLabel}</span>
              <span className="text-[10px] text-paper-400 font-normal">▾</span>
            </button>

            {/* Disease Dropdown Menu (Muncul ke atas / popover) */}
            {isDiseaseDropdownOpen && (
              <div
                className={cn(
                  "absolute left-0 top-full mt-1.5 z-50 w-64 rounded-2xl border border-paper-200/90 bg-white/98 p-1.5 shadow-[0_12px_36px_-6px_rgba(14,34,37,0.18),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150",
                )}
              >
                <div className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-paper-400">
                  Pilih Monitoring Penyakit
                </div>
                {(["DBD", "ISPA", "Diare"] as DiseaseType[]).map((type) => {
                  const cfg = DISEASE_CONFIG[type];
                  const Icon = cfg.icon;
                  const isSelected = selectedDisease === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedDisease(type);
                        setIsDiseaseDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer",
                        isSelected
                          ? "bg-brand-50/90 text-brand-900 font-semibold"
                          : "hover:bg-paper-100/70 text-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg border shrink-0",
                          isSelected
                            ? "bg-brand-700 text-white border-brand-700"
                            : "bg-paper-100 text-paper-600 border-paper-200",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span>{cfg.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-700 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-paper-500 mt-0.5 leading-tight">
                          Zona: {hotspotsFor(type)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Risk Stat Badges (Interactive Filter) */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setRiskFilter(riskFilter === "tinggi" ? "all" : "tinggi")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-0.5 transition-all cursor-pointer",
                riskFilter === "tinggi"
                  ? "bg-risk-high text-white font-semibold shadow-xs scale-105"
                  : "bg-risk-high/10 text-risk-high hover:bg-risk-high/20",
              )}
              title="Filter Hanya SIAGA"
            >
              <span className="h-2 w-2 rounded-full bg-risk-high" />
              <span>{siagaCount} Siaga</span>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter(riskFilter === "sedang" ? "all" : "sedang")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-0.5 transition-all cursor-pointer",
                riskFilter === "sedang"
                  ? "bg-risk-medium text-white font-semibold shadow-xs scale-105"
                  : "bg-risk-medium/10 text-risk-medium hover:bg-risk-medium/20",
              )}
              title="Filter Hanya WASPADA"
            >
              <span className="h-2 w-2 rounded-full bg-risk-medium" />
              <span>{waspadaCount} Waspada</span>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter(riskFilter === "rendah" ? "all" : "rendah")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-0.5 transition-all cursor-pointer",
                riskFilter === "rendah"
                  ? "bg-risk-low text-white font-semibold shadow-xs scale-105"
                  : "bg-risk-low/10 text-risk-low hover:bg-risk-low/20",
              )}
              title="Filter Hanya RENDAH"
            >
              <span className="h-2 w-2 rounded-full bg-risk-low" />
              <span>{rendahCount} Rendah</span>
            </button>
          </div>
        </div>

        {/* ── 3. Main Browser Viewport: 16 Kecamatan Grid ─────────────────── */}
        <div className="relative p-3 sm:p-3.5 bg-gradient-to-b from-white to-paper-50/70">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {kecamatanList.map((kec) => {
              const risk = getRiskColor(kec.tingkat_risiko);
              const isSelected = kec.nama === selectedKecamatan;
              const isDimmed = riskFilter !== "all" && kec.tingkat_risiko !== riskFilter;

              return (
                <button
                  key={kec.id}
                  type="button"
                  onClick={() => {
                    onSelectKecamatan(kec.nama);
                    setIsDrawerOpen(true);
                  }}
                  onMouseEnter={() => setHoveredKecamatan(kec.nama)}
                  onMouseLeave={() => setHoveredKecamatan(null)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-xl p-1.5 sm:p-2 text-white transition-all duration-200 cursor-pointer min-h-[52px] sm:min-h-[56px] text-center select-none overflow-hidden",
                    "border border-white/25 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.45)]",
                    isSelected
                      ? "ring-2 ring-brand-700 ring-offset-2 ring-offset-white scale-[1.04] shadow-md z-20 font-black"
                      : "hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-md",
                    isDimmed && "opacity-25 grayscale-[60%] hover:opacity-80 hover:grayscale-0",
                  )}
                  style={{ background: risk.bg }}
                  title={`${kec.nama} (${risk.label}) — Klik untuk melihat ringkasan`}
                >
                  {/* Subtle top gloss line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />

                  {/* Pulsing beacon on SIAGA hotspots */}
                  {kec.tingkat_risiko === "tinggi" && (
                    <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                      <span className="animate-beacon absolute inline-flex h-full w-full rounded-full bg-white" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                  )}

                  <span className="text-[12px] sm:text-[12.5px] font-semibold leading-tight truncate w-full tracking-tight drop-shadow-xs">
                    {kec.nama.replace("Semarang ", "Smg ")}
                  </span>
                  <span className="text-[10px] sm:text-[10.5px] font-semibold opacity-90 mt-0.5 tracking-wider uppercase drop-shadow-xs">
                    {risk.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 4. Interactive Slide-Up Panel ("Muncul Ke Atas") ─────────── */}
          {activeDistrictData && isDrawerOpen && (
            <div className="mt-3 rounded-2xl border border-paper-200/90 bg-white/95 p-3 shadow-card backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-250 transition-all">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-paper-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-50 border border-brand-200/60 text-brand-700 shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-foreground">
                        Kecamatan {activeDistrictData.nama}
                      </h4>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.2 text-[9.5px] font-semibold uppercase tracking-wider border",
                          getRiskColor(activeDistrictData.tingkat_risiko).badgeBg,
                        )}
                      >
                        {activeDistrictData.tingkat_risiko}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-paper-500">
                      Monitoring {selectedDisease} · BPS: {activeDistrictData.kode_bps}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-md text-paper-400 hover:text-paper-600 hover:bg-paper-100 transition-colors"
                  title="Sembunyikan panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div className="rounded-xl bg-paper-50/80 p-1.5 border border-paper-100">
                  <span className="block text-[10px] text-paper-500 font-medium">Kasus Aktif</span>
                  <span className="text-xs font-semibold text-foreground">
                    {activeDistrictData.kasus_aktif}
                    <span className="text-[9px] font-normal text-paper-400 ml-0.5">kasus</span>
                  </span>
                </div>

                <div className="rounded-xl bg-paper-50/80 p-1.5 border border-paper-100">
                  <span className="block text-[10px] text-paper-500 font-medium">Prediksi 14h</span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      activeDistrictData.delta_mingguan > 0 ? "text-risk-high" : "text-risk-low",
                    )}
                  >
                    {activeDistrictData.delta_mingguan > 0 ? "+" : ""}
                    {activeDistrictData.delta_mingguan}%
                  </span>
                </div>

                <div className="rounded-xl bg-paper-50/80 p-1.5 border border-paper-100">
                  <span className="block text-[10px] text-paper-500 font-medium">Cuaca BMKG</span>
                  <span className="text-xs font-semibold text-foreground">
                    {activeDistrictData.cuaca.curah_hujan_mm}
                    <span className="text-[9px] font-normal text-paper-400 ml-0.5">mm</span>
                  </span>
                </div>
              </div>

              {/* Action Button: Jump to detailed result */}
              <button
                type="button"
                onClick={() => {
                  onSelectKecamatan(activeDistrictData.nama);
                  scrollToResults();
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-700 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 transition-colors cursor-pointer"
              >
                <span>Lihat Rekomendasi & Analisis Lengkap</span>
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
          )}

          {!isDrawerOpen && (
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800 py-1 rounded-lg hover:bg-brand-50/70 transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Tampilkan Ringkasan Kecamatan ({selectedKecamatan})</span>
            </button>
          )}
        </div>

        {/* ── 5. macOS Status Bar Footer ──────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-paper-200/70 bg-paper-100/60 px-4 py-1.5 text-[10.5px] text-paper-500">
          <div className="flex items-center gap-1.5 truncate">
            <Activity className="h-3 w-3 text-brand-600 shrink-0" />
            <span className="truncate">Data BMKG & Dinkes Kota Semarang</span>
          </div>
          <span className="font-mono text-[10px] text-paper-400 shrink-0">16 Kecamatan Terpantau</span>
        </div>
      </div>
    </div>
  );
}
