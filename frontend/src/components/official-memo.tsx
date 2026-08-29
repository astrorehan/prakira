"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/data-state";
import { BrandLockup } from "@/components/brand-lockup";
import { fetchAction, fetchDistricts } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, COVERAGE_CONFIG, diseaseLabel, formatNumber, riskConfigOf } from "@/lib/utils";
import { formatDate, formatDateTime, formatMonth } from "@/lib/period";
import { ACTION_TYPE_LABEL, PRIORITY_LABEL } from "@/lib/action-queue";
import type { KecamatanData } from "@/types";

/**
 * Draf nota dinas — satu tindakan, satu lembar A4 siap tanda tangan.
 *
 * Jarak antara dashboard dan pekerjaan Senin pagi bukan angka, melainkan
 * dokumen: instruksi ke puskesmas berjalan sebagai nota dinas, bukan sebagai
 * tangkapan layar. Halaman ini menyusun draf itu dari tindakan yang sudah
 * diterbitkan mesin aturan, lalu menyerahkan pencetakannya ke mesin cetak
 * peramban — "Simpan sebagai PDF" ada di dialog cetak setiap peramban, dan
 * repositori ini tidak perlu menambah pustaka penata halaman untuk itu.
 *
 * Empat hal sengaja **dikosongkan**, tercetak sebagai garis isian:
 * nomor surat, pejabat pengirim, tanggal surat, dan penanda tangan. Semuanya
 * ditetapkan unit tata usaha, bukan oleh perangkat lunak. Versi produk yang
 * lama pernah menampilkan nomor surat `440/1892/DKK-P2P/VIII/2026` beserta
 * nama kepala puskesmas — keduanya karangan. Dokumen resmi berisi nomor palsu
 * lebih berbahaya daripada dokumen yang jujur mengaku draf.
 */

/** Baris isian yang harus dilengkapi manusia sebelum surat berlaku. */
function BlankLine({ width = "12rem" }: { width?: string }) {
  return (
    <span
      className="inline-block border-b border-dashed border-paper-400 align-baseline"
      style={{ width, height: "1em" }}
      aria-label="diisi manual"
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 text-body-sm leading-relaxed">
      <span className="w-28 shrink-0 text-paper-700">{label}</span>
      <span className="shrink-0 text-paper-700">:</span>
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 text-body-sm font-semibold uppercase tracking-[0.08em] text-paper-700">
      {children}
    </h2>
  );
}

