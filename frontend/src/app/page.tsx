"use client";

import { useCallback, useEffect, useState } from "react";
import { Hero } from "@/components/landing/hero";
import { RiskResultSection } from "@/components/landing/risk-result-section";
import { ProblemBand } from "@/components/landing/problem-band";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DistrictBoard } from "@/components/landing/district-board";
import { EducationSection } from "@/components/landing/features";
import { TrustSection } from "@/components/landing/dashboard-preview";
import { CtaBanner } from "@/components/landing/cta-banner";
import { KECAMATAN_PARAM, rememberKecamatan } from "@/lib/kecamatan-selection";
import { loadKecamatanDirectory, resolveKecamatanName } from "@/lib/kecamatan";

/**
 * The page answers one question, then earns the answer.
 *
 *   1. Hero          — ask which district, show the city while they decide
 *   2. Result        — the city, until they choose; then their district
 *   3. Masalahnya    — why any of this matters, in the year's numbers
 *   4. Cara kerja    — why that answer is more than a guess
 *   5. Peta risiko   — where their district sits among the other fifteen
 *   6. Pencegahan    — what to actually do about it
 *   7. Akurasi       — how well the model has held up, and its limits
 *   8. Lapor         — the two things a reader can give back
 */
export default function LandingPage() {
  // No district is chosen for the reader. The hero asks which kecamatan they
  // live in, so pre-answering it with one district would both contradict the
  // question and hand that district the whole page for free. Until they pick,
  // the result section reports the city as a whole.
  const [selectedKecamatan, setSelectedKecamatan] = useState<string | null>(null);

  /* `?kecamatan=` is the one exception, and it is not a guess: the reader
     already named their district somewhere else in this product — most often
     on /warga — and followed a link that carries the answer back here.
     Remembered choices are deliberately NOT restored on a plain visit: the
     hero's question stands on its own, and swapping the city summary for one
     district a frame after paint reads as a glitch. */
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get(KECAMATAN_PARAM);
    if (!raw) return;
    /* Nama divalidasi terhadap direktori gateway, bukan terhadap salinan
       tertulis di frontend: `?kecamatan=Jakarta` tidak boleh menembus. */
    let alive = true;
    loadKecamatanDirectory()
      .then((list) => {
        const resolved = resolveKecamatanName(list, raw);
        if (alive && resolved) setSelectedKecamatan(resolved);
      })
      .catch(() => {
        /* Tanpa direktori, tidak ada nama yang bisa dipercaya. */
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Every pick is remembered so the report form on /warga/lapor arrives with
     the district already filled. The reader answers "where do you live" once. */
  const choose = useCallback((name: string) => {
    setSelectedKecamatan(name);
    rememberKecamatan(name);
  }, []);

  return (
    <>
      <Hero selectedKecamatan={selectedKecamatan} onSelectKecamatan={choose} />
      <RiskResultSection
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={choose}
      />
      <ProblemBand />
      <HowItWorks />
      <DistrictBoard
        selectedKecamatan={selectedKecamatan}
        onSelectKecamatan={choose}
      />
      <EducationSection />
      <TrustSection />
      <CtaBanner selectedKecamatan={selectedKecamatan} />
    </>
  );
}
