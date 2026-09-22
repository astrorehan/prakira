"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HubungiKamiPage() {
  const [composer, setComposer] = React.useState({
    nama: "",
    instansi: "",
    topik: "koordinasi",
    pesan: "",
  });

  const handleOpenEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[PRAKIRA] ${composer.topik.toUpperCase()} - ${composer.instansi || "Umum"} (${composer.nama})`,
    );
    const body = encodeURIComponent(
      `Kepada Yth. Pengelola Sistem PRAKIRA / Dinas Kesehatan Kota Semarang,\n\n` +
        `Nama: ${composer.nama}\n` +
        `Instansi / Wilayah: ${composer.instansi || "-"}\n` +
        `Kebutuhan / Topik: ${composer.topik}\n\n` +
        `Isi Pesan:\n${composer.pesan}\n\n` +
        `Dikirim melalui formulir kontak PRAKIRA.`,
    );
    window.location.href = `mailto:dkk@semarangkota.go.id?subject=${subject}&body=${body}`;
  };

  return (
    <div className="container space-y-12 py-10 md:py-16 max-w-5xl">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="text-center mx-auto max-w-2xl">
        <div className="eyebrow mx-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-100 text-paper-700 text-xs font-mono uppercase">
          <Sparkles className="h-3 w-3 text-brand-700" />
          Kanal Bantuan &amp; Kontak Resmi
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          Pusat Informasi &amp; Layanan <span className="text-brand-700">PRAKIRA</span>
        </h1>
        <p className="mt-3 text-body text-paper-600 leading-relaxed">
          Saluran komunikasi resmi Dinas Kesehatan Kota Semarang. Kami membedakan bantuan teknis akun aplikasi dari pelaporan temuan lapangan warga.
        </p>
      </section>

      {/* ── Section Bantuan Pemulihan Akun (F03) ────────────────────────────── */}
      <section
        id="bantuan-akun"
        className="scroll-mt-24 rounded-2xl border-2 border-brand-200 bg-brand-50/40 p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-3xs font-mono font-bold uppercase bg-brand-100 text-brand-800 border border-brand-200">
                Khusus Petugas Dinkes &amp; Puskesmas
              </span>
              <h2 className="mt-1 text-xl font-bold text-foreground tracking-tight">
                Bantuan Masuk &amp; Pemulihan Kata Sandi
              </h2>
            </div>
            <p className="text-sm text-paper-700 leading-relaxed">
              Akun konsol PRAKIRA diterbitkan dan dikelola secara terpusat untuk menjaga kerahasiaan data surveilans. Penyetelan ulang kata sandi dilakukan secara manual oleh <strong>Administrator Sistem Dinas Kesehatan Kota Semarang</strong> setelah verifikasi identitas kedinasan.
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-2 text-xs text-paper-700">
              <div className="rounded-xl border border-sand-200 bg-white p-3.5 space-y-1">
                <span className="font-semibold text-slate-900 block">Jalur Surel Kedinasan:</span>
                <p className="text-paper-600">
                  Kirim permohonan ke <strong className="text-foreground font-mono">dkk@semarangkota.go.id</strong> menggunakan surel dinas instansi Anda.
                </p>
              </div>
              <div className="rounded-xl border border-sand-200 bg-white p-3.5 space-y-1">
                <span className="font-semibold text-slate-900 block">Jalur Panggilan Kerja:</span>
                <p className="text-paper-600">
                  Hubungi <strong className="text-foreground font-mono">(024) 8415269</strong> pada jam kerja dinas (Senin–Jumat, 07.30–16.00 WIB).
                </p>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button asChild size="sm" className="gap-2 bg-brand-700 hover:bg-brand-800 text-white font-medium">
                <a
                  href="mailto:dkk@semarangkota.go.id?subject=%5BPRAKIRA%5D%20Permohonan%20Reset%20Kata%20Sandi&body=Kepada%20Yth.%20Administrator%20Sistem%20PRAKIRA%20Dinas%20Kesehatan%20Kota%20Semarang%2C%0A%0ASaya%20mengajukan%20permohonan%20bantuan%20pemulihan%20kata%20sandi%20akun%20konsol%3A%0A-%20Nama%20Lengkap%3A%20%0A-%20Unit%20Kerja%20%2F%20Puskesmas%3A%20%0A-%20Surel%20Dinas%3A%20%0A-%20Nomor%20Kontak%3A%20%0A%0ATerima%20kasih."
                >
                  <Mail className="h-4 w-4" />
                  <span>Siapkan Draf Surel Pemulihan Akun</span>
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/masuk">
                  <span>Kembali ke Halaman Masuk</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid 2 Kolom: Pelaporan Warga vs Kantor Resmi ──────────────────── */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Kolom Kiri: Informasi Pengelola & Darurat */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 space-y-4 border-sand-200">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Pusat Komando &amp; Surveilans
            </h3>
            <div className="space-y-3.5 text-xs text-paper-700">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Dinas Kesehatan Kota Semarang</strong>
                  <br />
                  Jl. Pandanaran No. 79, Mugassari, Kec. Semarang Selatan, Kota Semarang, Jawa Tengah 50249
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-brand-700 shrink-0" />
                <span>Hari kerja: Senin–Jumat, 07.30–16.00 WIB</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-brand-700 shrink-0" />
                <span>(024) 8415269 (Pusat Panggilan Kantor)</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-brand-700 shrink-0" />
                <span>dkk@semarangkota.go.id / surveilans@prakira.id</span>
              </div>
            </div>
          </Card>

          {/* Tanggap Darurat & KLB */}
          <Card className="p-6 bg-linear-to-br from-rose-800 to-rose-950 text-white border-none shadow-md">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold opacity-95">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Layanan Darurat Medis 24 Jam
            </div>
            <p className="mt-3 text-xs leading-relaxed opacity-90">
              Untuk kondisi darurat bencana medis, lonjakan kasus mendadak di lingkungan (KLB), atau bantuan ambulans gawat darurat, segera hubungi:
            </p>
            <div className="mt-3 rounded-lg bg-black/25 p-2.5 text-center">
              <span className="font-mono text-lg font-bold text-amber-300 block">Hotline 112 (Bebas Pulsa)</span>
              <span className="text-3xs text-slate-200">Call Center Siaga Darurat Kota Semarang</span>
            </div>
          </Card>

          {/* Navigasi Pelaporan Warga */}
          <Card className="p-6 border-sand-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-paper-700">
              <ClipboardList className="h-4 w-4 text-brand-700" />
              Pelaporan Lapangan Warga
            </div>
            <p className="text-xs text-paper-600 leading-relaxed">
              Ingin melaporkan temuan jentik nyamuk, genangan air berhari-hari, saluran tersumbat, atau keluhan kesehatan di lingkungan Anda?
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="justify-between text-xs">
                <Link href="/warga/lapor">
                  <span>Kirim Laporan Temuan Lapangan</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-between text-xs text-paper-600">
                <Link href="/warga/status">
                  <span>Lacak Status Laporan yang Dikirim</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Kolom Kanan: Draf Surel ke Tim Pengelola */}
        <div className="lg:col-span-7">
          <Card className="p-6 md:p-8 border-sand-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Hubungi Pengelola melalui Surel Resmi
              </h3>
              <p className="text-xs text-paper-600 mt-1 leading-relaxed">
                Formulir ini menyiapkan pesan langsung ke alamat surel pengelola (<strong className="text-foreground">dkk@semarangkota.go.id</strong>). Tidak ada pesan yang disimpan atau dikirimkan tanpa persetujuan Anda di aplikasi surel.
              </p>
            </div>

            <form onSubmit={handleOpenEmail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nama Lengkap</label>
                  <input
                    required
                    type="text"
                    placeholder="Nama Anda"
                    value={composer.nama}
                    onChange={(e) => setComposer({ ...composer, nama: e.target.value })}
                    className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs focus:border-brand-700 focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Instansi / Puskesmas / Wilayah</label>
                  <input
                    type="text"
                    placeholder="Contoh: Puskesmas Pandanaran / Warga Banyumanik"
                    value={composer.instansi}
                    onChange={(e) => setComposer({ ...composer, instansi: e.target.value })}
                    className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs focus:border-brand-700 focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Kategori Kebutuhan</label>
                <select
                  value={composer.topik}
                  onChange={(e) => setComposer({ ...composer, topik: e.target.value })}
                  className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs focus:border-brand-700 focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  <option value="koordinasi">Koordinasi Data &amp; Integrasi Puskesmas</option>
                  <option value="pemutakhiran">Pemutakhiran Rekapitulasi Kasus</option>
                  <option value="teknis">Kendala Teknis Aplikasi / Masukan</option>
                  <option value="kemitraan">Kemitraan &amp; Penelitian Epidemiologi</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Isi Pesan Koordinasi</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Jelaskan kebutuhan koordinasi data kasus, kendala teknis yang dihadapi, atau permohonan koordinasi surveilans…"
                  value={composer.pesan}
                  onChange={(e) => setComposer({ ...composer, pesan: e.target.value })}
                  className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs focus:border-brand-700 focus:outline-hidden focus:ring-1 focus:ring-brand-700 resize-none"
                />
              </div>

              <div className="rounded-lg bg-sand-50 p-3 border border-sand-200 flex items-start gap-2.5 text-3xs text-paper-600">
                <HelpCircle className="h-4 w-4 shrink-0 text-brand-700 mt-0.5" />
                <span>
                  Mengklik tombol di bawah akan membuka aplikasi surel Anda dengan rincian di atas terisi otomatis. Anda dapat meninjau pesan sebelum mengirimkannya.
                </span>
              </div>

              <Button type="submit" size="default" className="w-full gap-2 bg-brand-700 hover:bg-brand-800 text-white font-medium">
                <ExternalLink className="h-4 w-4" />
                <span>Buka Pesan di Aplikasi Surel</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
