"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Siren,
  CheckCircle2,
  FileWarning,
  Bug,
  Wind,
  Droplets,
  ArrowRight,
} from "lucide-react";
import { cn, RISK_CONFIG } from "@/lib/utils";
import { getKecamatanDataList } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import type { DiseaseType, RiskLevel } from "@/types";

interface RiskResultSectionProps {
  selectedKecamatan: string;
}

/* ── Friendly risk label map ─────────────────────────────────────────────── */
const WARGA_RISK: Record<
  RiskLevel,
  {
    emoji: string;
    label: string;
    sublabel: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    icon: React.ElementType;
  }
> = {
  rendah: {
    emoji: "🟢",
    label: "AMAN",
    sublabel: "Risiko rendah saat ini",
    bgClass: "bg-risk-low-bg",
    borderClass: "border-risk-low-br",
    textClass: "text-risk-low",
    icon: ShieldCheck,
  },
  sedang: {
    emoji: "🟡",
    label: "WASPADA",
    sublabel: "Ada potensi peningkatan",
    bgClass: "bg-risk-medium-bg",
    borderClass: "border-risk-medium-br",
    textClass: "text-risk-medium",
    icon: AlertTriangle,
  },
  tinggi: {
    emoji: "🔴",
    label: "SIAGA",
    sublabel: "Potensi lonjakan dalam 2–4 minggu",
    bgClass: "bg-risk-high-bg",
    borderClass: "border-risk-high-br",
    textClass: "text-risk-high",
    icon: Siren,
  },
};

const DISEASE_ICON: Record<DiseaseType, React.ElementType> = {
  DBD: Bug,
  ISPA: Wind,
  Diare: Droplets,
};

const DISEASE_LABEL: Record<DiseaseType, string> = {
  DBD: "Demam Berdarah",
  ISPA: "Infeksi Pernapasan",
  Diare: "Diare & Pencernaan",
};

export function RiskResultSection({
  selectedKecamatan,
}: RiskResultSectionProps) {
  if (!selectedKecamatan) return null;

  const dbdData = getKecamatanDataList("DBD").find(
    (k) => k.nama === selectedKecamatan,
  );
  const ispaData = getKecamatanDataList("ISPA").find(
    (k) => k.nama === selectedKecamatan,
  );
  const diareData = getKecamatanDataList("Diare").find(
    (k) => k.nama === selectedKecamatan,
  );

  if (!dbdData || !ispaData || !diareData) return null;

  const diseases: { type: DiseaseType; data: typeof dbdData }[] = [
    { type: "DBD", data: dbdData },
    { type: "ISPA", data: ispaData },
    { type: "Diare", data: diareData },
  ];

  // Find the highest risk among the 3 diseases
  const highestRisk = diseases.reduce((prev, curr) => {
    const order: Record<RiskLevel, number> = {
      rendah: 0,
      sedang: 1,
      tinggi: 2,
    };
    return order[curr.data.tingkat_risiko] > order[prev.data.tingkat_risiko]
      ? curr
      : prev;
  });
  const overallRisk = WARGA_RISK[highestRisk.data.tingkat_risiko];

  return (
    <section
      id="risk-check"
      className="scroll-mt-20 py-12 md:py-16 bg-background"
    >
      <div className="container max-w-5xl">
        {/* Overall status banner */}
        <div
          className={cn(
            "rounded-2xl border-2 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in-up",
            overallRisk.bgClass,
            overallRisk.borderClass,
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 text-2xl",
              overallRisk.textClass,
              "bg-white/70",
            )}
          >
            {overallRisk.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className={cn(
                "text-xl md:text-2xl font-semibold tracking-tight",
                overallRisk.textClass,
              )}
            >
              Kecamatan {selectedKecamatan}: Status{" "}
              <span className="uppercase">{overallRisk.label}</span>
            </h2>
            <p className="text-sm text-paper-600 mt-1">
              {overallRisk.sublabel}. Berikut rincian per jenis penyakit:
            </p>
          </div>
        </div>

        {/* Disease cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {diseases.map(({ type, data }, idx) => {
            const risk = WARGA_RISK[data.tingkat_risiko];
            const DiseaseIcon = DISEASE_ICON[type];
            const RiskIcon = risk.icon;

            return (
              <div
                key={type}
                className={cn(
                  "rounded-2xl border bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift animate-fade-in-up",
                  risk.borderClass,
                )}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Header: disease name + risk badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DiseaseIcon className="h-5 w-5 text-paper-600" />
                    <span className="text-sm font-semibold text-foreground">
                      {type}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      risk.bgClass,
                      risk.textClass,
                    )}
                  >
                    <RiskIcon className="h-3.5 w-3.5" />
                    {risk.label}
                  </div>
                </div>

                {/* Score circle */}
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full border-4 shrink-0",
                      risk.borderClass,
                      risk.bgClass,
                    )}
                  >
                    <span
                      className={cn(
                        "text-xl font-semibold tracking-tight",
                        risk.textClass,
                      )}
                    >
                      {Math.round(data.skor_risiko)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {DISEASE_LABEL[type]}
                    </div>
                    <div className="text-xs text-paper-500 mt-0.5">
                      {data.kasus_aktif} kasus aktif · Prediksi {data.kasus_prediksi}
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-4 rounded-xl bg-paper-50 p-3 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-paper-500 font-medium block">
                    Yang bisa Anda lakukan:
                  </span>
                  {data.rekomendasi.slice(0, 2).map((rek, rIdx) => (
                    <div
                      key={rIdx}
                      className="flex items-start gap-1.5 text-xs text-paper-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-risk-low shrink-0 mt-0.5" />
                      <span>{rek}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA: Report symptoms */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up stagger-4">
          <Button asChild size="lg" className="group w-full sm:w-auto">
            <Link href="/warga">
              <FileWarning className="h-4 w-4 mr-2" />
              Laporkan Gejala di Lingkungan Anda
              <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href="/warga">Lihat Detail Lengkap</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
