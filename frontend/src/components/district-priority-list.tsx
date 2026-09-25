"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn, diseaseLabel, formatMaybeNumber, riskConfigOf } from "@/lib/utils";
import type { ActionRecommendation, DiseaseType, KecamatanData } from "@/types";

/**
 * Prioritas wilayah — panel di samping peta.
 *
 * Menggantikan daftar perhatian lintas penyakit yang dulu berdiri di atas
 * peta. Daftar itu memuat 27 baris dari semua penyakit sekaligus, sehingga
 * saat tab DBD aktif isinya justru ISPA, dan peta terdorong 1.300 px ke
 * bawah. Di sini daftarnya mengikuti penyakit yang sedang dibuka, berhenti di
 * lima wilayah, dan setiap baris menyorot wilayahnya di peta.
 */
type DistrictPriorityListProps = {
  districts: KecamatanData[];
  actions: ActionRecommendation[];
  disease: DiseaseType;
  onSelect: (id: string) => void;
  className?: string;
};

const LIMIT = 5;

function reasonOf(row: KecamatanData): string {
  if (row.kasus_prediksi === null) return "Belum ada prakiraan";
  const range =
    row.kasus_prediksi_lower !== null && row.kasus_prediksi_upper !== null
      ? ` · ${formatMaybeNumber(row.kasus_prediksi_lower)}–${formatMaybeNumber(row.kasus_prediksi_upper)}`
      : "";
  return `${formatMaybeNumber(row.kasus_prediksi)} kasus${range}`;
}

export function DistrictPriorityList({
  districts,
  actions,
  disease,
  onSelect,
  className,
}: DistrictPriorityListProps) {
  const top = React.useMemo(
    () =>
      [...districts]
        .sort((a, b) => (b.skor_risiko ?? -1) - (a.skor_risiko ?? -1))
        .slice(0, LIMIT),
    [districts],
  );

  /* Wilayah yang sudah punya tindakan terbuka mendapat pintu ke /tindakan. */
  const openAction = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of actions) {
      if (a.status === "completed") continue;
      for (const k of a.target_kecamatan) set.add(k.toLowerCase());
    }
    return set;
  }, [actions]);

  const siaga = districts.filter((d) => d.tingkat_risiko === "tinggi").length;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="border-b border-border pb-3">
        <p className="overline">5 wilayah prioritas · {diseaseLabel(disease)}</p>
        <h3 className="mt-0.5 text-h3 text-foreground">
          {siaga > 0
            ? `${siaga} kecamatan zona siaga`
            : "Tidak ada kecamatan zona siaga"}
        </h3>
      </div>

      <ol className="mt-1 min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {top.map((row, i) => {
          const risk = riskConfigOf(row.tingkat_risiko);
          const hasAction = openAction.has(row.nama.toLowerCase());
          return (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold tabular",
                  risk.bgSoft,
                  risk.textColor,
                )}
              >
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                className="group min-w-0 flex-1 text-left"
              >
                <span className="block break-words text-body-sm font-semibold text-foreground group-hover:text-brand-700">
                  {row.nama}
                </span>
                <span className="mt-0.5 block text-caption tabular text-paper-600">
                  <span className={cn("font-medium", risk.textColor)}>{risk.label}</span>
                  {" · "}
                  {reasonOf(row)}
                </span>
              </button>
              {hasAction ? (
                <Link
                  href={`/tindakan?disease=${encodeURIComponent(disease)}`}
                  className="flex shrink-0 items-center gap-1 text-caption font-semibold text-brand-700 hover:underline"
                >
                  {/* Di ponsel cukup panahnya; nama kecamatan lebih perlu tempat. */}
                  <span className="sr-only min-[400px]:not-sr-only">Tindakan</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-paper-400" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
