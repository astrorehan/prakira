/**
 * Perakitan data kecamatan yang dikirim ke dashboard.
 *
 * Satu baris kecamatan menggabungkan tiga sumber: tabel wilayah (statis),
 * observasi bulan terakhir (kasus + iklim), dan prediksi tersimpan. Kalau
 * prediksinya belum pernah ada, kolom prediksi dikirim `null` dan
 * `tingkat_risiko` juga `null` — bukan nol, bukan "rendah". Nol berarti
 * "diprediksi nol kasus"; kosong berarti "belum diprediksi". Dua hal yang
 * berbeda tidak boleh terlihat sama di peta.
 */
import { all } from "../db/index.js";
import { isPancaroba, rainfallCategory } from "./climate.js";
import {
  parseDrivers,
  readPredictions,
  type StoredPrediction,
} from "./predictions.js";
import { addMonths, latestObservedMonth } from "./period.js";
import { DRIVER_LABEL, driverUnit } from "./action-rules.js";

export type Coverage = "high" | "medium" | "low" | "insufficient";
export type RiskLevel = "rendah" | "sedang" | "tinggi";

export type DistrictPayload = {
  id: string;
  nama: string;
  kode_bps: string;
  populasi: number;
  luas_km2: number;
  disease: string;

  /** Bulan observasi yang dirujuk kolom kasus & cuaca. */
  periode_observasi: string | null;
  /** Bulan yang diprediksi. */
  periode_prediksi: string | null;

  kasus_aktif: number | null;
  kasus_prediksi: number | null;
  kasus_prediksi_lower: number | null;
  kasus_prediksi_upper: number | null;
  incidence_rate: number | null;
  skor_risiko: number | null;
  tingkat_risiko: RiskLevel | null;
  coverage: Coverage;
  /** Perubahan kasus dibanding bulan observasi sebelumnya, dalam persen. */
  delta_periode: number | null;

  cuaca: {
    curah_hujan_mm: number | null;
    suhu_c: number | null;
    kelembaban_pct: number | null;
    status_cuaca: string | null;
    indeks_pancaroba: boolean;
  };

  /** Fitur pemicu dominan dari model, sudah diberi label manusia. */
  drivers: {
    feature: string;
    label: string;
    value: number;
    percentile: number;
    unit: string;
  }[];
  model_version: string | null;
  koordinat: [number, number];
  /** Kasus tiga bulan observasi terakhir, terlama lebih dulu. */
  riwayat_periode: number[];
};

type KecamatanRow = {
  id: string;
  ml_id: string;
  nama: string;
  kode_bps: string;
  populasi: number;
  luas_km2: number;
  lat: number;
  lon: number;
};

type ObservasiRow = {
  kecamatan_id: string;
  month_start: string;
  cases: number;
  rainfall_mm: number | null;
  temp_mean_c: number | null;
  humidity_pct: number | null;
};

export function listKecamatan(): Promise<KecamatanRow[]> {
  return all<KecamatanRow>("SELECT * FROM kecamatan ORDER BY nama");
}

/** Bulan observasi terakhir per penyakit, jatuh ke keseluruhan bila kosong. */
async function observationMonths(
  disease: string,
  count: number,
): Promise<string[]> {
  const rows = await all<{ month_start: string }>(
    `SELECT DISTINCT month_start FROM observasi
      WHERE disease = ?
      ORDER BY month_start DESC
      LIMIT ?`,
    disease.toUpperCase(),
    count,
  );
  return rows.map((r) => r.month_start);
}

