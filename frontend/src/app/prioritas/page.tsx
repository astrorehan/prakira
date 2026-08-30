import type { Metadata } from "next";
import { PriorityBoard } from "@/components/priority-board";

/**
 * Prioritas terdampak — rute publik.
 *
 * Isinya agregat: kelas risiko, populasi BPS, dan kepadatan. Tidak ada satu
 * pun identitas pelapor dan tidak ada tombol yang menulis, jadi tidak ada
 * alasan menaruhnya di balik sesi. Justru sebaliknya — argumen keadilan
 * ("kecamatan padat berpenduduk banyak naik peringkat") adalah argumen yang
 * perlu bisa diperiksa dari luar dinas.
 */
export const metadata: Metadata = {
  title: "Prioritas Terdampak",
  description:
    "Peringkat risiko berdampingan dengan peringkat yang ikut menghitung jumlah jiwa dan kepadatan penduduk tiap kecamatan Semarang.",
};

export default function PrioritasPage() {
  return <PriorityBoard />;
}
