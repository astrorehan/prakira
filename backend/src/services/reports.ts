/**
 * Laporan warga — satu sumber untuk kedua sisi loop (PRD §5.4 & §5.5).
 *
 * Kode lacak yang terbit di `/warga/lapor` adalah baris yang sama yang muncul
 * di antrean `/verifikasi` dan yang dicari di `/warga/status`. Sebelumnya
 * ketiganya berbagi `localStorage`, artinya laporan warga tidak pernah sampai
 * ke petugas mana pun kecuali petugas itu memakai peramban yang sama. Di sini
 * state benar-benar berpindah antar-pengguna.
 */
import crypto from "node:crypto";
import { all, one, run, transaction } from "../db/index.js";
import { env } from "../env.js";
import { logAudit } from "./audit.js";
import { listKecamatan } from "./districts.js";
import { isSimulated } from "./demo.js";
import {
  ensureEnvironmentTicketTx,
  toPublicEnvironmentTicket,
  type EnvironmentTicket,
  type PublicEnvironmentTicket,
} from "./tickets.js";

export type ReportKind =
  "gejala" | "jentik" | "genangan" | "sampah" | "saluran";
/**
 * `perlu_informasi` ditambahkan oleh audit F11: laporan yang lokasinya tidak
 * dapat ditelusuri dulu hanya punya dua pintu — diterima atau ditolak — dan
 * warga harus mengulang dari awal tanpa hubungan ke laporan sebelumnya.
 */
export type ReportStatus =
  | "menunggu"
  | "perlu_informasi"
  | "terverifikasi"
  | "ditolak";
export type ReportHandlingMode = "mandiri_warga" | "dlh";

/**
 * Keadaan penyampaian ke instansi lain (F10).
 *
 * Lingkup Dinkes berakhir pada penyampaian yang tercatat. Tidak ada keadaan
 * "dikerjakan" atau "selesai" di sini dengan sengaja: pengerjaan instansi
 * penerima bukan pekerjaan yang dikelola PRAKIRA, dan menampilkannya berarti
 * menjanjikan pemantauan yang tidak punya sumber pembaruan.
 */
export type ForwardState = "perlu_diteruskan" | "diteruskan" | "gagal";

export const REPORT_HANDLING_MODES: ReportHandlingMode[] = [
  "mandiri_warga",
  "dlh",
];

export const REPORT_KINDS: ReportKind[] = [
  "gejala",
  "jentik",
  "genangan",
  "sampah",
  "saluran",
];

/** Keluarga laporan menentukan jalur tindak lanjut yang tersedia. */
export const REPORT_FAMILY: Record<ReportKind, "kesehatan" | "lingkungan"> = {
  gejala: "kesehatan",
  jentik: "kesehatan",
  genangan: "lingkungan",
  sampah: "lingkungan",
  saluran: "lingkungan",
};

export const REPORT_DESTINATION: Record<
  "kesehatan" | "lingkungan",
  string
> = {
  kesehatan: "Puskesmas wilayah",
  lingkungan: "Dinas Lingkungan Hidup",
};

export type CitizenGuidance = {
  title: string;
  steps: string[];
  caution: string;
};

/**
 * Arahan langsung setelah warga menerima keputusan. Ini sengaja deterministik
 * dan tidak mendiagnosis: petugas memberi keputusan atas laporan, bukan
 * menggantikan pemeriksaan lapangan atau pemeriksaan klinis.
 */
