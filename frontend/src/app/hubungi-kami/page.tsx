"use client";

import { useState } from "react";
import { Sparkles, Phone, Mail, MapPin, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HubungiKamiPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ nama: "", instansi: "", email: "", pesan: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="container space-y-12 py-12 md:py-20 max-w-5xl">
      {/* Header */}
      <section className="text-center mx-auto max-w-2xl">
        <div className="eyebrow mx-auto">
          <Sparkles className="h-3 w-3" />
          Layanan & Bantuan
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
          Hubungi Tim <span className="text-primary">Prakira</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Punya pertanyaan seputar data yang dipakai sistem ini, pelaporan klaster kasus di lingkungan Anda, atau kemitraan puskesmas? Kami siap membantu.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Contact Info */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Pusat Komando & Surveilans
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Jl. Pandanaran No. 79, Mugassari, Kec. Semarang Selatan, Kota Semarang, Jawa Tengah 50249</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">(024) 8415269 / Hotline 112 (Bencana & Darurat)</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>surveilans@prakira.id / dinkes@semarangkota.go.id</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary to-primary-deep text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium opacity-85">
              <ShieldAlert className="h-4 w-4" />
              Layanan Tanggap KLB 24 Jam
            </div>
            <p className="mt-3 text-xs opacity-90 leading-relaxed">
              Jika mendeteksi peningkatan kasus demam tinggi mendadak dengan bintik merah &gt; 3 orang dalam 1 RT/RW, segera hubungi puskesmas terdekat untuk verifikasi PE (Penyelidikan Epidemiologi).
            </p>
          </Card>
        </div>

        {/* Form */}
        <div className="lg:col-span-7">
          <Card className="p-6 md:p-8">
            {submitted ? (
              <div className="text-center py-10 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-risk-low-bg text-risk-low mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Pesan Berhasil Terkirim</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Terima kasih telah menghubungi kami. Tim teknis dan surveilans Prakira akan menindaklanjuti pesan Anda dalam kurun waktu 1x24 jam kerja.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline" size="sm" className="mt-4">
                  Kirim Pesan Lain
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Kirim Pesan / Permintaan Integrasi
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nama Lengkap</label>
                    <input
                      required
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      className="w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2 text-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Instansi / Puskesmas</label>
                    <input
                      required
                      type="text"
                      placeholder="Puskesmas Pedurungan"
                      value={form.instansi}
                      onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                      className="w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2 text-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Alamat Email</label>
                  <input
                    required
                    type="email"
                    placeholder="nama@instansi.go.id"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2 text-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Isi Pesan atau Laporan</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Jelaskan kebutuhan koordinasi data, pemutakhiran rekapitulasi kasus, atau laporan situasi wilayah Anda…"
                    value={form.pesan}
                    onChange={(e) => setForm({ ...form, pesan: e.target.value })}
                    className="w-full rounded-xl border border-paper-200 bg-white px-3.5 py-2 text-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <Button type="submit" variant="blue" className="w-full font-semibold text-white shadow-xs">
                  <Send className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">Kirim Pesan</span>
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
