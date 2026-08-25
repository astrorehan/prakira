"use client";

import { useState } from "react";
import { Hero } from "@/components/landing/hero";
import { RiskResultSection } from "@/components/landing/risk-result-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DistrictBoard } from "@/components/landing/district-board";
import { EducationSection } from "@/components/landing/features";
import { TrustSection } from "@/components/landing/dashboard-preview";
import { CtaBanner } from "@/components/landing/cta-banner";

/**
 * The page answers one question, then earns the answer.
 *
 *   1. Hero          — ask which district, show the city while they decide
 *   2. Result        — the city, until they choose; then their district
 *   3. Cara kerja    — why that answer is more than a guess
 *   4. Peta risiko   — where their district sits among the other fifteen
 *   5. Pencegahan    — what to actually do about it
 *   6. Akurasi       — how well the model has held up, and its limits
 *   7. Lapor         — the two things a reader can give back
 */
export default function LandingPage() {
  // No district is chosen for the reader. The hero asks which kecamatan they
  // live in, so pre-answering it with one district would both contradict the
  // question and hand that district the whole page for free. Until they pick,
  // the result section reports the city as a whole.
  const [selectedKecamatan, setSelectedKecamatan] = useState<string | null>(null);

  return (
    <>
      <Hero
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={setSelectedKecamatan}
      />
      <RiskResultSection
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={setSelectedKecamatan}
      />
      <HowItWorks />
      <DistrictBoard
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={setSelectedKecamatan}
      />
      <EducationSection />
      <TrustSection />
      <CtaBanner />
    </>
  );
}
