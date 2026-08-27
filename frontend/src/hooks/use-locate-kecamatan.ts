"use client";

import { useCallback, useState } from "react";

import { loadKecamatanDirectory, nearestKecamatan } from "@/lib/kecamatan";

export type LocateStatus =
  | "idle"
  | "locating"
  /** Izin ditolak, atau perangkat gagal mendapat titik. */
  | "denied"
  /** Titiknya ada, tapi bukan di Kota Semarang. */
  | "outside"
  | "unsupported";

/**
 * Menentukan kecamatan pembaca dari geolokasi peramban — hanya saat diminta.
 *
 * Tidak ada permintaan sebelum tombolnya ditekan, dan setiap jalur gagal
 * terlihat tanpa berisik: pemanggil tetap menampilkan apa yang sudah ada dan
 * kita memberi alasan pendek alih-alih menebak kecamatan.
 *
 * Sentroid pembanding datang dari gateway, jadi hasilnya mengikuti poligon
 * yang sama dengan yang digambar peta.
 */
export function useLocateKecamatan(onFound: (nama: string) => void) {
  const [status, setStatus] = useState<LocateStatus>("idle");

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadKecamatanDirectory()
          .then((list) => {
            const nama = nearestKecamatan(list, coords.latitude, coords.longitude);
            if (!nama) {
              setStatus("outside");
              return;
            }
            setStatus("idle");
            onFound(nama);
          })
          .catch(() => setStatus("denied"));
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, [onFound]);

  return { status, locate };
}
