"use client";

import * as React from "react";
import { CheckCircle2, CircleSlash, MinusCircle, AlertTriangle } from "lucide-react";
import { cn, COVERAGE_CONFIG, formatNumber } from "@/lib/utils";
import type { DataCoverage } from "@/types";
import type { KecamatanRef } from "@/lib/api";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

/**
 * Cakupan data historis per kecamatan (PRD §5.7, blok "Cakupan data").
 *
 * Layanan ML sudah menghitung angka ini sejak awal dan gateway sudah
 * menyimpannya utuh di `model_backtest.coverage_per_kecamatan`, tapi tidak ada
 * satu permukaan pun yang menampilkannya — kolomnya sampai di peramban lalu
 * berhenti di sana. Akibatnya bagian termahal dari kejujuran model justru yang
 * paling tidak terlihat: sebuah kecamatan dengan tiga bulan data dibaca sama
 * meyakinkannya dengan kecamatan yang punya lima tahun.
 *
 * Dua aturan yang tidak bisa ditawar di sini:
 *
 * 1. **Enam belas kecamatan selalu tampil.** Kecamatan yang tidak ada di peta
 *    cakupan bukan berarti aman — ia berarti tidak ada datanya sama sekali,
 *    dan ditandai `Tidak memadai`, bukan dihilangkan dari tabel. Menghilangkan
 *    baris membuat tabel terlihat lebih bersih dan lebih bohong.
 * 2. **Urutan dari yang terburuk.** Yang perlu dilihat juri dan Dinkes adalah
 *    kecamatan mana yang prediksinya paling tidak bisa dipegang, bukan
 *    kecamatan mana yang datanya paling rapi.
 *
 * Tingkat cakupan tidak dikodekan hanya dengan warna: setiap baris membawa
 * ikon dan label teks (WCAG 1.4.1, PRD §5.1).
 */

type ModelCoverageProps = {
  /** Peta `kecamatan_id` → tingkat cakupan, apa adanya dari hasil backtest. */
  coverage: Record<string, DataCoverage>;
  /** Register kecamatan resmi. Menentukan baris mana yang wajib ada. */
  kecamatan: KecamatanRef[];
  /** Rentang bulan yang tersedia untuk penyakit ini, mis. "Apr 2021 – Des 2025". */
  windowLabel?: string;
  /** Jumlah bulan pada rentang itu. */
  windowMonths?: number | null;
  className?: string;
};

/** Terburuk lebih dulu — urutan tabel sekaligus urutan kartu ringkasan. */
const COVERAGE_ORDER: DataCoverage[] = ["insufficient", "low", "medium", "high"];

const COVERAGE_META: Record<
  DataCoverage,
  {
    icon: typeof CheckCircle2;
    badge: "risk-low" | "risk-medium" | "risk-none" | "outline";
    /** Ambang kelengkapan yang dipakai layanan ML, ditulis apa adanya. */
    threshold: string;
  }
> = {
  high: { icon: CheckCircle2, badge: "risk-low", threshold: "≥ 75% bulan terisi" },
  medium: { icon: MinusCircle, badge: "outline", threshold: "50–74% bulan terisi" },
  low: { icon: AlertTriangle, badge: "risk-medium", threshold: "25–49% bulan terisi" },
  insufficient: { icon: CircleSlash, badge: "risk-none", threshold: "< 25% bulan terisi" },
};

