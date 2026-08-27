"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Download, Info, Table2 } from "lucide-react";

import {
  cn,
  formatNumber,
  formatMaybeNumber,
  formatMaybePercent,
  formatMaybeIncidence,
  riskConfigOf,
  COVERAGE_CONFIG,
} from "@/lib/utils";
import { formatMonth } from "@/lib/period";
import { downloadCsv, slugify, toCsv as buildCsv } from "@/lib/export";
import { useCityData } from "@/lib/use-city-data";
import { DataState } from "@/components/data-state";
import type { DiseaseType, KecamatanData, RiskLevel } from "@/types";
import { Reveal } from "@/components/landing/reveal";

type SortKey = "skor_risiko" | "kasus_aktif" | "incidence_rate" | "nama";

const COLUMNS: Array<{
  key: SortKey | null;
  label: string;
  align?: "right";
  className?: string;
}> = [
  { key: "nama", label: "Kecamatan" },
  { key: "kasus_aktif", label: "Kasus aktif", align: "right" },
  { key: null, label: "Prakiraan", align: "right" },
  { key: "incidence_rate", label: "Insidensi", align: "right", className: "hidden lg:table-cell" },
  { key: null, label: "Perubahan", align: "right", className: "hidden md:table-cell" },
  { key: "skor_risiko", label: "Skor", align: "right" },
  { key: null, label: "Status" },
];

const TAG: Record<RiskLevel, string> = {
  tinggi: "border-risk-high-br bg-risk-high-bg text-risk-high",
  sedang: "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
  rendah: "border-risk-low-br bg-risk-low-bg text-risk-low",
};

const BAR: Record<RiskLevel, string> = {
  tinggi: "bg-grad-bar-high",
  sedang: "bg-grad-bar-medium",
  rendah: "bg-grad-bar-low",
};

/* Nilai yang kosong keluar sebagai sel kosong, bukan sebagai 0: berkas yang
   diunduh untuk dianalisis ulang tidak boleh menyamarkan ketiadaan data. */
function toCsv(rows: KecamatanData[], disease: DiseaseType) {
  return buildCsv(rows, [
    { header: "kode_bps", value: (r) => r.kode_bps },
    { header: "kecamatan", value: (r) => r.nama },
    { header: "penyakit", value: () => disease },
    { header: "bulan_observasi", value: (r) => r.periode_observasi },
    { header: "bulan_prakiraan", value: (r) => r.periode_prediksi },
    { header: "populasi", value: (r) => r.populasi },
    { header: "kasus_observasi", value: (r) => r.kasus_aktif },
    { header: "prakiraan_bawah", value: (r) => r.kasus_prediksi_lower },
    { header: "prakiraan_atas", value: (r) => r.kasus_prediksi_upper },
    { header: "insidensi_per_100rb", value: (r) => r.incidence_rate },
    { header: "perubahan_bulanan_pct", value: (r) => r.delta_periode },
    { header: "skor_risiko", value: (r) => r.skor_risiko },
    { header: "tingkat_risiko", value: (r) => r.tingkat_risiko },
    { header: "kelengkapan_data", value: (r) => r.coverage },
    { header: "versi_model", value: (r) => r.model_version },
  ]);
}

