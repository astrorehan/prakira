/**
 * Periode pelaporan — dihitung dari data, bukan ditulis tangan.
 *
 * Sebelum ada gateway, frontend menyimpan `REPORTING_TODAY = 26 Agustus 2026`
 * sebagai konstanta. Setiap halaman lalu mencetak "Minggu 34 · Agustus 2026"
 * di atas grafik yang isinya data Desember 2025. Sumber kebenaran periode
 * adalah baris terakhir di tabel `observasi`, dan hanya itu.
 */
import { all, one } from "../db/index.js";

/* Metadata periode dibaca oleh hampir setiap permukaan. Data ini berubah saat
   ingest, bukan di setiap request, jadi cache singkat menghindari beberapa
   perjalanan bolak-balik ke Postgres untuk satu kali buka halaman. */
const PERIOD_CACHE_TTL_MS = 15_000;

type TimedValue<T> = {
  expiresAt: number;
  value: T;
};

let diseasesCache: TimedValue<string[]> | null = null;
let diseasesInFlight: Promise<string[]> | null = null;
const latestCache = new Map<string, TimedValue<string | null>>();
const latestInFlight = new Map<string, Promise<string | null>>();
const periodCache = new Map<string, TimedValue<ReportingPeriod>>();
const periodInFlight = new Map<string, Promise<ReportingPeriod>>();

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
  const key = disease?.toUpperCase() ?? "*";
  const cached = latestCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  latestCache.delete(key);

  const running = latestInFlight.get(key);
  if (running) return running;

  const task = (async () => {
    const row = disease
      ? await one<{ m: string | null }>(
          "SELECT MAX(month_start) AS m FROM observasi WHERE disease = ?",
          disease,
        )
      : await one<{ m: string | null }>(
          "SELECT MAX(month_start) AS m FROM observasi",
        );
    const value = row?.m ?? null;
    latestCache.set(key, {
      expiresAt: Date.now() + PERIOD_CACHE_TTL_MS,
      value,
    });
    return value;
  })();

  latestInFlight.set(key, task);
  task.finally(() => {
    if (latestInFlight.get(key) === task) latestInFlight.delete(key);
  }).catch(() => {
    /* Pemanggil menerima error dari task; finally tidak boleh membuat
       unhandled rejection baru. */
  });
  return task;
}

export async function availableDiseases(): Promise<string[]> {
  if (diseasesCache && diseasesCache.expiresAt > Date.now()) {
    return diseasesCache.value;
  }
  diseasesCache = null;
  if (diseasesInFlight) return diseasesInFlight;

  const task = all<{ disease: string }>(
    "SELECT DISTINCT disease FROM observasi ORDER BY disease",
  ).then((rows) => {
    const value = rows.map((r) => r.disease);
    diseasesCache = {
      expiresAt: Date.now() + PERIOD_CACHE_TTL_MS,
      value,
    };
    return value;
  });

  diseasesInFlight = task;
  task.finally(() => {
    if (diseasesInFlight === task) diseasesInFlight = null;
  }).catch(() => {
    /* Pemanggil menerima error dari task; finally tidak boleh membuat
       unhandled rejection baru. */
  });
  return task;
}

export async function reportingPeriod(
  disease?: string,
  knownDiseases?: string[],
): Promise<ReportingPeriod> {
  const key = `${disease?.toUpperCase() ?? "*"}|${knownDiseases?.join(",") ?? ""}`;
  const cached = periodCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  periodCache.delete(key);

  const running = periodInFlight.get(key);
  if (running) return running;

  /* Latest month, count, and disease list do not depend on one another. Running
     them together matters when the database is remote: three serial network
     round-trips become one latency window. */
  const task = Promise.all([
    latestObservedMonth(disease),
    disease
      ? one<{ n: number }>(
          "SELECT COUNT(DISTINCT month_start) AS n FROM observasi WHERE disease = ?",
          disease,
        )
      : one<{ n: number }>(
          "SELECT COUNT(DISTINCT month_start) AS n FROM observasi",
        ),
    knownDiseases ? Promise.resolve(knownDiseases) : availableDiseases(),
  ]).then(([latest, months, diseases]) => {
    const predictionMonth = latest ? addMonths(latest, 1) : null;
    const value = {
      latestObserved: latest,
      predictionMonth,
      monthYear: monthLabel(latest),
      predictionLabel: monthLabel(predictionMonth),
      historyMonths: months?.n ?? 0,
      granularity: "monthly" as const,
      diseases,
      ...describeDataLag(latest),
    };
    periodCache.set(key, {
      expiresAt: Date.now() + PERIOD_CACHE_TTL_MS,
      value,
    });
    return value;
  });

  periodInFlight.set(key, task);
  task.finally(() => {
    if (periodInFlight.get(key) === task) periodInFlight.delete(key);
  }).catch(() => {
    /* Pemanggil menerima error dari task; finally tidak boleh membuat
       unhandled rejection baru. */
  });
  return task;
}

/** Dipanggil setelah ingest agar halaman berikutnya membaca metadata baru. */
export function invalidatePeriodCache(): void {
  diseasesCache = null;
  latestCache.clear();
  periodCache.clear();
}