const GUIDANCE: Record<ReportKind, CitizenGuidance> = {
  gejala: {
    title: "Yang bisa dilakukan sekarang",
    steps: [
      "Pantau perubahan gejala dan catat kapan mulai memburuk.",
      "Istirahat, cukup minum, dan gunakan masker bila sedang batuk atau demam.",
      "Periksa ke fasilitas kesehatan bila gejala berat, menetap, atau kondisi memburuk.",
    ],
    caution: "Laporan ini bukan diagnosis dan tidak menggantikan pemeriksaan tenaga kesehatan.",
  },
  jentik: {
    title: "Putus siklus jentik di sekitar rumah",
    steps: [
      "Kuras dan sikat wadah penampung air secara rutin.",
      "Tutup rapat wadah air dan singkirkan barang bekas yang dapat menampung hujan.",
      "Minta bantuan kader atau puskesmas bila temuan menyebar di lingkungan sekitar.",
    ],
    caution: "Jangan memakai bahan kimia atau larvasida tanpa mengikuti petunjuk petugas.",
  },
  genangan: {
    title: "Sambil menunggu penanganan genangan",
    steps: [
      "Jauhkan anak-anak dan hewan dari genangan, terutama bila air berbau atau mengalir deras.",
      "Hindari menyentuh air dengan tangan kosong; gunakan alas kaki dan pelindung bila harus melintas.",
      "Simpan kode lacak dan kirim pembaruan bila genangan meluas atau tidak surut.",
    ],
    caution: "Jangan masuk ke saluran, membuka penutup jalan, atau menangani kabel/limbah di dalam air.",
  },
  sampah: {
    title: "Sambil menunggu pengangkutan sampah",
    steps: [
      "Jauhkan anak-anak dan hewan dari tumpukan sampah.",
      "Jangan membakar, membongkar, atau memindahkan limbah yang tidak dikenal.",
      "Simpan kode lacak untuk melihat perkembangan pemeriksaan dan penerusan.",
    ],
    caution: "Jika terlihat benda tajam, bahan kimia, atau limbah medis, jangan menyentuhnya dan beri tahu petugas.",
  },
  saluran: {
    title: "Sambil menunggu pemeriksaan saluran",
    steps: [
      "Amankan anak-anak dan kendaraan dari area yang airnya meluap.",
      "Bersihkan hanya sumbatan kecil dari tempat yang aman dan tidak berada di dalam saluran.",
      "Simpan kode lacak dan laporkan perubahan tinggi air melalui laporan baru bila kondisi memburuk.",
    ],
    caution: "Jangan masuk ke saluran atau membuka manhole; air deras dapat menyeret orang tanpa terlihat.",
  },
};

/* Rute mandiri tidak boleh menampilkan langkah yang mengandaikan ada tiket
   DLH. Arahan tetap konservatif: warga hanya diminta melakukan hal yang aman,
   dan kondisi yang memburuk diarahkan menjadi laporan baru. */
const MANDIRI_GUIDANCE: Partial<Record<ReportKind, CitizenGuidance>> = {
  genangan: {
    title: "Langkah aman untuk warga",
    steps: [
      "Jauhkan anak-anak dan hewan dari genangan, terutama bila air berbau atau mengalir deras.",
      "Jika aman, singkirkan benda kecil yang menghambat aliran dari tepi genangan tanpa masuk ke air.",
      "Kirim laporan baru bila genangan meluas, berulang, atau mulai membahayakan akses warga.",
    ],
    caution: "Jangan masuk ke saluran, membuka penutup jalan, atau menangani kabel/limbah di dalam air.",
  },
  sampah: {
    title: "Penanganan aman di sekitar rumah",
    steps: [
      "Jauhkan anak-anak dan hewan dari tumpukan sampah.",
      "Rapikan hanya sampah rumah tangga biasa dari tempat yang aman; jangan menyentuh benda tajam atau limbah yang tidak dikenal.",
      "Kirim laporan baru bila tumpukan meluas, menutup akses umum, atau menimbulkan asap dan bau menyengat.",
    ],
    caution: "Jangan membakar, membongkar, atau memindahkan limbah berbahaya, medis, atau bahan kimia.",
  },
  saluran: {
    title: "Langkah aman untuk saluran kecil",
    steps: [
      "Amankan anak-anak dan kendaraan dari area yang airnya meluap.",
      "Bersihkan hanya sumbatan kecil dari tempat yang aman dan tidak berada di dalam saluran.",
      "Kirim laporan baru bila saluran utama tersumbat, air terus meluap, atau kondisi membahayakan warga.",
    ],
    caution: "Jangan masuk ke saluran atau membuka manhole; air deras dapat menyeret orang tanpa terlihat.",
  },
};

/**
 * Satu laporan, tanpa fotonya.
 *
 * Ketiadaan `photo` di sini disengaja dan bukan kelalaian. Foto disimpan
 * sebagai data URL base64 di kolom `laporan_warga.photo`, sampai 400.000
 * karakter per baris; `SELECT *` pada antrean verifikasi karena itu menarik
 * setiap foto dari setiap laporan sekaligus, termasuk yang sudah selesai
 * diverifikasi berbulan-bulan lalu. Seratus laporan berfoto menjadi respons
 * ±40 MB, dan di jaringan aula pameran halaman `/verifikasi` akan tampak
 * menggantung.
 *
 * Yang dibawa daftar hanya `has_photo`. Gambarnya diambil satu per satu lewat
 * `findReportPhoto`, saat petugas benar-benar melihatnya.
 */
