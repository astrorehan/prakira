/**
 * Statistik korelasi untuk halaman Analitik.
 *
 * Halaman ini dulu mencetak "Korelasi Pearson: r = +0.84" dan lencana
 * "P-value < 0.001 (Signifikan)" sebagai teks mati. Angkanya tidak berubah saat
 * penyakit diganti, jadi memilih ISPA menampilkan grafik ISPA di bawah klaim
 * korelasi DBD. Nilai statistik yang tidak dihitung dari datanya bukan
 * transparansi model — ia hiasan yang menyamar sebagai bukti.
 *
 * Korelasinya berjeda. Hujan bulan ini tidak menaikkan kasus bulan ini: telur
 * butuh sekitar dua minggu menjadi nyamuk dewasa, lalu ada transmisi, inkubasi
 * 4–10 hari, gejala, dan baru pencatatan di puskesmas. Mengukur pada jeda nol
 * berarti membandingkan sebab dengan akibat yang belum sempat terjadi. Pada
 * data Semarang 2021–2025 selisihnya besar: r = +0,32 di jeda nol, +0,58 di
 * jeda dua bulan. Karena itu setiap variabel dipindai pada jeda 0–3 bulan dan
 * jeda terpilihnya ikut ditampilkan, bukan disembunyikan di balik satu `r`.
 */

/** Koefisien korelasi Pearson. `null` kalau salah satu deret tanpa variasi. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;

  const meanX = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let sxx = 0;
  let syy = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  const den = Math.sqrt(sxx * syy);
  return den === 0 ? null : num / den;
}

/** Jeda terjauh yang dipindai, dalam bulan. */
export const MAX_LAG = 3;

/**
 * Pearson dengan deret iklim mendahului deret kasus sebanyak `lag` bulan.
 *
 * Iklim bulan ke-`i` dipasangkan dengan kasus bulan ke-`i + lag`. Ekor yang
 * tidak punya pasangan dibuang di kedua sisi, jadi `n` menyusut sebanyak `lag`.
 */
export function pearsonAtLag(
  climate: number[],
  cases: number[],
  lag: number,
): number | null {
  if (lag < 0) return null;
  const n = Math.min(climate.length, cases.length) - lag;
  if (n < 3) return null;
  return pearson(climate.slice(0, n), cases.slice(lag, lag + n));
}

export type LagFit = { r: number | null; lag: number; n: number };

/** Jeda dengan |r| terbesar pada rentang 0..`maxLag`. */
export function bestLag(
  climate: number[],
  cases: number[],
  maxLag = MAX_LAG,
): LagFit {
  let best: LagFit = { r: null, lag: 0, n: Math.min(climate.length, cases.length) };

  for (let lag = 0; lag <= maxLag; lag += 1) {
    const r = pearsonAtLag(climate, cases, lag);
    if (r === null) continue;
    if (best.r === null || Math.abs(r) > Math.abs(best.r)) {
      best = { r, lag, n: Math.min(climate.length, cases.length) - lag };
    }
  }

  return best;
}

/**
 * Nilai kritis |r| dua-arah, indeks berdasarkan derajat bebas (n − 2).
 *
 * Tabel, bukan fungsi distribusi-t penuh: dengan dataset selebar ini, ambang
 * yang dilewati adalah informasi yang berguna, sedangkan p-value desimal
 * hasil aproksimasi hanya akan terlihat lebih pasti daripada yang sebenarnya.
 * Pencarian memakai df tertabel terbesar yang ≤ df sebenarnya, jadi
 * kesimpulannya konservatif.
 */
const CRITICAL_R: { df: number; p05: number; p01: number }[] = [
  { df: 3, p05: 0.878, p01: 0.959 },
  { df: 5, p05: 0.754, p01: 0.874 },
  { df: 8, p05: 0.632, p01: 0.765 },
  { df: 10, p05: 0.576, p01: 0.708 },
  { df: 12, p05: 0.532, p01: 0.661 },
  { df: 15, p05: 0.482, p01: 0.606 },
  { df: 20, p05: 0.423, p01: 0.537 },
  { df: 30, p05: 0.349, p01: 0.449 },
  { df: 50, p05: 0.273, p01: 0.354 },
  { df: 100, p05: 0.195, p01: 0.254 },
];

export type Significance =
  | "signifikan (p<0,01)"
  | "signifikan (p<0,05)"
  | "tidak signifikan"
  | "data belum cukup";

