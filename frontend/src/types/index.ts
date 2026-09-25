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

export type Role = "dinas" | "admin" | "puskesmas";

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

export type CitizenSignalComparison = {
  without: { mae: number; rmse: number; r2: number };
  with_signal: { mae: number; rmse: number; r2: number };
  note: string;
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
  /** Perbandingan varian dengan sinyal warga; kosong sebelum evaluasi dijalankan. */
  citizen_signal_family?: "semua" | "kesehatan" | "lingkungan" | null;
  citizen_signal_comparison?: CitizenSignalComparison | null;
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
/**
 * Tahapan pekerjaan tindakan (audit §7.A).
 *
 * `assigned` adalah tahap yang dulu hilang: tindakan sudah punya pemilik tetapi
 * belum ada yang mengerjakannya. Tanpa tahap itu, satu tombol "tandai berjalan"
 * harus melayani dua kejadian yang berbeda.
 */
export type ActionStatus = "pending" | "assigned" | "in_progress" | "completed";

export type ActionHistoryEvent =
  | "dibuat"
  | "ditugaskan"
  | "dikonfirmasi"
  | "kendala"
  | "catatan"
  | "selesai"
  | "dibuka_kembali"
  | "dipublikasikan"
  | "publikasi_ditarik";

export type ActionHistoryEntry = {
  id: number;
  ts: string;
  event: ActionHistoryEvent;
  actor: string;
  role: string;
  detail: string;
};

export type ActionAssignment = {
  unit: string;
  pic: string | null;
  note: string | null;
  assignedAt: string;
  assignedBy: string | null;
  /** Tenggat yang disepakati manusia — berbeda dari `due_date` saran aturan. */
  agreedDueDate: string | null;
};

export type ActionAcknowledgement = {
  at: string;
  by: string | null;
  /** Bagaimana konfirmasinya sampai: rapat, telepon, pesan, atau aplikasi. */
  source: string;
};

export type ActionResult = {
  note: string;
  completedBy: string | null;
  /** Butir SOP yang benar-benar dicentang saat pekerjaan ditutup. */
  sopCompleted: string[];
};

/**
 * Bagian satu kecamatan dari tindakan kota. Tiap puskesmas menerima dan
 * menyelesaikan bagiannya sendiri; tindakan selesai bila semua bagian selesai.
 */
export type ActionPart = {
  kecamatan: string;
  status: "assigned" | "in_progress" | "completed";
  assignedAt: string | null;
  acknowledgement: ActionAcknowledgement | null;
  blocker: { note: string; at: string | null } | null;
  result: ActionResult | null;
  completedAt: string | null;
};

export type ActionPublication = {
  publishedAt: string;
  publishedBy: string | null;
};
export type ActionType =
  | "fogging"
  | "psn"
  | "masker"
  | "klorinasi"
  | "logistik_obat"
  | "penyuluhan"
  /* Hanya untuk tugas manual Dinkes. */
  | "lainnya";

/** Saran mesin aturan, atau tugas yang dibuat Dinkes sendiri. */
export type ActionSource = "sistem" | "manual";

/** Puskesmas yang bisa ditugasi — satu per kecamatan. */
export type ActionAssignee = {
  kecamatan: string;
  /** Nama dari akun puskesmas wilayahnya; kosong bila akunnya belum ada. */
  puskesmas: string | null;
};

export type ActionRecommendation = {
  id: string;
  source: ActionSource;
  disease: DiseaseType;
  action_type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  title: string;
  description: string;
  /** Kalimat "Dasar: …" — wajib ada, PRD §5.2. */
  basis: string;
  target_kecamatan: string[];
  /** Sasaran yang belum ditugaskan ke puskesmasnya. Selalu kosong untuk akun puskesmas. */
  unassigned_kecamatan: string[];
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
  predicted_lower: number | null;
  predicted_upper: number | null;
  data_coverage: DataCoverage;
  generated_at: string;
  dispatched_at: string | null;
  dispatched_by: string | null;
  completed_at: string | null;
  assignment: ActionAssignment | null;
  acknowledgement: ActionAcknowledgement | null;
  /** Hambatan yang sedang dicatat; kosong bila tidak ada. */
  blocker: { note: string; at: string } | null;
  result: ActionResult | null;
  /** Kosong sebelum ditugaskan. Untuk akun puskesmas, kolom status di atas
      adalah bagian wilayahnya sendiri. */
  parts: ActionPart[];
  publication: ActionPublication | null;
  history: ActionHistoryEntry[];
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
  /** Bulan kalender berjalan menurut server (WIB), `YYYY-MM-01`. */
  calendarMonth: string;
  /** Jarak bulan kalender dari observasi terakhir; `1` = mutakhir. */
  dataLagMonths: number | null;
  /** Benar bila prakiraan bulan berjalan tidak bisa dibuat dari data yang ada. */
  forecastBehindCalendar: boolean;
  /** Kalimat siap tampil yang menjelaskan keterlambatan; `null` bila mutakhir. */
  lagNotice: string | null;
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
export type ReportStatus =
  | "menunggu"
  | "perlu_informasi"
  | "terverifikasi"
  | "ditolak";
/**
 * Keadaan penerusan ke instansi penerima (F10).
 *
 * Sengaja tidak punya tahap "dikerjakan" atau "selesai": Dinkes menyampaikan
 * laporan dan mencatat penyampaiannya, tidak mengelola pekerjaan instansi lain.
 */
export type ForwardState = "diusulkan" | "perlu_diteruskan" | "diteruskan" | "gagal";
export type ReportFamily = "kesehatan" | "lingkungan";
export type EnvironmentTicketStatus =
  | "baru"
  | "diterima"
  | "dikerjakan"
  | "selesai"
  | "ditutup";
export type EnvironmentTicketPriority = "normal" | "tinggi";
export type EnvironmentHandlingMode = "mandiri_warga" | "dlh";

export type CitizenGuidance = {
  title: string;
  steps: string[];
  caution: string;
};

export type CitizenRouting = {
  family: ReportFamily;
  destination: string;
  /** Instansi penerima bila laporan lingkungan diteruskan. */
  agency: { name: string; short: string } | null;
  handlingMode: EnvironmentHandlingMode | null;
  workflow:
    | "rekap_evaluasi"
    | "pilih_tindak_lanjut"
    | "arahan_warga"
    | "penerusan_instansi";
};

export type ReportForwarding = {
  state: ForwardState;
  target: string;
  channel: string | null;
  reference: string | null;
  note: string | null;
  forwardedAt: string | null;
  /** Jumlah laporan mandiri serupa bila laporan ini naik karena berulang. */
  pattern?: number | null;
};

/** Kelas risiko prakiraan terbaru yang relevan untuk laporan lingkungan. */
export type ReportRiskContext = {
  disease: string;
  riskClass: RiskLevel;
  month: string;
};

/** Kelengkapan informasi lokasi — dasar keputusan "perlu informasi" (F11). */
export type ReportCompleteness = {
  hasKelurahan: boolean;
  hasRtRw: boolean;
  hasLandmark: boolean;
  hasPhoto: boolean;
  hasCoordinates: boolean;
  /** Benar bila petugas punya cukup patokan untuk sampai ke lokasi. */
  locatable: boolean;
  missing: string[];
};

export type PublicEnvironmentTicket = {
  id: string;
  destinationUnit: string;
  status: EnvironmentTicketStatus;
  priority: EnvironmentTicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export type EnvironmentTicket = {
  id: string;
  report_id: string;
  kind: "genangan" | "sampah" | "saluran";
  destination_unit: string;
  status: EnvironmentTicketStatus;
  priority: EnvironmentTicketPriority;
  kecamatan: string;
  kelurahan: string | null;
  summary: string;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

export type CitizenReport = {
  id: string;
  /** Benar bila baris ini disuntikkan sebagai peragaan, bukan dikirim warga. */
  simulated?: boolean;
  /** Benar bila laporan berada di wilayah kerja petugas yang sedang masuk (misal Puskesmas). */
  forMyDistrict?: boolean;
  kind: ReportKind;
  kecamatan: string;
  kelurahan: string | null;
  occurredAt: string;
  description: string;
  submittedAt: string;
  /* Fotonya sendiri tidak ikut di daftar — lihat `fetchReportPhoto`. Sebuah
     data URL base64 bisa mencapai 400 KB, dan antrean menampilkan ratusan
     baris sekaligus. */
  hasPhoto: boolean;
  status: ReportStatus;
  reviewedAt: string | null;
  reviewer: string | null;
  reviewNote: string | null;
  landmark: string | null;
  rtRw: string | null;
  /** Titik perangkat — hanya dikirim ke petugas, null di halaman lacak. */
  location: { latitude: number; longitude: number; accuracyM: number | null } | null;
  /** Dari EXIF foto: merek/tipe ponsel dan jam pemotretan. Hanya untuk petugas. */
  photoMeta: { device: string | null; takenAt: string | null } | null;
  /** Pertanyaan yang menunggu jawaban pelapor, bila statusnya perlu informasi. */
  infoRequest: string | null;
  infoRequestedAt: string | null;
  /** Kode laporan sebelumnya yang dilengkapi atau dirujuk kiriman ini. */
  relatedReportId: string | null;
  completeness: ReportCompleteness;
  forwarding: ReportForwarding | null;
  risk?: ReportRiskContext | null;
  routing: CitizenRouting;
  guidance: CitizenGuidance;
  /** Tiket DLH lama. Tidak dibuat lagi; tetap tampil sebagai riwayat. */
  ticket: PublicEnvironmentTicket | null;
};

export type QueueSummary = {
  total: number;
  menunggu: number;
  perluInformasi: number;
  terverifikasi: number;
  ditolak: number;
  lingkunganMenunggu: number;
  /** Sudah diputuskan perlu diteruskan, penyampaiannya belum tercatat. */
  perluDiteruskan: number;
  /** Usulan penerusan dari puskesmas yang menunggu persetujuan Dinkes. */
  diusulkan: number;
  diteruskan: number;
  oldestWaitHours: number | null;
  /** Jumlah baris yang benar-benar dikirim; ada batas atas per permintaan. */
  shown?: number;
  /** Benar bila masih ada baris yang tertinggal di luar batas itu. */
  truncated?: boolean;
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
  /** Wilayah kerja akun puskesmas; null untuk peran lintas wilayah. */
  kecamatanId: string | null;
  kecamatan: string | null;
};

/* ── Kasus manual resmi (Nakes) ─────────────────────────────────────────── */

export type ManualCaseInput = {
  kecamatan_id: string;
  disease: string;
  month_start?: string;
  date?: string;
  cases: number;
  rainfall_mm?: number | null;
  temp_mean_c?: number | null;
  humidity_pct?: number | null;
  /** Wajib bila mengganti angka yang sudah tersimpan dengan angka berbeda. */
  reason?: string;
};

export type ManualCaseRecord = {
  kecamatan_id: string;
  kecamatan_nama: string;
  disease: string;
  month_start: string;
  cases: number;
  rainfall_mm: number | null;
  temp_mean_c: number | null;
  humidity_pct: number | null;
  source: string;
  recorded_at: string;
};

export type ManualCaseResponse = {
  status: "success";
  message: string;
  data: ManualCaseRecord & {
    /** Angka yang tergantikan, `null` bila periode ini belum pernah diisi. */
    previous_cases: number | null;
    replaced: boolean;
    recorded_by: string | null;
  };
};

/* ── Rekap kasus: kepemilikan angka dan kesiapan periode (F13, F18) ──────── */

export type RecapState = "tersimpan" | "diperiksa";

export type RecapEntry = ManualCaseRecord & {
  /** Orang yang bertanggung jawab atas angka ini, bukan sekadar pengetiknya. */
  recorded_by: string | null;
  revision_reason: string | null;
  recap_state: RecapState | null;
};

export type RecapRevision = {
  previous_cases: number | null;
  new_cases: number;
  reason: string;
  actor: string;
  role: string;
  recorded_at: string;
};

export type RecapEntryResponse = {
  entry: RecapEntry | null;
  revisions: RecapRevision[];
};

export type DistrictRecapStatus = {
  kecamatan_id: string;
  kecamatan_nama: string;
  cases: number | null;
  state: RecapState | "belum_dilaporkan";
  recorded_by: string | null;
  recorded_at: string | null;
};

export type ReadinessStage = {
  id:
    | "rekap_tersimpan"
    | "diperiksa"
    | "periode_siap"
    | "prakiraan_diperbarui"
    | "ditinjau";
  label: string;
  state: "selesai" | "berjalan" | "menunggu";
  detail: string;
  /** Siapa yang harus bergerak bila tahap ini belum selesai. */
  owner: string;
};

export type PeriodReadiness = {
  disease: string;
  month: string;
  totalDistricts: number;
  saved: number;
  checked: number;
  missing: string[];
  stages: ReadinessStage[];
  forecast: {
    month: string | null;
    generatedAt: string | null;
    modelVersion: string | null;
  };
  evaluation: { modelVersion: string | null; fetchedAt: string | null };
  districts: DistrictRecapStatus[];
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
  /** Nilai model sebelum dibulatkan. */
  baseline_expected: number | null;
  scenario_expected: number | null;
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
  baseline_expected_total: number;
  scenario_expected_total: number;
  rank_changed: number;
  /** Kecamatan yang skor risikonya sendiri naik / turun. */
  score_up: number;
  score_down: number;
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

/* ── Retraining Model Machine Learning (Admin) ─────────────────────────── */

export type RetrainMetrics = {
  mae: number;
  rmse: number;
  r2: number;
};

export type RetrainResult = {
  status: string;
  disease: string;
  new_version: string;
  include_citizen: boolean;
  citizen_family?: "semua" | "kesehatan" | "lingkungan" | null;
  citizen_signal_comparison?: {
    without: { mae: number; rmse: number; r2: number };
    with_signal: { mae: number; rmse: number; r2: number };
    note: string;
  } | null;
  metrics: RetrainMetrics;
  previous_version: string | null;
  improved: boolean;
};

export type RetrainResponse = {
  data: RetrainResult;
};