export type ReportRow = {
  id: string;
  kind: ReportKind;
  kecamatan: string;
  kelurahan: string | null;
  occurred_at: string;
  description: string;
  submitted_at: string;
  has_photo: boolean;
  status: ReportStatus;
  reviewed_at: string | null;
  reviewer: string | null;
  review_note: string | null;
  handling_mode: ReportHandlingMode | null;
  device_hash: string;
  landmark: string | null;
  rt_rw: string | null;
  info_request: string | null;
  info_requested_at: string | null;
  related_report_id: string | null;
  forward_state: ForwardState | null;
  forward_target: string | null;
  forward_channel: string | null;
  forward_reference: string | null;
  forward_note: string | null;
  forwarded_at: string | null;
  forwarded_by: string | null;
};

/* Proyeksi kolom yang dipakai setiap kueri baca laporan. Ditulis sekali di
   sini, bukan `SELECT *` di lima tempat: satu kolom besar yang ikut terbawa
   diam-diam adalah persis bentuk kesalahan yang menghasilkan respons 40 MB
   tadi. `photo` hanya muncul sebagai uji keberadaan. */
export const REPORT_COLUMNS = `id, kind, kecamatan, kelurahan, occurred_at,
        description, submitted_at, status, reviewed_at, reviewer, review_note,
        handling_mode, device_hash, landmark, rt_rw, info_request,
        info_requested_at, related_report_id, forward_state, forward_target,
        forward_channel, forward_reference, forward_note, forwarded_at,
        forwarded_by, (photo IS NOT NULL) AS has_photo`;

/* Tanpa 0/O dan 1/I/L: kode ini diketik ulang orang dari layar ponsel, dan
   satu karakter ambigu mengubah "laporan saya hilang" jadi keluhan. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateTrackingCode(): string {
  const bytes = crypto.randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i += 1)
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `PKR-${body}`;
}

export function normalizeTrackingCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const body = cleaned.startsWith("PKR") ? cleaned.slice(3) : cleaned;
  return body ? `PKR-${body}` : "";
}

/** Sidik jari perangkat untuk rate limit. Bukan identitas: alamat IP dan
 *  user-agent di-hash bersama garam server dan tidak pernah disimpan mentah. */
export function deviceHash(ip: string, userAgent: string): string {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

export type RateLimitState = {
  max: number;
  windowHours: number;
  remaining: number;
  blocked: boolean;
  resetsAt: string | null;
};

export async function checkRateLimit(hash: string): Promise<RateLimitState> {
  const { max, windowHours } = env.reportRateLimit;
  const cutoff = new Date(Date.now() - windowHours * 3600_000).toISOString();

  const rows = await all<{ submitted_at: string }>(
    "SELECT submitted_at FROM laporan_warga WHERE device_hash = ? AND submitted_at > ? ORDER BY submitted_at",
    hash,
    cutoff,
  );

  const oldest = rows[0]?.submitted_at ?? null;
  return {
    max,
    windowHours,
    remaining: Math.max(0, max - rows.length),
    blocked: rows.length >= max,
    resetsAt: oldest
      ? new Date(Date.parse(oldest) + windowHours * 3600_000).toISOString()
      : null,
  };
}

export type NewReport = {
  kind: ReportKind;
  kecamatan: string;
  kelurahan?: string;
  occurredAt: string;
  description: string;
  photo?: string;
  /* Patokan dan RT/RW dipisahkan dari narasi (F11): petugas perlu menilai
     apakah lokasi dapat ditelusuri tanpa membaca ulang ceritanya. */
  landmark?: string;
  rtRw?: string;
  /* Pengiriman ulang atas laporan yang sama tetap terhubung ke kode lacak
     sebelumnya, bukan memulai kejadian baru tanpa jejak. */
  relatedReportId?: string;
};

export async function createReport(
  input: NewReport,
  hash: string,
): Promise<ReportRow> {
  const id = generateTrackingCode();
  const submittedAt = new Date().toISOString();

  const related = input.relatedReportId
    ? normalizeTrackingCode(input.relatedReportId)
    : "";
  const relatedId = related ? ((await findReport(related))?.id ?? null) : null;

  await run(
    `INSERT INTO laporan_warga
       (id, kind, kecamatan, kelurahan, occurred_at, description, submitted_at,
        photo, status, device_hash, landmark, rt_rw, related_report_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, ?, ?, ?)`,
    id,
    input.kind,
    input.kecamatan,
    input.kelurahan?.trim() || null,
    input.occurredAt,
    input.description.trim(),
    submittedAt,
    input.photo ?? null,
    hash,
    input.landmark?.trim() || null,
    input.rtRw?.trim() || null,
    relatedId,
  );

  await logAudit({
    actor: "Warga",
    role: "Publik",
    action: "Laporan warga masuk",
    details: `${id} — ${input.kind} di ${input.kecamatan}.`,
    status: "info",
  });

  return (await findReport(id)) as ReportRow;
}

export async function findReport(code: string): Promise<ReportRow | null> {
  const id = normalizeTrackingCode(code);
  if (!id) return null;
  return one<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM laporan_warga WHERE id = ?`,
    id,
  );
}

/**
 * Foto satu laporan, diambil terpisah dari barisnya.
 *
 * Hanya dipanggil dari rute bersesi. Deskripsi dan foto ditulis warga dan
 * hanya boleh dibaca verifikator (PRD §8) — jadi tidak ada jalan publik ke
 * sini, termasuk lewat kode lacak: pemilik kode sudah tahu foto apa yang ia
 * kirim, dan menyajikannya kembali hanya menambah permukaan tanpa menambah
 * kegunaan.
 */
export async function findReportPhoto(code: string): Promise<string | null> {
  const id = normalizeTrackingCode(code);
  if (!id) return null;
  const row = await one<{ photo: string | null }>(
    "SELECT photo FROM laporan_warga WHERE id = ?",
    id,
  );
  return row?.photo ?? null;
}

export function listReports(filter?: {
  kecamatan?: string;
  status?: ReportStatus;
}): Promise<ReportRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.kecamatan) {
    clauses.push("kecamatan = ?");
    params.push(filter.kecamatan);
  }
  if (filter?.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return all<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM laporan_warga ${where}
      ORDER BY CASE status
                 WHEN 'menunggu' THEN 0
                 WHEN 'perlu_informasi' THEN 1
                 WHEN 'terverifikasi' THEN 2
                 ELSE 3
               END,
               submitted_at ASC`,
    ...params,
  );
}

