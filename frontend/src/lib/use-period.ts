"use client";

/**
 * Periode pelaporan dari gateway, di-memo satu kali per penyakit.
 *
 * Kepala halaman, chip tanggal, dan hitungan tenggat semuanya membutuhkan
 * nilai yang sama. Tanpa memo, satu halaman konsol memicu empat permintaan
 * identik dan keempatnya bisa mendarat pada urutan berbeda.
 */

import * as React from "react";
import { fetchPeriod } from "@/lib/api";
import type { ReportingPeriod } from "@/types";

const cache = new Map<string, Promise<ReportingPeriod>>();

export function loadPeriod(disease?: string): Promise<ReportingPeriod> {
  const key = disease ?? "*";
  if (!cache.has(key)) {
    cache.set(
      key,
      fetchPeriod(disease).catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  }
  return cache.get(key)!;
}

/** Membuang memo — dipakai setelah impor CSV mengubah bulan terakhir. */
export function invalidatePeriod(): void {
  cache.clear();
}

export type PeriodState = {
  period: ReportingPeriod | null;
  loading: boolean;
  error: string | null;
};

export function usePeriod(disease?: string): PeriodState {
  const [period, setPeriod] = React.useState<ReportingPeriod | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);

    loadPeriod(disease)
      .then((result) => {
        if (alive) {
          setPeriod(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [disease]);

  return { period, loading, error };
}
