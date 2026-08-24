"use client";

import { Bug, Wind, Droplets, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EDUCATION_CARDS = [
  {
    emoji: "🦟",
    title: "Cegah Demam Berdarah",
    subtitle: "Gerakan 3M Plus",
    icon: Bug,
    color: "border-brand-300/40",
    iconBg: "bg-brand-100 text-brand-700",
    tips: [
      "Kuras bak mandi & tampungan air minimal 1× seminggu",
      "Tutup rapat semua wadah penampung air bersih",
      "Kubur atau daur ulang barang bekas penampung air hujan",
      "Oleskan lotion anti nyamuk & pasang kelambu saat tidur",
    ],
  },
  {
    emoji: "🌬️",
    title: "Cegah ISPA & Batuk",
    subtitle: "Jaga Saluran Napas",
    icon: Wind,
    color: "border-climate-rain/30",
    iconBg: "bg-blue-50 text-blue-700",
    tips: [
      "Gunakan masker saat di luar ruangan, terutama di kawasan berdebu",
      "Buka ventilasi rumah setiap pagi untuk sirkulasi udara",
      "Perbanyak minum air putih dan konsumsi vitamin C",
      "Segera ke puskesmas jika batuk pilek > 3 hari disertai sesak",
    ],
  },
  {
    emoji: "💧",
    title: "Cegah Diare",
    subtitle: "Higienitas & Air Bersih",
    icon: Droplets,
    color: "border-risk-low-br",
    iconBg: "bg-risk-low-bg text-risk-low",
    tips: [
      "Rebus air minum sampai benar-benar mendidih (100°C)",
      "Cuci tangan pakai sabun sebelum makan & setelah dari toilet",
      "Waspadai kontaminasi air sumur saat banjir/genangan",
      "Siapkan oralit di rumah untuk penanganan pertama dehidrasi",
    ],
  },
];

export function EducationSection() {
  return (
    <section
      id="edukasi"
      className="scroll-mt-20 py-16 md:py-24 bg-paper-50/60 border-y border-paper-200/60"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Edukasi Pencegahan</div>
          <h2 className="mt-5 h-section text-balance">
            Langkah sederhana, dampak besar
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Pencegahan penyakit terkait iklim bisa dimulai dari rumah Anda sendiri.
            Berikut panduan ringkas yang bisa langsung diterapkan.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {EDUCATION_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={cn(
                  "group rounded-2xl border bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift",
                  card.color,
                )}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 shadow-sm",
                      card.iconBg,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                </div>

                {/* Tips */}
                <ul className="mt-5 space-y-2.5">
                  {card.tips.map((tip, tIdx) => (
                    <li
                      key={tIdx}
                      className="flex items-start gap-2 text-sm text-paper-700 leading-relaxed"
                    >
                      <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}