"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Reveal } from "./reveal";

export function CtaBanner() {
  const [phone, setPhone] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) setSubscribed(true);
  };

  return (
    <section id="lapor" className="scroll-mt-24 bg-grad-sand pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="container">
        <Reveal className="overflow-hidden rounded-3xl border border-sand-200 bg-grad-paper">
          <div className="grid md:grid-cols-2">
            {/* Left: the ask that costs the reader nothing */}
            <div className="border-b border-sand-200 bg-grad-brand-soft p-8 md:border-b-0 md:border-r md:p-12">
              <span className="font-mono text-overline uppercase text-paper-500">
                Peringatan otomatis
              </span>
              <h2 className="mt-5 text-h1 text-balance text-foreground">
                Kami kabari sebelum wilayah Anda masuk zona siaga
              </h2>
              <p className="mt-4 max-w-md text-body text-paper-600">
                Satu pesan WhatsApp saat status kecamatan Anda naik. Tidak ada kiriman
                harian, tidak ada promosi.
              </p>

              {subscribed ? (
                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-risk-low-br bg-risk-low-bg p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-risk-low" aria-hidden />
                  <p className="text-body-sm text-paper-700">
                    Nomor Anda terdaftar. Peringatan dikirim hanya saat status
                    kecamatan berubah naik.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="mt-8 flex flex-col gap-2.5 sm:flex-row"
                >
                  <label htmlFor="wa" className="sr-only">
                    Nomor WhatsApp
                  </label>
                  <input
                    id="wa"
                    type="tel"
                    inputMode="tel"
                    placeholder="08xx xxxx xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-14 flex-1 rounded-2xl border border-sand-200 bg-sand-50 px-5 text-base text-foreground placeholder:text-paper-400 transition-colors duration-fast focus:border-brand-500 focus:outline-none"
                  />
                  <Button type="submit" size="lg" className="shrink-0">
                    Aktifkan
                  </Button>
                </form>
              )}

              <p className="mt-3 text-caption text-paper-500">
                Nomor dipakai hanya untuk peringatan Dinas Kesehatan.
              </p>
            </div>

            {/* Right: the ask that improves the model */}
            <div className="p-8 md:p-12">
              <span className="font-mono text-overline uppercase text-paper-500">
                Lapor
              </span>
              <h2 className="mt-5 text-h1 text-balance text-foreground">
                Yang Anda lihat di gang belum tentu terlihat di data
              </h2>
              <p className="mt-4 max-w-md text-body text-paper-600">
                Genangan yang bertahan berhari-hari, tetangga yang demam bersamaan,
                sampah yang menampung hujan. Laporan Anda diverifikasi puskesmas
                sebelum masuk hitungan.
              </p>

              <Button asChild size="lg" className="group mt-8">
                <Link href="/warga">
                  Laporkan sekarang
                  <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
                </Link>
              </Button>

              <p className="mt-3 text-caption text-paper-500">
                Tanpa akun. Cukup pilih kecamatan dan jenis laporannya.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
