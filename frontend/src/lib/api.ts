/**
 * Klien API gateway.
 *
 * Berkas ini dulu punya jalur cadangan: bila `NEXT_PUBLIC_API_URL` kosong atau
 * permintaan gagal, ia mengembalikan `mock-data.ts` diam-diam. Akibatnya
 * dashboard yang backend-nya mati tetap tampil penuh angka, dan tidak ada cara
 * membedakannya dari dashboard yang bekerja. Cadangan itu dihapus: kegagalan
 * kini dilempar sebagai `ApiError` dan setiap permukaan yang memakainya wajib
 * menampilkan keadaan gagal.
 *
 * `API_BASE` sengaja kosong secara bawaan. `next.config.mjs` mem-proxy
 * `/api/*` ke gateway, jadi permintaan dari peramban berjalan same-origin dan
 * cookie sesi ikut terkirim tanpa konfigurasi CORS tambahan.
 */
import type {
  ActionRecommendation,
  ActionStatus,
  AuditLog,
  BacktestMetric,
  CitizenReport,
  ClimatePoint,
  DiseaseSummary,
  DistrictTriggerSummary,
  Escalation,
  EscalationMeta,
  EscalationRules,
  ExplainMeta,
  ExplainPayload,
  GeoDistrictCollection,
  IngestStatus,
  KecamatanData,
  PriorityMeta,
  PriorityPayload,
  PriorityWeighting,
  QueueSummary,
  RateLimitState,
  ReportKind,
  ReportingPeriod,
  RewindMeta,
  RewindPayload,
  Session,
  SimulateMeta,
  SimulatePayload,
  SurgeResult,
  TrendPoint,
} from "@/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Terbungkus `meta` + `data`: metadata periode ikut di hampir semua respons. */
export type Envelope<T, M = Record<string, unknown>> = { meta: M; data: T };

