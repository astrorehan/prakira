"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Download, Info, Table2 } from "lucide-react";

import {
  cn,
  formatNumber,
  formatPercent,
  formatIncidence,
  RISK_CONFIG,
  COVERAGE_CONFIG,
} from "@/lib/utils";
import { getKecamatanDataList } from "@/lib/mock-data";
import type { DiseaseType, KecamatanData, RiskLevel } from "@/types";
import { Reveal } from "@/components/landing/reveal";

const DISEASES: DiseaseType[] = ["DBD", "ISPA", "Diare"];

type SortKey = "skor_risiko" | "kasus_aktif" | "incidence_rate" | "nama";

const COLUMNS: Array<{
  key: SortKey | null;
  label: string;
  align?: "right";
  className?: string;
}> = [
  { key: "nama", label: "Kecamatan" },
  { key: "kasus_aktif", label: "Kasus aktif", align: "right" },
  { key: null, label: "Proyeksi 4 minggu", align: "right" },
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

function toCsv(rows: KecamatanData[], disease: DiseaseType) {
  const header = [
    "kode_bps",
    "kecamatan",
    "penyakit",
    "populasi",
    "kasus_aktif",
    "proyeksi_bawah",
    "proyeksi_atas",
    "insidensi_per_100rb",
    "perubahan_mingguan_pct",
    "skor_risiko",
    "tingkat_risiko",
    "kelengkapan_data",
  ].join(",");

  const body = rows.map((r) =>
    [
      r.kode_bps,
      r.nama,
      disease,
      r.populasi,
      r.kasus_aktif,
      r.kasus_prediksi_lower,
      r.kasus_prediksi_upper,
      r.incidence_rate,
      r.delta_mingguan,
      r.skor_risiko,
      r.tingkat_risiko,
      r.coverage,
    ].join(","),
  );

  return [header, ...body].join("\n");
}

function DetailRow({ data }: { data: KecamatanData }) {
  return (
    <tr className="bg-sand-50/70">
      <td colSpan={8} className="px-4 py-5 sm:px-5">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
              Kondisi iklim pekan ini
            </p>
            <dl className="mt-2.5 space-y-1.5 text-caption">
              {[
                ["Curah hujan", `${data.cuaca.curah_hujan_mm} mm`],
                ["Suhu rata-rata", `${data.cuaca.suhu_c.toFixed(1)} °C`],
                ["Kelembaban", `${data.cuaca.kelembaban_pct} %`],
                ["Kondisi", data.cuaca.status_cuaca],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-sand-200 pb-1.5 last:border-b-0">
                  <dt className="text-paper-500">{k}</dt>
                  <dd className="tabular font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
              Langkah pencegahan yang dianjurkan
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {data.rekomendasi.map((r) => (
                <li key={r} className="flex gap-2.5 text-caption text-paper-700">
                  <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-paper-500">
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
  const [disease, setDisease] = useState<DiseaseType>("DBD");
  const [sort, setSort] = useState<SortKey>("skor_risiko");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = [...getKecamatanDataList(disease)];
    return list.sort((a, b) =>
      sort === "nama" ? a.nama.localeCompare(b.nama) : (b[sort] as number) - (a[sort] as number),
    );
  }, [disease, sort]);

  const download = () => {
    const blob = new Blob([toCsv(rows, disease)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prakira-status-kecamatan-${disease.toLowerCase()}-minggu-34-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="register" className="scroll-mt-16 border-t border-sand-200 bg-grad-sand">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-sand-200 pt-6">
            <div className="max-w-2xl">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-500">
                03 · Data kecamatan
              </p>
              <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
                Register status 16 kecamatan
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
                {DISEASES.map((d) => (
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
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
              <Table2 className="h-3.5 w-3.5" aria-hidden />
              Tabel {disease} · Minggu 34 · 18–24 Agustus 2026
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-paper-400 sm:inline">
              Klik baris untuk rincian
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-sand-200">
                  <th scope="col" className="w-12 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 sm:px-5">
                    No
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className={cn(
                        "px-3 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500",
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
                        <td className="px-4 py-3 font-mono text-caption tabular text-paper-400 sm:px-5">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-3 py-3">
                          <span className="block text-sm font-medium text-foreground">{row.nama}</span>
                          <span className="mt-0.5 block font-mono text-[10px] tabular text-paper-400">
                            BPS {row.kode_bps} · {formatNumber(row.populasi)} jiwa
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular text-foreground">
                          {formatNumber(row.kasus_aktif)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular text-paper-700">
                          {formatNumber(row.kasus_prediksi_lower)}
                          <span className="mx-1 text-paper-300">–</span>
                          {formatNumber(row.kasus_prediksi_upper)}
                        </td>
                        <td className="hidden px-3 py-3 text-right text-sm tabular text-paper-700 lg:table-cell">
                          {formatIncidence(row.incidence_rate)}
                        </td>
                        <td
                          className={cn(
                            "hidden px-3 py-3 text-right text-sm tabular md:table-cell",
                            row.delta_mingguan > 0 ? "text-risk-high" : "text-risk-low",
                          )}
                        >
                          {formatPercent(row.delta_mingguan)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2.5">
                            <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-sand-200 sm:block">
                              <span
                                className={cn("block h-full rounded-full", BAR[row.tingkat_risiko])}
                                style={{ width: `${row.skor_risiko}%` }}
                              />
                            </span>
                            <span className="w-7 text-right text-sm tabular font-medium text-foreground">
                              {row.skor_risiko}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 pr-4 sm:pr-5">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                                TAG[row.tingkat_risiko],
                              )}
                            >
                              {RISK_CONFIG[row.tingkat_risiko].label}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-paper-400 transition-transform duration-base",
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

          <div className="flex flex-wrap items-start gap-2.5 border-t border-sand-200 bg-sand-50 px-5 py-4">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-400" aria-hidden />
            <p className="max-w-4xl text-[11px] text-paper-500">
              Sumber: observasi iklim BMKG (4 stasiun Kota Semarang) dan laporan kasus mingguan
              Dinas Kesehatan Kota Semarang. Proyeksi adalah rentang interval prediksi model,
              bukan kepastian kejadian, dan tidak dapat digunakan sebagai dasar diagnosis medis
              perorangan.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
