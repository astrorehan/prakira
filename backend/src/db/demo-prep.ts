/**
 * Persiapan panggung untuk naskah live demo 4 peran (kasus Kecamatan Tugu).
 *
 * Naskahnya menuntut tiga hal yang tidak ada di database hasil seeding:
 * akun puskesmas yang wilayahnya Tugu, tugas lapangan dari Dinkes yang sudah
 * menunggu di "Tugas Saya", dan rekap kasus puskesmas yang sudah tercatat
 * masuk sehingga kartu "Ingest terakhir" di halaman admin tidak kosong.
 *
 * Aman diulang sebelum setiap gladi:
 * - Akun dibuat bila belum ada; wilayah dan kata sandinya dikembalikan ke
 *   nilai demo bila sudah ada.
 * - Tugas demo yang sudah disentuh saat gladi (diterima/dikerjakan/selesai)
 *   dihapus lalu dibuat ulang dalam keadaan baru ditugaskan.
 * - Rekap yang ditulis adalah angka dataset Tugu itu sendiri untuk periode
 *   yang sudah ada. Tidak ada angka karangan dan prakiraan tidak bergeser;
 *   yang berubah hanya pemilik rekapnya menjadi puskesmas Tugu.
 * - Laporan warga yang pernah diteruskan ke DLH/DPU dihapus beserta tiketnya
 *   supaya riwayat penerusan kosong di awal setiap gladi.
 *
 * Jalankan: `npm run demo:prep` dari akar repositori.
 */
import crypto from "node:crypto";
import { all, closeDb, one, run, transaction } from "./index.js";
import { finishIngestJob, startIngestJob } from "./seed.js";
import { hashPassword } from "../services/password.js";
import { logAudit } from "../services/audit.js";
import { createManualAction } from "../services/actions.js";
import { invalidatePeriodCache } from "../services/period.js";

const KECAMATAN = "Tugu";
const PUSKESMAS_EMAIL = "puskesmas.tugu@prakira.id";
const PUSKESMAS_PASSWORD = "puskesmas123";
const PUSKESMAS_LABEL = "Puskesmas Mangkang";
const DINKES_LABEL = "Dinas Kesehatan Kota Semarang";

const TASK_TITLE = "Abatisasi titik genangan rawan rob";
const TASK_SOP = [
  "Petakan titik genangan dan penampungan air bersama kader RT/RW",
  "Siapkan bubuk abate (temefos 1%) sesuai jumlah titik",
  "Takar 10 gram abate untuk setiap 100 liter air",
  "Tabur abate di genangan, bak, dan penampungan terbuka",
  "Edukasi warga: jangan kuras penampungan selama 2–3 bulan",
  "Catat jumlah rumah dan titik yang sudah ditabur",
];

/** Periode rekap yang dipakai layar /kasus: bulan terakhir setiap penyakit. */
const RECAP_MONTHS = 3;

async function ensurePuskesmasAccount(kecamatanId: string): Promise<string> {
  const { hash, salt } = await hashPassword(PUSKESMAS_PASSWORD);
  const existing = await one<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    PUSKESMAS_EMAIL,
  );

  if (existing) {
    await run(
      `UPDATE users
          SET role = 'puskesmas', label = ?, home = '/dashboard', kecamatan_id = ?,
              password_hash = ?, salt = ?
        WHERE id = ?`,
      PUSKESMAS_LABEL,
      kecamatanId,
      hash,
      salt,
      existing.id,
    );
    return "diperbarui";
  }

  await run(
    `INSERT INTO users (id, email, password_hash, salt, role, label, home, created_at, kecamatan_id)
     VALUES (?, ?, ?, ?, 'puskesmas', ?, '/dashboard', ?, ?)`,
    crypto.randomUUID(),
    PUSKESMAS_EMAIL,
    hash,
    salt,
    PUSKESMAS_LABEL,
    new Date().toISOString(),
    kecamatanId,
  );
  return "dibuat";
}