/**
 * Bentuk laporan yang boleh keluar dari gateway.
 *
 * Tinggal di lapisan layanan, bukan di rutenya, supaya ada satu tempat yang
 * menentukan apa yang terlihat dari luar — dan supaya bisa diuji tanpa
 * menyalakan server. `device_hash` tidak pernah ikut: ia sidik jari perangkat
 * untuk pembatas laju, bukan identitas, dan tidak ada alasan ia meninggalkan
 * server.
 *
 * `simulated` diturunkan dari sidik jari itu sebelum ia dibuang. Baris hasil
 * peragaan wajib bisa dikenali di antrean verifikasi — petugas yang melihat
 * delapan laporan baru berhak tahu mana yang datang dari warga dan mana yang
 * disuntikkan untuk demo.
 */
export type PublicForwarding = {
  state: ForwardState;
  target: string | null;
  channel: string | null;
  reference: string | null;
  note: string | null;
  forwardedAt: string | null;
};

/**
 * Kelengkapan informasi laporan (F11).
 *
 * Dihitung dari kolom, bukan ditebak dari narasi: petugas perlu tahu apakah
 * lokasi dapat ditelusuri sebelum memutuskan, dan warga perlu tahu apa yang
 * kurang bila diminta melengkapi.
 */
export type ReportCompleteness = {
  hasKelurahan: boolean;
  hasRtRw: boolean;
  hasLandmark: boolean;
  hasPhoto: boolean;
  /** Benar bila ada kelurahan/RT-RW/patokan — cukup untuk dicari di lapangan. */
  locatable: boolean;
  missing: string[];
};

export function describeCompleteness(row: ReportRow): ReportCompleteness {
  const hasKelurahan = Boolean(row.kelurahan?.trim());
  const hasRtRw = Boolean(row.rt_rw?.trim());
  const hasLandmark = Boolean(row.landmark?.trim());
  const missing: string[] = [];
  if (!hasKelurahan) missing.push("kelurahan");
  if (!hasRtRw) missing.push("RT/RW");
  if (!hasLandmark) missing.push("patokan lokasi");
  if (!row.has_photo) missing.push("foto");
  return {
    hasKelurahan,
    hasRtRw,
    hasLandmark,
    hasPhoto: row.has_photo,
    locatable: hasKelurahan || hasRtRw || hasLandmark,
    missing,
  };
}

