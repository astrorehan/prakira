"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Activity, Users, ShieldCheck, Database, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface RolePickerDialogProps {
  children: ReactNode;
}

const ROLES = [
  {
    path: "/dashboard",
    title: "Dinas Kesehatan & Puskesmas",
    description: "Pantau zonasi risiko kecamatan, tren 2-4 minggu, dan instruksikan fogging/PSN.",
    icon: Activity,
    color: "bg-brand-100 text-brand-700",
    highlights: ["Peta Spasial 16 Kecamatan", "Prediksi DBD, ISPA, Diare", "Rekomendasi Tindakan Otomatis"],
  },
  {
    path: "/warga",
    title: "Portal Publik (Warga)",
    description: "Cek status risiko lingkungan tempat tinggal tanpa login dan pelajari edukasi 3M Plus.",
    icon: Users,
    color: "bg-brand-100 text-brand-700",
    highlights: ["Cek Risiko per Kecamatan", "Edukasi Pencegahan Mandiri", "Langganan Broadcast WhatsApp"],
  },
  {
    path: "/analitik",
    title: "Modul Analitik & Riwayat",
    description: "Evaluasi korelasi iklim BMKG vs penyakit dan transparansi backtesting model ML.",
    icon: ShieldCheck,
    color: "bg-brand-100 text-brand-700",
    highlights: ["Korelasi Curah Hujan & Suhu", "Backtesting Akurasi R² 0.91", "Ekspor Laporan PDF/Excel"],
  },
  {
    path: "/admin",
    title: "Manajemen Data & BMKG Sync",
    description: "Pusat import dataset CSV, monitoring koneksi API BMKG, dan log audit perubahan data.",
    icon: Database,
    color: "bg-brand-100 text-brand-700",
    highlights: ["Import Dataset Kasus CSV", "Sinkronisasi BMKG 4 Stasiun", "Immutable Audit Trail Logs"],
  },
];

export function RolePickerDialog({ children }: RolePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const choose = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl liquid-glass p-6 md:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold font-display text-foreground">
            Pilih Modul & Perspektif Pengguna
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Prakira melayani berbagai persona pengguna. Pilih peran untuk mengeksplorasi modul sistem yang sesuai.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ROLES.map(({ path, title, description, icon: Icon, color, highlights }) => (
            <button
              key={path}
              type="button"
              onClick={() => choose(path)}
              className={cn(
                "group relative flex flex-col justify-between gap-3 rounded-2xl border border-paper-200/90 bg-white/90 p-5 text-left transition-all duration-300",
                "hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow hover:bg-white",
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 shadow-sm", color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div className="mt-3 text-base font-semibold tracking-tight text-foreground">{title}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>

              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground pt-2 border-t border-paper-100">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5 font-medium text-paper-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {h}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Prakira — Platform Prediksi Risiko Penyakit Berbasis Iklim (DSDC ANFORCOM 2026)
        </p>
      </DialogContent>
    </Dialog>
  );
}