async function ensureDemoTask(): Promise<string> {
  const existing = await all<{ id: string; status: string; acknowledged_at: string | null }>(
    `SELECT t.id, w.status, w.acknowledged_at
       FROM tindakan t
       JOIN tindakan_wilayah w ON w.tindakan_id = t.id AND w.kecamatan = ?
      WHERE t.source = 'manual' AND t.title = ?`,
    KECAMATAN,
    TASK_TITLE,
  );

  const fresh = existing.find((t) => t.status === "assigned" && !t.acknowledged_at);
  const stale = existing.filter((t) => t !== fresh);
  for (const task of stale) {
    /* `tindakan_riwayat` dan `tindakan_wilayah` ikut terhapus lewat CASCADE. */
    await run("DELETE FROM tindakan WHERE id = ?", task.id);
  }
  if (fresh) return `${fresh.id} (sudah siap)`;

  const due = new Date(Date.now() + 7 * 24 * 3600_000).toISOString().slice(0, 10);
  const task = await createManualAction(
    {
      title: TASK_TITLE,
      description:
        "Bagikan dan taburkan bubuk abate di titik-titik genangan permukiman yang " +
        "tergenang rob dan saluran tersumbat, sebelum jentik berkembang menjadi nyamuk dewasa.",
      reason: "laporan warga saluran tersumbat dan genangan berjentik di Kecamatan Tugu.",
      disease: "DBD",
      actionType: "psn",
      priority: "high",
      kecamatan: [KECAMATAN],
      dueDate: due,
      sopChecklist: TASK_SOP,
      pic: "Koordinator kesling puskesmas",
      note: "Prioritaskan RW yang berbatasan dengan tanggul rob.",
    },
    DINKES_LABEL,
    "dinas",
  );
  return `${task.id} (${stale.length > 0 ? "dibuat ulang" : "dibuat"})`;
}

/**
 * Laporan warga yang pernah dirutekan ke DLH/DPU menumpuk dari satu gladi ke
 * gladi berikutnya. Seed tidak membuat laporan warga, jadi semua baris ini
 * berasal dari uji coba dan aman dihapus.
 */
async function clearForwardedReports(): Promise<number> {
  const forwarded = `SELECT id FROM laporan_warga
                      WHERE handling_mode = 'dlh' OR forward_state IS NOT NULL`;
  return transaction(async (tx) => {
    const rows = await tx.all<{ id: string }>(forwarded);
    if (rows.length === 0) return 0;
    await tx.run(`DELETE FROM tiket_lingkungan WHERE laporan_id IN (${forwarded})`);
    /* `related_report_id` tidak ber-FK; putuskan tautan supaya tidak menggantung. */
    await tx.run(
      `UPDATE laporan_warga SET related_report_id = NULL
        WHERE related_report_id IN (${forwarded})`,
    );
    await tx.run(`DELETE FROM laporan_warga WHERE id IN (${forwarded})`);
    return rows.length;
  });
}

