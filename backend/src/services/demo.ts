/**
 * Injeksi laporan simulasi — bahan peragaan loop warga → verifikasi → eskalasi.
 *
 * Loop itu nyata dan sudah berjalan, tapi memperagakannya butuh lonjakan yang
 * tidak bisa ditunggu di depan penonton. Berkas ini menyediakan lonjakan itu
 * dengan tiga pagar yang tidak boleh dilepas:
 *
 * 1. **Setiap baris ditandai.** Deskripsinya diawali `[SIMULASI]` dan
 *    `device_hash`-nya konstanta `SIMULATION_DEVICE`. Penandanya ada di
 *    kolom data, bukan hanya di ingatan orang yang menyuntikkannya.
 * 2. **Bisa dicabut utuh.** `clearSimulation()` menghapus persis baris
 *    bertanda itu dan tidak menyentuh laporan warga sungguhan.
 * 3. **Tercatat di audit.** Penyuntikan dan pencabutan masuk `audit_log`
 *    dengan nama penggunanya, sama seperti tindakan konsol lain.
 *
 * Yang **tidak** dilakukan berkas ini: menandai laporannya sebagai
 * terverifikasi. Laporan simulasi masuk dengan status `menunggu` seperti
 * laporan mana pun, dan tetap harus lewat tangan verifikator untuk menjadi
 * sinyal. Menyuntikkan laporan yang sudah terverifikasi berarti memperagakan
 * loop dengan memotong bagian yang justru jadi intinya.
 */
import { all, one, run } from "../db/index.js";
import { logAudit } from "./audit.js";
import { generateTrackingCode, type ReportKind } from "./reports.js";

/** Penanda di deskripsi. Ikut tampil di antrean, di ekspor, dan di audit. */
export const SIMULATION_PREFIX = "[SIMULASI]";

/**
 * Nilai `device_hash` khusus baris simulasi.
 *
 * Bukan hash sungguhan — panjangnya pun berbeda dari keluaran `deviceHash()`
 * yang 32 heksadesimal, jadi tidak mungkin bertabrakan dengan sidik jari
 * perangkat warga mana pun.
 */
export const SIMULATION_DEVICE = "simulasi-peragaan";

export function isSimulated(row: {
  device_hash?: string | null;
  description?: string | null;
}): boolean {
  return (
    row.device_hash === SIMULATION_DEVICE ||
    (row.description ?? "").startsWith(SIMULATION_PREFIX)
  );
}

/**
 * Kalimat laporan per jenis.
 *
 * Sengaja spesifik dan membosankan seperti laporan warga sungguhan. Kalimat
 * dramatis akan membuat antrean peragaan terbaca palsu justru pada saat ia
 * paling perlu terbaca wajar.
 */
const TEMPLATES: Record<ReportKind, string[]> = {
  genangan: [
    "Genangan setinggi mata kaki bertahan tiga hari di gang belakang pasar.",
    "Air tidak surut di depan balai RW sejak hujan Sabtu lalu.",
    "Cekungan jalan depan sekolah tergenang setiap sore.",
    "Halaman musala tergenang, warga lewat tanpa alas kaki.",
    "Genangan di bawah jembatan kecil menuju permukiman padat.",
    "Air rob masuk sampai teras rumah deret dekat tanggul.",
    "Bekas galian pipa menampung air hujan sudah seminggu.",
    "Parkiran ruko tergenang, banyak sampah mengambang.",
  ],
  jentik: [
    "Jentik ditemukan di bak mandi belakang saat pemeriksaan kader.",
    "Ban bekas di halaman berisi air dan berjentik.",
    "Tandon terbuka di kontrakan penuh jentik.",
    "Pot bunga bertatakan air, jentik terlihat jelas.",
    "Dispenser bekas di gudang menampung air lama.",
    "Talang air mampet menahan genangan berjentik.",
    "Ember cadangan di kamar mandi tidak pernah dikuras.",
    "Kolam ikan mati tidak terurus, banyak jentik.",
  ],
  gejala: [
    "Demam tiga hari disertai nyeri sendi, sudah berobat ke puskesmas.",
    "Dua anggota keluarga demam bersamaan minggu ini.",
    "Demam tinggi mendadak dengan bintik merah di lengan.",
    "Anak demam lima hari, dirujuk untuk cek darah.",
    "Demam disertai nyeri betis setelah membersihkan saluran.",
    "Batuk berdahak lebih dari seminggu, sesak saat malam.",
    "Tetangga satu gang mengalami keluhan serupa.",
    "Demam berulang setelah sempat turun dua hari.",
  ],
  sampah: [
    "Tumpukan sampah di tepi jalan tidak diangkut sejak pekan lalu.",
    "Sampah rumah tangga menumpuk di lahan kosong dekat permukiman.",
    "Bak sampah RW melimpah sampai badan jalan.",
    "Sampah menyumbat mulut gorong-gorong.",
    "Banyak tikus terlihat di sekitar tumpukan sampah pasar.",
    "Sampah sisa banjir menumpuk di pinggir sungai.",
    "Timbunan sampah dibakar warga, asap masuk rumah.",
    "Kantong sampah berserakan di pinggir rel.",
  ],
  saluran: [
    "Saluran depan rumah tersumbat lumpur dan sampah.",
    "Got mampet menyebabkan air meluap ke jalan.",
    "Saluran drainase pecah, air merembes ke halaman.",
    "Aliran got berhenti total di ujung gang.",
    "Sedimen tebal di saluran utama kampung.",
    "Tutup saluran hilang, sampah masuk bebas.",
    "Saluran sekunder tertutup bangunan liar.",
    "Air got berbau menyengat karena tidak mengalir.",
  ],
};