export function toPublicView(
  row: ReportRow,
  ticket?: EnvironmentTicket | null,
): {
  simulated: boolean;
  id: string;
  kind: ReportKind;
  kecamatan: string;
  kelurahan: string | null;
  occurredAt: string;
  description: string;
  submittedAt: string;
  hasPhoto: boolean;
  status: ReportStatus;
  reviewedAt: string | null;
  reviewer: string | null;
  reviewNote: string | null;
  landmark: string | null;
  rtRw: string | null;
  infoRequest: string | null;
  infoRequestedAt: string | null;
  relatedReportId: string | null;
  completeness: ReportCompleteness;
  forwarding: PublicForwarding | null;
  routing: {
    family: "kesehatan" | "lingkungan";
    destination: string;
    handlingMode: ReportHandlingMode | null;
    workflow:
      | "rekap_evaluasi"
      | "pilih_tindak_lanjut"
      | "arahan_warga"
      | "penerusan_instansi";
  };
  guidance: CitizenGuidance;
  ticket: PublicEnvironmentTicket | null;
} {
  const family = REPORT_FAMILY[row.kind];
  /* Baris lama yang sudah memiliki tiket dianggap sudah memilih DLH, bahkan
     bila kolom pilihan belum sempat terisi sebelum migrasi. */
  const handlingMode =
    family === "lingkungan"
      ? row.handling_mode ?? (ticket ? "dlh" : null)
      : null;
  const workflow =
    family === "kesehatan"
      ? "rekap_evaluasi"
      : handlingMode === "mandiri_warga"
        ? "arahan_warga"
        : handlingMode === "dlh"
          ? "penerusan_instansi"
          : "pilih_tindak_lanjut";

  /* Baris lama yang sudah dirutekan ke DLH sebelum kolom penerusan ada tetap
     berarti "perlu diteruskan": membuat tiket di dalam aplikasi bukan bukti
     bahwa laporannya sudah sampai ke instansi penerima. */
  const forwardState: ForwardState | null =
    row.forward_state ?? (handlingMode === "dlh" ? "perlu_diteruskan" : null);
  const destination =
    family === "kesehatan"
      ? REPORT_DESTINATION.kesehatan
      : handlingMode === "mandiri_warga"
        ? "Warga/pelapor"
        : handlingMode === "dlh"
          ? REPORT_DESTINATION.lingkungan
          : "Menunggu pilihan tindak lanjut";
  return {
    simulated: isSimulated(row),
    id: row.id,
    kind: row.kind,
    kecamatan: row.kecamatan,
    kelurahan: row.kelurahan,
    occurredAt: row.occurred_at,
    description: row.description,
    submittedAt: row.submitted_at,
    hasPhoto: row.has_photo,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewer: row.reviewer,
    reviewNote: row.review_note,
    landmark: row.landmark,
    rtRw: row.rt_rw,
    infoRequest: row.info_request,
    infoRequestedAt: row.info_requested_at,
    relatedReportId: row.related_report_id,
    completeness: describeCompleteness(row),
    forwarding: forwardState
      ? {
          state: forwardState,
          target: row.forward_target ?? REPORT_DESTINATION.lingkungan,
          channel: row.forward_channel,
          reference: row.forward_reference,
          note: row.forward_note,
          forwardedAt: row.forwarded_at,
        }
      : null,
    routing: {
      family,
      destination,
      handlingMode,
      workflow,
    },
    guidance:
      handlingMode === "mandiri_warga"
        ? MANDIRI_GUIDANCE[row.kind] ?? GUIDANCE[row.kind]
        : GUIDANCE[row.kind],
    ticket: toPublicEnvironmentTicket(ticket),
  };
}

export class ReportAlreadyReviewedError extends Error {
  constructor(readonly status: ReportStatus) {
    super(`Laporan sudah diputuskan dengan status ${status}.`);
    this.name = "ReportAlreadyReviewedError";
  }
}

export class ReportHandlingModeRequiredError extends Error {
  constructor() {
    super("Laporan lingkungan yang diterima harus memilih arahan warga atau DLH.");
    this.name = "ReportHandlingModeRequiredError";
  }
}

export class InvalidReportHandlingModeError extends Error {
  constructor() {
    super("Pilihan tindak lanjut hanya berlaku untuk laporan lingkungan.");
    this.name = "InvalidReportHandlingModeError";
  }
}

export class ForwardStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForwardStateError";
  }
}