export async function getDistricts(
  disease: string,
): Promise<DistrictPayload[]> {
  const upper = disease.toUpperCase();
  const kecamatan = await listKecamatan();

  const months = await observationMonths(upper, 3);
  const latest = months[0] ?? null;
  const previous = months[1] ?? null;

  const observations = new Map<string, Map<string, ObservasiRow>>();
  if (months.length > 0) {
    const placeholders = months.map(() => "?").join(", ");
    const rows = await all<ObservasiRow>(
      `SELECT kecamatan_id, month_start, cases, rainfall_mm, temp_mean_c, humidity_pct
         FROM observasi
        WHERE disease = ? AND month_start IN (${placeholders})`,
      upper,
      ...months,
    );
    for (const row of rows) {
      if (!observations.has(row.month_start))
        observations.set(row.month_start, new Map());
      observations.get(row.month_start)!.set(row.kecamatan_id, row);
    }
  }

  const predictionMonth = latest ? addMonths(latest, 1) : null;
  const predictions = predictionMonth
    ? await readPredictions(upper, predictionMonth)
    : new Map<string, StoredPrediction>();

  /* Riwayat dibaca dari yang terlama supaya sparkline naik ke kanan. */
  const historyMonths = [...months].reverse();

  return kecamatan.map((kec) => {
    const current = latest ? observations.get(latest)?.get(kec.id) : undefined;
    const prior = previous
      ? observations.get(previous)?.get(kec.id)
      : undefined;
    const prediction = predictions.get(kec.id) as StoredPrediction | undefined;

    const kasusAktif = current?.cases ?? null;
    const incidence =
      kasusAktif !== null && kec.populasi > 0
        ? Number(((kasusAktif / kec.populasi) * 100000).toFixed(1))
        : null;

    const delta =
      kasusAktif !== null && prior !== undefined && prior.cases > 0
        ? Number((((kasusAktif - prior.cases) / prior.cases) * 100).toFixed(1))
        : null;

    const drivers = prediction
      ? parseDrivers(prediction.drivers).map((d) => ({
          feature: d.feature,
          label: DRIVER_LABEL[d.feature] ?? d.feature,
          value: d.value,
          percentile: d.percentile,
          unit: driverUnit(d.feature),
        }))
      : [];

    return {
      id: kec.id,
      nama: kec.nama,
      kode_bps: kec.kode_bps,
      populasi: kec.populasi,
      luas_km2: kec.luas_km2,
      disease: upper,

      periode_observasi: latest,
      periode_prediksi: prediction ? prediction.month_start : null,

      kasus_aktif: kasusAktif,
      kasus_prediksi: prediction?.predicted_cases ?? null,
      kasus_prediksi_lower: prediction?.lower_bound ?? null,
      kasus_prediksi_upper: prediction?.upper_bound ?? null,
      incidence_rate: incidence,
      skor_risiko: prediction?.risk_score ?? null,
      tingkat_risiko: (prediction?.risk_class as RiskLevel | null) ?? null,
      coverage: (prediction?.data_coverage as Coverage) ?? "insufficient",
      delta_periode: delta,

      cuaca: {
        curah_hujan_mm: current?.rainfall_mm ?? null,
        suhu_c: current?.temp_mean_c ?? null,
        kelembaban_pct: current?.humidity_pct ?? null,
        status_cuaca: rainfallCategory(current?.rainfall_mm ?? null),
        indeks_pancaroba: latest ? isPancaroba(latest) : false,
      },

      drivers,
      model_version: prediction?.model_version ?? null,
      koordinat: [kec.lat, kec.lon] as [number, number],
      riwayat_periode: historyMonths
        .map((m) => observations.get(m)?.get(kec.id)?.cases)
        .filter((v): v is number => typeof v === "number"),
    };
  });
}

