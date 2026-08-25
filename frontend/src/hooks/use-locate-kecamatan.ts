"use client";

import { useCallback, useState } from "react";

import { nearestKecamatan } from "@/lib/nearest-kecamatan";

export type LocateStatus =
  | "idle"
  | "locating"
  /** Permission refused, or the device could not produce a fix. */
  | "denied"
  /** A fix arrived, but it is not inside Kota Semarang. */
  | "outside"
  | "unsupported";

/**
 * Resolves the reader's kecamatan from the browser's geolocation — on demand
 * only. Nothing is requested until the reader presses the button, and every
 * failure path is silent-but-visible: the caller keeps whatever it was showing
 * and we surface a short reason instead of guessing a district.
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
        const nama = nearestKecamatan(coords.latitude, coords.longitude);
        if (!nama) {
          setStatus("outside");
          return;
        }
        setStatus("idle");
        onFound(nama);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, [onFound]);

  return { status, locate };
}