export async function reviewReport(
  id: string,
  decision: {
    status: "terverifikasi" | "ditolak" | "perlu_informasi";
    note?: string;
    handlingMode?: ReportHandlingMode;
    /** Pertanyaan yang harus dijawab pelapor bila keputusannya minta informasi. */
    infoRequest?: string;
  },
  reviewer: string,
  role: string,
): Promise<ReportRow | null> {
  let updated: ReportRow | null = null;
  let selectedHandlingMode: ReportHandlingMode | null = null;
  const reviewedAt = new Date().toISOString();
  const note = decision.note?.trim() || null;

  await transaction(async (tx) => {
    const existing = await tx.one<ReportRow>(
      `SELECT ${REPORT_COLUMNS} FROM laporan_warga WHERE id = ? FOR UPDATE`,
      id,
    );
    if (!existing) return;
    /* Laporan yang sedang menunggu kelengkapan masih boleh diputuskan: itu
       justru tujuan permintaannya. Yang tidak boleh diputuskan dua kali adalah
       laporan yang sudah diterima atau ditolak. */
    if (existing.status !== "menunggu" && existing.status !== "perlu_informasi") {
      throw new ReportAlreadyReviewedError(existing.status);
    }

    const family = REPORT_FAMILY[existing.kind];
    if (
      decision.status === "terverifikasi" &&
      family === "lingkungan" &&
      !decision.handlingMode
    ) {
      throw new ReportHandlingModeRequiredError();
    }
    if (decision.handlingMode && family !== "lingkungan") {
      throw new InvalidReportHandlingModeError();
    }
    const handlingMode =
      decision.status === "terverifikasi" && family === "lingkungan"
        ? decision.handlingMode ?? null
        : null;
    selectedHandlingMode = handlingMode;

    /* Laporan yang diterima dan dirutekan ke instansi lain masuk keadaan
       "perlu diteruskan". Ia belum diteruskan: penyampaian adalah kejadian
       tersendiri yang dicatat lewat `recordForwarding`. */
    const forwardState =
      decision.status === "terverifikasi" && handlingMode === "dlh"
        ? "perlu_diteruskan"
        : null;
    const infoRequest =
      decision.status === "perlu_informasi"
        ? (decision.infoRequest?.trim() || note)
        : null;

    await tx.run(
      `UPDATE laporan_warga
          SET status = ?, reviewed_at = ?, reviewer = ?, review_note = ?,
              handling_mode = ?, forward_state = COALESCE(forward_state, ?),
              forward_target = COALESCE(forward_target, ?),
              info_request = ?, info_requested_at = ?
        WHERE id = ?`,
      decision.status,
      reviewedAt,
      reviewer,
      note,
      handlingMode,
      forwardState,
      forwardState ? REPORT_DESTINATION.lingkungan : null,
      infoRequest,
      decision.status === "perlu_informasi" ? reviewedAt : null,
      id,
    );

    updated = await tx.one<ReportRow>(
      `SELECT ${REPORT_COLUMNS} FROM laporan_warga WHERE id = ?`,
      id,
    );

    /* Tiket DLH tidak lagi dibuat di sini. Membuat tiket di dalam aplikasi dan
       menyampaikan laporan melalui kanal yang diterima instansi adalah dua
       kejadian berbeda (audit F10); yang pertama pernah tampil seolah yang
       kedua sudah terjadi. Baris tiket lama tetap ada sebagai riwayat. */
  });

  if (!updated) return null;

  await logAudit({
    actor: reviewer,
    role,
    action: `Verifikasi laporan ${id}`,
    details: `Diputuskan ${decision.status}${selectedHandlingMode ? ` — rute ${selectedHandlingMode}` : ""}${note ? ` — ${note}` : ""}.`,
    status: decision.status === "terverifikasi" ? "success" : "warning",
  });

  return updated;
}

/**
 * Mencatat penyampaian laporan ke instansi penerima (F10, audit §7.E).
 *
 * Batasnya disengaja: yang tercatat adalah tujuan, waktu, kanal, dan referensi
 * bila tersedia. Tidak ada kolom progres, PIC instansi penerima, atau
 * penyelesaian — Dinkes menyampaikan informasi dan tidak mengelola pekerjaan
 * instansi lain. Penyampaian yang gagal tetap "perlu diteruskan": itu
 * pekerjaan penerusan yang belum selesai, bukan tunggakan penanganan.
 */
