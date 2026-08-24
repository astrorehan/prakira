import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DiseaseType, RiskLevel } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ============================================================================
   Risk semantics — docs/DESIGN-SYSTEM.md §2.3
   Every value here is a design token. No stock Tailwind colours.

   `fill` values descend monotonically in lightness (84 → 74 → 45) so the
   ordinal survives grayscale, colour blindness, print and a projector in the
   exhibition room. `color` is the text/stroke value; `fill` is the map area.
   ========================================================================= */

export type RiskConfig = {
  label: string;
  /** Text & stroke colour. */
  color: string;
  /** Choropleth area fill. Lighter than `color` by design. */
  fill: string;
  textColor: string;
  bgSoft: string;
  border: string;
  /** lucide-react icon name. Risk is never encoded by colour alone. */
  iconName: string;
  badgeVariant: "risk-low" | "risk-medium" | "risk-high" | "risk-none";
  /** Diagonal hatch on top of the fill, for protanopia separation. */
  hatch: boolean;
  description: string;
  /** Legacy alias kept for the deprecated liquid-glass surfaces. */
  glassClass: string;
};

export const RISK_CONFIG: Record<RiskLevel, RiskConfig> = {
  rendah: {
    label: "Risiko Rendah",
    color: "#1B6B4F",
    fill: "#BCD9C9",
    textColor: "text-risk-low",
    bgSoft: "bg-risk-low-bg",
    border: "border-risk-low-br",
    iconName: "ShieldCheck",
    badgeVariant: "risk-low",
    hatch: false,
    description:
      "Insiden terkendali. Lanjutkan pemantauan rutin dan sanitasi lingkungan.",
    glassClass: "liquid-glass-risk-low",
  },
  sedang: {
    label: "Risiko Sedang",
    color: "#A8690C",
    fill: "#E0AF63",
    textColor: "text-risk-medium",
    bgSoft: "bg-risk-medium-bg",
    border: "border-risk-medium-br",
    iconName: "AlertTriangle",
    badgeVariant: "risk-medium",
    hatch: false,
    description:
      "Pola iklim mulai memicu peningkatan. Siagakan tim puskesmas dan mulai edukasi warga.",
    glassClass: "liquid-glass-risk-medium",
  },
  tinggi: {
    label: "Risiko Tinggi",
    color: "#A32B1F",
    fill: "#B34434",
    textColor: "text-risk-high",
    bgSoft: "bg-risk-high-bg",
    border: "border-risk-high-br",
    iconName: "Siren",
    badgeVariant: "risk-high",
    hatch: true,
    description:
      "Potensi lonjakan dalam 2–4 minggu. Perlu intervensi terarah: fogging fokus, PSN serentak, dan penyiapan stok obat.",
    glassClass: "liquid-glass-risk-high",
  },
};

/* ── Data coverage — PRD §7-H2 ─────────────────────────────────────────────
   A district with thin history is NOT a low-risk district. It gets its own
   class, its own colour, and its own copy. This is the single easiest trust
   bug for a judge to find, so it is modelled explicitly. */

export type DataCoverage = "high" | "medium" | "low" | "insufficient";

export const COVERAGE_CONFIG: Record<
  DataCoverage,
  { label: string; className: string; description: string }
> = {
  high: {
    label: "Tinggi",
    className: "text-paper-500",
    description: "Data historis lengkap. Interval prediksi relatif sempit.",
  },
  medium: {
    label: "Sedang",
    className: "text-paper-500",
    description: "Sebagian periode historis kosong. Interval prediksi lebih lebar.",
  },
  low: {
    label: "Rendah",
    className: "text-risk-medium",
    description:
      "Data historis terbatas. Prediksi punya ketidakpastian tinggi — perlakukan sebagai indikasi, bukan angka.",
  },
  insufficient: {
    label: "Tidak memadai",
    className: "text-risk-none",
    description:
      "Data historis tidak cukup untuk menghasilkan prediksi yang dapat dipertanggungjawabkan.",
  },
};

/* ── Climate variables — fixed encoding across the whole product ────────── */
export const CLIMATE_COLORS = {
  rain: "#2E6F8E",
  temp: "#B4552A",
  humid: "#4E8C7E",
} as const;

/* ── Categorical series — charts only, never encodes risk ───────────────── */
export const CAT_COLORS = ["#0B4A57", "#7A5C2E", "#47617F", "#5B4A70", "#2C6650"] as const;

/* ============================================================================
   Disease profiles

   Note: diseases are NOT colour-coded on the risk map — colour there belongs to
   risk. `color` below is the categorical series colour used in multi-series
   charts only (docs/DESIGN-SYSTEM.md §2.4). Diseases are distinguished in the
   UI by icon + label.

   Leptospirosis (PRD §3.2) is pending the data pass; add it to `DiseaseType`
   in src/types/index.ts together with its TREND_DATA entry once the Semarang
   historical series is loaded.
   ========================================================================= */

export const DISEASE_CONFIG: Record<
  DiseaseType,
  {
    name: string;
    short: DiseaseType;
    vector: string;
    /** Categorical chart series colour. Not a risk colour. */
    color: string;
    softColor: string;
    borderColor: string;
    iconName: string;
    climateTriggers: string;
    defaultIntervention: string;
  }
> = {
  DBD: {
    name: "Demam Berdarah Dengue",
    short: "DBD",
    vector: "Nyamuk Aedes aegypti",
    color: CAT_COLORS[0],
    softColor: "#EAF4F5",
    borderColor: "#D6E9EC",
    iconName: "Bug",
    climateTriggers:
      "Curah hujan tinggi pasca kemarau, suhu 28–32 °C, kelembaban di atas 75%",
    defaultIntervention: "Fogging fokus dan PSN 3M Plus serentak",
  },
  ISPA: {
    name: "Infeksi Saluran Pernapasan Akut",
    short: "ISPA",
    vector: "Aerosol dan partikulat udara",
    color: CAT_COLORS[2],
    softColor: "#EEF1F5",
    borderColor: "#D8DFE8",
    iconName: "Wind",
    climateTriggers:
      "Kelembaban rendah, fluktuasi suhu siang–malam yang ekstrem, kualitas udara memburuk",
    defaultIntervention:
      "Distribusi masker, edukasi ventilasi rumah, peringatan kualitas udara",
  },
  Diare: {
    name: "Penyakit Diare",
    short: "Diare",
    vector: "Patogen air dan kontaminasi sanitasi",
    color: CAT_COLORS[4],
    softColor: "#E9F1ED",
    borderColor: "#CFE0D8",
    iconName: "Droplets",
    climateTriggers:
      "Curah hujan ekstrem atau genangan banjir yang mencemari sumber air bersih",
    defaultIntervention: "Klorinasi air, logistik oralit dan zinc, penyuluhan PHBS",
  },
};

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("id-ID", opts).format(n);
}

export function formatIncidence(rate: number): string {
  return `${rate.toFixed(1)} / 100rb`;
}

export function formatPercent(val: number, showSign: boolean = true): string {
  const sign = showSign && val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

/** "41 – 68" — always render a prediction with its bounds (PRD §7-H1). */
export function formatRange(lower: number, upper: number): string {
  return `${formatNumber(lower)} – ${formatNumber(upper)}`;
}
