import type { Metadata } from "next";

import { CityStatus } from "@/components/sistem/city-status";
import { ActiveAlerts } from "@/components/sistem/active-alerts";
import { DistrictRegister } from "@/components/sistem/district-register";
import { Services } from "@/components/sistem/services";
import { Announcements } from "@/components/sistem/announcements";
import { PublicInfo } from "@/components/sistem/public-info";

export const metadata: Metadata = {
  title: "Prakira — Sistem Informasi Publik Risiko Penyakit Iklim Kota Semarang",
  description:
    "Portal layanan publik: status risiko penyakit iklim per kecamatan Kota Semarang, peringatan yang sedang berlaku, data terbuka, dan layanan warga.",
};

/**
 * The same product, addressed as a public service instead of a campaign.
 *
 *   1. Status kota       — the weekly bulletin, plus the one service that matters
 *   2. Peringatan resmi  — notices in force, with what a resident should do
 *   3. Register          — all 16 districts as an auditable, downloadable table
 *   4. Layanan           — what a citizen can actually do here, by service code
 *   5. Pengumuman        — announcements and the system's own activity log
 *   6. Informasi publik  — method, accuracy, limits, and the PPID route
 *
 * The campaign landing page at `/` is untouched; this route is a parallel
 * treatment of the same data and the same design tokens.
 */
export default function SistemPage() {
  return (
    <>
      <CityStatus />
      <ActiveAlerts />
      <DistrictRegister />
      <Services />
      <Announcements />
      <PublicInfo />
    </>
  );
}
