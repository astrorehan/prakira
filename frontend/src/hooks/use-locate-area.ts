"use client";

import { useCallback, useState } from "react";

import { loadKecamatanDirectory } from "@/lib/kecamatan";
import { locateArea, type LocatedArea } from "@/lib/locate-area";
import type { LocateStatus } from "@/hooks/use-locate-kecamatan";

/**
 * Kecamatan dan kelurahan dari geolokasi peramban — hanya saat diminta.
 *
 * Kembaran `useLocateKecamatan` untuk formulir laporan: pencocokannya memakai
 * poligon kelurahan, bukan sentroid, karena laporan yang salah kecamatan
 * masuk ke antrean petugas yang salah. Koordinat tidak pernah keluar dari
 * callback ini; pemanggil hanya menerima nama wilayah.
 */
export function useLocateArea(onFound: (area: LocatedArea) => void) {
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
          .then((list) => locateArea(list, coords.latitude, coords.longitude))
          .then((area) => {
            if (!area) {
              setStatus("outside");
              return;
            }
            setStatus("idle");
            onFound(area);
          })
          .catch(() => setStatus("denied"));
      },
      () => setStatus("denied"),
      /* Akurasi tinggi di sini layak dibayar: batas kelurahan di tengah kota
         bisa hanya satu gang, sedangkan titik berbasis jaringan meleset ratusan
         meter. Tetap satu kali baca, bukan pelacakan. */
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onFound]);

  return { status, locate };
}
