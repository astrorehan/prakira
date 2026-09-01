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

/** Metrik satu pembanding naif pada periode uji yang sama dengan model. */
export type BaselineResult = {
  label: string;
  mae: number;
  rmse: number;
  r2: number;
};

export type BaselineComparison = {
  baselines: Record<string, BaselineResult>;
  summary: {
    best_baseline: string;
    best_baseline_label: string;
    best_baseline_mae: number;
    model_mae: number;
    model_beats_all_baselines: boolean;
    mae_improvement_pct: number;
  } | null;
};

/**
 * Kalibrasi rentang prakiraan.
 *
 * `target_coverage` adalah yang dijanjikan, `empirical_coverage` yang
 * benar-benar tercapai pada periode uji. Keduanya ditampilkan berdampingan:
 * label tanpa pembuktinya adalah bagian yang berbahaya.
 */
export type ConformalCalibration = {
  method: string;
  alpha: number;
  q_hat: number;
  difficulty: string;
  n_calibration: number;
  n_folds?: number | null;
  calibration_period: string;
  target_coverage: number;
  empirical_coverage: number;
  mean_width: number;
  median_width: number;
  n_evaluated: number;
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
  /** Fitur paling berpengaruh saat pelatihan, terbesar lebih dulu. */
  top_features: ModelFeature[];
  /** Pembanding naif. `null` pada baris uji yang tersimpan sebelum fitur ini ada. */
  baselines: BaselineComparison | null;
  /** Kalibrasi rentang. `null` bila modelnya belum dilatih ulang. */
  conformal: ConformalCalibration | null;
  fetched_at: string;
};

/* -- Mesin Waktu ---------------------------------------------------------- */

/** Putusan satu pasangan bulan x kecamatan pada periode uji model. */
export type RewindVerdict =
  /** Kelas tinggi yang benar terjadi dan sudah ditandai lebih dulu. */
  | "tertandai"
  /** Kelas tinggi yang terjadi tapi tidak ditandai — peringatan yang gagal. */
  | "terlewat"
  /** Peringatan kelas tinggi yang tidak terbukti — sumber daya bergerak sia-sia. */
  | "alarm_palsu"
  /** Kelas sama, di luar kelas tinggi. */
  | "sepadan"
  /** Kelas berbeda tanpa melibatkan kelas tinggi. */
  | "meleset";

export type RewindTally = Record<RewindVerdict, number>;

export type RewindCell = {
  month_start: string;
  kecamatan_id: string;
  nama: string;
  actual: number;
  predicted: number;
  risk_score_actual: number;
  risk_score_predicted: number;
  risk_class_actual: RiskLevel | null;
  risk_class_predicted: RiskLevel | null;
  verdict: RewindVerdict;
};

export type RewindMonth = {
  month_start: string;
  label: string;
  /** Panjang bulan dalam hari — jarak antara prakiraan terbit dan rekapnya. */
  lead_time_days: number;
  actual: number;
  predicted: number;
  evaluated: number;
  tally: RewindTally;
};

export type RewindDistrict = {
  id: string;
  nama: string;
  kode_bps: string;
  populasi: number;
  evaluated: number;
  tally: RewindTally;
  /** Rata-rata selisih mutlak kasus di kecamatan ini, `null` bila tak diuji. */
  mae: number | null;
};

export type RewindSummary = {
  evaluated: number;
  monthsCount: number;
  districtsCount: number;
  leadTimeDays: number | null;
  tally: RewindTally;
  /** Bulan-kecamatan yang benar-benar berkelas tinggi. */
  surges: number;
  /** Peringatan kelas tinggi yang terbit, benar maupun tidak. */
  alarms: number;
  sensitivityPct: number | null;
  precisionPct: number | null;
  classAccuracyPct: number | null;
  mae: number | null;
};

export type RewindMeta = {
  disease: DiseaseType;
  model_version: string;
  algorithm: string | null;
  trained_at: string | null;
  train_period: string | null;
  test_period: string | null;
  fetched_at: string;
  leadTimeNote: string[];
  limitations: string[];
};

export type RewindPayload = {
  months: RewindMonth[];
  districts: RewindDistrict[];
  cells: RewindCell[];
  summary: RewindSummary;
};

