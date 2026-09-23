/**
 * Laporan warga — presentasi saja.
 *
 * Seluruh penyimpanan pindah ke gateway (`/api/reports`). Yang tersisa di sini
 * adalah hal-hal yang memang milik antarmuka: label jenis laporan, urutan
 * antrean, dan normalisasi kode lacak yang diketik ulang orang dari layar
 * ponsel. Enam laporan benih yang dulu ditanam ke `localStorage` ikut hilang —
 * antrean kosong pada pemasangan baru adalah keadaan yang jujur, dan laporan
 * yang muncul di sana sekarang benar-benar dikirim seseorang.
 */

import type { CitizenReport, ReportFamily, ReportKind, ReportStatus } from "@/types";

export type { CitizenReport, ReportFamily, ReportKind, ReportStatus };

export const REPORT_KIND: Record<
  ReportKind,
  { label: string; hint: string; family: ReportFamily }
> = {
  gejala: {
    label: "Gejala pada orang",
    hint: "Demam, batuk berkepanjangan, atau diare pada anggota keluarga/tetangga.",
    family: "kesehatan",
  },
  jentik: {
    label: "Temuan jentik nyamuk",
    hint: "Jentik di bak, ember, tandon, atau barang bekas penampung air.",
    family: "kesehatan",
  },
  genangan: {
    label: "Genangan air bertahan",
    hint: "Air yang tidak surut lebih dari tiga hari di jalan, lahan, atau halaman.",
    family: "lingkungan",
  },
  sampah: {
    label: "Timbunan sampah",
    hint: "Tumpukan yang menampung air hujan atau tidak terangkut berhari-hari.",
    family: "lingkungan",
  },
  saluran: {
    label: "Saluran tersumbat",
    hint: "Got atau drainase mampat sehingga air meluap saat hujan.",
    family: "lingkungan",
  },
};

export const REPORT_STATUS: Record<
  ReportStatus,
  { label: string; badge: "risk-medium" | "risk-low" | "risk-none"; blurb: string }
> = {
  /* F10: sebelum keputusan diambil, yang benar-benar dijanjikan hanyalah
     pemeriksaan. Menyebut "akan diteruskan" di tahap ini menjanjikan pekerjaan
     instansi lain yang belum tentu diminta. */
  menunggu: {
    label: "Diperiksa petugas",
    badge: "risk-medium",
    blurb:
      "Petugas memeriksa laporan dan menentukan tindak lanjut yang sesuai.",
  },
  perlu_informasi: {
    label: "Perlu informasi tambahan",
    badge: "risk-medium",
    blurb:
      "Petugas butuh keterangan lain sebelum dapat memutuskan. Pertanyaannya tercantum di bawah — jawab dengan kode lacak yang sama.",
  },
  terverifikasi: {
    label: "Terverifikasi",
    badge: "risk-low",
    blurb:
      "Petugas membenarkan laporan ini. Arahan tindak lanjut tercantum di bawah; bila diteruskan, penanganan menjadi kewenangan instansi penerima.",
  },
  ditolak: {
    label: "Ditolak",
    badge: "risk-none",
    blurb: "Petugas tidak dapat membenarkan laporan ini. Alasannya tercantum di bawah.",
  },
};

export const FAMILY_ROUTING: Record<ReportFamily, string> = {
  kesehatan: "Puskesmas wilayah",
  lingkungan: "Instansi lingkungan (DLH/DPU)",
};

/** Menerima ketikan longgar: spasi, huruf kecil, prefiks yang lupa ditulis. */
export function normalizeTrackingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = cleaned.startsWith("PKR") ? cleaned.slice(3) : cleaned;
  return body ? `PKR-${body}` : "";
}

const STATUS_RANK: Record<ReportStatus, number> = {
  menunggu: 0,
  /* Menunggu jawaban pelapor: belum dapat diputuskan, tetapi bolanya bukan di
     petugas — jadi ia tidak boleh menyamar sebagai pekerjaan paling mendesak. */
  perlu_informasi: 1,
  terverifikasi: 2,
  ditolak: 3,
};

/**
 * Prioritas pemeriksaan untuk laporan yang belum diputuskan.
 *
 * Antrean yang hanya diurutkan menurut waktu masuk membuat laporan lengkap
 * dari wilayah berisiko tinggi tertimbun di bawah laporan asal-asalan. Tiga
 * tingkat, sengaja sederhana supaya petugas bisa menebak alasannya sendiri:
 *
 *   - didahulukan: wilayahnya berisiko tinggi dan lokasinya bisa ditemukan,
 *     atau lokasinya bisa ditemukan dan disertai foto;
 *   - kurang lengkap: tanpa patokan lokasi apa pun dan tanpa foto — petugas
 *     tidak dapat memeriksanya di lapangan;
 *   - biasa: sisanya.
 *
 * Tidak ada laporan yang disembunyikan atau ditolak otomatis; yang berubah
 * hanya urutannya. Laporan kurang lengkap yang sudah menunggu lebih dari
 * `STALE_HOURS` naik ke tingkat biasa supaya tidak terlupakan selamanya.
 */
export type ReportPriority = "didahulukan" | "biasa" | "kurang_lengkap";

const STALE_HOURS = 72;

const PRIORITY_RANK: Record<ReportPriority, number> = {
  didahulukan: 0,
  biasa: 1,
  kurang_lengkap: 2,
};

export function reportPriority(report: CitizenReport, now = Date.now()): ReportPriority {
  const { locatable, hasPhoto } = report.completeness;
  const highRisk = report.risk?.riskClass === "tinggi";
  if (locatable && (highRisk || hasPhoto)) return "didahulukan";
  if (!locatable && !hasPhoto) {
    const waitedHours = (now - Date.parse(report.submittedAt)) / 3_600_000;
    return waitedHours > STALE_HOURS ? "biasa" : "kurang_lengkap";
  }
  return "biasa";
}

/**
 * Yang belum diputuskan lebih dulu; di antara yang menunggu pemeriksaan,
 * menurut prioritas; lalu yang paling lama menunggu.
 */
export function sortForQueue(list: CitizenReport[]): CitizenReport[] {
  const now = Date.now();
  return [...list].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    if (a.status === "menunggu") {
      const byPriority =
        PRIORITY_RANK[reportPriority(a, now)] - PRIORITY_RANK[reportPriority(b, now)];
      if (byPriority !== 0) return byPriority;
    }
    return a.submittedAt.localeCompare(b.submittedAt);
  });
}

export function familyOf(kind: ReportKind): ReportFamily {
  return REPORT_KIND[kind].family;
}
