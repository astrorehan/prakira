/**
 * Eskalasi otomatis "perlu perhatian" (PRD §4, S4).
 *
 * Antrean verifikasi diurutkan menunggu-dulu-terlama-dulu, dan itu benar untuk
 * memproses satu per satu. Yang hilang dari urutan itu adalah **pola**: lima
 * laporan genangan dari kecamatan yang sama dalam sepuluh hari tersebar di
 * seluruh daftar dan terbaca sebagai lima keluhan lepas, bukan sebagai satu
 * wilayah yang sedang memburuk. Berkas ini yang membaca polanya.
 *
 * Aturannya deterministik dan bisa diperiksa — tidak ada model di sini:
 *
 *   1. **Volume.** Jumlah laporan sebuah kecamatan dalam jendela pengamatan
 *      mencapai ambang.
 *   2. **Pemusatan satu jenis.** Satu jenis laporan saja (jentik, genangan, …)
 *      mencapai ambangnya sendiri. Lima laporan jentik lebih berarti daripada
 *      lima laporan bercampur.
 *   3. **Antrean tertahan.** Ada laporan yang menunggu verifikasi melewati
 *      batas jam. Ini eskalasi tentang layanan, bukan tentang penyakit, dan
 *      dibedakan supaya tidak terbaca sebagai sinyal epidemiologis.
 *
 * Laporan yang **ditolak** verifikator tidak pernah dihitung. Kalau tidak,
 * satu orang yang mengirim laporan berulang kali bisa menaikkan status
 * kecamatannya sendiri — persis bias pelaporan yang sudah disebut sebagai
 * batasan sistem, tapi kali ini dengan konsekuensi operasional.
 *
 * Eskalasi ini **tidak** menerbitkan tindakan dan tidak menyentuh tabel
 * `tindakan`. Ia menandai wilayah yang perlu dilihat manusia. Menerbitkan
 * instruksi fogging dari lima laporan warga yang belum diverifikasi adalah
 * persis jenis otomatisasi yang tidak boleh ada di sistem kesehatan.
 */
import { all } from "../db/index.js";
import { REPORT_FAMILY, type ReportKind } from "./reports.js";

export type EscalationReasonKind = "volume" | "pemusatan" | "tertahan";

export type EscalationReason = {
  kind: EscalationReasonKind;
  label: string;
  detail: string;
};

export type Escalation = {
  kecamatan: string;
  /** `perlu_perhatian` bila salah satu ambang terlampaui. */
  level: "perlu_perhatian";
  total: number;
  menunggu: number;
  terverifikasi: number;
  /** Jumlah per jenis laporan dalam jendela pengamatan. */
  perJenis: Record<string, number>;
  /** Jenis dengan laporan terbanyak. */
  jenisDominan: ReportKind | null;
  keluarga: "kesehatan" | "lingkungan" | "campuran";
  /** Jam tunggu laporan menunggu tertua di kecamatan ini. */
  tungguTerlamaJam: number | null;
  laporanTerakhir: string | null;
  reasons: EscalationReason[];
};

export type EscalationRules = {
  windowDays: number;
  minReports: number;
  minSameKind: number;
  maxWaitHours: number;
};

/**
 * Ambang bawaan.
 *
 * Angkanya dipilih dari bentuk antrean, bukan dari literatur: dengan batas
 * kirim 3 laporan per perangkat per 24 jam (`env.reportRateLimit`), lima
 * laporan dalam 14 hari dari satu kecamatan tidak mungkin berasal dari satu
 * perangkat saja. Empat laporan sejenis dipilih lebih rendah karena
 * pemusatan jenis lebih informatif daripada volume campuran. Dua puluh empat
 * jam untuk antrean tertahan mengikuti janji layanan yang wajar bagi laporan
 * warga, bukan temuan epidemiologis.
 *
 * Semuanya bisa ditimpa lewat parameter permintaan agar dinas dapat
 * menyetelnya tanpa mengubah kode.
 */
export const DEFAULT_RULES: EscalationRules = {
  windowDays: 14,
  minReports: 5,
  minSameKind: 4,
  maxWaitHours: 24,
};

const KIND_LABEL: Record<string, string> = {
  gejala: "gejala penyakit",
  jentik: "temuan jentik",
  genangan: "genangan air",
  sampah: "tumpukan sampah",
  saluran: "saluran tersumbat",
};

type Row = {
  kecamatan: string;
  kind: ReportKind;
  status: string;
  submitted_at: string;
};

