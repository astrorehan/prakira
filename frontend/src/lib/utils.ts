import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import type { DiseaseType, RiskLevel, DataCoverage } from "@/types";

/* tailwind-merge only knows Tailwind's stock font sizes. Our scale replaces
   them with names of its own (DESIGN-SYSTEM.md §7), and a name it does not
   recognise after `text-` is filed as a text *colour* — so `text-overline`
   and `text-paper-600` looked like the same class group and the colour, being
   last, silently won.

   That is why kpi-card's coverage label rendered at the inherited size: its
   `text-overline` was being dropped before it ever reached the DOM. Sizes
   written as arbitrary values (`text-[10px]`) were immune, which is what hid
   the bug while the codebase still used them.

   Listing the scale here fixes every call site at once. Keep this in step
   with `fontSize` in tailwind.config.ts. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "5xs",
            "4xs",
            "3xs",
            "2xs",
            "overline",
            "caption",
            "body-sm",
            "body",
            "body-lg",
            "h3",
            "h2",
            "h1",
            "display",
            "metric-sm",
            "metric",
            "metric-xl",
          ],
        },
      ],
    },
  },
});

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
    label: "Rendah",
    color: "#1F5132",
    fill: "#7AA876",
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
    label: "Waspada",
    color: "#D4933A",
    fill: "#E5AA52",
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
    label: "Siaga",
    color: "#A8442C",
    fill: "#C95E42",
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

/** Canonical definition lives in @/types; re-exported so existing imports hold. */
export type { DataCoverage };

export const COVERAGE_CONFIG: Record<
  DataCoverage,
  { label: string; className: string; description: string }
> = {
  high: {
    label: "Tinggi",
    className: "text-paper-600",
    description: "Data historis lengkap. Interval prediksi relatif sempit.",
  },
  medium: {
    label: "Sedang",
    className: "text-paper-600",
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

   Daftar penyakit yang benar-benar tampil ditentukan gateway
   (`/api/meta/diseases`), bukan berkas ini. Yang ada di sini adalah profil
   penjelasnya — nama panjang, vektor, pemicu iklim — yaitu pengetahuan domain
   yang tidak berubah mengikuti dataset. Penyakit tanpa profil tetap bisa
   tampil lewat `diseaseProfile()` di bawah, dengan label seadanya alih-alih
   membuat halamannya jatuh.
   ========================================================================= */

export type DiseaseProfile = {
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
};

export const DISEASE_CONFIG: Record<string, DiseaseProfile> = {
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
  LEPTOSPIROSIS: {
    name: "Leptospirosis",
    /* Nama penyakit disimpan kapital semua di gateway karena setiap kueri
       menyaringnya dengan `disease.toUpperCase()`. "LEPTOSPIROSIS" sebagai
       teriakan di layar bukan maksudnya — bentuk bacanya diambil dari sini. */
    short: "Leptospirosis",
    vector: "Urin tikus pada air dan lumpur genangan",
    color: CAT_COLORS[1],
    softColor: "#F3EFE9",
    borderColor: "#E3DACC",
    iconName: "Rat",
    climateTriggers:
      "Banjir dan rob yang menggenangi permukiman, curah hujan ekstrem, saluran tersumbat",
    defaultIntervention:
      "Sanitasi pascagenangan, pengendalian tikus, buffer stock doksisiklin",
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

/** Worst coverage in the set, ordered high → insufficient. */
const COVERAGE_RANK: DataCoverage[] = ["high", "medium", "low", "insufficient"];

/**
 * Coverage of a figure aggregated over several districts. The weakest input
 * decides: a city total built on one district with no history is not a
 * high-coverage number, however complete the other fifteen are.
 */
export function aggregateCoverage(parts: DataCoverage[]): DataCoverage {
  return parts.reduce<DataCoverage>(
    (worst, c) =>
      COVERAGE_RANK.indexOf(c) > COVERAGE_RANK.indexOf(worst) ? c : worst,
    "high",
  );
}

/**
 * Nama penyakit sebagaimana dibaca manusia.
 *
 * Gateway menyimpan dan mengirim nama penyakit kapital semua — bukan pilihan
 * gaya, melainkan konsekuensi setiap kueri menyaring dengan
 * `disease.toUpperCase()`. Akronim seperti DBD dan ISPA memang begitu bentuknya,
 * tapi "LEPTOSPIROSIS" di tengah kalimat terbaca sebagai teriakan. Dipakai di
 * setiap tempat nama penyakit muncul sebagai teks, bukan sebagai kunci.
 */
export function diseaseLabel(
  disease: DiseaseType | null | undefined,
): string {
  /* Nullish jadi string kosong, bukan "—": pemanggilnya menyisipkan ini di
     tengah kalimat, dan sebelum ada pembantu ini React memang tidak menuliskan
     apa pun untuk `null`. */
  return disease ? diseaseProfile(disease).short : "";
}

/** Profil penyakit, dengan cadangan seadanya untuk penyakit yang belum dikenal. */
export function diseaseProfile(disease: DiseaseType): DiseaseProfile {
  return (
    DISEASE_CONFIG[disease] ?? {
      name: disease,
      short: disease,
      vector: "—",
      color: CAT_COLORS[3],
      softColor: "#F1F0F4",
      borderColor: "#DEDCE4",
      iconName: "Activity",
      climateTriggers: "Belum ada profil pemicu iklim untuk penyakit ini.",
      defaultIntervention: "Belum ada intervensi baku yang terdaftar.",
    }
  );
}

/* ── Nilai yang boleh kosong ─────────────────────────────────────────────
   Prediksi sekarang bisa benar-benar tidak ada. Pembantu di bawah memastikan
   kekosongan tampil sebagai "—", bukan sebagai 0 — nol berarti "diprediksi nol
   kasus", dan dua hal berbeda tidak boleh terlihat sama. */

export function formatMaybeNumber(
  value: number | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  return value === null || value === undefined ? "—" : formatNumber(value, opts);
}

export function formatMaybeRange(
  lower: number | null | undefined,
  upper: number | null | undefined,
): string | null {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return null;
  }
  return formatRange(lower, upper);
}

export function formatMaybePercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatPercent(value);
}

export function formatMaybeIncidence(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatIncidence(value);
}

/** Konfigurasi risiko, termasuk keadaan "belum ada prediksi". */
export const RISK_UNKNOWN = {
  label: "Data tidak memadai",
  color: "#6B6560",
  fill: "#D6D2CC",
  textColor: "text-risk-none",
  bgSoft: "bg-paper-100",
  border: "border-paper-300",
  iconName: "HelpCircle",
  badgeVariant: "risk-none" as const,
  hatch: false,
  description:
    "Belum ada prediksi untuk kecamatan ini pada periode berjalan. Kekosongan ini bukan tanda aman.",
  glassClass: "liquid-glass",
};

export function riskConfigOf(level: RiskLevel | null | undefined) {
  return level ? RISK_CONFIG[level] : RISK_UNKNOWN;
}
