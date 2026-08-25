"use client";

import * as React from "react";
import { useState } from "react";
import { Search, MapPin, ShieldAlert, CheckCircle2, PhoneCall, BellRing, Sparkles } from "lucide-react";
import { cn, RISK_CONFIG, DISEASE_CONFIG } from "@/lib/utils";
import { SEMARANG_KECAMATAN_RAW, getKecamatanDataList } from "@/lib/mock-data";
import { LiquidGlassCard } from "./ui/liquid-glass-card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { RiskGauge } from "./ui/risk-gauge";

export function PublicRiskChecker({ className }: { className?: string }) {
  /* No district is pre-picked: this page asks the reader where they live, and
     answering it for them would put one kecamatan in front of every visitor. */
  const [selectedKecName, setSelectedKecName] = useState("");
  const [broadcastPhone, setBroadcastPhone] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Get data across diseases for selected district
  const dbdList = getKecamatanDataList("DBD");
  const ispaList = getKecamatanDataList("ISPA");
  const diareList = getKecamatanDataList("Diare");

  const currentDbd = dbdList.find((k) => k.nama === selectedKecName);
  const currentIspa = ispaList.find((k) => k.nama === selectedKecName);
  const currentDiare = diareList.find((k) => k.nama === selectedKecName);
  const selected =
    currentDbd && currentIspa && currentDiare
      ? [
          { data: currentDbd, type: "DBD" as const, desc: "Demam Berdarah Dengue" },
          { data: currentIspa, type: "ISPA" as const, desc: "Infeksi Saluran Pernapasan" },
          { data: currentDiare, type: "Diare" as const, desc: "Penyakit Diare & Pencernaan" },
        ]
      : null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (broadcastPhone.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Selector Box */}
      <LiquidGlassCard variant="blue" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary mb-2 shadow-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>Portal Publik Warga Semarang</span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-foreground">
              Cek Status Risiko Lingkungan Tempat Tinggal Anda
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Informasi prediksi dini risiko DBD, ISPA, dan Diare berbasis cuaca BMKG tanpa perlu login.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedKecName}
              onChange={(e) => setSelectedKecName(e.target.value)}
              className="rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih kecamatan Anda…</option>
              {SEMARANG_KECAMATAN_RAW.map((k) => (
                <option key={k.id} value={k.nama}>
                  Kecamatan {k.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Disease Cards Grid */}
      {!selected ? (
        <LiquidGlassCard variant="default" className="p-8 text-center">
          <MapPin className="mx-auto h-6 w-6 text-paper-400" aria-hidden />
          <h4 className="mt-3 font-semibold text-foreground">
            Pilih kecamatan tempat tinggal Anda
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Status DBD, ISPA, dan Diare ditampilkan setelah kecamatan dipilih.
          </p>
        </LiquidGlassCard>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selected.map((item, idx) => {
          const risk = RISK_CONFIG[item.data.tingkat_risiko];
          return (
            <LiquidGlassCard
              key={idx}
              variant={
                item.data.tingkat_risiko === "tinggi"
                  ? "risk-high"
                  : item.data.tingkat_risiko === "sedang"
                  ? "risk-medium"
                  : "risk-low"
              }
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant={`disease-${item.type.toLowerCase()}` as any}>
                    {item.type}
                  </Badge>
                  <Badge
                    variant={
                      item.data.tingkat_risiko === "tinggi"
                        ? "risk-high"
                        : item.data.tingkat_risiko === "sedang"
                        ? "risk-medium"
                        : "risk-low"
                    }
                    pulse={item.data.tingkat_risiko === "tinggi"}
                  >
                    {risk.label}
                  </Badge>
                </div>

                <div className="my-4 flex items-center justify-center">
                  <RiskGauge score={item.data.skor_risiko} level={item.data.tingkat_risiko} size="sm" />
                </div>

                <h4 className="font-semibold text-sm text-foreground">{item.desc}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {risk.description}
                </p>

                <div className="mt-3 rounded-xl bg-white/70 p-3 border border-white space-y-1.5 text-xs">
                  <span className="font-medium text-paper-800 block text-[11px] uppercase tracking-wider">
                    Langkah Edukasi Mandiri:
                  </span>
                  {item.data.rekomendasi.map((rek, rIdx) => (
                    <div key={rIdx} className="flex items-start gap-1.5 text-paper-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-risk-low shrink-0 mt-0.5" />
                      <span>{rek}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-paper-200/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Cuaca: {item.data.cuaca.curah_hujan_mm} mm</span>
                <span>Kasus Aktif: {item.data.kasus_aktif}</span>
              </div>
            </LiquidGlassCard>
          );
        })}
      </div>
      )}

      {/* Broadcast Alert Simulator */}
      <LiquidGlassCard variant="default" className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shrink-0 shadow-sm">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-display text-lg font-semibold text-foreground">
                Langganan Peringatan Dini Wilayah (WhatsApp / SMS Broadcast)
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Dapatkan notifikasi otomatis dari Dinas Kesehatan Kota Semarang saat kecamatan tempat tinggal Anda memasuki zona Waspada atau Bahaya KLB.
              </p>
            </div>
          </div>

          {subscribed ? (
            <div className="rounded-xl bg-risk-low-bg border border-risk-low-br p-3 text-xs text-risk-low font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-risk-low" />
              <span>Nomor terdaftar untuk Kecamatan {selectedKecName}!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex items-center gap-2.5 w-full md:w-auto">
              <input
                type="tel"
                placeholder="No WhatsApp (08...)"
                value={broadcastPhone}
                onChange={(e) => setBroadcastPhone(e.target.value)}
                required
                className="h-10 rounded-full border border-paper-200 bg-white px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
              />
              <Button size="sm" type="submit" className="whitespace-nowrap text-xs text-white font-semibold">
                Aktifkan
              </Button>
            </form>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
}
