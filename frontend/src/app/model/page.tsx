import type { Metadata } from "next";

import { ModelTransparency } from "@/components/model-transparency";

export const metadata: Metadata = {
  /* Sufiks " — Prakira" datang dari template judul di layout akar. */
  title: "Transparansi Model",
  description:
    "Metrik uji tiap model prakiraan risiko penyakit iklim Kota Semarang apa adanya: algoritma, fitur, periode latih, hasil backtest, cakupan data per kecamatan, dan batasan yang berlaku.",
};

/**
 * Rute `/model` (PRD §5.7). Sengaja publik: halaman yang menjelaskan seberapa
 * jauh angka prakiraan boleh dipercaya tidak boleh berada di balik kotak masuk
 * petugas. Isinya hanya baca; tidak ada identitas pelapor dan tidak ada tombol
 * yang menulis.
 */
export default function ModelPage() {
  return <ModelTransparency />;
}
