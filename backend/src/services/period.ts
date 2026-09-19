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
  /** Bulan kalender berjalan menurut jam server, `YYYY-MM-01`. */
  calendarMonth: string;
  /**
   * Jarak bulan kalender dari observasi terakhir. `1` berarti data mutakhir
   * (bulan lalu sudah masuk); `null` bila belum ada observasi sama sekali.
   */
  dataLagMonths: number | null;
  /**
   * Benar bila bulan prakiraan sudah lewat dari bulan kalender berjalan —
   * yakni, prakiraan untuk bulan ini tidak bisa dibuat dari data yang ada.
   */
  forecastBehindCalendar: boolean;
  /** Kalimat siap tampil yang menjelaskan keterlambatan; `null` bila mutakhir. */
  lagNotice: string | null;
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

/** Selisih bulan `to - from`, keduanya `YYYY-MM-01`. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Bulan kalender yang memuat `now`, `YYYY-MM-01`, menurut WIB.
 *
 * Server bisa berjalan di zona waktu mana pun; petugasnya di Semarang.
 * Pada 30 September pukul 20.00 UTC, di Semarang sudah 1 Oktober.
 */
export function calendarMonthOf(now: Date): string {
  const wib = new Date(now.getTime() + 7 * 3_600_000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export type DataLag = Pick<
  ReportingPeriod,
  "calendarMonth" | "dataLagMonths" | "forecastBehindCalendar" | "lagNotice"
>;

/**
 * Seberapa jauh data tertinggal dari kalender nyata.
 *
 * Model dilatih satu langkah ke depan: ia hanya bisa memprakirakan bulan
 * tepat setelah observasi terakhir. Kalau observasi berhenti di Desember dan
 * kalender sudah September, prakiraan yang sah tetap Januari — dan halaman
 * harus mengatakannya, bukan diam-diam menampilkan Januari seolah bulan ini.
 * Menghapus pembatasnya tidak menolong: lag `cases_lag1` akan menunjuk data
 * sembilan bulan lalu dan disebut "bulan lalu".
 */
export function describeDataLag(
  latestObserved: string | null,
  now: Date = new Date(),
): DataLag {
  const calendarMonth = calendarMonthOf(now);
  if (!latestObserved) {
    return {
      calendarMonth,
      dataLagMonths: null,
      forecastBehindCalendar: false,
      lagNotice: null,
    };
  }

  const dataLagMonths = monthsBetween(latestObserved, calendarMonth);
  const predictionMonth = addMonths(latestObserved, 1);
  const behind = monthsBetween(predictionMonth, calendarMonth) > 0;

  return {
    calendarMonth,
    dataLagMonths,
    forecastBehindCalendar: behind,
    lagNotice: behind
      ? `Data observasi terakhir ${monthLabel(latestObserved)}, tertinggal ` +
        `${dataLagMonths} bulan dari kalender ${monthLabel(calendarMonth)}. ` +
        `Model memprakirakan tepat satu bulan setelah observasi terakhir, jadi ` +
        `prakiraan yang sah hanya untuk ${monthLabel(predictionMonth)}, bukan ` +
        `${monthLabel(calendarMonth)}.`
      : null,
  };
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
    ...describeDataLag(latest),
  };
}
