"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RolePickerDialog } from "@/components/role-picker-dialog";

export function CtaBanner() {
  return (
    <section className="container pb-20 md:pb-32">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-deep to-primary-royal px-8 py-14 text-white shadow-elevated md:px-16 md:py-20">
        <div className="absolute inset-0 bg-grid-dot opacity-10" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-xs font-medium shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Demo Sistem Prakira Siap Digunakan</span>
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">
            Siap beralih ke pencegahan kesehatan preventif?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
            Pilih perspektif Dinas Kesehatan, Warga, atau Admin Data, jelajahi dashboard prediktif, dan rasakan keunggulan Machine Learning dalam deteksi dini KLB.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <RolePickerDialog>
              <Button size="xl" variant="secondary" className="group bg-white text-primary hover:bg-white/90 shadow-card font-semibold">
                <span>Coba Demo Sekarang</span>
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </RolePickerDialog>
            <Button
              asChild
              size="xl"
              variant="ghost"
              className="text-white hover:bg-white/15 border border-white/30 font-semibold"
            >
              <Link href="/warga">
                <Users className="h-4 w-4 mr-2" />
                <span>Portal Warga</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}