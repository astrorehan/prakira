import Link from "next/link";
import { Compass, Home, MapPin, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/brand-lockup";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-grad-paper">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 border border-brand-200 text-brand-700 shadow-sm">
            <Compass className="h-8 w-8 animate-spin-slow" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-widest text-risk-high font-semibold">
            404 · Halaman Tidak Ditemukan
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Wilayah ini belum terpetakan
          </h1>
          <p className="text-sm text-paper-600 max-w-md mx-auto leading-relaxed">
            Halaman atau tautan yang Anda tuju mungkin sudah dipindahkan, dihapus, atau alamat URL yang dimasukkan kurang tepat.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="primary" size="default" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Beranda Utama</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="default" className="w-full sm:w-auto gap-2">
            <Link href="/dashboard">
              <Activity className="h-4 w-4 text-brand-700" />
              <span>Dashboard Prediksi</span>
            </Link>
          </Button>
        </div>

        <Card className="p-4 bg-white/70 border-sand-200 text-left">
          <div className="text-2xs font-semibold uppercase tracking-wider text-paper-600 mb-2">
            Pintasan Layanan Populer
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/#risk-check"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-paper-100 text-foreground transition-colors group"
            >
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                <span>Cek Risiko Wilayah</span>
              </span>
              <ArrowRight className="h-3 w-3 text-paper-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
            <Link
              href="/warga/lapor"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-paper-100 text-foreground transition-colors group"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Compass className="h-3.5 w-3.5 text-risk-medium shrink-0" />
                <span>Lapor Temuan</span>
              </span>
              <ArrowRight className="h-3 w-3 text-paper-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