export type ModelFeature = {
  feature: string;
  /** Bobot kepentingan relatif; skalanya bergantung algoritma. */
  importance: number;
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
  /** Benar bila baris ini disuntikkan sebagai peragaan, bukan dikirim warga. */
  simulated?: boolean;
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

/* ── "Kenapa angka ini?" — kontribusi fitur per kecamatan ────────────────── */

/** Satu fitur dasar beserta nilai pembandingnya. */
export type ExplainFeature = {
  feature: string;
  label: string;
  unit: string;
  value: number;
  /** Nilai lazim yang dipakai sebagai pembanding, `null` bila tak tersedia. */
  reference: number | null;
  percentile: number | null;
};

export type ExplainFamily = {
  key: string;
  label: string;
  unit: string;
  note: string;
  reference_scope: "kecamatan" | "kota";
  /** Positif berarti keadaan bulan ini menaikkan prakiraan di atas bulan lazim. */
  delta: number;
  /** Prakiraan bila kelompok ini diganti nilai lazimnya. */
  counterfactual_cases: number;
  /** Porsi terhadap total pergerakan mutlak, bukan terhadap prakiraan. */
  share_pct: number | null;
  features: ExplainFeature[];
};

export type ExplainPayload = {
  data_coverage: DataCoverage;
  baseline_cases: number;
  baseline_rounded: number;
  reference_scope: "kecamatan" | "kota";
  reference_months: number;
  total_movement: number;
  families: ExplainFamily[];
  /** Importance hasil pelatihan — global, bukan per kecamatan. */
  global_importance: ModelFeature[];
};

export type ExplainMeta = {
  disease: DiseaseType;
  kecamatan_id: string;
  kecamatan_nama: string;
  month: string;
  monthLabel: string;
  method: string;
  notes: string[];
};

/* ── Simulator cuaca ─────────────────────────────────────────────────────── */

export type SimulateAdjustment = {
  rainfall_pct: number;
  temp_delta_c: number;
  humidity_delta_pct: number;
};

export type SimulateDistrict = {
  /** Id aplikasi (`KEC_SMG_xx`) — sudah diterjemahkan gateway. */
  id: string;
  nama: string;
  kecamatan_id: string;
  kecamatan_nama: string;
  data_coverage: DataCoverage;
  baseline_cases: number | null;
  baseline_risk_score: number | null;
  baseline_risk_class: RiskLevel | null;
  baseline_rank: number | null;
  scenario_cases: number | null;
  scenario_risk_score: number | null;
  scenario_risk_class: RiskLevel | null;
  scenario_rank: number | null;
  rainfall_baseline: number | null;
  rainfall_scenario: number | null;
  /** Fitur yang keluar dari rentang data latih setelah digeser. */
  beyond_training: string[];
};

export type SimulateSummary = {
  evaluated: number;
  baseline_total: number;
  scenario_total: number;
  baseline_high: number;
  scenario_high: number;
  rank_changed: number;
  beyond_training: number;
};

export type SimulatePayload = {
  districts: SimulateDistrict[];
  summary: SimulateSummary;
};

export type SimulateMeta = {
  disease: DiseaseType;
  month: string;
  monthLabel: string;
  adjustment: SimulateAdjustment;
  notes: string[];
  limitations: string[];
};

/* ── Prioritas terdampak ─────────────────────────────────────────────────── */

export type PriorityWeighting = "populasi" | "kepadatan";

export type PriorityRow = {
  id: string;
  nama: string;
  populasi: number;
  luas_km2: number;
  /** Jiwa per km². */
  kepadatan: number;
  /** Kepadatan dibagi median kota; 1,0 berarti sama dengan median. */
  kepadatan_relatif: number;
  skor_risiko: number | null;
  tingkat_risiko: RiskLevel | null;
  kasus_prediksi: number | null;
  kasus_prediksi_lower: number | null;
  kasus_prediksi_upper: number | null;
  coverage: DataCoverage;
  jiwa_berbobot: number | null;
  indeks_prioritas: number | null;
  peringkat_risiko: number | null;
  peringkat_prioritas: number | null;
  /** Positif berarti naik peringkat saat populasi ikut dihitung. */
  pergeseran: number | null;
};

export type PrioritySummary = {
  naikTajam: string[];
  turunTajam: string[];
  jiwaKelasTinggi: number;
  jiwaTerhitung: number;
  evaluated: number;
};

export type PriorityPayload = {
  rows: PriorityRow[];
  summary: PrioritySummary;
};

export type PriorityMeta = ReportingPeriod & {
  disease: DiseaseType;
  stale: boolean;
  error?: string;
  weighting: PriorityWeighting;
  method: string[];
  /** Faktor kerentanan yang diakui berpengaruh tapi tidak ada datanya. */
  missingFactors: string[];
};

/* ── Eskalasi laporan warga (S4) ─────────────────────────────────────────── */

export type EscalationReasonKind = "volume" | "pemusatan" | "tertahan";

export type EscalationReason = {
  kind: EscalationReasonKind;
  label: string;
  detail: string;
};

export type Escalation = {
  kecamatan: string;
  level: "perlu_perhatian";
  total: number;
  menunggu: number;
  terverifikasi: number;
  perJenis: Record<string, number>;
  jenisDominan: ReportKind | null;
  keluarga: ReportFamily | "campuran";
  tungguTerlamaJam: number | null;
  laporanTerakhir: string | null;
  reasons: EscalationReason[];
};

export type EscalationRules = {
  windowDays: number;
  minReports: number;
  minSameKind: number;
  maxWaitHours: number;
};

export type EscalationMeta = {
  rules: EscalationRules;
  defaults: EscalationRules;
  scanned: number;
  explanation: string[];
};

export type SurgeResult = {
  created: string[];
  kecamatan: string;
  kind: ReportKind;
  spreadDays: number;
  eskalasiSebelum: Escalation[];
  eskalasiSesudah: Escalation[];
  /** Kecamatan yang baru naik status akibat penyuntikan ini. */
  baru: Escalation[];
};
