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

export type MlBacktest = {
  disease: string;
  model_version: string;
  algorithm: string | null;
  trained_at: string | null;
  train_period: string;
  test_period: string;
  metrics: { mae: number; rmse: number; r2: number };
  monthly_results: MlBacktestMonth[];
  coverage_per_kecamatan: Record<string, string>;
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
