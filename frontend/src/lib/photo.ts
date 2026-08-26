/**
 * Menyiapkan foto laporan warga.
 *
 * PRD §5.4: "Foto di-strip EXIF sebelum disimpan (lokasi presisi tidak ikut
 * tersimpan)." Foto ponsel membawa koordinat GPS di blok EXIF-nya, dan laporan
 * warga sudah menyebut kecamatan — menyimpan titik presisi rumah pelapor di
 * atas itu adalah data yang tidak diminta dan tidak dibutuhkan siapa pun.
 *
 * Cara membuangnya: gambar ulang ke `<canvas>` lalu encode ulang. Kanvas hanya
 * memegang piksel; seluruh metadata — EXIF, GPS, orientasi, cap waktu kamera —
 * tidak punya jalan untuk ikut. Ini bukan penyaringan bidang per bidang yang
 * bisa kelewatan satu tag, melainkan penyalinan yang secara bentuk tidak bisa
 * membawa metadata.
 *
 * Pengecilan ke sisi terpanjang 720 piksel dilakukan di langkah yang sama.
 * Tanpa backend, foto menumpang `localStorage` (kuota sekitar 5 MB) sebagai
 * base64, dan foto ponsel mentah 4 MB akan mengisi kuota itu sendirian.
 */

const MAX_EDGE = 720;
const JPEG_QUALITY = 0.72;

/** 8 MB. Di atas ini berkasnya ditolak sebelum dibaca, bukan setelah. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PhotoResult =
  | { ok: true; dataUrl: string; bytes: number }
  | { ok: false; reason: "type" | "size" | "decode" };

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = dataUrl;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("decode"));
    reader.readAsDataURL(file);
  });
}

export async function preparePhoto(file: File): Promise<PhotoResult> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return { ok: false, reason: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "size" };

  try {
    const raw = await readAsDataUrl(file);
    const img = await loadImage(raw);

    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "decode" };

    /* Latar putih: PNG transparan yang di-encode jadi JPEG tanpa ini keluar
       dengan latar hitam. */
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    /* Panjang base64 dikurangi kepala `data:` lalu dikali 3/4 — cukup untuk
       memberi tahu pengguna ukuran yang benar-benar tersimpan. */
    const bytes = Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

    return { ok: true, dataUrl, bytes };
  } catch {
    return { ok: false, reason: "decode" };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