export async function recordForwarding(
  id: string,
  input: {
    delivered: boolean;
    target?: string;
    channel?: string;
    reference?: string;
    note?: string;
  },
  actor: string,
  role: string,
): Promise<ReportRow | null> {
  const existing = await findReport(id);
  if (!existing) return null;

  const family = REPORT_FAMILY[existing.kind];
  if (family !== "lingkungan" || existing.handling_mode !== "dlh") {
    throw new ForwardStateError(
      "Hanya laporan lingkungan yang dirutekan ke instansi lain yang dapat dicatat penerusannya.",
    );
  }
  if (existing.status !== "terverifikasi") {
    throw new ForwardStateError(
      "Laporan harus diperiksa dan diterima lebih dulu sebelum diteruskan.",
    );
  }
  if (existing.forward_state === "diteruskan") {
    throw new ForwardStateError("Laporan ini sudah tercatat diteruskan.");
  }

  const now = new Date().toISOString();
  const target = input.target?.trim() || REPORT_DESTINATION.lingkungan;
  const channel = input.channel?.trim() || null;
  const note = input.note?.trim() || null;

  if (input.delivered && !channel) {
    throw new ForwardStateError(
      "Sebutkan kanal penyampaian yang dipakai agar catatannya dapat diperiksa kembali.",
    );
  }
  if (!input.delivered && !note) {
    throw new ForwardStateError(
      "Penyampaian yang gagal wajib menyebutkan alasannya.",
    );
  }

  await run(
    `UPDATE laporan_warga
        SET forward_state = ?, forward_target = ?, forward_channel = ?,
            forward_reference = ?, forward_note = ?, forwarded_at = ?, forwarded_by = ?
      WHERE id = ?`,
    input.delivered ? "diteruskan" : "gagal",
    target,
    channel,
    input.reference?.trim() || null,
    note,
    input.delivered ? now : null,
    input.delivered ? actor : null,
    existing.id,
  );

  await logAudit({
    actor,
    role,
    action: `Penerusan laporan ${existing.id}`,
    details: input.delivered
      ? `Disampaikan ke ${target} melalui ${channel}${input.reference ? ` — referensi ${input.reference}` : ""}.`
      : `Penyampaian ke ${target} belum berhasil — ${note}.`,
    status: input.delivered ? "success" : "warning",
  });

  return findReport(existing.id);
}