export type DistrictsMeta = ReportingPeriod & {
  disease: string;
  /** Benar bila prediksi berasal dari cache karena layanan ML tak terjangkau. */
  stale: boolean;
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Gateway tidak dapat dihubungi. Pastikan layanan backend berjalan, lalu muat ulang.",
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Gateway menjawab ${response.status}.`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

/* ── Metadata ────────────────────────────────────────────────────────────── */

export function fetchPeriod(disease?: string): Promise<ReportingPeriod> {
  const query = disease ? `?disease=${encodeURIComponent(disease)}` : "";
  return request<ReportingPeriod>(`/api/meta/period${query}`);
}

export function fetchDiseases(): Promise<DiseaseSummary[]> {
  return request<DiseaseSummary[]>("/api/meta/diseases");
}

export type ActivityEntry = {
  id: number;
  ts: string;
  role: string;
  action: string;
  status: "success" | "warning" | "info";
};

/** Denyut sistem tanpa identitas — aman untuk halaman layanan publik. */
export function fetchActivity(limit = 8): Promise<{ data: ActivityEntry[] }> {
  return request(`/api/meta/activity?limit=${limit}`);
}

export function fetchGeoJson(): Promise<GeoDistrictCollection> {
  return request<GeoDistrictCollection>("/api/meta/geojson");
}

export type KecamatanRef = {
  id: string;
  nama: string;
  kode_bps: string;
  populasi: number;
  luas_km2: number;
  koordinat: [number, number];
};

export function fetchKecamatanList(): Promise<KecamatanRef[]> {
  return request<KecamatanRef[]>("/api/meta/kecamatan");
}

/* ── Prediksi & observasi ────────────────────────────────────────────────── */

export function fetchDistricts(
  disease: string,
  options: { refresh?: boolean } = {},
): Promise<Envelope<KecamatanData[], DistrictsMeta>> {
  const refresh = options.refresh ? "&refresh=1" : "";
  return request(`/api/districts?disease=${encodeURIComponent(disease)}${refresh}`);
}

/** Seluruh penyakit sekaligus — dipakai permukaan publik yang butuh risiko
 *  terburuk lintas penyakit tanpa menembakkan satu permintaan per penyakit. */
export function fetchAllDistricts(): Promise<
  Envelope<Record<string, KecamatanData[]>, DistrictsMeta & { staleDiseases: string[] }>
> {
  return request("/api/districts/all");
}

export function fetchTrend(
  disease: string,
  months = 12,
): Promise<Envelope<TrendPoint[], DistrictsMeta>> {
  return request(`/api/trend?disease=${encodeURIComponent(disease)}&months=${months}`);
}

export function fetchClimateSeries(
  months = 60,
): Promise<Envelope<ClimatePoint[], ReportingPeriod>> {
  return request(`/api/climate?months=${months}`);
}

/* ── Model ───────────────────────────────────────────────────────────────── */

export type BacktestMeta = {
  limitations: string[];
  errors?: Record<string, string>;
  stale: boolean;
};

export function fetchBacktests(
  disease?: string,
): Promise<Envelope<BacktestMetric[], BacktestMeta>> {
  const query = disease ? `?disease=${encodeURIComponent(disease)}` : "";
  return request(`/api/model/backtest${query}`);
}

/**
 * Mesin Waktu: hasil periode uji dirinci per bulan x kecamatan.
 *
 * Terpisah dari `fetchBacktests` dengan sengaja — muatannya ratusan baris dan
 * hanya satu halaman yang memerlukannya.
 */
export function fetchRewind(
  disease: string,
): Promise<Envelope<RewindPayload, RewindMeta>> {
  return request(`/api/model/rewind?disease=${encodeURIComponent(disease)}`);
}

export function fetchLimitations(): Promise<{ data: string[] }> {
  return request("/api/model/limitations");
}

/* ── Tindakan ────────────────────────────────────────────────────────────── */

export function fetchActions(
  disease?: string,
): Promise<Envelope<ActionRecommendation[], ReportingPeriod>> {
  const query = disease ? `?disease=${encodeURIComponent(disease)}` : "";
  return request(`/api/actions${query}`);
}

/** Satu tindakan berdasarkan id — dipakai halaman nota dinas. */
export function fetchAction(
  id: string,
): Promise<Envelope<ActionRecommendation, ReportingPeriod>> {
  return request(`/api/actions/${encodeURIComponent(id)}`);
}

export function updateActionStatus(
  id: string,
  status: ActionStatus,
): Promise<{ data: ActionRecommendation }> {
  return request(`/api/actions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/* ── Laporan warga ───────────────────────────────────────────────────────── */

export function fetchRateLimit(): Promise<RateLimitState> {
  return request("/api/reports/rate-limit");
}

export type NewReportInput = {
  kind: ReportKind;
  kecamatan: string;
  kelurahan?: string;
  occurredAt: string;
  description: string;
  photo?: string;
};

export function submitReport(
  input: NewReportInput,
): Promise<{ data: CitizenReport; rateLimit: RateLimitState }> {
  return request("/api/reports", { method: "POST", body: JSON.stringify(input) });
}

export function trackReport(code: string): Promise<{ data: CitizenReport }> {
  return request(`/api/reports/track/${encodeURIComponent(code)}`);
}

export type VerifiedSignal = {
  id: string;
  kind: ReportKind;
  kecamatan: string;
  submittedAt: string;
  reviewedAt: string | null;
};

/** Laporan terverifikasi tanpa isinya — aman untuk permukaan publik. */
export function fetchVerifiedReports(
  kecamatan?: string,
  limit = 10,
): Promise<{ data: VerifiedSignal[] }> {
  const query = kecamatan ? `&kecamatan=${encodeURIComponent(kecamatan)}` : "";
  return request(`/api/reports/verified?limit=${limit}${query}`);
}

/** Ringkasan agregasi pemicu lingkungan terverifikasi per kecamatan. */
export function fetchTriggerSummary(
  kecamatan?: string,
): Promise<{ data: DistrictTriggerSummary[] }> {
  const query = kecamatan ? `?kecamatan=${encodeURIComponent(kecamatan)}` : "";
  return request<{ data: DistrictTriggerSummary[] }>(`/api/reports/triggers${query}`);
}

export function fetchReportQueue(
  kecamatan?: string,
): Promise<Envelope<CitizenReport[], QueueSummary>> {
  const query = kecamatan ? `?kecamatan=${encodeURIComponent(kecamatan)}` : "";
  return request(`/api/reports${query}`);
}

/**
 * Foto satu laporan, diambil terpisah dari barisnya.
 *
 * Antrean verifikasi dulu menerima setiap foto dari setiap laporan sekaligus,
 * termasuk yang sudah selesai berbulan-bulan lalu — seratus laporan berfoto
 * menjadi respons ±40 MB. Sekarang daftarnya hanya membawa `hasPhoto`, dan
 * gambarnya diminta ketika kartunya benar-benar terlihat di layar.
 */
export function fetchReportPhoto(id: string): Promise<{ data: string }> {
  return request(`/api/reports/${encodeURIComponent(id)}/photo`);
}

export function reviewReport(
  id: string,
  decision: { status: "terverifikasi" | "ditolak"; note?: string },
): Promise<Envelope<CitizenReport, QueueSummary>> {
  return request(`/api/reports/${encodeURIComponent(id)}/review`, {
    method: "PATCH",
    body: JSON.stringify(decision),
  });
}

/* ── Sesi ────────────────────────────────────────────────────────────────── */

export function signIn(email: string, password: string): Promise<{ data: Session }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signOut(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

export function fetchSession(): Promise<{ data: Session | null }> {
  return request("/api/auth/session");
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

export function fetchIngestStatus(): Promise<IngestStatus> {
  return request("/api/admin/sync-status");
}

export function fetchAuditLog(limit = 25): Promise<{ data: AuditLog[] }> {
  return request(`/api/admin/audit?limit=${limit}`);
}

export type ImportPreview = {
  dryRun: true;
  disease: string;
  columns: { required: string[]; optional: string[]; found: string[] };
  totalRows: number;
  validRows: number;
  problems: { line: number; message: string }[];
  preview: {
    nama: string;
    month: string;
    cases: number;
    rainfall: number | null;
    temp: number | null;
    humidity: number | null;
  }[];
};

export type ImportResult = {
  dryRun: false;
  disease: string;
  imported: number;
  problems: { line: number; message: string }[];
};

export function previewImport(disease: string, csv: string): Promise<ImportPreview> {
  return request("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({ disease, csv, dryRun: true }),
  });
}

export function commitImport(disease: string, csv: string): Promise<ImportResult> {
  return request("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({ disease, csv, dryRun: false }),
  });
}

export function refreshPredictions(): Promise<{ data: unknown[] }> {
  return request("/api/admin/refresh", { method: "POST" });
}

/**
 * "Kenapa angka ini?" — kontribusi fitur untuk satu kecamatan.
 *
 * Tidak punya cadangan tersimpan, dan itu disengaja di sisi gateway: penjelasan
 * yang basi menerangkan angka yang sudah berganti. Kalau layanan ML mati,
 * permukaan ini wajib menampilkan keadaan gagal.
 */
export function fetchExplain(
  disease: string,
  kecamatanId: string,
): Promise<Envelope<ExplainPayload, ExplainMeta>> {
  return request(
    `/api/model/explain?disease=${encodeURIComponent(disease)}&kecamatan_id=${encodeURIComponent(kecamatanId)}`,
  );
}

/** Simulator cuaca. POST karena tiga parameter geseran, bukan karena menulis. */
export function runSimulation(input: {
  disease: string;
  rainfallPct: number;
  tempDeltaC: number;
  humidityDeltaPct: number;
}): Promise<Envelope<SimulatePayload, SimulateMeta>> {
  return request("/api/model/simulate", {
    method: "POST",
    body: JSON.stringify({
      disease: input.disease,
      rainfall_pct: input.rainfallPct,
      temp_delta_c: input.tempDeltaC,
      humidity_delta_pct: input.humidityDeltaPct,
    }),
  });
}

/** Prioritas terdampak — risiko dikalikan orang yang menanggungnya. */
export function fetchPriority(
  disease: string,
  weighting: PriorityWeighting = "populasi",
): Promise<Envelope<PriorityPayload, PriorityMeta>> {
  return request(
    `/api/districts/priority?disease=${encodeURIComponent(disease)}&bobot=${weighting}`,
  );
}

/** Eskalasi "perlu perhatian" (S4). Butuh sesi. */
export function fetchEscalations(): Promise<
  Envelope<Escalation[], EscalationMeta>
> {
  return request("/api/reports/escalations");
}

/* ── Peragaan lonjakan (admin/dinas) ─────────────────────────────────────── */

export function fetchSimulationStatus(): Promise<
  Envelope<{ kecamatan: string; total: number }[], { totalSimulasi: number }>
> {
  return request("/api/admin/demo/surge");
}

export function injectSurge(input: {
  kecamatan: string;
  kind: ReportKind;
  count: number;
  spreadDays?: number;
}): Promise<
  Envelope<
    SurgeResult,
    { simulasi: true; totalSimulasi: number; rules: EscalationRules }
  >
> {
  return request("/api/admin/demo/surge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function clearSurge(): Promise<{
  meta: { removed: number };
  data: { rules: EscalationRules; escalations: Escalation[]; scanned: number };
}> {
  return request("/api/admin/demo/surge", { method: "DELETE" });
}
