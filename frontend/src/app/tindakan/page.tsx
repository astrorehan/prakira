"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { ConsolePageHeader } from "@/components/console/page-header";
import { EarlyActionCenter } from "@/components/early-action-center";
import { Button } from "@/components/ui/button";
import { ACTION_RECOMMENDATIONS } from "@/lib/mock-data";

/**
 * Aksi Dini — the operational half of the product.
 *
 * The dashboard answers "where is the risk"; this page answers "what do we
 * send, to whom, and did it go out". Keeping the dispatch queue here is what
 * lets the dashboard stay a monitoring surface instead of two products in one
 * scroll.
 *
 * The link back to the map is deliberate: the dashboard already points here
 * when actions are pending, but there was no way back to the evidence the
 * queue is derived from.
 */
export default function TindakanPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-6">
        <ConsolePageHeader
          title="Aksi Dini"
          description="Instruksi intervensi untuk puskesmas dan satgas, dikirim sebelum lonjakan kasus terjadi. Antrean terurut: yang lewat tenggat lebih dulu."
          actions={
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Peta risiko</span>
              </Link>
            </Button>
          }
        />

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