export function clampRules(input: Partial<EscalationRules>): EscalationRules {
  const clamp = (value: number | undefined, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(Math.max(value as number, min), max) : fallback;

  return {
    windowDays: clamp(input.windowDays, 1, 90, DEFAULT_RULES.windowDays),
    minReports: clamp(input.minReports, 2, 50, DEFAULT_RULES.minReports),
    minSameKind: clamp(input.minSameKind, 2, 50, DEFAULT_RULES.minSameKind),
    maxWaitHours: clamp(input.maxWaitHours, 1, 720, DEFAULT_RULES.maxWaitHours),
  };
}

export async function detectEscalations(
  overrides: Partial<EscalationRules> = {},
): Promise<{ rules: EscalationRules; escalations: Escalation[]; scanned: number }> {
  const rules = clampRules(overrides);
  const cutoff = new Date(
    Date.now() - rules.windowDays * 24 * 3600_000,
  ).toISOString();

  /* Laporan ditolak dibuang di SQL, bukan di JavaScript: kalau tidak, jumlah
     `scanned` yang dilaporkan ke UI akan memuat baris yang tidak pernah ikut
     menghitung apa pun. */
  const rows = await all<Row>(
    `SELECT kecamatan, kind, status, submitted_at
       FROM laporan_warga
      WHERE submitted_at > ? AND status <> 'ditolak'
      ORDER BY submitted_at`,
    cutoff,
  );

  const byKecamatan = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byKecamatan.get(row.kecamatan) ?? [];
    list.push(row);
    byKecamatan.set(row.kecamatan, list);
  }

  const now = Date.now();
  const escalations: Escalation[] = [];

  for (const [kecamatan, list] of byKecamatan) {
    const perJenis: Record<string, number> = {};
    for (const row of list) perJenis[row.kind] = (perJenis[row.kind] ?? 0) + 1;

    const pending = list.filter((r) => r.status === "menunggu");
    const verified = list.filter((r) => r.status === "terverifikasi");

    const oldestPending = pending.reduce<number | null>((acc, r) => {
      const t = Date.parse(r.submitted_at);
      if (Number.isNaN(t)) return acc;
      return acc === null || t < acc ? t : acc;
    }, null);
    const waitHours =
      oldestPending === null
        ? null
        : Math.floor((now - oldestPending) / 3600_000);

    const dominant = (Object.entries(perJenis).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? null) as [ReportKind, number] | null;

    const families = new Set(list.map((r) => REPORT_FAMILY[r.kind]));

    const reasons: EscalationReason[] = [];

    if (list.length >= rules.minReports) {
      reasons.push({
        kind: "volume",
        label: "Laporan menumpuk",
        detail: `${list.length} laporan dalam ${rules.windowDays} hari terakhir, ambang ${rules.minReports}.`,
      });
    }

    if (dominant && dominant[1] >= rules.minSameKind) {
      reasons.push({
        kind: "pemusatan",
        label: "Terpusat satu jenis",
        detail: `${dominant[1]} laporan ${KIND_LABEL[dominant[0]] ?? dominant[0]} dalam ${rules.windowDays} hari terakhir, ambang ${rules.minSameKind}.`,
      });
    }

    if (waitHours !== null && waitHours >= rules.maxWaitHours) {
      reasons.push({
        kind: "tertahan",
        label: "Antrean tertahan",
        detail: `Laporan tertua menunggu verifikasi ${waitHours} jam, ambang ${rules.maxWaitHours} jam.`,
      });
    }

    if (reasons.length === 0) continue;

    const latest = list.reduce<string | null>((acc, r) => {
      if (!acc) return r.submitted_at;
      return r.submitted_at > acc ? r.submitted_at : acc;
    }, null);

    escalations.push({
      kecamatan,
      level: "perlu_perhatian",
      total: list.length,
      menunggu: pending.length,
      terverifikasi: verified.length,
      perJenis,
      jenisDominan: dominant ? dominant[0] : null,
      keluarga:
        families.size === 1
          ? ([...families][0] as "kesehatan" | "lingkungan")
          : "campuran",
      tungguTerlamaJam: waitHours,
      laporanTerakhir: latest,
      reasons,
    });
  }

  /* Urut menurut jumlah alasan lalu volume: kecamatan yang memicu tiga aturan
     sekaligus tampil di atas kecamatan yang hanya melewati satu ambang. */
  escalations.sort(
    (a, b) => b.reasons.length - a.reasons.length || b.total - a.total,
  );

  return { rules, escalations, scanned: rows.length };
}
