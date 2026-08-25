import Link from "next/link";
import { Activity, ShieldCheck, HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-paper-200/80 bg-white/80 text-xs text-muted-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-display font-semibold text-base text-foreground tracking-tight">
                Prakira
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Platform Prediksi Risiko Penyakit Berbasis Iklim (DBD, ISPA, Diare) per Wilayah. Mengubah paradigma surveilans kesehatan dari reaktif menjadi tindakan preventif terarah.
            </p>
            <div className="text-[11px] text-paper-500">
              DSDC ANFORCOM 2026 — Subtema: Eco-Health Monitoring & Early Warning Platforms.
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-display font-medium text-foreground text-xs uppercase tracking-wider">
              Navigasi
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/#risk-check" className="hover:text-primary transition-colors">
                  Cek Risiko Wilayah
                </Link>
              </li>
              <li>
                <Link href="/#cara-kerja" className="hover:text-primary transition-colors">
                  Cara Kerja Prakiraan
                </Link>
              </li>
              <li>
                <Link href="/#edukasi" className="hover:text-primary transition-colors">
                  Panduan Pencegahan
                </Link>
              </li>
              <li>
                <Link href="/tentang" className="hover:text-primary transition-colors">
                  Tentang Prakira
                </Link>
              </li>
              <li>
                <Link href="/hubungi-kami" className="hover:text-primary transition-colors">
                  Hubungi Kami
                </Link>
              </li>
              <li>
                <Link href="/warga" className="hover:text-primary transition-colors">
                  Portal Publik Warga
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-display font-medium text-foreground text-xs uppercase tracking-wider">
              Modul Sistem
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Dashboard Prediksi Risiko
                </Link>
              </li>
              <li>
                <Link href="/analitik" className="hover:text-primary transition-colors">
                  Analitik & Riwayat Cuaca
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors">
                  Manajemen Data & BMKG
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-paper-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © 2026 <strong>Prakira</strong>. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-paper-600">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>BMKG Real-Time Sync</span>
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
