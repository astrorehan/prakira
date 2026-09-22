import type { Metadata } from "next";
import { ReturnToWork } from "@/components/return-to-work";
import { WeatherSimulator } from "@/components/weather-simulator";

/**
 * Simulator cuaca — rute publik.
 *
 * Sama alasannya dengan `/model` dan `/mesin-waktu`: halaman yang menunjukkan
 * bagaimana model bereaksi terhadap masukannya adalah halaman kepercayaan, dan
 * menaruhnya di balik kotak masuk petugas berarti menyembunyikannya dari orang
 * yang paling perlu memeriksanya. Tidak ada tombol yang menulis di sini.
 */
export const metadata: Metadata = {
  title: "Simulator Cuaca",
  description:
    "Geser curah hujan, suhu, dan kelembaban lalu lihat prakiraan risiko 16 kecamatan Semarang dihitung ulang oleh model.",
};

export default function SimulasiPage() {
  return (
    <>
      {/* F14: petugas yang sampai ke sini dari konsol punya jalan pulang yang
          membawa kembali penyakit dan wilayah yang tadi dikerjakan. */}
      <ReturnToWork surface="Simulator cuaca" />
      <WeatherSimulator />
    </>
  );
}
