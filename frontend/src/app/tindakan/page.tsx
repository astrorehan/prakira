"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { AppleGlassDate } from "@/components/ui/apple-glass-date";
import { EarlyActionCenter } from "@/components/early-action-center";
import { ACTION_RECOMMENDATIONS } from "@/lib/mock-data";

/**
 * Aksi Dini — the operational half of the product.
 *
 * The dashboard answers "where is the risk"; this page answers "what do we
 * send, to whom, and did it go out". Keeping the dispatch queue here is what
 * lets the dashboard stay a monitoring surface instead of two products in one
 * scroll.
 */
export default function TindakanPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 bg-mesh-blue">
      <div className="container max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-4 border-b border-paper-200/80">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-3 w-3 text-brand-700" />
              <span>Rekomendasi berbasis skor risiko</span>
            </span>
            <h1 className="h-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground mt-1.5">
              Aksi Dini
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Instruksi intervensi untuk puskesmas dan satgas, dikirim sebelum lonjakan kasus terjadi.
            </p>
          </div>

          <div className="shrink-0">
            <AppleGlassDate week="Minggu 34" monthYear="Agustus 2026" />
          </div>
        </div>

        <EarlyActionCenter
          initialRecommendations={ACTION_RECOMMENDATIONS}
          onExecuteRecommendation={(id, checklist) => {
            console.log(`Action #${id} dispatched with checklist:`, checklist);
          }}
        />
      </div>
    </div>
  );
}
