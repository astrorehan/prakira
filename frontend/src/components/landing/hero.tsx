"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  ArrowRight,
  ArrowDown,
  CornerDownLeft,
  LocateFixed,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEMARANG_KECAMATAN_RAW, getKecamatanDataList } from "@/lib/mock-data";
import { getCityRiskRows } from "@/lib/city-risk";
import { useLocateKecamatan } from "@/hooks/use-locate-kecamatan";
import type { RiskLevel } from "@/types";

import { CityPulse } from "./city-pulse";

interface HeroProps {
  /** `null` until the reader answers the question this hero asks. */
  selectedKecamatan: string | null;
  onSelectKecamatan: (name: string) => void;
}

/* Risk reads as a tinted word, never as a coloured dot: the label carries the
   meaning on its own, so it survives greyscale and screen readers. */
const RISK_TAG: Record<RiskLevel, { word: string; className: string }> = {
  tinggi: { word: "Siaga", className: "bg-risk-high-bg text-risk-high" },
  sedang: { word: "Waspada", className: "bg-risk-medium-bg text-risk-medium" },
  rendah: { word: "Rendah", className: "bg-risk-low-bg text-risk-low" },
};

/* ── Search ───────────────────────────────────────────────────────────────
   The single most important control on the page, so it gets hero scale,
   keyboard navigation, and a submit affordance rather than a bare text field. */