function DetailRow({ data }: { data: KecamatanData }) {
  return (
    <tr className="bg-sand-50/70">
      <td colSpan={8} className="px-4 py-5 sm:px-5">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
              Kondisi iklim {formatMonth(data.periode_observasi)}
            </p>
            <dl className="mt-2.5 space-y-1.5 text-caption">
              {[
                ["Curah hujan", `${formatMaybeNumber(data.cuaca.curah_hujan_mm)} mm`],
                [
                  "Suhu rata-rata",
                  data.cuaca.suhu_c === null ? "—" : `${data.cuaca.suhu_c.toFixed(1)} °C`,
                ],
                ["Kelembaban", `${formatMaybeNumber(data.cuaca.kelembaban_pct)} %`],
                ["Sifat hujan", data.cuaca.status_cuaca ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-sand-200 pb-1.5 last:border-b-0">
                  <dt className="text-paper-600">{k}</dt>
                  <dd className="tabular font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-2">
            {/* Dulu di sini ada daftar "langkah pencegahan yang dianjurkan" dari
                kolom `rekomendasi` berkas mock — teks yang sama untuk setiap
                kecamatan pada kelas risiko yang sama. Yang ditampilkan sekarang
                adalah fitur pemicu yang benar-benar dipakai model. */}
            <p className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
              Pemicu dominan menurut model
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {data.drivers.length === 0 ? (
                <li className="text-caption text-paper-600">
                  Belum ada prakiraan untuk kecamatan ini pada periode berjalan.
                </li>
              ) : (
                data.drivers.map((d) => (
                  <li key={d.feature} className="flex gap-2.5 text-caption text-paper-700">
                    <span
                      aria-hidden
                      className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-brand-500"
                    />
                    {d.label}{" "}
                    {d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    {d.unit} · persentil {d.percentile}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-3 text-2xs text-paper-600">
              Kelengkapan data historis:{" "}
              <span className={cn("font-medium", COVERAGE_CONFIG[data.coverage].className)}>
                {COVERAGE_CONFIG[data.coverage].label}
              </span>{" "}
              — {COVERAGE_CONFIG[data.coverage].description}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function DistrictRegister() {
  const { byDisease, diseases, meta, loading, error } = useCityData();
  const [disease, setDisease] = useState<DiseaseType | null>(null);
  const [sort, setSort] = useState<SortKey>("skor_risiko");
  const [openId, setOpenId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!disease && diseases.length > 0) setDisease(diseases[0]);
  }, [diseases, disease]);

  const rows = useMemo(() => {
    const list = [...(disease ? (byDisease[disease] ?? []) : [])];
    return list.sort((a, b) => {
      if (sort === "nama") return a.nama.localeCompare(b.nama);
      /* Nilai kosong selalu di dasar tabel, tidak pernah di puncak sebagai 0. */
      const av = a[sort];
      const bv = b[sort];
      if (av === null && bv === null) return a.nama.localeCompare(b.nama);
      if (av === null) return 1;
      if (bv === null) return -1;
      return (bv as number) - (av as number);
    });
  }, [byDisease, disease, sort]);

  const download = () => {
    if (!disease) return;
    downloadCsv(
      slugify("prakira-status-kecamatan", disease, meta?.latestObserved?.slice(0, 7)),
      toCsv(rows, disease),
    );
  };

  return (
    <section id="register" className="scroll-mt-16 border-t border-sand-200 bg-grad-sand">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-sand-200 pt-6">
            <div className="max-w-2xl">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
                03 · Data kecamatan
              </p>
              <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
                Register status kecamatan{rows.length > 0 ? ` (${rows.length})` : ""}
              </h2>
              <p className="mt-4 max-w-xl text-body-lg text-paper-600">
                Data lengkap yang menjadi dasar seluruh peringatan di halaman ini. Terbuka
                untuk diunduh, diperiksa ulang, dan digunakan kembali.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                role="tablist"
                aria-label="Pilih penyakit"
                className="inline-flex rounded-xl border border-sand-200 bg-white p-1"
              >
                {diseases.map((d) => (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={disease === d}
                    onClick={() => {
                      setDisease(d);
                      setOpenId(null);
                    }}
                    className={cn(
                      "rounded-lg px-3.5 py-2 text-caption font-medium transition-colors duration-fast",
                      disease === d
                        ? "bg-brand-700 text-white"
                        : "text-paper-600 hover:bg-sand-50 hover:text-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={download}
                disabled={rows.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-sand-200 bg-white px-4 text-caption font-medium text-paper-700 transition-colors duration-fast hover:border-brand-300 hover:text-brand-700"
              >
                <Download className="h-4 w-4" />
                Unduh CSV
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={90} className="mt-8 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-sand-200 bg-sand-50 px-5 py-3">
            <span className="flex items-center gap-2 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
              <Table2 className="h-3.5 w-3.5" aria-hidden />
              Tabel {disease ?? "—"} · observasi {formatMonth(meta?.latestObserved)} ·
              prakiraan {formatMonth(meta?.predictionMonth)}
            </span>
            <span className="hidden font-mono text-3xs uppercase tracking-[0.08em] text-paper-600 sm:inline">
              Klik baris untuk rincian
            </span>
          </div>

          <DataState
            loading={loading}
            error={error}
            empty={!loading && rows.length === 0}
            emptyMessage="Belum ada kecamatan untuk penyakit ini."
            className="m-4"
          >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-sand-200">
                  <th scope="col" className="w-12 px-4 py-3 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600 sm:px-5">
                    No
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className={cn(
                        "px-3 py-3 font-mono text-3xs uppercase tracking-[0.08em] text-paper-600",
                        col.align === "right" && "text-right",
                        col.className,
                      )}
                    >
                      {col.key ? (
                        <button
                          type="button"
                          onClick={() => setSort(col.key as SortKey)}
                          className={cn(
                            "inline-flex items-center gap-1 uppercase transition-colors duration-fast hover:text-brand-700",
                            sort === col.key && "text-brand-700",
                          )}
                        >
                          {col.label}
                          {sort === col.key ? <ChevronDown className="h-3 w-3" /> : null}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, i) => {
                  const open = openId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => setOpenId(open ? null : row.id)}
                        className={cn(
                          "cursor-pointer border-b border-sand-100 transition-colors duration-fast",
                          open ? "bg-sand-50" : "hover:bg-sand-50/60",
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-caption tabular text-paper-600 sm:px-5">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-3 py-3">
                          <span className="block text-sm font-medium text-foreground">{row.nama}</span>
                          <span className="mt-0.5 block font-mono text-3xs tabular text-paper-600">
                            BPS {row.kode_bps} · {formatNumber(row.populasi)} jiwa
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular text-foreground">
                          {formatMaybeNumber(row.kasus_aktif)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular text-paper-700">
                          {row.kasus_prediksi_lower === null ? (
                            "—"
                          ) : (
                            <>
                              {formatNumber(row.kasus_prediksi_lower)}
                              <span className="mx-1 text-paper-300">–</span>
                              {formatMaybeNumber(row.kasus_prediksi_upper)}
                            </>
                          )}
                        </td>
                        <td className="hidden px-3 py-3 text-right text-sm tabular text-paper-700 lg:table-cell">
                          {formatMaybeIncidence(row.incidence_rate)}
                        </td>
                        <td
                          className={cn(
                            "hidden px-3 py-3 text-right text-sm tabular md:table-cell",
                            row.delta_periode === null
                              ? "text-paper-600"
                              : row.delta_periode > 0
                                ? "text-risk-high"
                                : "text-risk-low",
                          )}
                        >
                          {formatMaybePercent(row.delta_periode)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2.5">
                            <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-sand-200 sm:block">
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  row.tingkat_risiko ? BAR[row.tingkat_risiko] : "bg-paper-300",
                                )}
                                style={{ width: `${row.skor_risiko ?? 0}%` }}
                              />
                            </span>
                            <span className="w-7 text-right text-sm tabular font-medium text-foreground">
                              {row.skor_risiko ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 pr-4 sm:pr-5">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded border px-2 py-0.5 font-mono text-3xs uppercase tracking-[0.06em]",
                                row.tingkat_risiko
                                  ? TAG[row.tingkat_risiko]
                                  : "border-sand-200 bg-sand-50 text-paper-600",
                              )}
                            >
                              {riskConfigOf(row.tingkat_risiko).label}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-paper-600 transition-transform duration-base",
                                open && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </span>
                        </td>
                      </tr>
                      {open ? <DetailRow data={row} /> : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </DataState>

          <div className="flex flex-wrap items-start gap-2.5 border-t border-sand-200 bg-sand-50 px-5 py-4">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
            <p className="max-w-4xl text-2xs text-paper-600">
              Sumber: deret iklim dan rekapitulasi kasus bulanan per kecamatan yang
              tersimpan di basis data sistem ini. Prakiraan adalah rentang interval
              prediksi model, bukan kepastian kejadian, dan tidak dapat digunakan sebagai
              dasar diagnosis medis perorangan.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