export function OfficialMemo({ id }: { id: string }) {
  const action = useApi(() => fetchAction(id), [id]);
  const recommendation = action.data?.data ?? null;

  const districts = useApi(
    () =>
      recommendation
        ? fetchDistricts(recommendation.disease)
        : Promise.resolve(null as never),
    [recommendation?.disease],
  );

  /* Kecamatan sasaran diperkaya angka prakiraannya hanya bila bulan
     prediksinya memang bulan yang sama dengan bulan nota. Menempelkan angka
     dari bulan lain ke dalam surat dinas adalah kesalahan yang tidak akan
     terlihat oleh pembacanya. */
  const enriched = React.useMemo(() => {
    const rows = districts.data?.data ?? [];
    const byName = new Map<string, KecamatanData>();
    for (const row of rows) {
      if (row.periode_prediksi === recommendation?.prediction_month) {
        byName.set(row.nama, row);
      }
    }
    return (recommendation?.target_kecamatan ?? []).map((nama) => ({
      nama,
      data: byName.get(nama) ?? null,
    }));
  }, [districts.data, recommendation]);

  const enrichedCount = enriched.filter((row) => row.data !== null).length;
  const totalPopulation = enriched.reduce(
    (sum, row) => sum + (row.data?.populasi ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-paper-100 py-6 print:bg-paper-0 print:py-0">
      {/* ── Bilah kendali. Tidak ikut tercetak. ─────────────────────────── */}
      <div className="print-hide mx-auto mb-5 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/tindakan">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke Aksi Dini
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <p className="hidden text-caption text-paper-600 sm:block">
            Pilih <span className="font-medium">Simpan sebagai PDF</span> di
            dialog cetak untuk menyimpan berkasnya.
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
            disabled={!recommendation}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Cetak / Simpan PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[210mm] px-4 print:px-0">
        <DataState
          loading={action.loading}
          error={action.error}
          empty={!action.loading && recommendation === null}
          emptyMessage="Tindakan ini tidak ditemukan. Kemungkinan antreannya sudah diperbarui untuk bulan prakiraan berikutnya."
          onRetry={action.reload}
        >
          {recommendation && (
            <article className="print-sheet rounded-xl border border-border bg-paper-0 p-8 shadow-card sm:p-12">
              {/* ── Kop ──────────────────────────────────────────────────── */}
              <header className="print-keep space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <BrandLockup subline="Peringatan Dini Risiko Iklim" />
                  <span className="rounded-full border border-risk-medium-br bg-risk-medium-bg px-2.5 py-1 text-caption font-semibold uppercase tracking-[0.08em] text-risk-medium">
                    Draf
                  </span>
                </div>
                <p className="text-caption leading-relaxed text-paper-600">
                  Dokumen ini disusun otomatis oleh sistem Prakira dari prakiraan
                  risiko {diseaseLabel(recommendation.disease)} Kota Semarang
                  periode {formatMonth(recommendation.prediction_month)}. Nomor
                  surat, pejabat pengirim, tanggal, dan penanda tangan tidak
                  diisi sistem.
                </p>
                <div className="border-b-2 border-paper-900" />
              </header>

              {/* ── Judul ────────────────────────────────────────────────── */}
              <div className="print-keep mt-8 text-center">
                <h1 className="text-h2 font-semibold uppercase tracking-[0.14em] text-foreground">
                  Nota Dinas
                </h1>
                <p className="mt-1 text-body-sm text-paper-700">
                  Nomor: <BlankLine width="14rem" />
                </p>
              </div>

              {/* ── Kepala surat ─────────────────────────────────────────── */}
              <div className="print-keep mt-8 space-y-1.5">
                <Field label="Kepada Yth.">{recommendation.pic_unit}</Field>
                <Field label="Dari">
                  <BlankLine width="16rem" />
                </Field>
                <Field label="Tanggal">
                  <BlankLine width="10rem" />
                </Field>
                <Field label="Sifat">
                  {recommendation.priority === "high" ? "Segera" : "Biasa"}
                  <span className="ml-2 text-caption text-paper-600">
                    (dari {PRIORITY_LABEL[recommendation.priority].toLowerCase()}{" "}
                    pada antrean aksi dini)
                  </span>
                </Field>
                <Field label="Lampiran">—</Field>
                <Field label="Hal">
                  <span className="font-semibold">{recommendation.title}</span>{" "}
                  — {diseaseLabel(recommendation.disease)},{" "}
                  {formatMonth(recommendation.prediction_month)}
                </Field>
              </div>

              <div className="mt-6 border-t border-border" />

              {/* ── Pembuka ──────────────────────────────────────────────── */}
              <section className="mt-6 space-y-3 text-body-sm leading-relaxed text-paper-800">
                <p>
                  Sehubungan dengan hasil prakiraan risiko{" "}
                  {diseaseLabel(recommendation.disease)} untuk periode{" "}
                  <span className="font-semibold">
                    {formatMonth(recommendation.prediction_month)}
                  </span>{" "}
                  pada {enriched.length} kecamatan di Kota Semarang, bersama ini
                  disampaikan permintaan pelaksanaan{" "}
                  <span className="font-semibold">
                    {ACTION_TYPE_LABEL[recommendation.action_type]}
                  </span>{" "}
                  sebagaimana diuraikan di bawah ini.
                </p>
                <p>{recommendation.description}</p>
              </section>

              {/* ── Dasar ────────────────────────────────────────────────── */}
              <section className="print-keep mt-6">
                <SectionTitle>Dasar pertimbangan</SectionTitle>
                <p className="rounded-lg border border-border bg-paper-50 p-3 text-body-sm leading-relaxed text-paper-800">
                  {recommendation.basis}
                </p>
                {recommendation.climate_trigger && (
                  <p className="mt-2 text-caption leading-relaxed text-paper-700">
                    <span className="font-semibold">Pemicu iklim:</span>{" "}
                    {recommendation.climate_trigger}
                  </p>
                )}
              </section>

              {/* ── Sasaran ──────────────────────────────────────────────── */}
              <section className="mt-6">
                <SectionTitle>Kecamatan sasaran</SectionTitle>
                {/* Enam kolom tidak muat di layar ponsel; tabelnya menggeser di
                    dalam wadahnya sendiri, bukan mendorong seluruh lembar.
                    Di atas kertas A4 lebarnya muat, jadi batasnya dilepas. */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[520px] border-collapse text-body-sm print:min-w-0">
                  <caption className="sr-only">
                    Kecamatan sasaran beserta prakiraan kasus dan cakupan datanya
                  </caption>
                  <thead>
                    <tr className="border-y border-paper-300 bg-paper-100 text-left">
                      <th scope="col" className="px-2 py-2 font-semibold">
                        No
                      </th>
                      <th scope="col" className="px-2 py-2 font-semibold">
                        Kecamatan
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">
                        Penduduk
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">
                        Prakiraan kasus
                      </th>
                      <th scope="col" className="px-2 py-2 font-semibold">
                        Kelas risiko
                      </th>
                      <th scope="col" className="px-2 py-2 font-semibold">
                        Cakupan data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((row, index) => {
                      const risk = riskConfigOf(row.data?.tingkat_risiko ?? null);
                      return (
                        <tr key={row.nama} className="border-b border-border">
                          <td className="px-2 py-2 tabular-nums text-paper-700">
                            {index + 1}
                          </td>
                          <th
                            scope="row"
                            className="px-2 py-2 text-left font-medium text-foreground"
                          >
                            {row.nama}
                          </th>
                          <td className="px-2 py-2 text-right tabular-nums text-paper-700">
                            {row.data ? formatNumber(row.data.populasi) : "—"}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-paper-700">
                            {row.data &&
                            row.data.kasus_prediksi_lower !== null &&
                            row.data.kasus_prediksi_upper !== null
                              ? `${formatNumber(row.data.kasus_prediksi_lower)}–${formatNumber(row.data.kasus_prediksi_upper)}`
                              : "—"}
                          </td>
                          <td className={cn("px-2 py-2 font-medium", risk.textColor)}>
                            {risk.label}
                          </td>
                          <td className="px-2 py-2 text-paper-700">
                            {row.data
                              ? COVERAGE_CONFIG[row.data.coverage].label
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {enrichedCount > 0 && (
                    <tfoot>
                      <tr className="border-b border-paper-300 font-semibold">
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-foreground">Jumlah</td>
                        <td className="px-2 py-2 text-right tabular-nums text-foreground">
                          {formatNumber(totalPopulation)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-foreground">
                          {formatNumber(recommendation.predicted_lower)}–
                          {formatNumber(recommendation.predicted_upper)}
                        </td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2" />
                      </tr>
                    </tfoot>
                  )}
                  </table>
                </div>

                {enrichedCount < enriched.length && (
                  <p className="mt-2 text-caption leading-relaxed text-paper-600">
                    Kolom bertanda &ldquo;—&rdquo; berarti prakiraan kecamatan itu
                    tidak lagi tersedia untuk bulan yang sama dengan nota ini.
                    Angka dari bulan lain sengaja tidak disalin ke dalam tabel.
                  </p>
                )}
              </section>

              {/* ── Tindakan ─────────────────────────────────────────────── */}
              <section className="mt-6">
                <SectionTitle>Tindakan yang diminta</SectionTitle>
                <ol className="list-decimal space-y-1.5 pl-5 text-body-sm leading-relaxed text-paper-800">
                  {recommendation.sop_checklist.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              {/* ── Tenggat ──────────────────────────────────────────────── */}
              <section className="print-keep mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-paper-50 p-3">
                  <span className="overline">Tenggat pelaksanaan</span>
                  <p className="text-body-sm font-semibold text-foreground">
                    Paling lambat {formatDate(recommendation.due_date)}
                  </p>
                  <p className="text-caption text-paper-600">
                    Unit pelaksana membutuhkan {recommendation.lead_time_days}{" "}
                    hari kerja persiapan, jadi persiapannya dimulai sebelum
                    tanggal itu.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-paper-50 p-3">
                  <span className="overline">Unit pelaksana</span>
                  <p className="text-body-sm font-semibold text-foreground">
                    {recommendation.pic_unit}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-paper-50 p-3">
                  <span className="overline">Beban tanpa intervensi</span>
                  <p className="text-body-sm leading-snug text-foreground">
                    {formatNumber(recommendation.predicted_lower)}–
                    {formatNumber(recommendation.predicted_upper)} kasus
                  </p>
                  <p className="text-caption text-paper-600">
                    {COVERAGE_CONFIG[recommendation.data_coverage].label ===
                    "Tinggi"
                      ? "Cakupan data tinggi."
                      : `Cakupan data ${COVERAGE_CONFIG[recommendation.data_coverage].label.toLowerCase()} — perlakukan sebagai indikasi.`}
                  </p>
                </div>
              </section>

              {/* ── Batas keandalan ──────────────────────────────────────── */}
              <section className="print-keep mt-6 rounded-lg border border-border bg-paper-50 p-3">
                <SectionTitle>Batas keandalan angka di atas</SectionTitle>
                <p className="text-caption leading-relaxed text-paper-700">
                  Seluruh angka prakiraan pada nota ini adalah estimasi
                  statistik untuk mendukung keputusan pencegahan — bukan
                  diagnosis, bukan kepastian, dan bukan pengganti surveilans
                  resmi. Rentang bawah–atas serta cakupan data tiap kecamatan
                  dicantumkan agar keputusan mempertimbangkan ketidakpastiannya.
                  Metrik uji model, hasil per kecamatan pada periode uji, dan
                  daftar batasan tersedia terbuka di halaman Transparansi Model
                  dan Mesin Waktu.
                </p>
              </section>

              {/* ── Tanda tangan ─────────────────────────────────────────── */}
              <section className="print-keep mt-10 flex justify-end">
                <div className="w-64 space-y-1 text-center text-body-sm">
                  <p className="text-paper-700">
                    Semarang, <BlankLine width="7rem" />
                  </p>
                  <p className="text-paper-700">Pejabat pengirim,</p>
                  <div className="h-20" />
                  <div className="border-b border-dashed border-paper-400" />
                  <p className="text-caption text-paper-600">Nama &amp; NIP</p>
                </div>
              </section>

              {/* ── Kaki dokumen ─────────────────────────────────────────── */}
              <footer className="print-keep mt-10 border-t border-border pt-3 text-caption leading-relaxed text-paper-600">
                <p>
                  Draf dihasilkan sistem Prakira · Kode tindakan{" "}
                  <span className="font-mono">{recommendation.id}</span> ·
                  Disusun {formatDateTime(recommendation.generated_at)}
                  {recommendation.dispatched_at
                    ? ` · Ditandai terkirim ${formatDateTime(recommendation.dispatched_at)}${recommendation.dispatched_by ? ` oleh ${recommendation.dispatched_by}` : ""}`
                    : " · Belum ditandai terkirim di antrean aksi dini"}
                </p>
                <p className="mt-1">
                  Dokumen ini berlaku setelah diberi nomor surat dan
                  ditandatangani pejabat berwenang.
                </p>
              </footer>
            </article>
          )}
        </DataState>
      </div>
    </div>
  );
}
