/**
 * Kontrak data frontend — cerminan respons gateway (`backend/src/routes`).
 *
 * Perubahan penting dibanding versi sebelumnya: hampir semua angka prediksi
 * bertipe `| null`. Sebelumnya `tingkat_risiko` selalu terisi karena datanya
 * dikarang, jadi kecamatan tanpa prediksi tetap tampil "rendah" di peta.
 * Sekarang kekosongan bisa diwakili, dan UI wajib menanganinya (PRD §7-H2).
 */

/** Nama penyakit apa adanya dari gateway — tidak lagi union tertutup, karena
 *  daftar penyakit ditentukan isi dataset, bukan berkas ini. */
export type DiseaseType = string;

export type RiskLevel = "rendah" | "sedang" | "tinggi";

/** Kelengkapan data historis. Kecamatan berdata tipis bukan kecamatan aman. */
export type DataCoverage = "high" | "medium" | "low" | "insufficient";

export type Role = "dinas" | "analis" | "admin" | "puskesmas";

export type KpiMetric = {
  label: string;
  value: string;
  unit?: string;
  delta?: string | null;
  positive?: boolean;
  description?: string;
  status?: "normal" | "warning" | "danger" | "success";
};

export type DistrictClimate = {
  curah_hujan_mm: number | null;
  suhu_c: number | null;
  kelembaban_pct: number | null;
  /** Klasifikasi curah hujan bulanan BMKG. `null` bila datanya tidak ada. */
  status_cuaca: string | null;
  indeks_pancaroba: boolean;
};

/** Fitur pemicu dominan dari model, sudah berlabel manusia oleh gateway. */
export type PredictionDriver = {
  feature: string;
  label: string;
  value: number;
  percentile: number;
  unit: string;
};

export type KecamatanData = {
  id: string;
  nama: string;
  kode_bps: string;
  populasi: number;
  luas_km2: number;
  disease: DiseaseType;

  /** Bulan yang dirujuk kolom kasus & cuaca, `YYYY-MM-01`. */
  periode_observasi: string | null;
  /** Bulan yang diprediksi, `YYYY-MM-01`. */
  periode_prediksi: string | null;

  kasus_aktif: number | null;
  kasus_prediksi: number | null;
  kasus_prediksi_lower: number | null;
  kasus_prediksi_upper: number | null;
  incidence_rate: number | null;
  skor_risiko: number | null;
  tingkat_risiko: RiskLevel | null;
  coverage: DataCoverage;
  /** Perubahan kasus dibanding bulan observasi sebelumnya, dalam persen. */
  delta_periode: number | null;

  cuaca: DistrictClimate;
  drivers: PredictionDriver[];
  model_version: string | null;
  koordinat: [number, number];
  /** Kasus beberapa bulan observasi terakhir, terlama lebih dulu. */
  riwayat_periode: number[];
};

export type TrendPoint = {
  /** `YYYY-MM-01`. Pelabelan diserahkan ke pemakai lewat `formatMonth`. */
  periode: string;
  kasus_aktual: number | null;
  kasus_prediksi: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  curah_hujan_mm: number | null;
  suhu_c: number | null;
  kelembaban_pct: number | null;
  proyeksi: boolean;
};

export type ClimatePoint = {
  periode: string;
  curah_hujan_mm: number | null;
  suhu_c: number | null;
  kelembaban_pct: number | null;
  /** Kasus per penyakit pada bulan itu, kunci = nama penyakit. */
  kasus: Record<string, number>;
};

export type BacktestMonth = {
  month_start: string;
  actual: number;
  predicted: number;
  risk_class_actual: string | null;
  risk_class_predicted: string | null;
};

