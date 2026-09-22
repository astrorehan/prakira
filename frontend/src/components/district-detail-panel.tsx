"use client";

import * as React from "react";
import {
  CloudRain,
  Thermometer,
  Activity,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {
  cn,
  COVERAGE_CONFIG,
  formatMaybeIncidence,
  formatMaybeNumber,
  riskConfigOf,
} from "@/lib/utils";
import { formatMonth, formatMonthShort } from "@/lib/period";
import type { DiseaseType, DistrictTriggerSummary, KecamatanData } from "@/types";
import { RiskGauge } from "./ui/risk-gauge";
import { WhyThisNumber } from "./why-this-number";

interface DistrictDetailPanelProps {
  district: KecamatanData | undefined;
  disease: DiseaseType;
  trigger?: DistrictTriggerSummary;
  /** Bila ada, kepala panel menampilkan tombol kembali ke daftar prioritas. */
  onBack?: () => void;
  className?: string;
}

/** Label pemicu warga — daftar, bukan lima kartu mini berwarna. */
const TRIGGER_LABEL: Record<string, string> = {
  jentik: "Jentik",
  genangan: "Genangan",
  sampah: "Tumpukan sampah",
  saluran: "Saluran tersumbat",
  gejala: "Laporan gejala",
};

/**
 * Panel kecamatan.
 *
 * Tiga hal yang diperbaiki bersamaan dengan masuknya gateway:
 *
 * 1. Lencana "Keyakinan model 94%" dihapus. Angka itu berasal dari
 *    `0.91 + (idx % 7) * 0.01` di berkas mock — bukan keluaran model. Yang
 *    menggantikannya adalah dua hal yang benar-benar dihitung: interval
 *    prediksi dan cakupan data.
 * 2. "Proyeksi 2–4 Minggu" jadi bulan yang sebenarnya diprediksi. Model
 *    dilatih bulanan; label mingguan menjanjikan resolusi yang tidak ada.
 * 3. Kecamatan tanpa prediksi tidak lagi meminjam gaya "rendah" — ia punya
 *    tampilannya sendiri, dan angka prediksinya kosong, bukan nol.
 *
 * Lalu F17, tiga hal lagi:
 *
 * 4. Seluruh panel dulu diwarnai tingkat risiko lewat gradien kaca. Risiko
 *    wilayah, status data, dan status pekerjaan jadi satu bidang warna yang
 *    sama, dan tidak ada satu pun yang bisa dibaca sendiri. Sekarang panelnya
 *    netral: risiko dinyatakan gauge dan satu lencana, cakupan data punya
 *    barisnya sendiri.
 * 5. Empat tingkat huruf di bawah `caption` (sampai `text-4xs`, 8 px pada root
 *    112,5%) diratakan ke `caption`/`overline`. Panel ini dibaca di lapangan.
 * 6. Grafik tren kota pindah ke halaman: sebuah deret tingkat kota yang duduk
 *    di dalam kartu berjudul "Kecamatan X" akan terbaca sebagai milik
 *    kecamatan itu, betapapun jelasnya catatan kaki di bawahnya.
 */
export function DistrictDetailPanel({
  district,
  disease,
  trigger,
  onBack,
  className,
}: DistrictDetailPanelProps) {
  if (!district) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[480px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-card",
          className,
        )}
      >
        <Activity className="mb-3 h-8 w-8 animate-pulse text-paper-500" aria-hidden="true" />
        <p className="text-body font-medium text-foreground">Pilih wilayah pada peta</p>
        <p className="mt-1 max-w-xs text-body-sm text-paper-600">
          Klik salah satu kecamatan pada peta Kota Semarang untuk membuka angka
          periode dan dasar prakiraannya.
        </p>
      </div>
    );
  }

  const coverage = COVERAGE_CONFIG[district.coverage];
  const risk = riskConfigOf(district.tingkat_risiko);
  const hasPrediction = district.kasus_prediksi !== null;

  const triggerRows = trigger
    ? (Object.entries(trigger.byKind) as [string, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div
      className={cn(
        "flex h-full min-h-[480px] flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      {/* 1. Kepala: identitas wilayah, risiko wilayah, dan tidak ada yang lain.
             Risiko satu-satunya hal berwarna di sini (§1.1 "warna adalah data"). */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 inline-flex items-center gap-1 text-caption font-medium text-brand-700 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Daftar prioritas
            </button>
          ) : (
            <p className="overline">Detail wilayah</p>
          )}
          <h3 className="text-h3 text-foreground">{district.nama}</h3>
          <p className={cn("mt-1 text-caption font-medium", risk.textColor)}>
            Risiko {risk.label.toLowerCase()}
          </p>
        </div>

        <RiskGauge
          score={district.skor_risiko}
          level={district.tingkat_risiko}
          size="md"
          className="shrink-0"
        />
      </div>

      {/* 2. Angka utama: observasi di kiri, prakiraan di kanan */}
      <dl className="grid shrink-0 grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-paper-50 p-3">
          <dt className="overline">Kasus {formatMonthShort(district.periode_observasi)}</dt>
          <dd className="mt-1 flex items-baseline gap-1">
            <span className="text-metric-sm text-foreground">
              {formatMaybeNumber(district.kasus_aktif)}
            </span>
            <span className="text-caption text-paper-600">kasus</span>
          </dd>
          <dd className="mt-2 border-t border-border pt-2 text-caption text-paper-600">
            Insidensi{" "}
            <span className="whitespace-nowrap font-medium text-foreground">
              {formatMaybeIncidence(district.incidence_rate)}
            </span>
          </dd>
        </div>

        <div className="rounded-xl border border-border bg-paper-50 p-3">
          <dt className="overline">Prakiraan {formatMonthShort(district.periode_prediksi)}</dt>

          {hasPrediction ? (
            <>
              <dd className="mt-1 flex items-baseline gap-1">
                <span className="text-metric-sm text-foreground">
                  {formatMaybeNumber(district.kasus_prediksi)}
                </span>
                <span className="text-caption text-paper-600">kasus</span>
              </dd>
              {/* Angka prediksi tidak pernah tampil tanpa batasnya (PRD §7-H1). */}
              <dd className="mt-2 border-t border-border pt-2 text-caption text-paper-600">
                Rentang{" "}
                <span className="tabular whitespace-nowrap font-medium text-foreground">
                  {formatMaybeNumber(district.kasus_prediksi_lower)}–
                  {formatMaybeNumber(district.kasus_prediksi_upper)}
                </span>
              </dd>
            </>
          ) : (
            <dd className="mt-1 text-caption leading-relaxed text-paper-600">
              Belum ada prediksi untuk kecamatan ini. Kekosongan ini bukan tanda aman.
            </dd>
          )}
        </div>
      </dl>

      {/* 3. Iklim bulan observasi dan status data dalam satu baris ringkas.
             Cakupan data hanya disebut bila bukan "high" — label yang selalu
             sama di setiap kartu berhenti dibaca. */}
      <div className="shrink-0 space-y-1.5 text-caption text-paper-600">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CloudRain className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Hujan{" "}
            <span className="font-medium text-foreground">
              {formatMaybeNumber(district.cuaca.curah_hujan_mm)} mm
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Suhu{" "}
            <span className="font-medium text-foreground">
              {formatMaybeNumber(district.cuaca.suhu_c)} °C
            </span>
          </span>
          <span className="text-paper-500">({formatMonthShort(district.periode_observasi)})</span>
        </p>
        {district.coverage !== "high" && (
          <p title={coverage.description}>
            Cakupan data:{" "}
            <span className="font-medium text-foreground">{coverage.label}</span>
          </p>
        )}
      </div>

      {/* 5. Pemicu dominan menurut model — mengisi kalimat "Dasar:" (§5.2).
             Daftar ini bersifat global: fitur iklim ber-importance tertinggi
             menurut model secara keseluruhan, sama untuk keenam belas
             kecamatan. Tombol di bawahnya membuka hitungan yang lokal. */}
      <div className="shrink-0 space-y-2">
        {district.drivers.length > 0 && (
          <div className="rounded-xl border border-border bg-paper-50 p-3">
            <p className="overline">Pemicu utama menurut model</p>
            <ul className="mt-1.5 space-y-1">
              {district.drivers.map((d) => (
                <li
                  key={d.label}
                  className="flex items-baseline justify-between gap-3 text-caption text-paper-700"
                >
                  <span className="min-w-0 first-letter:uppercase">{d.label}</span>
                  <span
                    className="tabular shrink-0 font-medium text-foreground"
                    title={`Persentil ${d.percentile} dari riwayat wilayah ini`}
                  >
                    {d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    {d.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <WhyThisNumber
          disease={disease}
          kecamatanId={district.id}
          kecamatanNama={district.nama}
          hasPrediction={district.kasus_prediksi !== null}
        />
      </div>

      {/* 6. Sinyal pemicu lingkungan terverifikasi dari warga — daftar, bukan
             lima lencana berwarna yang bersaing dengan warna risiko. */}
      {trigger && trigger.total > 0 && (
        <div className="shrink-0 rounded-xl border border-border bg-paper-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 overline">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden="true" />
              <span>Sinyal pemicu warga</span>
            </p>
            <span className="text-caption font-medium text-foreground">
              {trigger.total} terverifikasi
            </span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {triggerRows.map(([kind, count]) => (
              <li
                key={kind}
                className="flex items-baseline justify-between gap-3 text-caption text-paper-700"
              >
                <span className="min-w-0 truncate">{TRIGGER_LABEL[kind] ?? kind}</span>
                <span className="tabular shrink-0 font-medium text-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
