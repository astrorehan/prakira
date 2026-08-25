import { SEMARANG_KECAMATAN_RAW } from "@/lib/mock-data";

/* Semarang spans roughly 0.15° of latitude. Anything further than this from
   every centroid is not in the city, and guessing a district for it would be
   worse than showing nothing. ~0.22° ≈ 25 km. */
const MAX_DEGREES = 0.22;

/**
 * Nearest kecamatan centroid to a coordinate, or `null` when the point sits
 * outside Kota Semarang.
 *
 * Squared degrees with a cosine correction on longitude — enough to *rank*
 * sixteen centroids inside one city, and it avoids a haversine we would only
 * use to compare distances against each other.
 */
export function nearestKecamatan(lat: number, lon: number): string | null {
  const scale = Math.cos((lat * Math.PI) / 180);
  let best: string | null = null;
  let bestDistanceSq = Infinity;

  for (const kec of SEMARANG_KECAMATAN_RAW) {
    const [kecLat, kecLon] = kec.coords;
    const dy = kecLat - lat;
    const dx = (kecLon - lon) * scale;
    const distanceSq = dy * dy + dx * dx;

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = kec.nama;
    }
  }

  return bestDistanceSq > MAX_DEGREES * MAX_DEGREES ? null : best;
}
