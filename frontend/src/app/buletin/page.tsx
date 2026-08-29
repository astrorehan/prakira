"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  ShieldAlert,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bug,
  Droplets,
  Trash2,
  Waves,
  Activity,
  FileText,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  formatNumber,
  formatMaybeNumber,
  formatMaybePercent,
  formatMaybeIncidence,
  riskConfigOf,
  cn,
} from "@/lib/utils";
import { formatMonth, formatDate } from "@/lib/period";
import { Button } from "@/components/ui/button";
import {
  fetchActions,
  fetchDiseases,
  fetchDistricts,
  fetchPeriod,
  fetchTriggerSummary,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ActionRecommendation, DiseaseType, DistrictTriggerSummary, KecamatanData } from "@/types";

function BuletinContent() {
  const searchParams = useSearchParams();
  const requestedDisease = searchParams.get("disease");

  const diseases = useApi(() => fetchDiseases(), []);
  const [selectedDisease, setSelectedDisease] = React.useState<DiseaseType | null>(null);

  React.useEffect(() => {
    if (requestedDisease) {
      setSelectedDisease(requestedDisease);
    } else if (!selectedDisease && diseases.data && diseases.data.length > 0) {
      setSelectedDisease(diseases.data[0].disease);
    }
  }, [requestedDisease, diseases.data, selectedDisease]);

  const activeDisease = selectedDisease ?? "DBD";

  const period = useApi(
    () => fetchPeriod(activeDisease),
    [activeDisease],
  );

  const districts = useApi(
    () => fetchDistricts(activeDisease),
    [activeDisease],
  );

  const actions = useApi(
    () => fetchActions(activeDisease),
    [activeDisease],
  );

  const triggers = useApi(
    () => fetchTriggerSummary(),
    [],
  );

  const rows: KecamatanData[] = React.useMemo(() => districts.data?.data ?? [], [districts.data]);
  const meta = districts.data?.meta ?? null;
  const triggerList: DistrictTriggerSummary[] = React.useMemo(() => triggers.data?.data ?? [], [triggers.data]);

  const triggerMap = React.useMemo(() => {
    const map = new Map<string, DistrictTriggerSummary>();
    for (const t of triggerList) {
      map.set(t.kecamatan.toLowerCase(), t);
    }
    return map;
  }, [triggerList]);

  // Aggregate totals
  const totals = React.useMemo(() => {
    const observed = rows.filter((d) => d.kasus_aktif !== null);
    const predicted = rows.filter((d) => d.kasus_prediksi !== null);

    const active = observed.reduce((s, d) => s + (d.kasus_aktif ?? 0), 0);
    const pred = predicted.reduce((s, d) => s + (d.kasus_prediksi ?? 0), 0);
    const lower = predicted.reduce((s, d) => s + (d.kasus_prediksi_lower ?? 0), 0);
    const upper = predicted.reduce((s, d) => s + (d.kasus_prediksi_upper ?? 0), 0);

    const high = rows.filter((d) => d.tingkat_risiko === "tinggi");
    const medium = rows.filter((d) => d.tingkat_risiko === "sedang");
    const low = rows.filter((d) => d.tingkat_risiko === "rendah");

    const totalTriggers = triggerList.reduce((s, t) => s + t.total, 0);

    return {
      active,
      pred,
      lower,
      upper,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      highDistricts: high,
      totalTriggers,
    };
  }, [rows, triggerList]);

  // Sorted districts by risk score descending
  const sortedDistricts = React.useMemo(() => {
    return [...rows].sort((a, b) => (b.skor_risiko ?? -1) - (a.skor_risiko ?? -1));
  }, [rows]);

  const currentYear = new Date().getFullYear();
  const documentNumber = `PKR/SKDR-SMG/${currentYear}/${activeDisease}/${meta?.predictionMonth?.replace("-", "") ?? "202609"}`;
  const publishDate = period.data?.systemToday
    ? formatDate(period.data.systemToday)
    : "27 Agustus 2026";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased print:bg-white print:text-black">
      {/* ── Screen Toolbar (Hidden on Print) ─────────────────────────────────── */}
      <header className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Konsol</span>
              </Link>
            </Button>
            <div className="hidden sm:block h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-brand-700" />
              <span className="text-xs font-semibold text-slate-800">
                Buletin Resmi SKDR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Disease Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(diseases.data ?? []).map((d) => (
                <button
                  key={d.disease}
                  type="button"
                  onClick={() => setSelectedDisease(d.disease)}
                  className={cn(
                    "px-2.5 py-1 rounded text-2xs font-semibold uppercase transition-all",
                    activeDisease === d.disease
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  {d.disease}
                </button>
              ))}
            </div>

            {/* Print CTA */}
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 bg-brand-700 hover:bg-brand-800 text-white shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak / Simpan PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Document Container (A4 Proportions) ──────────────────────────────── */}
      <main className="mx-auto max-w-5xl py-8 px-4 sm:px-6 print:max-w-none print:p-0 print:m-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-md print:rounded-none print:border-none print:p-0 print:shadow-none">
          {/* ── Kop Surat Resmi Pemerintah Kota Semarang ────────────────────── */}
          <div className="flex items-center justify-between gap-6 border-b-4 border-double border-slate-900 pb-5">
            {/* Logo Lambang Kota Semarang (Clean Vector Emblem) */}
            <div className="shrink-0 flex items-center justify-center h-20 w-20 rounded-full border-2 border-slate-800 p-2 text-center text-slate-800">
              <div className="flex flex-col items-center justify-center leading-none">
                <Building2 className="h-8 w-8 text-slate-900 mb-1" />
                <span className="text-[8px] font-bold uppercase tracking-tighter">KOTA SEMARANG</span>
              </div>
            </div>

            {/* Kop Text */}
            <div className="flex-1 text-center">
              <h3 className="font-serif text-sm sm:text-base font-bold tracking-wider text-slate-900 uppercase">
                Pemerintah Kota Semarang
              </h3>
              <h2 className="font-serif text-lg sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Dinas Kesehatan Kota Semarang
              </h2>
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Bidang Pencegahan dan Pengendalian Penyakit (P2P)
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Jl. Pandanaran No. 79, Mugassari, Kec. Semarang Selatan, Kota Semarang, Jawa Tengah 50249
              </p>
              <p className="text-[10px] text-slate-600">
                Laman: dkk.semarangkota.go.id · Pos-el: dkk@semarangkota.go.id · Telp: (024) 8415269
              </p>
            </div>

            {/* Document Verification Code */}
            <div className="shrink-0 hidden sm:flex flex-col items-end text-right border-l border-slate-300 pl-4 text-3xs text-slate-500 font-mono">
              <span className="font-bold text-slate-800">SISTEM PRAKIRA</span>
              <span>DSDC ANFORCOM 2026</span>
              <span>SKDR DINI v0.1</span>
              <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                RESMI
              </span>
            </div>
          </div>

          {/* ── Metadata Judul & Nomor Buletin ───────────────────────────────── */}
          <div className="mt-6 text-center">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 uppercase tracking-tight underline underline-offset-4">
              Buletin Sistem Kewaspadaan Dini & Respon Cepat (SKDR)
            </h1>
            <p className="text-xs font-semibold text-slate-700 mt-1 uppercase">
              Prakiraan Risiko Penyakit {activeDisease} Berbasis Iklim & Sinyal Lingkungan
            </p>
            <p className="text-2xs font-mono text-slate-600 mt-0.5">
              Nomor: {documentNumber}
            </p>
          </div>

          {/* ── Ringkasan Identitas Distribusi ─────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-300 bg-slate-50/70 p-3 text-xs">
            <div>
              <span className="text-3xs font-semibold uppercase text-slate-500 block">Periode Prakiraan</span>
              <span className="font-bold text-slate-900">{formatMonth(meta?.predictionMonth)}</span>
            </div>
            <div>
              <span className="text-3xs font-semibold uppercase text-slate-500 block">Data Observasi Terakhir</span>
              <span className="font-bold text-slate-900">{formatMonth(meta?.latestObserved)}</span>
            </div>
            <div>
              <span className="text-3xs font-semibold uppercase text-slate-500 block">Tanggal Penerbitan</span>
              <span className="font-bold text-slate-900">{publishDate}</span>
            </div>
            <div>
              <span className="text-3xs font-semibold uppercase text-slate-500 block">Klasifikasi Dokumen</span>
              <span className="font-bold text-rose-800">Instruksi Kesiapsiagaan</span>
            </div>
          </div>

          {/* ── Bagian I: Ringkasan Situasi & Peringatan Dini Kota ─────────────── */}
          <section className="mt-8">
            <div className="flex items-center gap-2 border-b border-slate-300 pb-1.5 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-2xs font-bold">
                I
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Ringkasan Eksekutif Situasi Kota Semarang
              </h2>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed text-justify">
              Berdasarkan permodelan prediktif berbasis lag variabel iklim (curah hujan, suhu, kelembaban udara) dan integrasi laporan sinyal pemicu lingkungan terverifikasi warga, diprakirakan total kasus <strong>{activeDisease}</strong> di Kota Semarang pada bulan <strong>{formatMonth(meta?.predictionMonth)}</strong> mencapai <strong>{formatNumber(totals.pred)} kasus</strong> (interval ketidakpastian 95%: {formatNumber(totals.lower)}–{formatNumber(totals.upper)} kasus). Terdapat <strong>{totals.highCount} kecamatan siaga tinggi</strong> dan <strong>{totals.mediumCount} kecamatan waspada sedang</strong> yang membutuhkan mobilisasi sumber daya intervensi pencegahan dini sebelum lonjakan kurva kasus terjadi.
            </p>

            {/* 4-Column KPI Cards */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-3xs font-semibold text-slate-500 uppercase block">Kasus Teramati ({formatMonth(meta?.latestObserved)})</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900">{formatNumber(totals.active)}</span>
                  <span className="text-3xs text-slate-500">kasus</span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 shadow-2xs">
                <span className="text-3xs font-semibold text-amber-800 uppercase block">Prakiraan ({formatMonth(meta?.predictionMonth)})</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-amber-900">{formatNumber(totals.pred)}</span>
                  <span className="text-3xs font-semibold text-amber-700">kasus</span>
                </div>
                <span className="text-4xs text-amber-800 font-mono block mt-0.5">
                  Rentang: {formatNumber(totals.lower)}–{formatNumber(totals.upper)}
                </span>
              </div>

              <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 shadow-2xs">
                <span className="text-3xs font-semibold text-rose-800 uppercase block">Status Siaga Wilayah</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xl font-bold text-rose-900">{totals.highCount}</span>
                  <span className="text-3xs font-medium text-rose-800 leading-tight">
                    Kecamatan Siaga Merah
                  </span>
                </div>
                <span className="text-4xs text-slate-600 block mt-0.5">
                  Waspada: {totals.mediumCount} · Rendah: {totals.lowCount}
                </span>
              </div>

              <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 shadow-2xs">
                <span className="text-3xs font-semibold text-teal-800 uppercase block">Sinyal Pemicu Lapangan</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-teal-950">{totals.totalTriggers}</span>
                  <span className="text-3xs font-semibold text-teal-700">laporan</span>
                </div>
                <span className="text-4xs text-teal-800 block mt-0.5">
                  Terverifikasi tim surveilans
                </span>
              </div>
            </div>
          </section>

          {/* ── Bagian II: Matriks Wilayah Prioritas Kesiapsiagaan ──────────────── */}
          <section className="mt-8 page-break-before-avoid">
            <div className="flex items-center gap-2 border-b border-slate-300 pb-1.5 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-2xs font-bold">
                II
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Matriks Analisis Risiko & Sinyal Pemicu per Kecamatan
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-slate-300">Kecamatan</th>
                    <th className="p-2 border-r border-slate-300 text-center">Kelas Risiko</th>
                    <th className="p-2 border-r border-slate-300 text-right">Kasus Aktif</th>
                    <th className="p-2 border-r border-slate-300 text-right">Prakiraan</th>
                    <th className="p-2 border-r border-slate-300 text-right">Insidensi</th>
                    <th className="p-2 border-r border-slate-300">Curah Hujan</th>
                    <th className="p-2 border-r border-slate-300">Pemicu Dominan Model</th>
                    <th className="p-2">Sinyal Pemicu Warga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedDistricts.map((d, index) => {
                    const risk = riskConfigOf(d.tingkat_risiko);
                    const trigger = triggerMap.get(d.nama.toLowerCase());
                    const triggerSummary = trigger && trigger.total > 0
                      ? [
                          trigger.byKind.jentik ? `${trigger.byKind.jentik} Jentik` : "",
                          trigger.byKind.genangan ? `${trigger.byKind.genangan} Genangan` : "",
                          trigger.byKind.sampah ? `${trigger.byKind.sampah} Sampah` : "",
                          trigger.byKind.saluran ? `${trigger.byKind.saluran} Saluran` : "",
                        ].filter(Boolean).join(", ")
                      : "—";

                    const driverText = d.drivers.length > 0
                      ? `${d.drivers[0].label} (${d.drivers[0].value.toFixed(1)}${d.drivers[0].unit})`
                      : "—";

                    return (
                      <tr
                        key={d.id}
                        className={cn(
                          "hover:bg-slate-50 transition-colors",
                          d.tingkat_risiko === "tinggi" ? "bg-rose-50/40" : "",
                        )}
                      >
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-3xs text-slate-500">
                          {index + 1}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">
                          {d.nama}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded text-3xs font-bold uppercase",
                              d.tingkat_risiko === "tinggi"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : d.tingkat_risiko === "sedang"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : d.tingkat_risiko === "rendah"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {risk.label}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono">
                          {formatMaybeNumber(d.kasus_aktif)}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono font-semibold text-rose-700">
                          {d.kasus_prediksi !== null ? `${formatMaybeNumber(d.kasus_prediksi)}` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono text-3xs">
                          {formatMaybeIncidence(d.incidence_rate)}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-3xs">
                          {d.cuaca.curah_hujan_mm !== null ? `${d.cuaca.curah_hujan_mm} mm` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-3xs text-slate-600">
                          {driverText}
                        </td>
                        <td className="p-2 text-3xs font-medium text-slate-700">
                          {trigger && trigger.total > 0 ? (
                            <span className="text-amber-800 font-semibold inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" aria-hidden />
                              <span>{trigger.total} ({triggerSummary})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Bagian III: Matriks Instruksi Tindakan & Intervensi Lapangan ─────── */}
          <section className="mt-8 page-break-inside-avoid">
            <div className="flex items-center gap-2 border-b border-slate-300 pb-1.5 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-2xs font-bold">
                III
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Instruksi Operasional Intervensi Dini (Action Dispatch)
              </h2>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Instruksi berikut diterbitkan secara otomatis oleh mesin aturan deterministik sistem PRAKIRA berdasarkan ambang batas risiko epidemiologis bulan berjalan:
            </p>

            <div className="space-y-4">
              {(actions.data?.data ?? []).map((act, idx) => (
                <div
                  key={act.id}
                  className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 text-xs space-y-2 break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-white font-bold text-3xs">
                        #{idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {act.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-3xs font-bold uppercase",
                          act.priority === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200",
                        )}
                      >
                        Prioritas {act.priority === "high" ? "Tinggi" : "Sedang"}
                      </span>
                      <span className="text-3xs font-mono text-slate-500">
                        Batas: {formatDate(act.due_date)}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {act.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-3xs border-t border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900 block mb-0.5">Wilayah Sasaran Intervensi:</span>
                      <span className="text-slate-700">
                        Kecamatan {act.target_kecamatan.join(", ")} (Estimasi populasi sasaran: {formatNumber(act.target_population)} jiwa).
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-900 block mb-0.5">Unit Penanggung Jawab (PIC):</span>
                      <span className="text-slate-700">{act.pic_unit}</span>
                    </div>
                  </div>

                  {/* SOP Checklist */}
                  {act.sop_checklist.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="font-semibold text-slate-900 block mb-1 text-3xs uppercase tracking-wider">
                        Checklist Standar Operasional Prosedur (SOP):
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-3xs text-slate-700">
                        {act.sop_checklist.map((item, cIdx) => (
                          <li key={cIdx} className="flex items-start gap-1.5">
                            <span className="h-3 w-3 rounded-xs border border-slate-400 inline-block mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-1 text-3xs text-slate-500 italic">
                    <strong>Dasar:</strong> {act.basis}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Bagian IV: Lembar Pengesahan Otorisasi ────────────────────────── */}
          <section className="mt-12 pt-6 border-t-2 border-slate-400 break-inside-avoid">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-8">
              <div className="text-3xs text-slate-500 max-w-xs space-y-1">
                <p className="font-bold text-slate-700">CATATAN PENTING:</p>
                <p>
                  1. Buletin ini diterbitkan sebagai instrumen pendukung keputusan (Decision Support System) kewaspadaan dini berbasis iklim.
                </p>
                <p>
                  2. Petugas surveilans wajib melakukan konfirmasi lapangan terhadap sinyal pemicu lingkungan terverifikasi.
                </p>
              </div>

              <div className="text-center sm:text-right text-xs">
                <p className="text-slate-700">Semarang, {publishDate}</p>
                <p className="font-semibold text-slate-900 mt-1">
                  Kepala Dinas Kesehatan Kota Semarang
                </p>

                {/* Digital Signature & Stamp Box */}
                <div className="my-3 flex justify-center sm:justify-end">
                  <div className="flex flex-col items-center justify-center h-20 w-44 rounded border border-dashed border-slate-400 bg-slate-50/50 p-2 text-center">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                      DITANDATANGANI ELEKTRONIK
                    </span>
                    <span className="text-3xs font-bold text-brand-800 mt-1">
                      DINAS KESEHATAN KOTA SEMARANG
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">
                      ID: {documentNumber}
                    </span>
                  </div>
                </div>

                <p className="font-bold text-slate-900 underline underline-offset-2">
                  Dr. dr. Mochamad Abdul Hakam, Sp.P.D.
                </p>
                <p className="text-3xs font-mono text-slate-600">
                  NIP. 19750514 200212 1 002
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Global Print Stylesheet ────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-before-avoid {
            break-before: avoid;
            page-break-before: avoid;
          }
          .page-break-inside-avoid,
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default function BuletinResmiPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
          Memuat Buletin Resmi SKDR...
        </div>
      }
    >
      <BuletinContent />
    </React.Suspense>
  );
}

