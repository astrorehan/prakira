import type { Metadata } from "next";

import { ReturnToWork } from "@/components/return-to-work";
import { TimeMachine } from "@/components/time-machine";

export const metadata: Metadata = {
  /* Sufiks " — Prakira" datang dari template judul di layout akar. */
  title: "Mesin Waktu",
  description:
    "Putar ulang periode uji model prakiraan risiko penyakit iklim Kota Semarang: peta prakiraan berdampingan dengan rekap kasus resmi per kecamatan, lengkap dengan peringatan yang terlewat dan alarm yang tidak terbukti.",
};

/**
 * Rute `/mesin-waktu`. Publik, seperti `/model`: bukti bahwa sebuah prakiraan
 * pernah benar — dan pernah salah — tidak boleh berada di balik kotak masuk
 * petugas. Halaman ini hanya membaca; tidak ada tombol yang menulis.
 */
export default function MesinWaktuPage() {
  return (
    <>
      {/* F14: petugas yang sampai ke sini dari konsol punya jalan pulang yang
          membawa kembali penyakit dan wilayah yang tadi dikerjakan. */}
      <ReturnToWork surface="Mesin Waktu" />
      <TimeMachine />
    </>
  );
}
