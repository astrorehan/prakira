export type DiseaseType = "DBD" | "ISPA" | "Diare";

export type RiskLevel = "rendah" | "sedang" | "tinggi";

/** Historical data completeness. A thin-history district is NOT a safe one. */
export type DataCoverage = "high" | "medium" | "low" | "insufficient";

export type Role = "dinas" | "puskesmas" | "warga" | "admin";

export type KpiMetric = {
  label: string;
  value: string;
  unit?: string;
  delta?: string | null;
  positive?: boolean; // in health, positive usually means good (lowered cases or high confidence)
  description?: string;
  status?: "normal" | "warning" | "danger" | "success";
};

export type DistrictClimate = {
  curah_hujan_mm: number;
  suhu_c: number;
  kelembaban_pct: number;
  status_cuaca: string;
  indeks_pancaroba: boolean;
};

export type KecamatanData = {
  id: string; // e.g. "KEC_SMG_01"
  nama: string; // e.g. "Semarang Barat"
  kode_bps: string;
  populasi: number;
  luas_km2: number;
  disease: DiseaseType;
  kasus_aktif: number;
  kasus_prediksi: number;
  incidence_rate: number; // per 100.000 penduduk
  skor_risiko: number; // 0 - 100
  tingkat_risiko: RiskLevel;
  confidence: number; // 0.0 - 1.0 (e.g. 0.94)
  /** Prediction interval for `kasus_prediksi`. The point value never ships alone. */
  kasus_prediksi_lower: number;
  kasus_prediksi_upper: number;
  /** Drives the honesty label on <Metric>. Derived from `confidence`. */
  coverage: DataCoverage;
  delta_mingguan: number; // % change (+15.4%)
  cuaca: DistrictClimate;
  rekomendasi: string[];
  koordinat: [number, number];
  historical_cases_3w: number[];
};

export type TrendPoint = {
  periode: string; // e.g. "Mg 1 (Ags)"
  tanggal: string;
  kasus_aktual: number | null;
  kasus_prediksi: number | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  curah_hujan_mm: number;
  suhu_c: number;
  kelembaban_pct: number;
};

export type ClimateCorrelationPoint = {
  periode: string;
  curah_hujan_mm: number;
  suhu_c: number;
  kelembaban_pct: number;
  kasus_dbd: number;
  kasus_ispa: number;
  kasus_diare: number;
};

export type BacktestMetric = {
  model_name: string;
  disease: DiseaseType;
  mae: number;
  rmse: number;
  r2: number;
  accuracy_pct: number;
  backtest_period: string;
  sample_size: number;
};

export type ActionRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  target_kecamatan: string[];
  disease: DiseaseType;
  action_type: "fogging" | "psn" | "masker" | "klorinasi" | "logistik_obat" | "penyuluhan";
  status: "pending" | "in_progress" | "completed";
  due_date: string;
  lead_time_days?: number;
  estimated_impact?: string;
  ai_confidence?: number; // e.g. 94.5
  pic_unit?: string;
  target_population?: string;
  climate_trigger?: string;
  sop_checklist?: string[];
  target_puskesmas?: {
    name: string;
    head: string;
    phone: string;
    readiness: "Siaga 1" | "Siaga 2" | "Siap Operasi";
  }[];
  broadcast_template?: string;
  dispatched_at?: string;
};

export type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  status: "success" | "warning" | "info";
};

export type BmkgSyncStatus = {
  last_sync: string;
  status: "online" | "syncing" | "idle";
  stations_active: number;
  next_sync_in: string;
  latency_ms: number;
  synced_features: string[];
};

export type PublicRiskCheckResult = {
  kecamatan: string;
  disease_statuses: {
    disease: DiseaseType;
    risk_level: RiskLevel;
    skor_risiko: number;
    trend: "naik" | "turun" | "stabil";
    incidence_rate: number;
    edukasi: string[];
    peringatan: string;
  }[];
  cuaca_terkini: DistrictClimate;
  kontak_darurat: string;
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