export type SurgeInput = {
  kecamatan: string;
  kind: ReportKind;
  count: number;
  /** Rentang hari ke belakang tempat laporan disebar. */
  spreadDays?: number;
};

export type SurgeResult = {
  created: string[];
  kecamatan: string;
  kind: ReportKind;
  spreadDays: number;
};

function isoDateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 3600_000);
  return d.toISOString().slice(0, 10);
}

export async function injectSurge(
  input: SurgeInput,
  actor: string,
  role: string,
): Promise<SurgeResult> {
  const count = Math.min(Math.max(Math.round(input.count), 1), 20);
  const spreadDays = Math.min(Math.max(input.spreadDays ?? 6, 1), 30);
  const templates = TEMPLATES[input.kind];
  const created: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const id = generateTrackingCode();

    /* Waktu kirim disebar mundur agar antrean tidak menampilkan delapan baris
       berstempel detik yang sama — dan agar aturan "antrean tertahan" punya
       laporan tertua yang benar-benar tua. */
    const daysAgo = (spreadDays * i) / Math.max(count - 1, 1);
    const submittedAt = new Date(
      Date.now() - daysAgo * 24 * 3600_000,
    ).toISOString();

    await run(
      `INSERT INTO laporan_warga
         (id, kind, kecamatan, kelurahan, occurred_at, description, submitted_at, photo, status, device_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'menunggu', ?)`,
      id,
      input.kind,
      input.kecamatan,
      null,
      isoDateDaysAgo(Math.ceil(daysAgo) + 1),
      `${SIMULATION_PREFIX} ${templates[i % templates.length]}`,
      submittedAt,
      SIMULATION_DEVICE,
    );

    created.push(id);
  }

  await logAudit({
    actor,
    role,
    action: "Injeksi laporan simulasi",
    details: `${created.length} laporan ${input.kind} bertanda ${SIMULATION_PREFIX} di ${input.kecamatan}, tersebar ${spreadDays} hari.`,
    status: "warning",
  });

  return {
    created,
    kecamatan: input.kecamatan,
    kind: input.kind,
    spreadDays,
  };
}

export async function countSimulation(): Promise<number> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM laporan_warga WHERE device_hash = ?",
    SIMULATION_DEVICE,
  );
  return row?.n ?? 0;
}

export async function listSimulationDistricts(): Promise<
  { kecamatan: string; total: number }[]
> {
  return all<{ kecamatan: string; total: number }>(
    `SELECT kecamatan, COUNT(*) AS total
       FROM laporan_warga
      WHERE device_hash = ?
      GROUP BY kecamatan
      ORDER BY total DESC`,
    SIMULATION_DEVICE,
  );
}

export async function clearSimulation(
  actor: string,
  role: string,
): Promise<number> {
  const before = await countSimulation();
  if (before === 0) return 0;

  /* Predikat penghapusan memakai `device_hash`, bukan awalan deskripsi:
     deskripsi bisa diedit, kolom sidik jari tidak pernah tersentuh alur mana
     pun setelah penyisipan. */
  await run("DELETE FROM laporan_warga WHERE device_hash = ?", SIMULATION_DEVICE);

  await logAudit({
    actor,
    role,
    action: "Hapus laporan simulasi",
    details: `${before} laporan bertanda ${SIMULATION_PREFIX} dihapus.`,
    status: "info",
  });

  return before;
}