/**
 * `tests` adalah banyaknya jeda yang dipindai sebelum satu `r` dipilih.
 *
 * Memilih |r| terbesar dari empat jeda lalu mengujinya seolah cuma satu
 * pengujian akan melebihkan keyakinan: dengan empat percobaan, peluang salah
 * satunya melewati ambang 5 % secara kebetulan jauh di atas 5 %. Koreksi
 * Bonferroni menuntut α/4 = 0,0125; kolom p01 (α = 0,01) yang tersedia di
 * tabel lebih ketat dari itu, jadi dipakai sebagai ambang "signifikan".
 * Klaim p<0,01 sendiri tidak lagi diterbitkan saat ada pemindaian — ambang
 * terkoreksinya (0,0025) di luar jangkauan tabel ini.
 */
export function significanceOf(
  r: number | null,
  n: number,
  tests = 1,
): Significance {
  if (r === null || n < 5) return "data belum cukup";

  const df = n - 2;
  const row = [...CRITICAL_R].reverse().find((c) => c.df <= df) ?? CRITICAL_R[0];
  const abs = Math.abs(r);

  if (tests > 1) {
    /* Curah hujan dan kasus DBD sama-sama musiman. Pada deret yang lebih
       pendek dari dua siklus tahunan, "jeda 2 bulan" tak bisa dibedakan dari
       dua kurva musiman yang kebetulan bergeser — dan |r| yang keluar justru
       terlihat paling meyakinkan saat datanya paling tipis. ISPA, dengan 12
       bulan tercatat, jatuh di sini. */
    if (n < 24) return "data belum cukup";
    return abs >= row.p01 ? "signifikan (p<0,05)" : "tidak signifikan";
  }

  if (abs >= row.p01) return "signifikan (p<0,01)";
  if (abs >= row.p05) return "signifikan (p<0,05)";
  return "tidak signifikan";
}

/** Benar kalau ambang statistiknya terlewati — untuk memilih gaya lencana. */
export function isSignificant(s: Significance): boolean {
  return s.startsWith("signifikan");
}

/** Kekuatan hubungan dalam kata, supaya angkanya tidak berdiri sendiri. */
export function strengthOf(r: number | null): string {
  if (r === null) return "tak terdefinisi";
  const abs = Math.abs(r);
  if (abs >= 0.8) return "sangat kuat";
  if (abs >= 0.6) return "kuat";
  if (abs >= 0.4) return "sedang";
  if (abs >= 0.2) return "lemah";
  return "sangat lemah";
}

export type Correlation = {
  /** Kunci variabel iklim, untuk mencocokkan warna deret. */
  key: "rain" | "temp" | "humid";
  label: string;
  r: number | null;
  n: number;
  significance: Significance;
  strength: string;
  /** "+0,84" / "−0,31" — koma desimal Indonesia, tanda selalu ikut. */
  display: string;
  /** Jeda terpilih dalam bulan: iklim mendahului kasus sebanyak ini. */
  lag: number;
  /** "tanpa jeda" / "jeda 2 bulan" — supaya angkanya tidak berdiri telanjang. */
  lagLabel: string;
};

export function formatLag(lag: number): string {
  return lag === 0 ? "tanpa jeda" : `jeda ${lag} bulan`;
}

export function formatR(r: number | null): string {
  if (r === null) return "—";
  const sign = r < 0 ? "−" : "+";
  return `${sign}${Math.abs(r).toFixed(2).replace(".", ",")}`;
}

function describe(
  key: Correlation["key"],
  label: string,
  xs: number[],
  ys: number[],
): Correlation {
  const fit = bestLag(xs, ys);
  return {
    key,
    label,
    r: fit.r,
    n: fit.n,
    significance: significanceOf(fit.r, fit.n, MAX_LAG + 1),
    strength: strengthOf(fit.r),
    display: formatR(fit.r),
    lag: fit.lag,
    lagLabel: formatLag(fit.lag),
  };
}

/**
 * Korelasi kasus terhadap tiga variabel iklim sekaligus.
 *
 * Menampilkan ketiganya, bukan satu angka pilihan, karena pendorong tiap
 * penyakit berbeda: DBD mengikuti curah hujan, ISPA justru berlawanan arah
 * dengan kelembaban. Satu `r` tunggal menyembunyikan perbedaan itu.
 *
 * Tiap variabel dipindai pada jeda 0–3 bulan dan yang dilaporkan adalah jeda
 * dengan |r| terbesar, berikut jedanya.
 */