export type BacktestMetric = {
  disease: DiseaseType;
  model_version: string;
  algorithm: string | null;
  trained_at: string | null;
  train_period: string | null;
  test_period: string | null;
  mae: number;
  rmse: number;
  r2: number;
  /** Akurasi klasifikasi kelas risiko. `null` bila tidak bisa dihitung. */
  class_accuracy_pct: number | null;
  sample_size: number | null;
  monthly_results: BacktestMonth[];
  coverage_per_kecamatan: Record<string, DataCoverage>;
  fetched_at: string;
};

export type ActionPriority = "high" | "medium" | "low";
export type ActionStatus = "pending" | "in_progress" | "completed";
export type ActionType =
  | "fogging"
  | "psn"
  | "masker"
  | "klorinasi"
  | "logistik_obat"
  | "penyuluhan";

export type ActionRecommendation = {
  id: string;
  disease: DiseaseType;
  action_type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  title: string;
  description: string;
  /** Kalimat "Dasar: …" — wajib ada, PRD §5.2. */
  basis: string;
  target_kecamatan: string[];
  target_population: number;
  /** `YYYY-MM-DD`. */
  due_date: string;
  lead_time_days: number;
  estimated_impact: string;
  climate_trigger: string | null;
  sop_checklist: string[];
  pic_unit: string;
  broadcast_draft: string;
  prediction_month: string;
  predicted_lower: number;
  predicted_upper: number;
  data_coverage: DataCoverage;
  generated_at: string;
  dispatched_at: string | null;
  dispatched_by: string | null;
  completed_at: string | null;
};

export type AuditLog = {
  id: number;
  ts: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  status: "success" | "warning" | "info";
};

/** Status pekerjaan ingest terakhir — menggantikan "status BMKG" yang lama. */
export type IngestStatus = {
  lastJob: {
    source: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    rows: number;
    latencyMs: number | null;
    detail: string;
  } | null;
  climateVariables: string[];
  coverage: { disease: string; months: number; rows: number; latest: string; latestLabel: string }[];
};

export type ReportingPeriod = {
  latestObserved: string | null;
  predictionMonth: string | null;
  monthYear: string;
  predictionLabel: string;
  historyMonths: number;
  granularity: "monthly";
  diseases: DiseaseType[];
  /** Hari terakhir bulan observasi — acuan tenggat konsol, `YYYY-MM-DD`. */
  systemToday: string | null;
};

export type DiseaseSummary = {
  disease: DiseaseType;
  months: number;
  kecamatan: number;
  latestObserved: string;
  latestObservedLabel: string;
};

export type GeoDistrictFeature = {
  type: "Feature";
  properties: {
    id: string;
    nama: string;
    kode_bps: string;
    level: "kecamatan";
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type GeoDistrictCollection = {
  type: "FeatureCollection";
  features: GeoDistrictFeature[];
};

/* ── Laporan warga ───────────────────────────────────────────────────────── */

export type ReportKind = "gejala" | "jentik" | "genangan" | "sampah" | "saluran";
export type ReportStatus = "menunggu" | "terverifikasi" | "ditolak";
export type ReportFamily = "kesehatan" | "lingkungan";

export type CitizenReport = {
  id: string;
  kind: ReportKind;
  kecamatan: string;
  kelurahan: string | null;
  occurredAt: string;
  description: string;
  submittedAt: string;
  photo: string | null;
  status: ReportStatus;
  reviewedAt: string | null;
  reviewer: string | null;
  reviewNote: string | null;
};

export type QueueSummary = {
  total: number;
  menunggu: number;
  terverifikasi: number;
  ditolak: number;
  lingkunganMenunggu: number;
  oldestWaitHours: number | null;
};

export type DistrictTriggerSummary = {
  kecamatan: string;
  total: number;
  byKind: Record<ReportKind, number>;
  latestReportAt: string | null;
  environmentalCount: number;
  healthCount: number;
};

export type RateLimitState = {
  max: number;
  windowHours: number;
  remaining: number;
  blocked: boolean;
  resetsAt: string | null;
};

export type Session = {
  email: string;
  role: Role;
  label: string;
  home: string;
  signedInAt: string;
};
