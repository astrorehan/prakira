"use client";

/**
 * Kode lacak yang pernah dipegang perangkat ini.
 *
 * Kode lacak satu-satunya kunci laporan: tidak ada nama, nomor, atau surel
 * yang bisa dipakai memulihkannya. Menyuruh pelapor "simpan kode ini" lalu
 * membuangnya begitu halaman ditutup membuat kode itu gampang hilang.
 *
 * Yang disimpan sengaja sedikit — kode, jenis, kecamatan, dan waktu kirim —
 * cukup untuk mengenali laporan sendiri di daftar. Deskripsi dan foto tidak
 * ikut: perangkat bisa dipakai bergantian, dan statusnya tetap diambil dari
 * gateway setiap kali dibuka. `localStorage` di sini disengaja, sama seperti
 * pilihan kecamatan: ini ingatan satu perangkat, bukan data.
 */

import * as React from "react";
import type { CitizenReport, ReportKind } from "@/types";

const STORAGE_KEY = "prakira.reports.v1";
/* Batas atas supaya daftar tetap terbaca; yang terlama dibuang lebih dulu. */
const MAX_SAVED = 20;

export type SavedReport = {
  id: string;
  kind: ReportKind;
  kecamatan: string;
  submittedAt: string;
};

const listeners = new Set<() => void>();
const EMPTY: SavedReport[] = [];
let cache: SavedReport[] | null = null;

function read(): SavedReport[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (r): r is SavedReport =>
            !!r && typeof r.id === "string" && typeof r.kind === "string",
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedReport[]): boolean {
  cache = next;
  listeners.forEach((fn) => fn());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    /* Mode privat memblokir tulisan. Daftar tetap hidup selama tab terbuka. */
    return false;
  }
}

/** Menyimpan (atau menyegarkan) satu laporan. Mengembalikan `false` bila peramban menolak. */
export function saveReport(report: CitizenReport): boolean {
  if (typeof window === "undefined") return false;
  const entry: SavedReport = {
    id: report.id,
    kind: report.kind,
    kecamatan: report.kecamatan,
    submittedAt: report.submittedAt,
  };
  const rest = read().filter((r) => r.id !== entry.id);
  const next = [entry, ...rest]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, MAX_SAVED);
  return write(next);
}

export function forgetReport(id: string): void {
  if (typeof window === "undefined") return;
  write(read().filter((r) => r.id !== id));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  /* Tab lain yang mengirim laporan ikut memperbarui daftar di tab ini. */
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSavedReports(): SavedReport[] {
  return React.useSyncExternalStore(subscribe, read, () => EMPTY);
}
