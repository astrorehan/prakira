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
  AuditLog,
  BacktestMetric,
  CitizenReport,
  ClimatePoint,
  DiseaseSummary,
  DistrictTriggerSummary,
  EnvironmentHandlingMode,
  Escalation,
  EscalationMeta,
  EscalationRules,
  ExplainMeta,
  ExplainPayload,
  GeoDistrictCollection,
  IngestStatus,
  KecamatanData,
  ManualCaseInput,
  ManualCaseRecord,
  ManualCaseResponse,
  PeriodReadiness,
  RecapEntry,
  RecapEntryResponse,
  PriorityMeta,
  PriorityPayload,
  PriorityWeighting,
  QueueSummary,
  RateLimitState,
  ReportKind,
  ReportingPeriod,
  RetrainMetrics,
  RetrainResponse,
  RetrainResult,
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

/* Navigasi konsol sering memasang dua widget yang meminta endpoint sama (atau
   halaman berikutnya dibuka beberapa detik kemudian). Cache proses peramban
   yang pendek menghindari request kembar tanpa membuat data operasional lama.
   Mutasi di bawah otomatis mengosongkannya. */
const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const getInFlight = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

/** Perubahan data atau sesi membatalkan snapshot tingkat komponen juga. */
export function getApiCacheGeneration(): number {
  return cacheGeneration;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const cacheable = method === "GET" && !init?.body;

  if (cacheable) {
    const cached = getCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    getCache.delete(path);

    const running = getInFlight.get(path);
    if (running) return (await running) as T;

    const task = requestNetwork<T>(path, init).then((value) => {
      getCache.set(path, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value,
      });
      return value;
    });
    getInFlight.set(path, task);
    task.finally(() => {
      if (getInFlight.get(path) === task) getInFlight.delete(path);
    }).catch(() => {
      /* Penolakan diteruskan ke pemanggil; finally tidak boleh membuat
         unhandled rejection tambahan. */
    });
    return task;
  }

  const value = await requestNetwork<T>(path, init);
  /* Login, logout, import, review, dan refresh dapat mengubah seluruh snapshot
     baca. Membersihkan cache setelah mutasi menjaga navigasi berikutnya jujur. */
  getCache.clear();
  cacheGeneration += 1;
  return value;
}