/** Deret bulanan tingkat kota: aktual sampai bulan terakhir, lalu prediksi. */
export async function getTrend(disease: string, historyMonths = 12) {
  const upper = disease.toUpperCase();

  const actualRows = await all<{
    month_start: string;
    cases: number;
    rainfall_mm: number | null;
    temp_mean_c: number | null;
    humidity_pct: number | null;
  }>(
    `SELECT month_start,
            SUM(cases)          AS cases,
            AVG(rainfall_mm)    AS rainfall_mm,
            AVG(temp_mean_c)    AS temp_mean_c,
            AVG(humidity_pct)   AS humidity_pct
       FROM observasi
      WHERE disease = ?
      GROUP BY month_start
      ORDER BY month_start DESC
      LIMIT ?`,
    upper,
    historyMonths,
  );
  const actual = [...actualRows].reverse();

  const latest = await latestObservedMonth(upper);
  const predictionMonth = latest ? addMonths(latest, 1) : null;

  const points = actual.map((row) => ({
    periode: row.month_start,
    kasus_aktual: row.cases,
    kasus_prediksi: null as number | null,
    lower_bound: null as number | null,
    upper_bound: null as number | null,
    curah_hujan_mm: round1(row.rainfall_mm),
    suhu_c: round1(row.temp_mean_c),
    kelembaban_pct: round1(row.humidity_pct),
    proyeksi: false,
  }));

  if (predictionMonth) {
    const stored = await readPredictions(upper, predictionMonth);
    if (stored.size > 0) {
      let predicted = 0;
      let lower = 0;
      let upper2 = 0;
      for (const row of stored.values()) {
        predicted += row.predicted_cases;
        lower += row.lower_bound;
        upper2 += row.upper_bound;
      }

      /* Titik sambung: bulan aktual terakhir juga membawa nilai prediksi yang
         sama dengan aktualnya, supaya garis prediksi bersambung dengan garis
         aktual alih-alih melayang terputus. */
      const last = points[points.length - 1];
      if (last) {
        last.kasus_prediksi = last.kasus_aktual;
        last.lower_bound = last.kasus_aktual;
        last.upper_bound = last.kasus_aktual;
      }

      points.push({
        periode: predictionMonth,
        kasus_aktual: null as unknown as number,
        kasus_prediksi: predicted,
        lower_bound: lower,
        upper_bound: upper2,
        curah_hujan_mm: null,
        suhu_c: null,
        kelembaban_pct: null,
        proyeksi: true,
      });
    }
  }

  return points;
}

/** Korelasi iklim–kasus: satu baris per bulan, semua penyakit sekaligus. */
/* 60 bulan, bukan 24: korelasi iklim–penyakit dipindai sampai jeda 3 bulan,
   dan jendela sependek 24 titik membuat `r` goyah — pada data Semarang,
   potongan 24 bulan terakhir memberi +0,09 sedangkan 60 bulan penuh +0,32
   untuk pasangan yang sama. */
export async function getClimateSeries(historyMonths = 60) {
  const monthRows = await all<{ month_start: string }>(
    `SELECT DISTINCT month_start FROM observasi ORDER BY month_start DESC LIMIT ?`,
    historyMonths,
  );
  const months = monthRows.map((r) => r.month_start).reverse();

  if (months.length === 0) return [];

  const placeholders = months.map(() => "?").join(", ");
  const rows = await all<{
    month_start: string;
    disease: string;
    cases: number;
    rainfall_mm: number | null;
    temp_mean_c: number | null;
    humidity_pct: number | null;
  }>(
    `SELECT month_start, disease,
            SUM(cases)        AS cases,
            AVG(rainfall_mm)  AS rainfall_mm,
            AVG(temp_mean_c)  AS temp_mean_c,
            AVG(humidity_pct) AS humidity_pct
       FROM observasi
      WHERE month_start IN (${placeholders})
      GROUP BY month_start, disease
      ORDER BY month_start`,
    ...months,
  );

  const byMonth = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!byMonth.has(row.month_start)) {
      byMonth.set(row.month_start, {
        periode: row.month_start,
        curah_hujan_mm: round1(row.rainfall_mm),
        suhu_c: round1(row.temp_mean_c),
        kelembaban_pct: round1(row.humidity_pct),
        kasus: {} as Record<string, number>,
      });
    }
    const entry = byMonth.get(row.month_start)!;
    (entry.kasus as Record<string, number>)[row.disease] = row.cases;
  }

  return [...byMonth.values()];
}

function round1(value: number | null): number | null {
  return value === null || !Number.isFinite(value)
    ? null
    : Number(value.toFixed(1));
}