function KecamatanSearch({
  selectedKecamatan,
  onSelect,
}: {
  selectedKecamatan: string | null;
  onSelect: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const riskByName = useMemo(() => {
    const map = new Map<string, RiskLevel>();
    getKecamatanDataList("DBD").forEach((k) => map.set(k.nama, k.tingkat_risiko));
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEMARANG_KECAMATAN_RAW;
    return SEMARANG_KECAMATAN_RAW.filter((k) => k.nama.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = (name: string) => {
    onSelect(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[cursor]) commit(filtered[cursor].nama);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <div
        className={cn(
          "relative flex items-center rounded-2xl border bg-white p-1.5 pl-5 transition-all duration-base",
          open
            ? "border-brand-500 shadow-lift"
            : "border-sand-200 shadow-card hover:border-sand-300",
        )}
      >
        <Search className="h-5 w-5 shrink-0 text-paper-400" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Cari kecamatan Anda…"
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base font-medium text-foreground placeholder:text-paper-400 focus:outline-none"
          aria-label="Cari kecamatan"
          aria-expanded={open}
          role="combobox"
          aria-controls="kecamatan-listbox"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => {
            const target = filtered[cursor]?.nama ?? selectedKecamatan;
            if (target) commit(target);
          }}
          aria-label="Cek risiko kecamatan"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white transition-colors duration-fast hover:bg-brand-600 sm:w-auto sm:px-5"
        >
          <span className="hidden sm:inline">Cek Risiko</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          id="kecamatan-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-sand-100 px-4 py-2">
            <span className="font-mono text-overline uppercase text-paper-400">
              {filtered.length} kecamatan
            </span>
            <span className="hidden items-center gap-1 font-mono text-[10px] uppercase text-paper-400 sm:flex">
              <CornerDownLeft className="h-3 w-3" /> pilih
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-paper-500">
                Kecamatan tidak ditemukan.
              </p>
            ) : (
              filtered.map((kec, i) => {
                const level = riskByName.get(kec.nama) ?? "rendah";
                return (
                  <button
                    key={kec.id}
                    type="button"
                    role="option"
                    aria-selected={selectedKecamatan === kec.nama}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => commit(kec.nama)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast",
                      i === cursor ? "bg-sand-50" : "bg-transparent",
                    )}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-paper-400" />
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {kec.nama}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        RISK_TAG[level].className,
                      )}
                    >
                      {RISK_TAG[level].word}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
/* Why the reader's own location beat the search box, and why it failed. Kept
   to one line — a location prompt that fails should cost the reader a glance,
   not a paragraph. */
const LOCATE_MESSAGE: Record<string, string> = {
  denied: "Lokasi tidak bisa dibaca. Silakan pilih kecamatan lewat pencarian.",
  outside: "Anda tampaknya di luar Kota Semarang. Pilih kecamatan secara manual.",
  unsupported: "Peramban ini tidak mendukung deteksi lokasi.",
};

export function Hero({ selectedKecamatan, onSelectKecamatan }: HeroProps) {
  const scrollToResults = () => {
    document.getElementById("risk-check")?.scrollIntoView({ behavior: "smooth" });
  };

  const pick = React.useCallback(
    (name: string) => {
      onSelectKecamatan(name);
      window.setTimeout(scrollToResults, 120);
    },
    [onSelectKecamatan],
  );

  const { status: locateStatus, locate } = useLocateKecamatan(pick);

  /* Shortcuts are the four highest-scoring kecamatan this week, not a fixed
     list. A hardcoded row is an editorial choice about which districts matter;
     the ranking is a fact the data already carries. */
  const shortcuts = useMemo(
    () => getCityRiskRows().slice(0, 4).map((r) => r.nama),
    [],
  );

  return (
    <section className="relative isolate overflow-hidden bg-grad-page">
      {/* Printed-page texture: a fine dot field, hairline column rules, and one
          warm wash. No blurred colour orbs — this surface should read as paper. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(11,74,87,.14) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(120% 90% at 20% 0%, #000 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(120% 90% at 20% 0%, #000 0%, transparent 70%)",
          }}
        />
        <div className="absolute -right-32 top-[-18%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(214,233,236,.75)_0%,rgba(239,245,249,0)_68%)]" />
        <div className="absolute -left-40 bottom-[-30%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(127,184,192,.40)_0%,rgba(239,245,249,0)_70%)]" />
      </div>

      <div className="container relative pb-12 pt-12 md:pb-16 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ── Copy + search ── */}
          <div className="min-w-0 lg:col-span-7">
            <p className="animate-fade-in text-overline uppercase leading-5 tracking-[0.1em] text-paper-500">
              Peringatan dini penyakit iklim
              <span className="mx-2 hidden text-paper-300 sm:inline">/</span>
              <span className="block sm:inline">Kota Semarang</span>
            </p>

            {/* Two lines by construction: the break is explicit so the accent
                rule under "aman" can never collide with a wrapped third line. */}
            <h1 className="animate-fade-in-up mt-5 text-display leading-[1.06] text-foreground">
              Apakah wilayah Anda
              <br className="hidden md:block" />{" "}
              <span className="relative inline-block">
                <span
                  className="relative z-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(100deg,#E5AA52 0%,#C95E42 48%,#A8442C 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  aman
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-[0.08em] -z-0 h-[0.2em] rounded-full bg-[linear-gradient(90deg,rgba(229,170,82,.38)_0%,rgba(201,94,66,.34)_100%)]"
                />
              </span>{" "}
              bulan depan?
            </h1>

            <p className="animate-fade-in-up stagger-2 mt-6 max-w-xl text-body-lg text-paper-600">
              Prakira membaca cuaca BMKG dan riwayat kasus Dinas Kesehatan untuk
              memperkirakan lonjakan{" "}
              <strong className="font-semibold text-foreground">
                DBD, ISPA, dan Diare
              </strong>{" "}
              2–4 minggu sebelum terjadi.
            </p>

            <div className="animate-fade-in-up stagger-3 mt-9">
              <KecamatanSearch selectedKecamatan={selectedKecamatan} onSelect={pick} />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={locate}
                  disabled={locateStatus === "locating"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition-colors duration-fast hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
                >
                  {locateStatus === "locating" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {locateStatus === "locating"
                    ? "Mencari lokasi…"
                    : "Gunakan lokasi saya"}
                </button>

                <span className="ml-1 font-mono text-overline uppercase text-paper-400">
                  Paling berisiko
                </span>
                {shortcuts.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pick(name)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast",
                      selectedKecamatan === name
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-sand-200 bg-white/70 text-paper-600 hover:border-brand-300 hover:text-brand-700",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {LOCATE_MESSAGE[locateStatus] && (
                <p role="status" className="mt-3 text-caption text-paper-600">
                  {LOCATE_MESSAGE[locateStatus]}
                </p>
              )}
            </div>

            <p className="animate-fade-in-up stagger-4 mt-6 text-caption text-paper-500">
              Gratis · tanpa login · bukan alat diagnosis medis
            </p>
          </div>

          {/* ── Live city pulse ── */}
          <div className="min-w-0 animate-fade-in-up stagger-3 lg:col-span-5">
            <CityPulse onSelectKecamatan={pick} />
          </div>
        </div>
      </div>

      {/* Masthead rule: the seam between the hero and the answer below. */}
      <div className="container">
        <div className="flex items-center justify-between gap-6 border-t border-sand-200 py-5">
          <p className="hidden font-mono text-overline uppercase text-paper-400 sm:block">
            Sumber · BMKG · Dinkes Kota Semarang · Laporan warga terverifikasi
          </p>
          <button
            type="button"
            onClick={scrollToResults}
            className="group flex items-center gap-2 font-mono text-overline uppercase text-paper-500 transition-colors duration-base hover:text-brand-700"
          >
            Lihat hasilnya
            <ArrowDown className="h-3.5 w-3.5 animate-rise-fall" />
          </button>
        </div>
      </div>
    </section>
  );
}