export function ModelCoverage({
  coverage,
  kecamatan,
  windowLabel,
  windowMonths,
  className,
}: ModelCoverageProps) {
  const rows = React.useMemo(() => {
    const list = kecamatan.map((k) => ({
      ...k,
      /* Tidak tercatat di hasil backtest = tidak ada datanya, bukan aman. */
      level: coverage[k.id] ?? ("insufficient" as DataCoverage),
    }));

    return list.sort((a, b) => {
      const byLevel =
        COVERAGE_ORDER.indexOf(a.level) - COVERAGE_ORDER.indexOf(b.level);
      return byLevel !== 0 ? byLevel : a.nama.localeCompare(b.nama, "id");
    });
  }, [coverage, kecamatan]);

  const tally = React.useMemo(() => {
    const counts: Record<DataCoverage, number> = {
      high: 0,
      medium: 0,
      low: 0,
      insufficient: 0,
    };
    for (const row of rows) counts[row.level] += 1;
    return counts;
  }, [rows]);

  if (kecamatan.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-body-sm text-paper-600">
          Register kecamatan belum termuat, jadi cakupan data belum bisa dipetakan.
        </p>
      </Card>
    );
  }

  const weak = tally.low + tally.insufficient;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cakupan diukur sebagai kepadatan di dalam jendela yang tersedia, bukan
          panjang riwayatnya. Tanpa kalimat ini, penyakit dengan dua belas bulan
          data yang terisi penuh terbaca "Tinggi" persis seperti penyakit dengan
          lima tahun — dan itu pertanyaan pertama yang akan diajukan siapa pun
          yang membaca tabel di bawah dengan serius. */}
      {windowLabel && (
        <p className="text-body-sm text-paper-600">
          Diukur terhadap{" "}
          <span className="font-medium text-foreground">
            {windowMonths ? `${windowMonths} bulan` : "seluruh bulan"}
          </span>{" "}
          yang tersedia untuk penyakit ini ({windowLabel}).{" "}
          <span className="font-medium text-foreground">Tinggi</span> berarti
          bulan-bulan itu terisi — bukan bahwa riwayatnya panjang.
        </p>
      )}

      {/* Ringkasan: empat tingkat, jumlahnya dari 16 kecamatan yang sama. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COVERAGE_ORDER.map((level) => {
          const meta = COVERAGE_META[level];
          const config = COVERAGE_CONFIG[level];
          const Icon = meta.icon;

          return (
            <Card key={level} className="space-y-1 p-4">
              <div className="flex items-center gap-1.5">
                <Icon className={cn("h-4 w-4 shrink-0", config.className)} aria-hidden="true" />
                <span className="text-overline uppercase text-paper-600">
                  {config.label}
                </span>
              </div>
              <p className="tabular text-metric font-semibold text-foreground">
                {tally[level]}
                <span className="text-caption font-normal text-paper-600">
                  {" "}
                  / {rows.length} kec.
                </span>
              </p>
              <p className="text-caption text-paper-600">{meta.threshold}</p>
            </Card>
          );
        })}
      </div>

      {weak > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium"
            aria-hidden="true"
          />
          <p className="text-body-sm text-paper-700">
            <span className="font-semibold text-foreground">
              {weak} dari {rows.length} kecamatan
            </span>{" "}
            berdiri di atas data historis yang tipis. Prakiraan di wilayah itu tetap
            dihitung, tetapi ditandai cakupan rendah di seluruh antarmuka dan tidak
            boleh dibaca sebagai angka pasti.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left">
          <caption className="sr-only">
            Kelengkapan data historis tiap kecamatan, diurutkan dari yang paling
            tipis datanya.
          </caption>

          <thead className="bg-paper-100">
            <tr>
              <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                Kecamatan
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                Kode BPS
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right text-overline uppercase text-paper-600">
                Penduduk
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                Cakupan
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-overline uppercase text-paper-600">
                Konsekuensi pada prakiraan
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const config = COVERAGE_CONFIG[row.level];
              const meta = COVERAGE_META[row.level];
              const Icon = meta.icon;

              return (
                <tr key={row.id} className="transition-colors hover:bg-paper-50">
                  <th scope="row" className="px-3 py-2 text-body-sm font-medium text-foreground">
                    {row.nama}
                  </th>
                  <td className="px-3 py-2 font-mono text-caption text-paper-600">
                    {row.kode_bps}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-body-sm text-paper-700">
                    {formatNumber(row.populasi)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={meta.badge} className="gap-1">
                      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>{config.label}</span>
                    </Badge>
                  </td>
                  <td className="max-w-md px-3 py-2 text-caption text-paper-600">
                    {config.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
