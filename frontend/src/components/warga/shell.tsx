"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kerangka halaman portal warga.
 *
 * PRD §5.3 mewajibkan satu kalimat hadir permanen di setiap permukaan publik —
 * "Ini perkiraan risiko wilayah, bukan diagnosis" — dan §11-H3 mengujinya di
 * `/warga`, `/warga/lapor`, dan `/warga/status`. Versi sebelumnya tidak
 * memuatnya di satu pun. Menaruhnya di kerangka, bukan di masing-masing
 * halaman, berarti halaman baru tidak bisa lupa membawanya.
 *
 * Bannernya duduk di bawah isi, bukan di atas: pembaca yang membuka `/warga`
 * datang untuk melapor, dan menyambutnya dengan penyangkalan sebelum ia sempat
 * melihat apa pun mengubah peringatan jadi penghalang. Yang di atas adalah
 * pekerjaannya; yang di bawah adalah batas alat ini.
 */

export function WargaShell({
  title,
  lead,
  backHref,
  backLabel,
  children,
  className,
}: {
  title: string;
  lead?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-grad-paper", className)}>
      <div className="container py-12 md:py-16">
        {backHref && (
          <Link
            href={backHref}
            className="group inline-flex items-center gap-1.5 text-body-sm font-medium text-paper-600 transition-colors duration-fast hover:text-brand-700"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-fast group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            {backLabel ?? "Kembali"}
          </Link>
        )}

        <header className={cn("max-w-2xl", backHref && "mt-6")}>
          <h1 className="text-display leading-[1.06] text-foreground">{title}</h1>
          {lead && <p className="mt-5 text-body-lg text-paper-600">{lead}</p>}
        </header>

        <div className="mt-10 md:mt-12">{children}</div>

        <aside className="mt-14 flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-5">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-paper-500" aria-hidden="true" />
          <p className="text-body-sm leading-relaxed text-paper-700">
            <strong className="font-semibold text-foreground">
              Ini perkiraan risiko wilayah, bukan diagnosis.
            </strong>{" "}
            Prakira memperkirakan kemungkinan lonjakan kasus di satu kecamatan, bukan
            kondisi satu orang. Jika Anda atau keluarga sakit, periksakan ke puskesmas
            atau fasilitas kesehatan terdekat. Keadaan darurat: hubungi 119.
          </p>
        </aside>
      </div>
    </div>
  );
}
