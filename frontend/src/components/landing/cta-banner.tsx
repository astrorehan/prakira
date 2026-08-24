"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileWarning,
  BellRing,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";

export function CtaBanner() {
  const [phone, setPhone] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) setSubscribed(true);
  };

  return (
    <section id="lapor" className="container scroll-mt-20 pb-20 md:pb-32">
      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: Report CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-deep to-primary-royal px-8 py-10 text-white shadow-elevated md:px-10 md:py-12">
          <div className="absolute inset-0 bg-grid-dot opacity-10" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
              <FileWarning className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-balance">
              Lihat gejala penyakit di sekitar Anda?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85 max-w-sm">
              Bantu kami mendeteksi lebih cepat. Laporkan gejala atau kondisi
              lingkungan berisiko — laporan Anda akan diverifikasi petugas puskesmas.
            </p>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-6 group bg-white text-primary hover:bg-white/90 shadow-card font-semibold"
            >
              <Link href="/warga">
                Laporkan Sekarang
                <ArrowRight className="ml-1.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Right: WhatsApp subscription */}
        <div className="relative overflow-hidden rounded-3xl border border-paper-200 bg-white px-8 py-10 shadow-card md:px-10 md:py-12">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-50 blur-3xl" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
              <BellRing className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              Terima peringatan otomatis via WhatsApp
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-sm">
              Dapatkan notifikasi dari Dinas Kesehatan saat kecamatan Anda memasuki
              zona waspada atau siaga.
            </p>

            {subscribed ? (
              <div className="mt-6 rounded-xl bg-risk-low-bg border border-risk-low-br p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-risk-low shrink-0" />
                <span className="text-sm font-medium text-risk-low">
                  Nomor Anda berhasil didaftarkan! Kami akan mengirimkan
                  peringatan saat diperlukan.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="mt-6 flex flex-col sm:flex-row items-stretch gap-2.5"
              >
                <input
                  type="tel"
                  placeholder="Nomor WhatsApp (08...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 flex-1 rounded-xl border border-paper-200 bg-paper-50 px-4 text-sm text-foreground placeholder:text-paper-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="whitespace-nowrap font-semibold"
                >
                  Aktifkan
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer link for officers */}
      <div className="mt-6 flex items-center justify-center">
        <RolePickerDialog>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span>Masuk sebagai Petugas Kesehatan</span>
          </button>
        </RolePickerDialog>
      </div>
    </section>
  );
}