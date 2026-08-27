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
  menunggu: {
    label: "Menunggu verifikasi",
    badge: "risk-medium",
    blurb: "Petugas puskesmas wilayah Anda akan memeriksa laporan ini.",
  },
  terverifikasi: {
    label: "Terverifikasi",
    badge: "risk-low",
    blurb:
      "Petugas membenarkan laporan ini. Laporan ikut memperkaya prakiraan bulan berikutnya dengan bobot lebih rendah daripada data resmi.",
  },
  ditolak: {
    label: "Ditolak",
    badge: "risk-none",
    blurb: "Petugas tidak dapat membenarkan laporan ini. Alasannya tercantum di bawah.",
  },
};

export const FAMILY_ROUTING: Record<ReportFamily, string> = {
  kesehatan: "Puskesmas wilayah",
  lingkungan: "Dinas Lingkungan Hidup",
};

/** Menerima ketikan longgar: spasi, huruf kecil, prefiks yang lupa ditulis. */
export function normalizeTrackingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = cleaned.startsWith("PKR") ? cleaned.slice(3) : cleaned;
  return body ? `PKR-${body}` : "";
}

const STATUS_RANK: Record<ReportStatus, number> = {
  menunggu: 0,
  terverifikasi: 1,
  ditolak: 2,
};

/** Yang belum diputuskan lebih dulu, lalu yang paling lama menunggu. */
export function sortForQueue(list: CitizenReport[]): CitizenReport[] {
  return [...list].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    return a.submittedAt.localeCompare(b.submittedAt);
  });
}

export function familyOf(kind: ReportKind): ReportFamily {
  return REPORT_KIND[kind].family;
}