async function requestNetwork<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        0,
        "Layanan terlalu lama merespons. Data terakhir tetap dipertahankan; coba muat ulang.",
      );
    }
    throw new ApiError(
      0,
      "Gateway tidak dapat dihubungi. Pastikan layanan backend berjalan, lalu muat ulang.",
    );
  } finally {
    clearTimeout(timeout);
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
    let message: string;
    if (payload && typeof payload === "object" && "error" in payload) {
      message = String((payload as { error: unknown }).error);
    } else if (response.status >= 500) {
      message = "Data belum dapat dimuat. Coba lagi; detail gangguan tersedia bagi pengelola.";
    } else {
      message = `Permintaan tidak dapat diproses (${response.status}).`;
    }
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

/** Samakan respons gateway lama dan baru sebelum dipakai komponen. */
function normalizeAction(action: ActionRecommendation): ActionRecommendation {
  const record = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  const string = (...values: unknown[]): string | null => {
    const value = values.find((item) => typeof item === "string" && item.length > 0);
    return typeof value === "string" ? value : null;
  };

  const assigned = record(action.assignment);
  const unit = string(assigned?.unit);
  const assignedAt = string(assigned?.assignedAt, assigned?.assigned_at);
  const acknowledged = record(action.acknowledgement);
  const acknowledgedAt = string(acknowledged?.at);
  const source = string(acknowledged?.source);
  const result = record(action.result);
  const resultNote = string(result?.note);
  const publication = record(action.publication);
  const publishedAt = string(publication?.publishedAt, publication?.published_at);
  const sop = result?.sopCompleted ?? result?.sop_completed;

  return {
    ...action,
    assignment: unit && assignedAt
      ? {
          unit,
          pic: string(assigned?.pic),
          note: string(assigned?.note),
          assignedAt,
          assignedBy: string(assigned?.assignedBy, assigned?.assigned_by),
          agreedDueDate: string(assigned?.agreedDueDate, assigned?.agreed_due_date),
        }
      : null,
    acknowledgement: acknowledgedAt && source
      ? { at: acknowledgedAt, by: string(acknowledged?.by), source }
      : null,
    result: resultNote
      ? {
          note: resultNote,
          completedBy: string(result?.completedBy, result?.completed_by),
          sopCompleted: Array.isArray(sop)
            ? sop.filter((item): item is string => typeof item === "string")
            : [],
        }
      : null,
    publication: publishedAt
      ? {
          publishedAt,
          publishedBy: string(publication?.publishedBy, publication?.published_by),
        }
      : null,
    parts: Array.isArray(action.parts) ? action.parts : [],
    history: action.history.map((entry, index) => ({
      ...entry,
      id: typeof entry.id === "number" ? entry.id : index,
    })),
  };
}

export function fetchActions(
  disease?: string,
  /** F15: permukaan publik hanya boleh menerima kegiatan yang sudah ditinjau. */
  options: { publishedOnly?: boolean } = {},
): Promise<Envelope<ActionRecommendation[], ReportingPeriod>> {
  const params = new URLSearchParams();
  if (disease) params.set("disease", disease);
  if (options.publishedOnly) params.set("published", "1");
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<Envelope<ActionRecommendation[], ReportingPeriod>>(`/api/actions${query}`)
    .then((response) => ({ ...response, data: response.data.map(normalizeAction) }));
}

/** Satu tindakan berdasarkan id — dipakai halaman nota dinas. */
export function fetchAction(
  id: string,
): Promise<Envelope<ActionRecommendation, ReportingPeriod>> {
  return request<Envelope<ActionRecommendation, ReportingPeriod>>(
    `/api/actions/${encodeURIComponent(id)}`,
  ).then((response) => ({ ...response, data: normalizeAction(response.data) }));
}

/**
 * Kejadian sepanjang hidup satu tindakan (F04, F05).
 *
 * Dulu seluruh alur ini diwakili satu `PATCH { status }`. Satu tulisan status
 * tidak bisa membedakan "sudah ada yang ditugasi" dari "sudah ada yang
 * mengerjakan", dan tidak menyimpan siapa, kapan, atau hasil apa — sehingga
 * layarnya hanya sanggup mencatat awal pekerjaan. Setiap fungsi di bawah
 * mencatat satu kejadian yang benar-benar terjadi di lapangan.
 */
function actionEvent(
  id: string,
  event: string,
  body: Record<string, unknown>,
): Promise<{ data: ActionRecommendation }> {
  return request<{ data: ActionRecommendation }>(`/api/actions/${encodeURIComponent(id)}/${event}`, {
    method: "POST",
    body: JSON.stringify(body),
  }).then((response) => ({ ...response, data: normalizeAction(response.data) }));
}

/** Menetapkan unit pelaksana, PIC, dan tenggat yang disepakati. */
export function assignAction(
  id: string,
  input: { unit: string; pic?: string; dueDate?: string; note?: string },
) {
  return actionEvent(id, "assign", input);
}

/** Mencatat bahwa pelaksana membenarkan menerima penugasan, dan lewat apa. */
export function acknowledgeAction(
  id: string,
  input: { source: string; note?: string },
) {
  return actionEvent(id, "acknowledge", input);
}

/** Hambatan yang menahan pekerjaan — penanda, bukan status baru. */
export function recordActionBlocker(id: string, note: string) {
  return actionEvent(id, "blocker", { note });
}

/** Catatan pelaksanaan; inilah yang memindahkan pekerjaan ke "dikerjakan". */
export function recordActionProgress(id: string, note: string) {
  return actionEvent(id, "progress", { note });
}

/** Menutup pekerjaan. Catatan hasil wajib: tanpa itu tidak ada yang tercatat. */
export function completeAction(
  id: string,
  input: { resultNote: string; sopCompleted?: string[] },
) {
  return actionEvent(id, "complete", input);
}

/** Membuka kembali bagian satu kecamatan yang sudah ditandai selesai. */
export function reopenAction(id: string, reason: string, kecamatan?: string) {
  return actionEvent(id, "reopen", { reason, kecamatan });
}

/** Keputusan penerbitan ke permukaan publik (F15), terpisah dari status kerja. */
export function setActionPublication(id: string, published: boolean) {
  return actionEvent(id, "publication", { published });
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
  /** Patokan yang dikenali orang setempat; menggantikan paksaan titik GPS. */
  landmark?: string;
  rtRw?: string;
  /** Kode laporan yang sedang dilengkapi, bila kiriman ini kelanjutannya. */
  relatedReportId?: string;
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
 * Mencatat penyampaian laporan ke instansi penerima (F10).
 *
 * Menggantikan pengelolaan tiket DLH di dalam aplikasi. Yang tercatat adalah
 * tujuan, kanal, dan referensi penyampaian — bukan progres atau penyelesaian
 * pekerjaan instansi lain, yang memang bukan kewenangan Dinkes.
 */
export function forwardReport(
  id: string,
  input: {
    delivered: boolean;
    target?: string;
    channel?: string;
    reference?: string;
    note?: string;
  },
): Promise<Envelope<CitizenReport, QueueSummary>> {
  return request(`/api/reports/${encodeURIComponent(id)}/forward`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Mengirim rujukan lewat SMTP dan mencatatnya setelah server email menerimanya. */
export function sendReportEmail(
  id: string,
): Promise<Envelope<CitizenReport, QueueSummary> & { recipient: string }> {
  return request(`/api/reports/${encodeURIComponent(id)}/send-email`, {
    method: "POST",
  });
}

/** Laporan lain pada kejadian yang sama, untuk menautkan duplikat (F11). */
export function fetchRelatedReports(
  id: string,
): Promise<{ data: CitizenReport[] }> {
  return request(`/api/reports/${encodeURIComponent(id)}/related`);
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
  decision: {
    status: "terverifikasi" | "ditolak" | "perlu_informasi";
    note?: string;
    handlingMode?: EnvironmentHandlingMode;
    /** Wajib bila keputusannya "perlu informasi": apa yang harus dilengkapi. */
    infoRequest?: string;
  },
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
  /** Periode kecamatan yang belum pernah diisi. */
  newRows: number;
  /** Baris yang akan mengganti angka lama dengan angka berbeda (F13). */
  replacedRows: number;
  replacements: {
    nama: string;
    month: string;
    previousCases: number | null;
    cases: number;
  }[];
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
  replaced: number;
  problems: { line: number; message: string }[];
  /** Jawaban "lalu apa" setelah impor selesai (F18). */
  readiness: Omit<PeriodReadiness, "districts">;
};

export function previewImport(disease: string, csv: string): Promise<ImportPreview> {
  return request("/api/cases/import", {
    method: "POST",
    body: JSON.stringify({ disease, csv, dryRun: true }),
  });
}

export function commitImport(disease: string, csv: string): Promise<ImportResult> {
  return request("/api/cases/import", {
    method: "POST",
    body: JSON.stringify({ disease, csv, dryRun: false }),
  });
}

export function refreshPredictions(): Promise<{ data: unknown[] }> {
  return request("/api/admin/refresh", { method: "POST" });
}

/* ── Kasus Manual (Nakes) ────────────────────────────────────────────────── */

export function submitManualCase(
  payload: ManualCaseInput,
): Promise<ManualCaseResponse> {
  return request("/api/cases/manual", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchRecentManualCases(): Promise<{ data: ManualCaseRecord[] }> {
  return request("/api/cases/recent");
}

/**
 * Rekap yang sudah tersimpan untuk satu kecamatan-penyakit-periode (F13).
 *
 * Dipanggil sebelum menyimpan supaya operator melihat angka yang akan ia
 * ganti — dan siapa pemiliknya — bukan mengetahuinya setelah tergantikan.
 */
export function fetchRecapEntry(
  kecamatanId: string,
  disease: string,
  monthStart: string,
): Promise<{ data: RecapEntryResponse }> {
  const params = new URLSearchParams({
    kecamatan_id: kecamatanId,
    disease,
    month_start: monthStart,
  });
  return request(`/api/cases/entry?${params.toString()}`);
}

/** Menandai rekap sudah diperiksa pemiliknya — kejadian lain dari menyimpan. */
export function markRecapChecked(input: {
  kecamatanId: string;
  disease: string;
  monthStart: string;
}): Promise<{ data: RecapEntry }> {
  return request("/api/cases/entry/checked", {
    method: "POST",
    body: JSON.stringify({
      kecamatan_id: input.kecamatanId,
      disease: input.disease,
      month_start: input.monthStart,
    }),
  });
}

/** Perjalanan kesiapan layanan setelah rekap masuk (F18). */
export function fetchPeriodReadiness(
  disease: string,
  monthStart?: string,
): Promise<{ data: PeriodReadiness }> {
  const params = new URLSearchParams({ disease });
  if (monthStart) params.set("month_start", monthStart);
  return request(`/api/cases/readiness?${params.toString()}`);
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

/** Prioritas terdampak untuk konsol admin — risiko dikalikan orang yang menanggungnya. */
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

/* ── Retraining Model (Admin) ────────────────────────────────────────────── */

export function retrainModel(
  disease: string,
  includeCitizen = false,
  citizenFamily: "semua" | "kesehatan" | "lingkungan" = "lingkungan",
): Promise<RetrainResponse> {
  return request("/api/admin/retrain", {
    method: "POST",
    body: JSON.stringify({
      disease: disease.toUpperCase(),
      includeCitizen,
      citizenFamily,
    }),
  });
}


