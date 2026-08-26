"use client";

import * as React from "react";
import Link from "next/link";
import { MegaphoneIcon, SearchCheck, ArrowRight, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WargaShell } from "@/components/warga/shell";
import { Badge } from "@/components/ui/badge";
import { getKecamatanDataList } from "@/lib/mock-data";
import { useRememberedKecamatan, withKecamatan } from "@/lib/kecamatan-selection";
import {
  loadReports,
  relativeAge,
  REPORT_KIND,
  type CitizenReport,
} from "@/lib/reports";
import type { DiseaseType, RiskLevel } from "@/types";

/**
 * Portal warga — pintu masuk pelaporan.
 *
 * Versi sebelumnya adalah pengecek risiko kedua: satu `<select>` 16 kecamatan,
 * tiga kartu penyakit, tiga blok edukasi statis yang berbunyi sama untuk setiap
 * kecamatan dan setiap tingkat risiko, dan satu formulir langganan WhatsApp
 * yang justru masuk daftar WON'T di PRD §4. Halaman depan sudah melakukan
 * ketiga hal pertama dengan lebih baik — pencarian dengan papan ketik, deteksi
 * lokasi, skor beserta selang prakiraan, dan panduan pencegahan bertab.
 *
 * Yang tidak dilakukan halaman depan, dan yang dijanjikan enam tautan menuju
 * ke sini, adalah menerima laporan. Itu yang sekarang ada di halaman ini.
 *
 * Baris status kecamatan di bawah bukan pengecek yang dihidupkan kembali: satu
 * kalimat, tanpa skor dan tanpa kartu, yang menjawab "kenapa saya perlu repot
 * melapor" dan menyerahkan jawaban lengkapnya ke halaman depan.
 */

const ORDER: Record<RiskLevel, number> = { rendah: 0, sedang: 1, tinggi: 2 };

const RISK_WORD: Record<RiskLevel, { word: string; badge: "risk-low" | "risk-medium" | "risk-high"; blurb: string }> = {
  rendah: {
    word: "Aman",
    badge: "risk-low",
    blurb: "Tidak ada indikasi lonjakan. Laporan Anda tetap berguna sebagai peringatan awal.",
  },
  sedang: {
    word: "Waspada",
    badge: "risk-medium",
    blurb: "Cuaca mulai mendukung penularan. Temuan di lapangan paling berguna justru sekarang.",
  },
  tinggi: {
    word: "Siaga",
    badge: "risk-high",
    blurb: "Potensi lonjakan 2–4 minggu ke depan. Petugas sedang mencari titik pemicu.",
  },
};

const ENTRIES = [
  {
    href: "/warga/lapor",
    icon: MegaphoneIcon,
    title: "Kirim laporan",
    lead: "Gejala, jentik, genangan, sampah, atau saluran tersumbat. Enam pertanyaan, tanpa akun.",
    cta: "Mulai melapor",
    primary: true,
  },
  {
    href: "/warga/status",
    icon: SearchCheck,
    title: "Lacak laporan",
    lead: "Sudah pernah mengirim? Masukkan kode lacak untuk melihat keputusan petugas.",
    cta: "Cek kode lacak",
    primary: false,
  },
] as const;

function DistrictLine({ kecamatan }: { kecamatan: string }) {
  const worst = React.useMemo(() => {
    const types: DiseaseType[] = ["DBD", "ISPA", "Diare"];
    const rows = types
      .map((t) => getKecamatanDataList(t).find((k) => k.nama === kecamatan))
      .filter((d): d is NonNullable<typeof d> => !!d);
    if (rows.length === 0) return null;
    return rows.reduce((prev, curr) =>
      ORDER[curr.tingkat_risiko] > ORDER[prev.tingkat_risiko] ? curr : prev,
    );
  }, [kecamatan]);

  if (!worst) return null;
  const risk = RISK_WORD[worst.tingkat_risiko];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-paper-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body-sm text-paper-600">
            Kecamatan Anda ·{" "}
            <span className="font-semibold text-foreground">{kecamatan}</span>
          </p>
          <p className="mt-1 text-body-sm leading-relaxed text-paper-600">{risk.blurb}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant={risk.badge}>{risk.word}</Badge>
        <Link
          href={withKecamatan("/", kecamatan)}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Lihat rinciannya
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}

function VerifiedNearby({ reports, kecamatan }: { reports: CitizenReport[]; kecamatan: string | null }) {
  const recent = React.useMemo(
    () =>
      reports
        .filter((r) => r.status === "terverifikasi")
        .filter((r) => !kecamatan || r.kecamatan === kecamatan)
        .slice(0, 3),
    [reports, kecamatan],
  );

  if (recent.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-h3 text-foreground">
        {kecamatan ? `Sudah diverifikasi di ${kecamatan}` : "Sudah diverifikasi petugas"}
      </h2>
      <p className="mt-1 text-body-sm text-paper-600">
        Laporan warga yang dibenarkan petugas dan ikut dihitung sebagai sinyal wilayah.
      </p>

      <ul className="mt-4 space-y-2.5">
        {recent.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-sand-200 bg-white px-4 py-3"
          >
            <Check className="h-4 w-4 shrink-0 text-risk-low" aria-hidden="true" />
            <span className="text-body-sm font-medium text-foreground">
              {REPORT_KIND[r.kind].label}
            </span>
            <span className="text-body-sm text-paper-600">
              {r.kecamatan}
              {r.kelurahan ? ` · ${r.kelurahan}` : ""}
            </span>
            <span className="ml-auto text-caption text-paper-500">
              {relativeAge(r.submittedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PortalWargaPage() {
  const [kecamatan] = useRememberedKecamatan();
  const [reports, setReports] = React.useState<CitizenReport[]>([]);

  /* localStorage hanya ada di klien; dibaca setelah mount supaya markup
     pertama sama antara server dan peramban. */
  React.useEffect(() => setReports(loadReports()), []);

  return (
    <WargaShell
      title="Yang Anda lihat di gang belum tentu terlihat di data"
      lead="Rekapitulasi resmi Dinas Kesehatan datang mingguan sampai bulanan. Laporan warga datang hari ini. Kirim temuan dari lingkungan Anda, petugas puskesmas memverifikasinya, dan yang terverifikasi ikut memperbaiki prakiraan minggu berikutnya."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={
                entry.href === "/warga/lapor"
                  ? withKecamatan(entry.href, kecamatan)
                  : entry.href
              }
              className={cn(
                "group flex flex-col rounded-3xl border p-7 transition-colors duration-base md:p-8",
                entry.primary
                  ? "border-brand-300/60 bg-grad-brand-soft hover:border-brand-500"
                  : "border-sand-200 bg-white hover:border-brand-300",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border",
                  entry.primary
                    ? "border-white/70 bg-white/80 text-brand-700"
                    : "border-sand-200 bg-sand-50 text-paper-600",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <h2 className="mt-5 text-h2 text-foreground">{entry.title}</h2>
              <p className="mt-2.5 flex-1 text-body text-paper-600">{entry.lead}</p>

              <span className="mt-6 inline-flex items-center gap-2 text-body-sm font-semibold text-brand-700">
                {entry.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5">
        {kecamatan ? (
          <DistrictLine kecamatan={kecamatan} />
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-paper-600">
              Belum tahu status kecamatan Anda? Cek dulu di halaman depan — kecamatan yang
              Anda pilih akan terbawa ke formulir laporan.
            </p>
            <Link
              href="/"
              className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Cek status wilayah
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        )}
      </div>

      <VerifiedNearby reports={reports} kecamatan={kecamatan} />
    </WargaShell>
  );
}
