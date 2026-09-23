/**
 * Keterangan foto dari blok EXIF JPEG: merek/tipe ponsel dan jam pemotretan.
 *
 * Hanya dua hal itu yang dibaca, dan sengaja tidak lebih. Jam pemotretan
 * membantu petugas menilai apakah foto memang diambil saat kejadian, bukan
 * foto lama yang diunggah ulang; tipe ponsel membantu mengenali kiriman
 * berulang dari satu perangkat. Koordinat GPS di EXIF tidak dibaca sama
 * sekali — titik lokasi laporan datang dari perangkat, atas permintaan
 * pelapor, bukan dari foto.
 *
 * Fotonya sendiri tetap digambar ulang di kanvas (`lib/photo.ts`), sehingga
 * berkas yang tersimpan tidak membawa EXIF apa pun.
 */

export type PhotoMeta = {
  /** Mis. "Samsung SM-A515F". */
  device: string | null;
  /** `YYYY-MM-DDTHH:MM:SS`, dengan zona bila kamera mencatatnya. */
  takenAt: string | null;
};

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;

/* EXIF selalu berada di segmen APP1 dekat awal berkas. */
const HEAD_BYTES = 256 * 1024;

type Ifd = Map<number, { type: number; count: number; valueOffset: number }>;

function readIfd(view: DataView, tiff: number, offset: number, little: boolean): Ifd {
  const entries: Ifd = new Map();
  const start = tiff + offset;
  if (start + 2 > view.byteLength) return entries;
  const count = view.getUint16(start, little);
  for (let i = 0; i < count; i++) {
    const at = start + 2 + i * 12;
    if (at + 12 > view.byteLength) break;
    entries.set(view.getUint16(at, little), {
      type: view.getUint16(at + 2, little),
      count: view.getUint32(at + 4, little),
      /* Nilai ≤ 4 bita disimpan langsung di sini; selebihnya berupa offset. */
      valueOffset: at + 8,
    });
  }
  return entries;
}

function readAscii(view: DataView, tiff: number, ifd: Ifd, tag: number, little: boolean): string | null {
  const entry = ifd.get(tag);
  if (!entry || entry.type !== 2 || entry.count === 0) return null;
  const start =
    entry.count <= 4 ? entry.valueOffset : tiff + view.getUint32(entry.valueOffset, little);
  const end = Math.min(start + entry.count, view.byteLength);
  let text = "";
  for (let i = start; i < end; i++) {
    const code = view.getUint8(i);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text.trim() || null;
}

function readLong(view: DataView, ifd: Ifd, tag: number, little: boolean): number | null {
  const entry = ifd.get(tag);
  if (!entry || entry.type !== 4) return null;
  return view.getUint32(entry.valueOffset, little);
}

/** "2026:09:21 14:03:22" → "2026-09-21T14:03:22". */
function toIso(raw: string | null, offset: string | null): string | null {
  const match = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match || match[1] === "0000") return null;
  const [, y, mo, d, h, mi, s] = match;
  const zone = offset && /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : "";
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${zone}`;
}

function describeDevice(make: string | null, model: string | null): string | null {
  if (!make && !model) return null;
  if (!make) return model;
  if (!model) return make;
  /* Banyak kamera menulis merek di awal model: "Apple" + "iPhone 13". */
  const brand = make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
  return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${brand} ${model}`;
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  const empty: PhotoMeta = { device: null, takenAt: null };
  if (file.type !== "image/jpeg") return empty;
  try {
    const view = new DataView(await file.slice(0, HEAD_BYTES).arrayBuffer());
    if (view.getUint16(0) !== 0xffd8) return empty;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      const length = view.getUint16(offset + 2);
      /* APP1 dengan tanda "Exif\0\0". */
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        const tiff = offset + 10;
        const little = view.getUint16(tiff) === 0x4949;
        const ifd0 = readIfd(view, tiff, view.getUint32(tiff + 4, little), little);
        const exifOffset = readLong(view, ifd0, TAG_EXIF_IFD, little);
        const exif = exifOffset !== null ? readIfd(view, tiff, exifOffset, little) : new Map();

        const original = readAscii(view, tiff, exif, TAG_DATETIME_ORIGINAL, little);
        const zone = readAscii(view, tiff, exif, TAG_OFFSET_TIME_ORIGINAL, little);
        return {
          device: describeDevice(
            readAscii(view, tiff, ifd0, TAG_MAKE, little),
            readAscii(view, tiff, ifd0, TAG_MODEL, little),
          )?.slice(0, 80) ?? null,
          takenAt: toIso(original ?? readAscii(view, tiff, ifd0, TAG_DATETIME, little), zone),
        };
      }
      /* Data gambar dimulai; tidak ada EXIF setelah ini. */
      if (marker === 0xffda || (marker & 0xff00) !== 0xff00) break;
      offset += 2 + length;
    }
  } catch {
    /* EXIF rusak tidak boleh menggagalkan unggahan foto. */
  }
  return empty;
}