async function claimRecap(kecamatanId: string): Promise<string[]> {
  const diseases = await all<{ disease: string; latest: string }>(
    /* ISPA terakhir: kartu "Ingest terakhir" di admin hanya menampilkan satu
       pekerjaan, dan rekap ISPA Tugu yang angkanya ribuan lebih enak dibaca
       daripada DBD/leptospirosis yang nol. */
    `SELECT disease, MAX(month_start) AS latest FROM observasi
      GROUP BY disease ORDER BY disease = 'ISPA', disease`,
  );
  const notes: string[] = [];

  for (const { disease, latest } of diseases) {
    const months = await all<{ month_start: string }>(
      `SELECT month_start FROM observasi
        WHERE kecamatan_id = ? AND disease = ? AND month_start <= ?
        ORDER BY month_start DESC LIMIT ?`,
      kecamatanId,
      disease,
      latest,
      RECAP_MONTHS,
    );
    if (months.length === 0) continue;

    const jobId = await startIngestJob(`impor-csv-${disease.toLowerCase()}`);
    const startedAt = Date.now();
    const recordedAt = new Date().toISOString();

    /* Angka kasus dan iklim tidak disentuh: hanya kepemilikan rekap. */
    await transaction(async (tx) => {
      for (const { month_start } of months) {
        await tx.run(
          `UPDATE observasi
              SET source = 'import', recorded_at = ?, recorded_by = ?, recap_state = 'tersimpan'
            WHERE kecamatan_id = ? AND disease = ? AND month_start = ?`,
          recordedAt,
          PUSKESMAS_LABEL,
          kecamatanId,
          disease,
          month_start,
        );
      }
    });

    await finishIngestJob(jobId, {
      status: "success",
      rows: months.length,
      latencyMs: Date.now() - startedAt,
      detail: `Impor ${disease}: ${months.length} baris diterima, 0 baris ditolak.`,
    });
    await logAudit({
      actor: PUSKESMAS_LABEL,
      role: "puskesmas",
      action: `Impor CSV kasus ${disease}`,
      details: `${months.length} baris masuk, 0 ditolak.`,
      status: "success",
    });
    notes.push(`${disease} ${months.map((m) => m.month_start.slice(0, 7)).reverse().join(", ")}`);
  }

  invalidatePeriodCache();
  return notes;
}

async function summary(kecamatanId: string): Promise<void> {
  const risks = await all<{ disease: string; month_start: string; risk_class: string | null }>(
    `SELECT disease, month_start, risk_class FROM prediksi p
      WHERE kecamatan_id = ?
        AND month_start = (SELECT MAX(month_start) FROM prediksi WHERE disease = p.disease)
      ORDER BY disease`,
    kecamatanId,
  );
  const queue = await all<{ id: string; kind: string; status: string }>(
    `SELECT id, kind, status FROM laporan_warga
      WHERE kecamatan = ? AND status IN ('menunggu', 'perlu_informasi')
      ORDER BY submitted_at DESC`,
    KECAMATAN,
  );

  console.log("\nPrakiraan Tugu yang akan tampil di beranda warga:");
  for (const r of risks) {
    console.log(`  ${r.disease.padEnd(14)} ${r.month_start.slice(0, 7)}  ${r.risk_class ?? "—"}`);
  }
  console.log(
    queue.length === 0
      ? "\nAntrean laporan Tugu kosong — laporan live akan jadi satu-satunya."
      : `\nMasih ada ${queue.length} laporan Tugu di antrean puskesmas (selesaikan saat gladi agar tidak membingungkan):\n` +
          queue.map((q) => `  ${q.id}  ${q.kind}  ${q.status}`).join("\n"),
  );
}

const kecamatan = await one<{ id: string }>(
  "SELECT id FROM kecamatan WHERE nama = ?",
  KECAMATAN,
);
if (!kecamatan) {
  console.error(`Kecamatan ${KECAMATAN} tidak ditemukan. Jalankan \`npm run seed\` dulu.`);
  process.exit(1);
}

const account = await ensurePuskesmasAccount(kecamatan.id);
console.log(`Akun ${PUSKESMAS_EMAIL} / ${PUSKESMAS_PASSWORD} (${PUSKESMAS_LABEL}, ${KECAMATAN}) ${account}.`);

const task = await ensureDemoTask();
console.log(`Tugas "${TASK_TITLE}" untuk ${KECAMATAN}: ${task}.`);

const cleared = await clearForwardedReports();
console.log(`Riwayat penerusan DLH/DPU dibersihkan: ${cleared} laporan dihapus.`);

const recap = await claimRecap(kecamatan.id);
console.log(`Rekap ${KECAMATAN} tercatat masuk dari ${PUSKESMAS_LABEL}: ${recap.join(" · ")}.`);

await summary(kecamatan.id);
await closeDb();
