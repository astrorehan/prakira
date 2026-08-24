"use client";

import { useState } from "react";
import { Hero } from "@/components/landing/hero";
import { RiskResultSection } from "@/components/landing/risk-result-section";
import { EducationSection } from "@/components/landing/features";
import { TrustSection } from "@/components/landing/dashboard-preview";
import { CtaBanner } from "@/components/landing/cta-banner";

export default function LandingPage() {
  // Default to Pedurungan so the page isn't empty on first load —
  // it's a high-risk area which makes the demo more impactful.
  const [selectedKecamatan, setSelectedKecamatan] = useState("Pedurungan");

  return (
    <>
      <Hero
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={setSelectedKecamatan}
      />
      <RiskResultSection selectedKecamatan={selectedKecamatan} />
      <EducationSection />
      <TrustSection />
      <CtaBanner />
    </>
  );
}