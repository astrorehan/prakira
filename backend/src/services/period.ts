/**
 * Periode pelaporan — dihitung dari data, bukan ditulis tangan.
 *
 * Sebelum ada gateway, frontend menyimpan `REPORTING_TODAY = 26 Agustus 2026`
 * sebagai konstanta. Setiap halaman lalu mencetak "Minggu 34 · Agustus 2026"
 * di atas grafik yang isinya data Desember 2025. Sumber kebenaran periode
 * adalah baris terakhir di tabel `observasi`, dan hanya itu.
 */
import { all, one } from "../db/index.js";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export type ReportingPeriod = {
  /** Bulan observasi terakhir yang ada datanya, `YYYY-MM-01`. */
  latestObserved: string | null;
  /** Bulan yang diprediksi = satu bulan setelah observasi terakhir. */
  predictionMonth: string | null;
  /** "Desember 2025" — label bulan observasi terakhir. */
  monthYear: string;
  /** "Januari 2026" — label bulan prediksi. */
  predictionLabel: string;
  /** Jumlah bulan riwayat yang benar-benar tersedia. */
  historyMonths: number;
  /** Granularitas dataset. Semua model dilatih bulanan. */
  granularity: "monthly";
  diseases: string[];
};

export function monthLabel(monthStart: string | null): string {
  if (!monthStart) return "—";
  const [year, month] = monthStart.split("-");
  const index = Number(month) - 1;
  return index >= 0 && index < 12 ? `${MONTHS_ID[index]} ${year}` : monthStart;
}

/** `2025-12-01` + n bulan -> `YYYY-MM-01`. */
export function addMonths(monthStart: string, n: number): string {
  const [year, month] = monthStart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + n, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function latestObservedMonth(
  disease?: string,
): Promise<string | null> {
  const row = disease
    ? await one<{ m: string | null }>(
        "SELECT MAX(month_start) AS m FROM observasi WHERE disease = ?",
        disease,
      )
    : await one<{ m: string | null }>(
        "SELECT MAX(month_start) AS m FROM observasi",
      );
  return row?.m ?? null;
}

export async function availableDiseases(): Promise<string[]> {
  const rows = await all<{ disease: string }>(
    "SELECT DISTINCT disease FROM observasi ORDER BY disease",
  );
  return rows.map((r) => r.disease);
}

export async function reportingPeriod(
  disease?: string,
): Promise<ReportingPeriod> {
  const latest = await latestObservedMonth(disease);
  const predictionMonth = latest ? addMonths(latest, 1) : null;

  const months = disease
    ? await one<{ n: number }>(
        "SELECT COUNT(DISTINCT month_start) AS n FROM observasi WHERE disease = ?",
        disease,
      )
    : await one<{ n: number }>(
        "SELECT COUNT(DISTINCT month_start) AS n FROM observasi",
      );

  return {
    latestObserved: latest,
    predictionMonth,
    monthYear: monthLabel(latest),
    predictionLabel: monthLabel(predictionMonth),
    historyMonths: months?.n ?? 0,
    granularity: "monthly",
    diseases: await availableDiseases(),
  };
}
