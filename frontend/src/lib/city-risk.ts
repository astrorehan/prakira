import type { DiseaseType, KecamatanData, RiskLevel } from "@/types";

const ORDER: Record<RiskLevel, number> = { rendah: 0, sedang: 1, tinggi: 2 };

export interface CityRiskRow {
  nama: string;
  /** Kelas terburuk yang dibawa kecamatan ini di seluruh penyakit. */
  level: RiskLevel | null;
  /** Skor penyakit yang menetapkan kelas itu. `null` bila belum ada prediksi. */
  score: number | null;
  driver: DiseaseType | null;
}

/**
 * Satu baris per kecamatan, membawa penyakit terburuknya alih-alih rata-rata.
 *
 * Kecamatan yang Siaga untuk ISPA dan Aman untuk yang lain tetap Siaga — aturan
 * yang sama dipakai panel kecamatan tunggal, sehingga tampilan kota dan
 * tampilan kecamatan tidak bisa berbeda pendapat tentang satu kecamatan.
 *
 * Kecamatan tanpa prediksi tetap muncul dengan `level: null`. Menghilangkannya
 * dari daftar akan membuat kota tampak lebih terpantau daripada kenyataannya.
 */
export function getCityRiskRows(byDisease: Record<string, KecamatanData[]>): CityRiskRow[] {
  const worst = new Map<string, CityRiskRow>();

  for (const [disease, districts] of Object.entries(byDisease)) {
    for (const kec of districts) {
      const current = worst.get(kec.nama);

      if (!current) {
        worst.set(kec.nama, {
          nama: kec.nama,
          level: kec.tingkat_risiko,
          score: kec.skor_risiko,
          driver: kec.tingkat_risiko ? disease : null,
        });
        continue;
      }

      if (kec.tingkat_risiko === null) continue;

      const beatsLevel =
        current.level === null || ORDER[kec.tingkat_risiko] > ORDER[current.level];
      const tiesButScoresHigher =
        current.level !== null &&
        ORDER[kec.tingkat_risiko] === ORDER[current.level] &&
        (kec.skor_risiko ?? 0) > (current.score ?? 0);

      if (beatsLevel || tiesButScoresHigher) {
        worst.set(kec.nama, {
          nama: kec.nama,
          level: kec.tingkat_risiko,
          score: kec.skor_risiko,
          driver: disease,
        });
      }
    }
  }

  return [...worst.values()].sort((a, b) => {
    const rankA = a.level === null ? -1 : ORDER[a.level];
    const rankB = b.level === null ? -1 : ORDER[b.level];
    if (rankA !== rankB) return rankB - rankA;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export interface CityRiskSummary {
  /** Setiap kecamatan, terburuk lebih dulu. */
  rows: CityRiskRow[];
  counts: Record<RiskLevel, number>;
  /** Kecamatan yang belum punya prediksi sama sekali. */
  unknown: number;
  total: number;
}

export function summarizeCityRisk(rows: CityRiskRow[]): CityRiskSummary {
  return {
    rows,
    counts: {
      tinggi: rows.filter((r) => r.level === "tinggi").length,
      sedang: rows.filter((r) => r.level === "sedang").length,
      rendah: rows.filter((r) => r.level === "rendah").length,
    },
    unknown: rows.filter((r) => r.level === null).length,
    total: rows.length,
  };
}