export function climateCorrelations(
  rows: { curah_hujan_mm: number; suhu_c: number; kelembaban_pct: number }[],
  cases: number[],
): Correlation[] {
  return [
    describe("rain", "Curah hujan", rows.map((d) => d.curah_hujan_mm), cases),
    describe("temp", "Suhu", rows.map((d) => d.suhu_c), cases),
    describe("humid", "Kelembaban", rows.map((d) => d.kelembaban_pct), cases),
  ];
}

/** Korelasi dengan |r| terbesar — variabel yang paling menjelaskan deret ini. */
export function strongestCorrelation(list: Correlation[]): Correlation | null {
  const scored = list.filter((c) => c.r !== null);
  if (scored.length === 0) return null;
  return scored.reduce((best, c) =>
    Math.abs(c.r as number) > Math.abs(best.r as number) ? c : best,
  );
}

/* ============================================================================
   Backtest & ML Model Evaluation Helpers
   ========================================================================= */

export type ModelQualityTier = "high" | "moderate" | "low";

export type R2Evaluation = {
  tier: ModelQualityTier;
  label: string;
  badgeVariant: "risk-low" | "risk-medium" | "risk-high";
  color: string;
  percentage: number;
  description: string;
  recommendation: string;
};

/**
 * Kalibrasi kualitatif nilai R² untuk konteks deret waktu epidemiologi bulanan.
 */
export function evaluateR2(r2: number | null | undefined): R2Evaluation {
  if (r2 === null || r2 === undefined || Number.isNaN(r2)) {
    return {
      tier: "low",
      label: "Belum Teruji",
      badgeVariant: "risk-high",
      color: "#5A6C6E",
      percentage: 0,
      description: "Belum ada evaluasi backtesting tersimpan untuk model ini.",
      recommendation: "Lakukan pengujian data historis terlebih dahulu.",
    };
  }

  const percentage = Math.round(r2 * 100);

  if (r2 >= 0.7) {
    return {
      tier: "high",
      label: "Kesesuaian Kuat",
      badgeVariant: "risk-low",
      color: "#1F5132",
      percentage,
      description: `${percentage}% variasi kasus pada data uji berhasil dijelaskan oleh pola iklim dan riwayat kasus.`,
      recommendation: "Model memiliki keandalan tinggi untuk proyeksi operasional dan peringatan dini.",
    };
  }

  if (r2 >= 0.4) {
    return {
      tier: "moderate",
      label: "Kesesuaian Moderat",
      badgeVariant: "risk-medium",
      color: "#D4933A",
      percentage,
      description: `${percentage}% variasi kasus data uji terjelaskan. Baseline solid untuk deret waktu multivariat.`,
      recommendation: "Model menangkap tren umum dengan baik; gunakan interval proyeksi (batas bawah–atas) sebagai acuan.",
    };
  }

  return {
    tier: "low",
    label: "Kesesuaian Terbatas",
    badgeVariant: "risk-high",
    color: "#A8442C",
    percentage: Math.max(0, percentage),
    description: `${percentage}% variasi terjelaskan. Fluktuasi kasus nyata memiliki faktor lokal di luar variabel model.`,
    recommendation: "Perlakukan hasil sebagai indikasi awal dan kombinasikan dengan pengawasan epidemiologis manual.",
  };
}

export type FormattedAlgorithm = {
  architecture: string;
  subtitle: string;
  models: string[];
  description: string;
};

/**
 * Menerjemahkan nama algoritma internal (snake_case) menjadi identitas manusiawi.
 */
