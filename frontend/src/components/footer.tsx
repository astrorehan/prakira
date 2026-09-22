import Link from "next/link";
import { ShieldCheck, HeartHandshake } from "lucide-react";
import { AccessibilityMenu } from "@/components/accessibility-menu";
import { BrandLockup } from "@/components/brand-lockup";

export function Footer() {
  return (
    <footer className="border-t border-paper-200/80 bg-white/80 text-xs text-muted-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <BrandLockup size="sm" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Platform Prediksi Risiko Penyakit Berbasis Iklim (DBD, ISPA,
              Leptospirosis) per Wilayah. Mengubah paradigma surveilans kesehatan dari
              reaktif menjadi tindakan preventif terarah.
            </p>
            <div className="text-2xs text-paper-600">
              DSDC ANFORCOM 2026 — Subtema: Eco-Health Monitoring & Early
              Warning Platforms.
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-display font-medium text-foreground text-xs uppercase tracking-wider">
              Navigasi
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/#risk-check"
                  className="hover:text-primary transition-colors"
                >
                  Cek Risiko Wilayah
                </Link>
              </li>
              <li>
                <Link
                  href="/#cara-kerja"
                  className="hover:text-primary transition-colors"
                >
                  Cara Kerja Prakiraan
                </Link>
              </li>
              <li>
                <Link
                  href="/#edukasi"
                  className="hover:text-primary transition-colors"
                >
                  Panduan Pencegahan
                </Link>
              </li>
              <li>
                <Link
                  href="/tentang"
                  className="hover:text-primary transition-colors"
                >
                  Tentang Prakira
                </Link>
              </li>
              <li>
                <Link
                  href="/hubungi-kami"
                  className="hover:text-primary transition-colors"
                >
                  Hubungi Kami
                </Link>
              </li>
              <li>
                <Link
                  href="/warga"
                  className="hover:text-primary transition-colors"
                >
                  Lapor & Lacak Laporan
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            {/* F14: kolom ini dulu bernama "Modul Sistem" dan berisi tiga rute
                konsol — dashboard, analitik, manajemen data. Halaman publik
                tidak punya urusan menawarkan ruang kerja petugas kepada warga;
                yang terjadi hanya satu klik menuju layar masuk yang tidak
                diminta. Yang tersisa di sini adalah permukaan yang memang
                dibuka tanpa akun, dan satu pintu masuk petugas yang jujur
                menyebut dirinya begitu. */}
            <h4 className="font-display font-medium text-foreground text-xs uppercase tracking-wider">
              Layanan & Transparansi
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  href="/sistem"
                  className="hover:text-primary transition-colors"
                >
                  Layanan Publik & Data Kecamatan
                </Link>
              </li>
              <li>
                <Link
                  href="/model"
                  className="hover:text-primary transition-colors"
                >
                  Transparansi Model
                </Link>
              </li>
              <li>
                <Link
                  href="/mesin-waktu"
                  className="hover:text-primary transition-colors"
                >
                  Uji Historis Prakiraan
                </Link>
              </li>
              <li>
                <Link
                  href="/simulasi"
                  className="hover:text-primary transition-colors"
                >
                  Simulator Cuaca
                </Link>
              </li>
              <li>
                <Link
                  href="/masuk"
                  className="hover:text-primary transition-colors"
                >
                  Masuk sebagai Petugas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-paper-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs">
          <div>
            © 2026 <strong>Prakira</strong>. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* The reader who needs this looks in the footer, not the navbar. */}
            <AccessibilityMenu variant="inline" className="w-auto" />

            <span className="inline-flex items-center gap-1 text-paper-600">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Data iklim bulanan</span>
            </span>
            <span className="inline-flex items-center gap-1 text-paper-600">
              <HeartHandshake className="h-3.5 w-3.5 text-risk-low" />
              <span>Dinkes Kota Semarang</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
