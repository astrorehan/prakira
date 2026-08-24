"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Navigation, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEMARANG_KECAMATAN_RAW, getKecamatanDataList } from "@/lib/mock-data";

interface HeroProps {
  selectedKecamatan: string;
  onSelectKecamatan: (name: string) => void;
}

/* ── Mini Map Grid ──────────────────────────────────────────────────────────
   A simple visual grid showing all 16 kecamatan with color-coded risk levels.
   Tapping a cell selects that kecamatan. */
function MiniMapGrid({
  selectedKecamatan,
  onSelect,
}: {
  selectedKecamatan: string;
  onSelect: (name: string) => void;
}) {
  const dbdList = getKecamatanDataList("DBD");

  const riskColor = (level: string) => {
    if (level === "tinggi") return { bg: "#A32B1F", label: "SIAGA" };
    if (level === "sedang") return { bg: "#A8690C", label: "WASPADA" };
    return { bg: "#1B6B4F", label: "AMAN" };
  };

  return (
    <div className="w-full max-w-md mx-auto lg:mx-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-paper-600 font-medium">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>Peta Risiko 16 Kecamatan</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-paper-500">
          {[
            { color: "#1B6B4F", label: "Aman" },
            { color: "#A8690C", label: "Waspada" },
            { color: "#A32B1F", label: "Siaga" },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {dbdList.map((kec) => {
          const risk = riskColor(kec.tingkat_risiko);
          const isSelected = kec.nama === selectedKecamatan;
          return (
            <button
              key={kec.id}
              type="button"
              onClick={() => onSelect(kec.nama)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl p-2 text-white transition-all duration-200 cursor-pointer",
                isSelected
                  ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105 shadow-lg z-10"
                  : "hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100",
              )}
              style={{ background: risk.bg }}
              title={kec.nama}
            >
              <span className="text-[10px] font-semibold leading-tight truncate w-full text-center">
                {kec.nama.replace("Semarang ", "Smg ")}
              </span>
              <span className="text-[9px] opacity-80 mt-0.5">{risk.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Search Autocomplete ────────────────────────────────────────────────── */
function KecamatanSearch({
  selectedKecamatan,
  onSelect,
}: {
  selectedKecamatan: string;
  onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? SEMARANG_KECAMATAN_RAW.filter((k) =>
        k.nama.toLowerCase().includes(query.toLowerCase()),
      )
    : SEMARANG_KECAMATAN_RAW;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (name: string) => {
    onSelect(name);
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-paper-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Ketik nama kecamatan Anda..."
          className="w-full h-14 rounded-2xl border-2 border-paper-200 bg-white pl-12 pr-4 text-base font-medium text-foreground placeholder:text-paper-400 shadow-card focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          aria-label="Cari kecamatan"
          autoComplete="off"
        />
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-paper-200 bg-white shadow-pop">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-paper-500">
              Kecamatan tidak ditemukan
            </div>
          ) : (
            filtered.map((kec) => {
              const dbdData = getKecamatanDataList("DBD").find(
                (k) => k.nama === kec.nama,
              );
              const level = dbdData?.tingkat_risiko ?? "rendah";
              const dotColor =
                level === "tinggi"
                  ? "#A32B1F"
                  : level === "sedang"
                    ? "#A8690C"
                    : "#1B6B4F";

              return (
                <button
                  key={kec.id}
                  type="button"
                  onClick={() => handleSelect(kec.nama)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-paper-50 transition-colors",
                    selectedKecamatan === kec.nama && "bg-brand-50",
                  )}
                >
                  <MapPin className="h-4 w-4 text-paper-400 shrink-0" />
                  <span className="font-medium text-foreground flex-1">
                    Kecamatan {kec.nama}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: dotColor }}
                  />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Hero Component ─────────────────────────────────────────────────────── */
export function Hero({ selectedKecamatan, onSelectKecamatan }: HeroProps) {
  const scrollToResults = () => {
    document.getElementById("risk-check")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-wash-warm">
      <div className="container relative pb-16 pt-10 md:pb-20 md:pt-16">
        <div className="grid items-center gap-8 md:grid-cols-12 lg:gap-12">
          {/* Left: Tagline + Search */}
          <div className="md:col-span-6 lg:col-span-6">
            <div className="eyebrow animate-fade-in">
              Peringatan Dini · Kota Semarang
            </div>

            <h1 className="mt-4 animate-fade-in-up text-display text-balance text-foreground">
              Apakah wilayah Anda aman?
            </h1>

            <p className="mt-3 max-w-lg animate-fade-in-up stagger-2 text-body-lg text-paper-600">
              Cek status risiko penyakit DBD, ISPA, dan Diare di kecamatan Anda —
              langsung, tanpa login.
            </p>

            {/* Search Bar */}
            <div className="mt-6 animate-fade-in-up stagger-3">
              <KecamatanSearch
                selectedKecamatan={selectedKecamatan}
                onSelect={(name) => {
                  onSelectKecamatan(name);
                  setTimeout(scrollToResults, 100);
                }}
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-paper-600 gap-1.5 bg-white"
                  onClick={() => {
                    onSelectKecamatan("Pedurungan");
                    setTimeout(scrollToResults, 100);
                  }}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Gunakan Lokasi Saya
                </Button>

                {selectedKecamatan && (
                  <span className="text-xs text-paper-500">
                    Menampilkan:{" "}
                    <strong className="text-foreground">{selectedKecamatan}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Scroll hint */}
            {selectedKecamatan && (
              <button
                type="button"
                onClick={scrollToResults}
                className="mt-5 animate-fade-in-up flex items-center gap-2 text-xs text-primary font-medium hover:underline"
              >
                <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
                Lihat detail status risiko di bawah
              </button>
            )}
          </div>

          {/* Right: Mini Map Card */}
          <div className="animate-fade-in md:col-span-6 lg:col-span-6">
            <div className="rounded-2xl border border-paper-200/90 bg-white/80 p-5 shadow-card backdrop-blur-sm">
              <MiniMapGrid
                selectedKecamatan={selectedKecamatan}
                onSelect={(name) => {
                  onSelectKecamatan(name);
                  setTimeout(scrollToResults, 100);
                }}
              />
              <p className="mt-3 text-[11px] text-paper-500 text-center max-w-md mx-auto">
                Klik kecamatan pada kotak peta di atas atau ketik nama di kolom pencarian.
                Data diperbarui berkala bersama BMKG & Dinas Kesehatan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
