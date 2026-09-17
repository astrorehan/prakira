import type { Metadata } from "next";

import { OfficialMemo } from "@/components/official-memo";

export const metadata: Metadata = {
  title: "Draf Nota Dinas",
  description:
    "Draf nota dinas satu halaman untuk satu tindakan aksi dini: dasar prakiraan, kecamatan sasaran, langkah SOP, dan tenggat pelaksanaan.",
  /* Draf surat dinas tidak punya urusan di hasil pencarian. */
  robots: { index: false, follow: false },
};

/**
 * Rute `/tindakan/nota/[id]`.
 *
 * Terdaftar sebagai rute polos (`BARE_ROUTES`): sidebar konsol yang ikut
 * tercetak di kertas A4 bukan sekadar jelek, ia memakan satu kolom penuh dari
 * surat yang harus ditandatangani.
 */
export default async function NotaDinasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OfficialMemo id={id} />;
}
