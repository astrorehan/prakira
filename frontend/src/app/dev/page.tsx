import { notFound } from "next/navigation";

import DevGallery from "./dev-gallery";

/**
 * Galeri komponen hanya tersedia melalui `next dev`. Menjaga pemeriksaan ini
 * di Server Component membuat produksi menghentikan render dan menyajikan
 * halaman 404 sebelum galeri bisa dibuka.
 */
export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevGallery />;
}
