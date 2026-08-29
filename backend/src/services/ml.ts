/**
 * Klien layanan ML (FastAPI `ml-services`).
 *
 * Gateway tidak pernah menghitung prediksi sendiri. Kalau layanan ML mati,
 * fungsi di sini melempar `MlUnavailableError` dan pemanggilnya jatuh ke
 * prediksi terakhir yang tersimpan di database — bukan ke angka karangan.
 * Itu perbedaan yang dijanjikan PRD §6 dan satu-satunya alasan tabel
 * `prediksi` ada.
 */
import { env } from "../env.js";

export class MlUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MlUnavailableError";
  }
}

export type MlDriver = { feature: string; value: number; percentile: number };

export type MlPrediction = {
  kecamatan_id: string;
  disease: string;
  month: string;
  predicted_cases: number;
  lower_bound: number;
  upper_bound: number;
  risk_score: number;
  risk_class: "rendah" | "sedang" | "tinggi" | null;
  data_coverage: "high" | "medium" | "low" | "insufficient";
  drivers: MlDriver[];
  model_version: string;
};

export type MlBacktestMonth = {
  month_start: string;
  actual: number;
  predicted: number;
  risk_class_actual: string | null;
  risk_class_predicted: string | null;
};

/** Satu pasangan bulan x kecamatan pada periode uji model. */
export type MlBacktestDistrict = {
  month_start: string;
  kecamatan_id: string;
  actual: number;
  predicted: number;
  risk_score_actual: number;
  risk_score_predicted: number;
  risk_class_actual: string | null;
  risk_class_predicted: string | null;
};

export type MlBacktest = {
  disease: string;
  model_version: string;
  algorithm: string | null;
  trained_at: string | null;
  train_period: string;
  test_period: string;
  metrics: { mae: number; rmse: number; r2: number };
  monthly_results: MlBacktestMonth[];
  district_results?: MlBacktestDistrict[];
  coverage_per_kecamatan: Record<string, string>;
  top_features?: { feature: string; importance: number }[];
};

export type MlHealth = {
  status: string;
  diseases_available: string[];
  models_loaded: Record<
    string,
    {
      model_exists: boolean;
      version: string;
      trained_at: string;
      granularity: string;
    }
  >;
};

async function call<T>(pathname: string, init?: RequestInit): Promise<T> {
  const url = `${env.mlServiceUrl.replace(/\/$/, "")}${pathname}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.mlTimeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        /* Dikirim selalu; layanan ML mengabaikannya saat tokennya kosong. */
        "x-ml-token": env.mlApiToken,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new MlUnavailableError(
        `Layanan ML menjawab ${response.status} untuk ${pathname}: ${body.slice(0, 300)}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MlUnavailableError) throw error;
    throw new MlUnavailableError(
      `Layanan ML tidak dapat dihubungi di ${url}. Jalankan ml-services lalu ulangi.`,
      error,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function mlHealth(): Promise<MlHealth> {
  return call<MlHealth>("/health");
}

export async function mlPredictBatch(
  disease: string,
  month: string,
): Promise<MlPrediction[]> {
  const body = await call<{ predictions: MlPrediction[] }>("/predict/batch", {
    method: "POST",
    body: JSON.stringify({ disease: disease.toUpperCase(), month }),
  });
  return body.predictions ?? [];
}

export function mlBacktest(disease: string): Promise<MlBacktest> {
  return call<MlBacktest>(
    `/backtest?disease=${encodeURIComponent(disease.toUpperCase())}`,
  );
}

export function mlRetrain(disease: string, includeCitizen: boolean) {
  return call<{
    status: string;
    disease: string;
    new_version: string;
    include_citizen: boolean;
    metrics: { mae: number; rmse: number; r2: number };
    previous_version: string | null;
    improved: boolean;
  }>("/retrain", {
    method: "POST",
    body: JSON.stringify({
      disease: disease.toUpperCase(),
      include_citizen: includeCitizen,
    }),
  });
}

/* ── Penjelasan kontribusi fitur & simulator cuaca ───────────────────────── */

export type MlExplainFeature = {
  feature: string;
  label: string;
  unit: string;
  value: number;
  reference: number | null;
  percentile: number | null;
};

export type MlExplainFamily = {
  key: string;
  label: string;
  unit: string;
  note: string;
  reference_scope: "kecamatan" | "kota";
  delta: number;
  counterfactual_cases: number;
  share_pct: number | null;
  features: MlExplainFeature[];
};

export type MlExplain = {
  kecamatan_id: string;
  disease: string;
  month: string;
  data_coverage: "high" | "medium" | "low" | "insufficient";
  baseline_cases: number;
  baseline_rounded: number;
  reference_scope: "kecamatan" | "kota";
  reference_months: number;
  total_movement: number;
  families: MlExplainFamily[];
  global_importance: { feature: string; label?: string; importance: number }[];
  method: string;
  notes: string[];
};

export type MlSimulateDistrict = {
  kecamatan_id: string;
  kecamatan_nama: string;
  data_coverage: "high" | "medium" | "low" | "insufficient";
  baseline_cases: number | null;
  baseline_risk_score: number | null;
  baseline_risk_class: string | null;
  baseline_rank: number | null;
  scenario_cases: number | null;
  scenario_risk_score: number | null;
  scenario_risk_class: string | null;
  scenario_rank: number | null;
  rainfall_baseline: number | null;
  rainfall_scenario: number | null;
  beyond_training: string[];
};

export type MlSimulate = {
  disease: string;
  month: string;
  adjustment: {
    rainfall_pct: number;
    temp_delta_c: number;
    humidity_delta_pct: number;
  };
  districts: MlSimulateDistrict[];
  summary: {
    evaluated: number;
    baseline_total: number;
    scenario_total: number;
    baseline_high: number;
    scenario_high: number;
    rank_changed: number;
    beyond_training: number;
  };
  notes: string[];
};

export function mlExplain(
  disease: string,
  kecamatanId: string,
  month: string,
): Promise<MlExplain> {
  return call<MlExplain>("/explain", {
    method: "POST",
    body: JSON.stringify({
      disease: disease.toUpperCase(),
      kecamatan_id: kecamatanId,
      month,
    }),
  });
}

export function mlSimulate(input: {
  disease: string;
  month: string;
  rainfallPct: number;
  tempDeltaC: number;
  humidityDeltaPct: number;
}): Promise<MlSimulate> {
  return call<MlSimulate>("/simulate", {
    method: "POST",
    body: JSON.stringify({
      disease: input.disease.toUpperCase(),
      month: input.month,
      rainfall_pct: input.rainfallPct,
      temp_delta_c: input.tempDeltaC,
      humidity_delta_pct: input.humidityDeltaPct,
    }),
  });
}
