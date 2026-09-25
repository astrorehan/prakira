import type { DiseaseType } from "@/types";

/**
 * Warna identitas per penyakit (token `dz-*`, docs/DESIGN-SYSTEM.md §2.8).
 *
 * Ini warna *nama* penyakit — tab, ikon, aksen — bukan warna risiko. Hijau,
 * kuning, dan merah tetap milik `risk-*` saja, jadi DBD yang ungu tidak pernah
 * terbaca sebagai "Siaga". Kelas ditulis lengkap agar Tailwind menemukannya.
 */
export interface DiseaseTone {
  /** Teks dan ikon; lolos AA di atas putih dan di atas `bg`. */
  ink: string;
  /** Titik, batang, latar ikon penuh. */
  fill: string;
  bg: string;
  border: string;
  /** Latar kartu bergradasi lembut. */
  surface: string;
  /** Tab terpilih: isi penuh, teks putih. */
  tabActive: string;
}

const TONES: Record<string, DiseaseTone> = {
  DBD: {
    ink: "text-dz-dbd-ink",
    fill: "bg-dz-dbd-fill",
    bg: "bg-dz-dbd-bg",
    border: "border-dz-dbd-br",
    surface: "bg-grad-dz-dbd",
    tabActive: "bg-dz-dbd-ink text-white",
  },
  ISPA: {
    ink: "text-dz-ispa-ink",
    fill: "bg-dz-ispa-fill",
    bg: "bg-dz-ispa-bg",
    border: "border-dz-ispa-br",
    surface: "bg-grad-dz-ispa",
    tabActive: "bg-dz-ispa-ink text-white",
  },
  LEPTOSPIROSIS: {
    ink: "text-dz-lepto-ink",
    fill: "bg-dz-lepto-fill",
    bg: "bg-dz-lepto-bg",
    border: "border-dz-lepto-br",
    surface: "bg-grad-dz-lepto",
    tabActive: "bg-dz-lepto-ink text-white",
  },
};

/* Penyakit baru dari dataset belum punya hue sendiri: ia memakai warna merek,
   bukan meminjam hue penyakit lain. */
const FALLBACK: DiseaseTone = {
  ink: "text-brand-700",
  fill: "bg-ocean-500",
  bg: "bg-ocean-50",
  border: "border-ocean-200",
  surface: "bg-grad-aqua-soft",
  tabActive: "bg-brand-700 text-white",
};

export function diseaseTone(disease: DiseaseType | null | undefined): DiseaseTone {
  if (!disease) return FALLBACK;
  return TONES[disease.toUpperCase()] ?? FALLBACK;
}
