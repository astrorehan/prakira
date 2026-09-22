"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import { diseaseLabel } from "@/lib/utils";
import { actionMarkers, effectiveDueDate } from "@/lib/action-queue";
import { describeDeadline } from "@/lib/period";
import { fetchActions, fetchDistricts } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ActionRecommendation, DiseaseType, KecamatanData } from "@/types";
import { DataState } from "./data-state";
import { Badge } from "./ui/badge";

/**
 * Daftar perhatian lintas penyakit (audit §5 F06).
 *
 * Beranda sebelumnya membuka dengan peta dan grafik satu penyakit: pembaca
 * harus menganalisis dulu sebelum tahu pekerjaannya sendiri. Daftar ini
 * membalik urutannya — wilayah, penyakit, alasan singkat, siapa yang memegang,
 * dan pintu tindakan berikutnya — sehingga halaman dibuka dengan pekerjaan,
 * bukan dengan bahan analisis.
 *
 * Kolom "penanggung jawab" hanya menyebut nama bila penugasan benar-benar
 * tercatat. `pic_unit` dari mesin aturan adalah usulan, bukan orang yang sudah
 * menerima pekerjaan, dan menampilkannya sebagai pemilik akan mengarang
 * kepemilikan yang belum ada.
 */

export type AttentionItem = {
  key: string;
  kecamatan: string;
  disease: DiseaseType;
  reason: string;
  pic: string;
  picAssigned: boolean;
  nextLabel: string;
  nextHref: string;
  /** Makin kecil makin dulu; lihat perhitungannya di `buildItems`. */
  severity: number;
  marker: string | null;
};

function districtReason(row: KecamatanData): string | null {
  if (row.tingkat_risiko === "tinggi") {
    return row.kasus_prediksi === null
      ? "Zona siaga pada prakiraan berjalan."
      : `Zona siaga · prakiraan ${row.kasus_prediksi} kasus.`;
  }
  if (row.tingkat_risiko === "sedang" && (row.delta_periode ?? 0) >= 25) {
    return `Zona waspada · kasus naik ${row.delta_periode}% dari bulan lalu.`;
  }
  return null;
}

function actionPic(rec: ActionRecommendation): {
  pic: string;
  assigned: boolean;
} {
  if (!rec.assignment) return { pic: "Belum ditugaskan", assigned: false };
  return {
    pic: rec.assignment.pic
      ? `${rec.assignment.pic} · ${rec.assignment.unit}`
      : rec.assignment.unit,
    assigned: true,
  };
}

function buildItems(
  groups: { disease: DiseaseType; districts: KecamatanData[]; actions: ActionRecommendation[] }[],
  systemToday: string | null,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const group of groups) {
    /* Satu tindakan per kecamatan: yang paling awal dalam antrean, karena itu
       yang akan dibuka orang ketika ia menekan barisnya. */
    const byDistrict = new Map<string, ActionRecommendation>();
    for (const action of group.actions) {
      if (action.status === "completed") continue;
      for (const target of action.target_kecamatan) {
        const current = byDistrict.get(target.toLowerCase());
        if (!current || current.status !== "pending") {
          byDistrict.set(target.toLowerCase(), action);
        }
      }
    }

    for (const row of group.districts) {
      const action = byDistrict.get(row.nama.toLowerCase());
      const reason = districtReason(row);
      if (!reason && !action) continue;

      const markers = action ? actionMarkers(action, systemToday) : [];
      const deadline = action
        ? describeDeadline(effectiveDueDate(action), systemToday)
        : null;
      const { pic, assigned } = action
        ? actionPic(action)
        : { pic: "Belum ditugaskan", assigned: false };

      /* Pintu berikutnya menyebut kejadian yang diminta dari pembaca, bukan
         nama halaman tujuannya. */
      let nextLabel = "Tinjau wilayah";
      let nextHref = "/dashboard";
      if (action) {
        nextHref = "/tindakan";
        if (markers.some((m) => m.id === "terkendala")) nextLabel = "Tangani hambatan";
        else if (markers.some((m) => m.id === "lewat_tenggat"))
          nextLabel = "Tindak lanjuti keterlambatan";
        else if (markers.some((m) => m.id === "belum_dikonfirmasi"))
          nextLabel = "Tagih konfirmasi pelaksana";
        else if (action.status === "pending") nextLabel = "Tinjau tindakan";
        else if (action.status === "assigned") nextLabel = "Buka penugasan";
        else nextLabel = "Catat pelaksanaan";
      }

      const severity =
        (markers.some((m) => m.id === "terkendala" || m.id === "lewat_tenggat") ? 0 : 10) +
        (action?.status === "pending" ? 0 : 2) +
        (row.tingkat_risiko === "tinggi" ? 0 : 1);

      items.push({
        key: `${group.disease}-${row.id}`,
        kecamatan: row.nama,
        disease: group.disease,
        reason:
          reason ??
          (action ? action.basis || action.title : "Tindakan berjalan di wilayah ini."),
        pic,
        picAssigned: assigned,
        nextLabel,
        nextHref,
        severity,
        marker:
          markers[0]?.label ??
          (deadline?.urgency === "overdue" ? "Lewat tenggat" : null),
      });
    }
  }

  return items.sort(
    (a, b) => a.severity - b.severity || a.kecamatan.localeCompare(b.kecamatan),
  );
}