export function formatAlgorithmName(rawAlgo: string | null | undefined): FormattedAlgorithm {
  if (!rawAlgo) {
    return {
      architecture: "Model Regresi Standar",
      subtitle: "Model tersimpan",
      models: ["Regresi Multivariat"],
      description: "Model prediksi statistik berbasis data iklim dan riwayat kasus.",
    };
  }

  const normalized = rawAlgo.toLowerCase();

  if (normalized.includes("ensemble_ridge_trees_xgboost") || (normalized.includes("ridge") && normalized.includes("xgboost"))) {
    return {
      architecture: "Ensemble Stacking (Multi-Model)",
      subtitle: "Ridge + Decision Trees + XGBoost",
      models: ["Ridge Regressor", "Decision Trees", "XGBoost"],
      description:
        "Kombinasi berbobot: Regresi Ridge untuk stabilitas linier, Decision Trees untuk pola lokal, dan XGBoost untuk optimasi galat residual.",
    };
  }

  if (normalized.includes("ensemble_rf_xgboost_elasticnet") || (normalized.includes("rf") && normalized.includes("elasticnet"))) {
    return {
      architecture: "Ensemble Stacking (Multi-Model)",
      subtitle: "Random Forest + XGBoost + ElasticNet",
      models: ["Random Forest", "XGBoost", "ElasticNet"],
      description:
        "Kombinasi berbobot: Random Forest untuk varians non-linier, XGBoost untuk gradien boosting, dan ElasticNet untuk seleksi fitur seimbang.",
    };
  }

  // Generic parser for other ensemble / single models
  const parts = normalized.split(/[_+]/).filter((p) => p !== "ensemble" && p !== "model");
  const modelLabels: Record<string, string> = {
    rf: "Random Forest",
    trees: "Decision Trees",
    tree: "Decision Tree",
    ridge: "Ridge Regressor",
    xgboost: "XGBoost",
    xgb: "XGBoost",
    elasticnet: "ElasticNet",
    lasso: "Lasso Regressor",
    lstm: "LSTM RNN",
    arima: "ARIMA",
    sarima: "SARIMA",
    linear: "Regresi Linier",
    svm: "Support Vector Regressor",
    svr: "Support Vector Regressor",
    lightgbm: "LightGBM",
  };

  const detectedModels = parts.map((p) => modelLabels[p] ?? p.toUpperCase());

  const isEnsemble = normalized.includes("ensemble");
  return {
    architecture: isEnsemble ? "Ensemble Stacking Model" : (detectedModels[0] ?? "Model Statistik"),
    subtitle: detectedModels.join(" + ") || rawAlgo,
    models: detectedModels.length > 0 ? detectedModels : [rawAlgo],
    description: isEnsemble
      ? `Penggabungan ensemble dari algoritma ${detectedModels.join(", ")} untuk meminimalkan bias dan varians prediksi.`
      : `Model prediksi berbasis ${detectedModels.join(", ")}.`,
  };
}

const MONTHS_SHORT_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
] as const;

/**
 * Mengubah rentang tanggal "YYYY-MM-DD to YYYY-MM-DD" menjadi format bahasa Indonesia
 * yang ringkas dan informatif, misal: "Apr 2021 – Des 2024 (45 bulan)".
 */
export function formatPeriodRange(periodStr: string | null | undefined): {
  formatted: string;
  startLabel: string;
  endLabel: string;
  monthsCount: number | null;
  monthsLabel: string;
} {
  if (!periodStr) {
    return {
      formatted: "—",
      startLabel: "—",
      endLabel: "—",
      monthsCount: null,
      monthsLabel: "—",
    };
  }

  const separator = periodStr.includes(" to ")
    ? " to "
    : periodStr.includes(" s/d ")
      ? " s/d "
      : periodStr.includes(" - ")
        ? " - "
        : null;

  if (!separator) {
    return {
      formatted: periodStr,
      startLabel: periodStr,
      endLabel: periodStr,
      monthsCount: null,
      monthsLabel: "—",
    };
  }

  const [startRaw, endRaw] = periodStr.split(separator).map((s) => s.trim());

  const parseMonth = (str: string) => {
    const parts = str.split("-");
    if (parts.length >= 2) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
        return {
          year,
          month,
          label: `${MONTHS_SHORT_ID[month - 1]} ${year}`,
        };
      }
    }
    return null;
  };

  const startParsed = parseMonth(startRaw);
  const endParsed = parseMonth(endRaw);

  if (startParsed && endParsed) {
    const monthsCount =
      (endParsed.year - startParsed.year) * 12 + (endParsed.month - startParsed.month) + 1;
    const countLabel = `${monthsCount} bulan`;
    return {
      formatted: `${startParsed.label} – ${endParsed.label}`,
      startLabel: startParsed.label,
      endLabel: endParsed.label,
      monthsCount,
      monthsLabel: countLabel,
    };
  }

  return {
    formatted: `${startRaw} – ${endRaw}`,
    startLabel: startRaw,
    endLabel: endRaw,
    monthsCount: null,
    monthsLabel: "—",
  };
}

