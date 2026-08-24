"use client";

import * as React from "react";
import { Users, HeartHandshake, ShieldCheck, PhoneCall, BellRing, Sparkles } from "lucide-react";
import { PublicRiskChecker } from "@/components/public-risk-checker";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export default function PortalPublikPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-paper-200/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3.5 py-1 text-xs font-medium text-brand-800 shadow-sm mb-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Portal Edukasi & Kewaspadaan Warga</span>
            </div>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Cek Status Risiko Wilayah & Panduan Pencegahan
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Layanan terbuka tanpa login untuk warga Kota Semarang dalam memantau potensi risiko penyakit DBD, ISPA, dan Diare di lingkungan tempat tinggal.
            </p>
          </div>
        </div>

        <PublicRiskChecker />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LiquidGlassCard variant="default" className="p-6">
            <h4 className="font-display font-semibold text-base text-foreground mb-2">
              🦟 Pencegahan DBD (3M Plus)
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• <strong>Menguras:</strong> Bersihkan bak mandi dan penampungan air minimal 1x seminggu.</li>
              <li>• <strong>Menutup:</strong> Tutup rapat semua tempat penampungan air bersih.</li>
              <li>• <strong>Mendaur ulang:</strong> Kubur atau manfaatkan barang bekas yang berpotensi menampung air hujan.</li>
              <li>• <strong>Plus:</strong> Gunakan kelambu, oleskan lotion anti nyamuk, dan taburkan serbuk abate.</li>
            </ul>
          </LiquidGlassCard>

          <LiquidGlassCard variant="default" className="p-6">
            <h4 className="font-display font-semibold text-base text-foreground mb-2">
              🌬️ Perlindungan ISPA & Debu
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• Gunakan masker medis saat beraktivitas di luar ruangan terutama di kawasan pesisir/industri.</li>
              <li>• Pastikan ventilasi silang udara rumah terbuka pada pagi hari.</li>
              <li>• Tingkatkan konsumsi air putih dan vitamin C pada masa peralihan cuaca.</li>
              <li>• Segera ke puskesmas jika mengalami batuk pilek &gt; 3 hari dengan sesak napas.</li>
            </ul>
          </LiquidGlassCard>

          <LiquidGlassCard variant="default" className="p-6">
            <h4 className="font-display font-semibold text-base text-foreground mb-2">
              💧 Higienitas & Sanitasi Diare
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• Rebus air minum hingga benar-benar mendidih sempurna (100°C).</li>
              <li>• Biasakan Cuci Tangan Pakai Sabun (CTPS) sebelum makan dan setelah dari toilet.</li>
              <li>• Waspadai kontaminasi air sumur saat terjadi banjir atau genangan rob.</li>
              <li>• Siapkan larutan oralit di rumah sebagai penanganan pertama dehidrasi.</li>
            </ul>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}