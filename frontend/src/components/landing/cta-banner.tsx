"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withKecamatan } from "@/lib/kecamatan-selection";

import { Reveal } from "./reveal";

/**
 * Dua ajakan di kaki halaman depan.
 *
 * Kolom kiri dulu berisi formulir langganan peringatan WhatsApp: satu bidang
 * nomor telepon, tombol "Aktifkan", dan layar berhasil bertuliskan "Nomor Anda
 * terdaftar". Tidak ada nomor yang pernah tersimpan, tidak ada pesan yang
 * pernah dikirim, dan PRD §4 menaruh notifikasi broadcast di daftar WON'T untuk
 * babak ini. Formulir yang mengumpulkan nomor telepon lalu membuangnya bukan
 * sekadar fitur bohong — ia meminta data pribadi tanpa tujuan.
 *
 * Penggantinya adalah satu-satunya cara melacak yang benar-benar ada: kode
 * lacak laporan.
 */
export function CtaBanner({ selectedKecamatan }: { selectedKecamatan: string | null }) {
  return (
    <section id="lapor" className="scroll-mt-24 bg-grad-aqua-soft pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="container">
        <Reveal className="overflow-hidden rounded-[2rem] border border-ocean-200 bg-white shadow-lift">
          <div className="grid md:grid-cols-2">
            {/* Kiri: yang bisa dicek kembali pembaca tanpa akun */}
            <div className="relative isolate border-b border-ocean-100 bg-white p-8 md:border-b-0 md:border-r md:p-12">
              <div aria-hidden className="halftone pointer-events-none absolute inset-0 -z-10 opacity-70" />
              <span className="font-mono text-overline uppercase text-ocean-600">
                Lacak laporan
              </span>
              <h2 className="mt-5 text-h1 text-balance text-foreground">
                Cek keputusan laporan
              </h2>
              <p className="mt-4 max-w-md text-body text-paper-600">
                Masukkan kode lacak untuk melihat status dan alasan keputusan petugas.
              </p>

              <Button asChild size="lg" variant="outline" className="group mt-8">
                <Link href="/warga/status">
                  <SearchCheck className="h-4 w-4" aria-hidden />
                  Cek kode lacak
                  <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              </Button>

              <p className="mt-3 text-caption text-paper-600">
                Tanpa akun dan tanpa nomor telepon.
              </p>
            </div>

            {/* Kanan: yang memperbaiki modelnya — permukaan laut, seperti banner */}
            <div className="relative isolate bg-grad-ocean p-8 text-white md:p-12">
              <div aria-hidden className="halftone halftone-light pointer-events-none absolute inset-0 -z-10" />
              <span className="font-mono text-overline uppercase text-ocean-200">
                Lapor
              </span>
              <h2 className="mt-5 text-h1 text-balance text-white">
                Temuan Anda membantu melengkapi data
              </h2>
              <p className="mt-4 max-w-md text-body text-ocean-100">
                Laporkan genangan, jentik, gejala, atau kondisi lingkungan. Petugas
                memverifikasi laporan sebelum memakainya.
              </p>

              <Button
                asChild
                size="lg"
                className="group mt-8 bg-white text-brand-800 shadow-card hover:bg-ocean-50 hover:text-brand-900 active:bg-ocean-100 active:text-brand-900"
              >
                <Link href={withKecamatan("/warga/lapor", selectedKecamatan)}>
                  Laporkan sekarang
                  <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              </Button>

              <p className="mt-3 text-caption text-ocean-200">
                Tanpa akun. Cukup pilih kecamatan dan jenis laporannya.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