/** Laporan lain di kecamatan dan jenis yang sama, untuk menautkan duplikat. */
export async function listRelatedReports(
  id: string,
  windowDays = 14,
): Promise<ReportRow[]> {
  const report = await findReport(id);
  if (!report) return [];
  const cutoff = new Date(
    Date.parse(report.submitted_at) - windowDays * 86_400_000,
  ).toISOString();

  return all<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM laporan_warga
      WHERE id <> ? AND kecamatan = ? AND kind = ?
        AND (submitted_at > ? OR related_report_id = ? OR id = ?)
      ORDER BY submitted_at DESC
      LIMIT 10`,
    report.id,
    report.kecamatan,
    report.kind,
    cutoff,
    report.id,
    report.related_report_id ?? "",
  );
}

export type QueueSummary = {
  total: number;
  menunggu: number;
  perluInformasi: number;
  terverifikasi: number;
  ditolak: number;
  lingkunganMenunggu: number;
  /** Sudah diputuskan perlu diteruskan, penyampaiannya belum tercatat. */
  perluDiteruskan: number;
  diteruskan: number;
  oldestWaitHours: number | null;
};

export async function summarizeQueue(): Promise<QueueSummary> {
  const rows = await all<{
    status: ReportStatus;
    kind: ReportKind;
    submitted_at: string;
    handling_mode: ReportHandlingMode | null;
    forward_state: ForwardState | null;
  }>(
    "SELECT status, kind, submitted_at, handling_mode, forward_state FROM laporan_warga",
  );

  const pending = rows.filter((r) => r.status === "menunggu");
  const oldest = pending.reduce<number | null>((acc, r) => {
    const t = Date.parse(r.submitted_at);
    if (Number.isNaN(t)) return acc;
    return acc === null || t < acc ? t : acc;
  }, null);

  /* Baris lama yang dirutekan ke DLH sebelum kolom penerusan ada dihitung
     sebagai pekerjaan penerusan yang belum tercatat, bukan sebagai selesai. */
    const awaitingForward = rows.filter(
    (r) =>
      r.status === "terverifikasi" &&
      r.handling_mode === "dlh" &&
      (r.forward_state ?? "perlu_diteruskan") !== "diteruskan",
  ).length;

  return {
    total: rows.length,
    menunggu: pending.length,
    perluInformasi: rows.filter((r) => r.status === "perlu_informasi").length,
    terverifikasi: rows.filter((r) => r.status === "terverifikasi").length,
    ditolak: rows.filter((r) => r.status === "ditolak").length,
    perluDiteruskan: awaitingForward,
    diteruskan: rows.filter((r) => r.forward_state === "diteruskan").length,
    lingkunganMenunggu: pending.filter(
      (r) => REPORT_FAMILY[r.kind] === "lingkungan",
    ).length,
    oldestWaitHours:
      oldest === null ? null : Math.floor((Date.now() - oldest) / 3600_000),
  };
}

export type CitizenSignalFamily = "semua" | "kesehatan" | "lingkungan";

/**
 * Sinyal warga per kecamatan per bulan — masukan `include_citizen` untuk
 * retraining (PRD §5.6a). Hanya laporan terverifikasi yang dihitung.
 *
 * Keluarga dipisahkan supaya checkbox "sinyal lingkungan" tidak diam-diam
 * memasukkan gejala kesehatan ke dalam eksperimen model yang sama.
 */
export function citizenSignal(): Promise<
  { kecamatan: string; month: string; verified: number }[]
> {
  return citizenSignalByFamily("semua");
}

export function citizenSignalByFamily(
  family: CitizenSignalFamily,
): Promise<{ kecamatan: string; month: string; verified: number }[]> {
  const kinds =
    family === "lingkungan"
      ? ["genangan", "sampah", "saluran"]
      : family === "kesehatan"
        ? ["gejala", "jentik"]
        : [];
  const familyWhere = kinds.length
    ? ` AND kind IN (${kinds.map(() => "?").join(", ")})`
    : "";
  return all<{ kecamatan: string; month: string; verified: number }>(
    `SELECT kecamatan,
            substr(occurred_at, 1, 7) || '-01' AS month,
            COUNT(*)                           AS verified
       FROM laporan_warga
      WHERE status = 'terverifikasi'${familyWhere}
      GROUP BY kecamatan, month
      ORDER BY month DESC, kecamatan`,
    ...kinds,
  );
}

export type DistrictTriggerSummary = {
  kecamatan: string;
  total: number;
  byKind: Record<ReportKind, number>;
  latestReportAt: string | null;
  environmentalCount: number;
  healthCount: number;
};

/**
 * Ringkasan agregat laporan terverifikasi per kecamatan.
 *
 * Mengelompokkan pemicu lingkungan (genangan, jentik, sampah, saluran) dan
 * gejala kesehatan tanpa mengekspos koordinat presisi atau identitas pelapor,
 * sesuai PRD §8 (privasi).
 */
export async function getTriggerSummaryByDistrict(
  kecamatanFilter?: string,
): Promise<DistrictTriggerSummary[]> {
  const params: unknown[] = [];
  let where = "WHERE status = 'terverifikasi'";
  if (kecamatanFilter) {
    where += " AND LOWER(kecamatan) = LOWER(?)";
    params.push(kecamatanFilter);
  }

  /* Direktori kecamatan dan agregat laporan tidak saling bergantung. Pada
     database remote, menjalankannya paralel menghapus satu jeda jaringan. */
  const [allKec, rows] = await Promise.all([
    listKecamatan(),
    all<{
      kecamatan: string;
      kind: ReportKind;
      submitted_at: string;
    }>(
      `SELECT kecamatan, kind, submitted_at
         FROM laporan_warga
        ${where}
        ORDER BY submitted_at DESC`,
      ...params,
    ),
  ]);
  const byDistrict = new Map<string, DistrictTriggerSummary>();

  for (const k of allKec) {
    if (!kecamatanFilter || k.nama.toLowerCase() === kecamatanFilter.toLowerCase()) {
      byDistrict.set(k.nama, {
        kecamatan: k.nama,
        total: 0,
        byKind: {
          gejala: 0,
          jentik: 0,
          genangan: 0,
          sampah: 0,
          saluran: 0,
        },
        latestReportAt: null,
        environmentalCount: 0,
        healthCount: 0,
      });
    }
  }

  for (const row of rows) {
    const entry = byDistrict.get(row.kecamatan);
    if (entry) {
      entry.total += 1;
      if (entry.byKind[row.kind] !== undefined) {
        entry.byKind[row.kind] += 1;
      }
      if (REPORT_FAMILY[row.kind] === "lingkungan") {
        entry.environmentalCount += 1;
      } else {
        entry.healthCount += 1;
      }
      if (!entry.latestReportAt || row.submitted_at > entry.latestReportAt) {
        entry.latestReportAt = row.submitted_at;
      }
    }
  }

  return Array.from(byDistrict.values());
}

