"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Bug,
  Clock,
  Code2,
  Database,
  MapPinned,
  Phone,
  Stethoscope,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";

type Service = {
  code: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  meta: string;
  external?: boolean;
};

/* Sistem publik dinilai dari apa yang benar-benar bisa dilakukan warga di
   atasnya. Tiap entri membawa kode layanan, karena begitulah kantor publik
   merujuknya di surat, nomor antrean, dan pengaduan.

   Dua entri dicabut dari daftar ini: langganan peringatan WhatsApp dan
   antarmuka data untuk pengembang. Keduanya tidak ada — yang pertama bahkan
   masuk daftar WON'T di PRD section 4 — dan kartu layanan yang menjanjikan
   kanal yang tidak berdiri adalah janji yang akan ditagih warga. */
const SERVICES: Service[] = [
  {
    code: "SL-01",
    title: "Cek status risiko wilayah",
    description:
      "Lihat status risiko di kecamatan tempat tinggal beserta prakiraan bulan berikutnya dan rentang ketidakpastiannya.",
    icon: MapPinned,
    href: "#status",
    meta: "Daring · seketika · tanpa biaya",
  },
  {
    code: "SL-02",
    title: "Lapor kasus & temuan jentik",
    description:
      "Kirim laporan kasus demam berdarah atau temuan jentik di lingkungan Anda untuk diverifikasi petugas surveilans.",
    icon: Bug,
    href: "/warga/lapor",
    meta: "Verifikasi petugas · 1×24 jam kerja",
  },
  {
    code: "SL-03",
    title: "Lacak status laporan",
    description:
      "Masukkan kode lacak yang Anda terima setelah mengirim laporan untuk melihat keputusan petugas beserta alasannya.",
    icon: BellRing,
    href: "/warga/status",
    meta: "Tanpa akun · dengan kode lacak",
  },
  {
    code: "SL-04",
    title: "Hubungi Dinas Kesehatan",
    description:
      "Alamat kantor, nomor telepon layanan, dan jalur permohonan informasi publik.",
    icon: Stethoscope,
    href: "/hubungi-kami",
    meta: "Senin–Jumat · jam kerja",
  },
  {
    code: "SL-05",
    title: "Unduh data terbuka",
    description:
      "Register status seluruh kecamatan dalam format CSV, berisi kolom prakiraan beserta batas bawah dan atasnya.",
    icon: Database,
    href: "#register",
    meta: "CSV · mengikuti bulan data terakhir",
  },
];

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  const internal = service.href.startsWith("#");

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-brand-700 transition-colors duration-base group-hover:border-brand-300 group-hover:bg-brand-50">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-mono text-3xs uppercase tracking-[0.08em] tabular text-paper-600">
          {service.code}
        </span>
      </div>

      <h3 className="mt-5 text-h3 text-foreground">{service.title}</h3>
      <p className="mt-2 text-caption text-paper-600">{service.description}</p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-sand-200 pt-3.5">
        <span className="font-mono text-3xs uppercase tracking-[0.07em] text-paper-600">
          {service.meta}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-paper-600 transition-colors duration-base group-hover:text-brand-700" />
      </div>
    </>
  );

  const className =
    "group flex h-full flex-col rounded-2xl border border-sand-200 bg-white p-6 shadow-card transition-[border-color,box-shadow] duration-base hover:border-brand-300 hover:shadow-lift";

  return internal ? (
    <a href={service.href} className={className}>
      {body}
    </a>
  ) : (
    <Link href={service.href} className={className}>
      {body}
    </Link>
  );
}

export function Services() {
  return (
    <section id="layanan" className="scroll-mt-16 border-t border-sand-200 bg-grad-paper">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="max-w-2xl border-t border-sand-200 pt-6">
            <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
              04 · Layanan publik
            </p>
            <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
              {SERVICES.length} layanan yang bisa diakses warga
            </h2>
            <p className="mt-4 text-body-lg text-paper-600">
              Seluruh layanan terbuka tanpa pendaftaran dan tanpa biaya, kecuali yang
              memerlukan verifikasi petugas.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal key={service.code} delay={i * 60} className="h-full">
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>

        {/* Emergency channel strip — the one thing that must never be buried. */}
        <Reveal delay={120} className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-brand-900 text-white">
          <div className="grid gap-px bg-white/10 sm:grid-cols-3">
            <div className="flex items-start gap-3 bg-brand-900 p-6">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <div>
                <p className="font-mono text-3xs uppercase tracking-[0.08em] text-white/50">
                  Panggilan darurat kesehatan
                </p>
                <p className="mt-1.5 text-metric-sm tabular text-white">119</p>
                <p className="mt-1 text-caption text-white/60">Ekstensi 9 · 24 jam</p>
              </div>
            </div>
            {/* Nomor WhatsApp "0812 2849 0119" dihapus: nomornya dikarang,
                dan aduan yang dikirim ke sana tidak sampai ke mana pun. Kanal
                pengaduan yang benar-benar ada di sistem ini adalah formulir
                laporan warga. */}
            <div className="flex items-start gap-3 bg-brand-900 p-6">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <div>
                <p className="font-mono text-3xs uppercase tracking-[0.08em] text-white/50">
                  Lapor temuan lingkungan
                </p>
                <p className="mt-1.5 text-body-lg font-medium text-white">/warga/lapor</p>
                <p className="mt-1 text-caption text-white/60">
                  Tanpa akun · diverifikasi petugas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-brand-900 p-6">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
              <div>
                <p className="font-mono text-3xs uppercase tracking-[0.08em] text-white/50">
                  Loket Dinas Kesehatan
                </p>
                <p className="mt-1.5 text-body-lg font-medium text-white">Senin–Jumat</p>
                <p className="mt-1 text-caption text-white/60">07.30–15.30 WIB · Jl. Pandanaran 79</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