export type AttentionListProps = {
  diseases: DiseaseType[];
  systemToday: string | null;
  className?: string;
};

export function AttentionList({ diseases, systemToday, className }: AttentionListProps) {
  const key = diseases.join(",");

  const data = useApi(async () => {
    if (diseases.length === 0) return [] as AttentionItem[];
    const groups = await Promise.all(
      diseases.map(async (disease) => {
        const [districts, actions] = await Promise.all([
          fetchDistricts(disease),
          fetchActions(disease),
        ]);
        return {
          disease,
          districts: districts.data,
          actions: actions.data,
        };
      }),
    );
    return buildItems(groups, systemToday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, systemToday]);

  const items = data.data ?? [];
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? items : items.slice(0, 8);

  return (
    <section className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Perlu perhatian hari ini
        </h2>
        <p className="text-caption text-paper-600">
          Seluruh penyakit yang dipantau, diurutkan dari yang paling mendesak.
        </p>
      </div>

      <DataState
        loading={data.loading}
        error={data.error}
        empty={!data.loading && items.length === 0}
        emptyMessage="Tidak ada wilayah yang menuntut keputusan hari ini. Peta dan tren di bawah tetap bisa dibuka untuk penelusuran."
        onRetry={data.reload}
      >
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((item) => (
            <li key={item.key}>
              <Link
                href={item.nextHref}
                className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-paper-50 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body-sm font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                    <span>{item.kecamatan}</span>
                    <span className="text-paper-400">·</span>
                    <span className="font-medium text-paper-700">
                      {diseaseLabel(item.disease)}
                    </span>
                    {item.marker && (
                      <Badge variant="risk-medium" className="gap-1">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {item.marker}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-1 text-caption leading-relaxed text-paper-600">
                    {item.reason}
                  </p>
                </div>

                <p className="shrink-0 text-caption text-paper-600 sm:w-52">
                  <span className="text-paper-500">Penanggung jawab: </span>
                  <span
                    className={
                      item.picAssigned ? "font-medium text-foreground" : "text-risk-medium"
                    }
                  >
                    {item.pic}
                  </span>
                </p>

                <span className="flex shrink-0 items-center gap-1 text-caption font-semibold text-brand-700">
                  {item.nextLabel}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {items.length > 8 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-caption font-medium text-brand-700 hover:underline"
          >
            {expanded
              ? "Tampilkan 8 teratas saja"
              : `Tampilkan ${items.length - 8} wilayah lainnya`}
          </button>
        )}
      </DataState>
    </section>
  );
}
