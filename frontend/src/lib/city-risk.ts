import { getKecamatanDataList } from "@/lib/mock-data";
import type { DiseaseType, RiskLevel } from "@/types";

const DISEASES: DiseaseType[] = ["DBD", "ISPA", "Diare"];
const ORDER: Record<RiskLevel, number> = { rendah: 0, sedang: 1, tinggi: 2 };

export interface CityRiskRow {
  nama: string;
  /** Worst level the district carries across all three diseases. */
  level: RiskLevel;
  /** Score of the disease that set that level. */
  score: number;
  driver: DiseaseType;
}

/**
 * One row per kecamatan, carrying its worst disease rather than an average.
 *
 * A district that is Siaga for ISPA and Aman for the other two is Siaga — the
 * same rule the single-district panel already uses to pick its headline, so
 * the city view and the district view can never disagree about a district.
 */
export function getCityRiskRows(): CityRiskRow[] {
  const worst = new Map<string, CityRiskRow>();

  for (const disease of DISEASES) {
    for (const kec of getKecamatanDataList(disease)) {
      const current = worst.get(kec.nama);
      const beatsLevel =
        !current || ORDER[kec.tingkat_risiko] > ORDER[current.level];
      const tiesLevelButScoresHigher =
        current &&
        ORDER[kec.tingkat_risiko] === ORDER[current.level] &&
        kec.skor_risiko > current.score;

      if (beatsLevel || tiesLevelButScoresHigher) {
        worst.set(kec.nama, {
          nama: kec.nama,
          level: kec.tingkat_risiko,
          score: kec.skor_risiko,
          driver: disease,
        });
      }
    }
  }

  return [...worst.values()].sort(
    (a, b) => ORDER[b.level] - ORDER[a.level] || b.score - a.score,
  );
}

export interface CityRiskSummary {
  /** Every district, worst-first. */
  rows: CityRiskRow[];
  counts: Record<RiskLevel, number>;
  total: number;
}

export function getCityRiskSummary(): CityRiskSummary {
  const rows = getCityRiskRows();
  return {
    rows,
    counts: {
      tinggi: rows.filter((r) => r.level === "tinggi").length,
      sedang: rows.filter((r) => r.level === "sedang").length,
      rendah: rows.filter((r) => r.level === "rendah").length,
    },
    total: rows.length,
  };
}
