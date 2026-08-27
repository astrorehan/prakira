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
    <section id="lapor" className="scroll-mt-24 bg-grad-sand pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="container">
        <Reveal className="overflow-hidden rounded-3xl border border-sand-200 bg-grad-paper">
          <div className="grid md:grid-cols-2">
            {/* Kiri: yang bisa dicek kembali pembaca tanpa akun */}
            <div className="border-b border-sand-200 bg-grad-brand-soft p-8 md:border-b-0 md:border-r md:p-12">
              <span className="font-mono text-overline uppercase text-paper-600">
                Lacak laporan
              </span>
              <h2 className="mt-5 text-h1 text-balance text-foreground">
                Sudah melapor? Lihat keputusan petugasnya
              </h2>
              <p className="mt-4 max-w-md text-body text-paper-600">
                Setiap laporan menerbitkan satu kode lacak. Masukkan kodenya untuk
                melihat apakah petugas sudah memutuskan, dan alasannya bila ditolak.
              </p>

              <Button asChild size="lg" variant="outline" className="group mt-8">
                <Link href="/warga/status">
                  <SearchCheck className="h-4 w-4" aria-hidden />
                  Cek kode lacak
                  <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              </Button>

              <p className="mt-3 text-caption text-paper-600">
                Kami tidak meminta nama maupun nomor telepon, jadi kode itulah
                satu-satunya identitas laporan Anda.
              </p>
            </div>

            {/* Kanan: yang memperbaiki modelnya */}
            <div className="p-8 md:p-12">
              <span className="font-mono text-overline uppercase text-paper-600">
                Lapor
              </span>
              <h2 className="mt-5 text-h1 text-balance text-foreground">
                Yang Anda lihat di gang belum tentu terlihat di data
              </h2>
              <p className="mt-4 max-w-md text-body text-paper-600">
                Genangan yang bertahan berhari-hari, tetangga yang demam bersamaan,
                sampah yang menampung hujan. Laporan Anda diverifikasi petugas
                sebelum masuk hitungan.
              </p>

              <Button asChild size="lg" className="group mt-8">
                <Link href={withKecamatan("/warga/lapor", selectedKecamatan)}>
                  Laporkan sekarang
                  <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              </Button>

              <p className="mt-3 text-caption text-paper-600">
                Tanpa akun. Cukup pilih kecamatan dan jenis laporannya.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
