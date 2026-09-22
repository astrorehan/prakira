/**
 * Mesin aturan rekomendasi tindakan (PRD §5.2).
 *
 * Deterministik, bukan ML: masukan adalah kelas risiko, penyakit, pemicu iklim
 * dominan dari model, dan populasi kecamatan target. Setiap rekomendasi wajib
 * membawa kalimat "Dasar:" yang menyebut variabel pemicunya — rekomendasi
 * tanpa alasan dilarang terbit, jadi kecamatan tanpa prediksi tidak pernah
 * menghasilkan tindakan sama sekali.
 *
 * Regenerasi bersifat idempoten: `id` diturunkan dari penyakit + jenis aksi +
 * bulan prediksi, sehingga status yang sudah diubah petugas (dikirim, selesai)
 * bertahan saat prediksi diperbarui.
 */
import { all, one, run } from "../db/index.js";
import { getDistricts, type DistrictPayload } from "./districts.js";
import { monthLabel } from "./period.js";
import {
  ACTION_TYPE_LABEL,
  templatesFor,
  type ActionTemplate,
  type RiskClass,
} from "./action-rules.js";
import { logAudit } from "./audit.js";

export type ActionRow = {
  id: string;
  disease: string;
  action_type: string;
  priority: "high" | "medium" | "low";
  status: ActionStatus;
  title: string;
  description: string;
  basis: string;
  target_kecamatan: string;
  target_population: number;
  due_date: string;
  lead_time_days: number;
  estimated_impact: string;
  climate_trigger: string | null;
  sop_checklist: string;
  pic_unit: string;
  broadcast_draft: string;
  prediction_month: string;
  predicted_lower: number;
  predicted_upper: number;
  data_coverage: string;
  generated_at: string;
  dispatched_at: string | null;
  dispatched_by: string | null;
  completed_at: string | null;
  assigned_unit: string | null;
  assigned_pic: string | null;
  assignment_note: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  agreed_due_date: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledgement_source: string | null;
  blocker_note: string | null;
  blocked_at: string | null;
  result_note: string | null;
  completed_by: string | null;
  sop_completed: string | null;
  published_at: string | null;
  published_by: string | null;
};

/**
 * Model status minimal audit §7.A: Perlu keputusan -> Ditugaskan -> Dikerjakan
 * -> Selesai. `in_progress` dipertahankan sebagai "dikerjakan" supaya baris
 * lama yang sudah ditandai berjalan tidak berubah arti saat gateway naik.
 */
export type ActionStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed";

export type ActionHistoryEvent =
  | "ditugaskan"
  | "dikonfirmasi"
  | "kendala"
  | "catatan"
  | "selesai"
  | "dibuka_kembali"
  | "dipublikasikan"
  | "publikasi_ditarik";

export type ActionHistoryRow = {
  id: number;
  tindakan_id: string;
  ts: string;
  event: ActionHistoryEvent;
  actor: string;
  role: string;
  detail: string;
};

const PRIORITY_OF: Record<RiskClass, "high" | "medium" | "low"> = {
  tinggi: "high",
  sedang: "medium",
  rendah: "low",
};

const COVERAGE_RANK: Record<string, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const COVERAGE_LABEL: Record<string, string> = {
  high: "tinggi",
  medium: "sedang",
  low: "rendah",
  insufficient: "tidak memadai",
};

/** Membangun ulang antrean tindakan untuk seluruh penyakit yang punya prediksi. */
export async function regenerateActions(diseases: string[]): Promise<number> {
  let generated = 0;
  for (const disease of diseases) {
    generated += await regenerateForDisease(disease);
  }
  return generated;
}

async function regenerateForDisease(disease: string): Promise<number> {
  const districts = await getDistricts(disease);
  const withPrediction = districts.filter(
    (d) => d.tingkat_risiko !== null && d.periode_prediksi !== null,
  );
  if (withPrediction.length === 0) return 0;

  const predictionMonth = withPrediction[0].periode_prediksi as string;
  const upper = disease.toUpperCase();

  /* Tindakan untuk bulan prediksi lain sudah tidak relevan; yang belum pernah
     dikirim dibuang, yang sudah dikirim disimpan sebagai riwayat. */
  await run(
    `DELETE FROM tindakan
      WHERE disease = ? AND prediction_month <> ?
        AND dispatched_at IS NULL AND assigned_at IS NULL`,
    upper,
    predictionMonth,
  );

  let count = 0;

  for (const riskClass of ["tinggi", "sedang"] as RiskClass[]) {
    const group = withPrediction.filter((d) => d.tingkat_risiko === riskClass);
    if (group.length === 0) continue;

    for (const template of templatesFor(upper, riskClass)) {
      await upsertAction(upper, riskClass, predictionMonth, group, template);
      count += 1;
    }
  }

  return count;
}

async function upsertAction(
  disease: string,
  riskClass: RiskClass,
  predictionMonth: string,
  group: DistrictPayload[],
  template: ActionTemplate,
): Promise<void> {
  const id = `ACT-${disease}-${template.actionType.toUpperCase()}-${predictionMonth.slice(0, 7)}`;

  const sorted = [...group].sort(
    (a, b) => (b.skor_risiko ?? 0) - (a.skor_risiko ?? 0),
  );
  const names = sorted.map((d) => d.nama);
  const population = sorted.reduce((sum, d) => sum + d.populasi, 0);
  const lower = sorted.reduce(
    (sum, d) => sum + (d.kasus_prediksi_lower ?? 0),
    0,
  );
  const upper = sorted.reduce(
    (sum, d) => sum + (d.kasus_prediksi_upper ?? 0),
    0,
  );

  /* Cakupan gabungan mengikuti kecamatan paling tipis datanya: instruksi
     hanya sekuat masukannya yang paling lemah. */
  const coverage = sorted.reduce(
    (worst, d) =>
      COVERAGE_RANK[d.coverage] < COVERAGE_RANK[worst] ? d.coverage : worst,
    "high" as string,
  );

  const basis = buildBasis({
    disease,
    riskClass,
    predictionMonth,
    group: sorted,
    lower,
    upper,
    coverage,
  });
  const climateTrigger = buildClimateTrigger(sorted);
  const label = monthLabel(predictionMonth);

  const estimatedImpact =
    `Menjangkau ${population.toLocaleString("id-ID")} jiwa di ${sorted.length} kecamatan. ` +
    `Proyeksi tanpa intervensi: ${lower.toLocaleString("id-ID")}–${upper.toLocaleString("id-ID")} kasus ${disease} pada ${label}.`;

  const broadcast = buildBroadcast({
    disease,
    label,
    names,
    actionLabel: ACTION_TYPE_LABEL[template.actionType],
    lower,
    upper,
    basis,
  });

  const existing = await one<{ id: string }>(
    "SELECT id FROM tindakan WHERE id = ?",
    id,
  );
  const generatedAt = new Date().toISOString();

  if (existing) {
    await run(
      `UPDATE tindakan SET
         priority = ?, title = ?, description = ?, basis = ?,
         target_kecamatan = ?, target_population = ?, due_date = ?, lead_time_days = ?,
         estimated_impact = ?, climate_trigger = ?, sop_checklist = ?, pic_unit = ?,
         broadcast_draft = ?, predicted_lower = ?, predicted_upper = ?, data_coverage = ?,
         generated_at = ?
       WHERE id = ?`,
      PRIORITY_OF[riskClass],
      template.title,
      template.description,
      basis,
      JSON.stringify(names),
      population,
      predictionMonth,
      template.leadTimeDays,
      estimatedImpact,
      climateTrigger,
      JSON.stringify(template.sopChecklist),
      template.picUnit,
      broadcast,
      lower,
      upper,
      coverage,
      generatedAt,
      id,
    );
    return;
  }

  await run(
    `INSERT INTO tindakan
       (id, disease, action_type, priority, status, title, description, basis,
        target_kecamatan, target_population, due_date, lead_time_days, estimated_impact,
        climate_trigger, sop_checklist, pic_unit, broadcast_draft, prediction_month,
        predicted_lower, predicted_upper, data_coverage, generated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    disease,
    template.actionType,
    PRIORITY_OF[riskClass],
    template.title,
    template.description,
    basis,
    JSON.stringify(names),
    population,
    predictionMonth,
    template.leadTimeDays,
    estimatedImpact,
    climateTrigger,
    JSON.stringify(template.sopChecklist),
    template.picUnit,
    broadcast,
    predictionMonth,
    lower,
    upper,
    coverage,
    generatedAt,
  );
}

function buildBasis(input: {
  disease: string;
  riskClass: RiskClass;
  predictionMonth: string;
  group: DistrictPayload[];
  lower: number;
  upper: number;
  coverage: string;
}): string {
  const label = monthLabel(input.predictionMonth);
  const names = input.group.map((d) => d.nama).join(", ");

  let opening = `Dasar: kelas risiko ${input.disease} ${input.riskClass} pada ${label} di ${input.group.length} kecamatan (${names})`;

  const drivers = dominantDrivers(input.group);
  if (drivers.length > 0) {
    const phrases = drivers.map(
      (d) =>
        `${d.label} ${d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${d.unit} (persentil ${d.percentile} historis)`,
    );
    opening += `, dipicu ${phrases.join(" dan ")}`;
  }

  return (
    [
      opening,
      `Ketidakpastian: proyeksi ${input.lower.toLocaleString("id-ID")}–${input.upper.toLocaleString("id-ID")} kasus`,
      `Cakupan data kecamatan: ${COVERAGE_LABEL[input.coverage] ?? input.coverage}`,
    ].join(". ") + "."
  );
}

/** Dua fitur pemicu yang paling sering muncul sebagai driver di grup ini. */
function dominantDrivers(group: DistrictPayload[]) {
  const tally = new Map<
    string,
    {
      label: string;
      unit: string;
      count: number;
      value: number;
      percentile: number;
    }
  >();

  for (const district of group) {
    for (const driver of district.drivers) {
      const entry = tally.get(driver.feature);
      if (entry) {
        entry.count += 1;
        entry.value += driver.value;
        entry.percentile += driver.percentile;
      } else {
        tally.set(driver.feature, {
          label: driver.label,
          unit: driver.unit,
          count: 1,
          value: driver.value,
          percentile: driver.percentile,
        });
      }
    }
  }

  return [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((entry) => ({
      label: entry.label,
      unit: entry.unit,
      value: entry.value / entry.count,
      percentile: Math.round(entry.percentile / entry.count),
    }));
}

function buildClimateTrigger(group: DistrictPayload[]): string | null {
  const rain = average(group.map((d) => d.cuaca.curah_hujan_mm));
  const temp = average(group.map((d) => d.cuaca.suhu_c));
  const humidity = average(group.map((d) => d.cuaca.kelembaban_pct));

  const parts: string[] = [];
  if (rain !== null) parts.push(`curah hujan rata-rata ${rain.toFixed(1)} mm`);
  if (temp !== null) parts.push(`suhu ${temp.toFixed(1)} °C`);
  if (humidity !== null) parts.push(`kelembaban ${humidity.toFixed(1)}%`);
  if (parts.length === 0) return null;

  return `Observasi bulan terakhir di kecamatan target: ${parts.join(", ")}.`;
}

function average(values: (number | null)[]): number | null {
  const usable = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (usable.length === 0) return null;
  return usable.reduce((s, v) => s + v, 0) / usable.length;
}

/**
 * Draf siaran. Sengaja tanpa nomor surat dan tanpa nama pejabat: keduanya
 * hanya bisa diisi oleh dinas, dan mengarangnya di sistem berarti mengirim
 * dokumen yang tampak resmi padahal tidak.
 */
function buildBroadcast(input: {
  disease: string;
  label: string;
  names: string[];
  actionLabel: string;
  lower: number;
  upper: number;
  basis: string;
}): string {
  return [
    `[DRAF INSTRUKSI — PRAKIRA · ${input.disease} · ${input.label}]`,
    "",
    `Kepada puskesmas wilayah: ${input.names.join(", ")}.`,
    `Tindakan: ${input.actionLabel}.`,
    input.basis,
    "",
    "Draf ini dihasilkan sistem pendukung keputusan. Nomor surat, pejabat penanda tangan, dan tanggal pelaksanaan diisi oleh dinas sebelum diedarkan.",
  ].join("\n");
}

/* ── Pembacaan ───────────────────────────────────────────────────────────── */

export function listActions(disease?: string): Promise<ActionRow[]> {
  return disease
    ? all<ActionRow>(
        "SELECT * FROM tindakan WHERE disease = ? ORDER BY due_date, priority",
        disease.toUpperCase(),
      )
    : all<ActionRow>("SELECT * FROM tindakan ORDER BY due_date, priority");
}

export function getAction(id: string): Promise<ActionRow | null> {
  return one<ActionRow>("SELECT * FROM tindakan WHERE id = ?", id);
}

export class ActionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionTransitionError";
  }
}

/**
 * Penugasan (F04). Sebelum ini antarmuka hanya bisa menulis "berjalan": tidak
 * ada tempat untuk PIC, tenggat yang disepakati, atau kalimat penugasan, jadi
 * produk mencatat awal pekerjaan tanpa pemiliknya.
 */
export async function assignAction(
  id: string,
  input: {
    unit: string;
    pic?: string | null;
    dueDate?: string | null;
    note?: string | null;
  },
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  if (existing.status === "completed") {
    throw new ActionTransitionError(
      "Tindakan yang sudah selesai tidak dapat ditugaskan ulang. Buka kembali lebih dulu bila hasilnya perlu diperbaiki.",
    );
  }

  const now = new Date().toISOString();
  const unit = input.unit.trim();
  const pic = input.pic?.trim() || null;
  const dueDate = input.dueDate?.trim() || null;
  const note = input.note?.trim() || null;

  await run(
    `UPDATE tindakan
        SET status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
            assigned_unit = ?, assigned_pic = ?, assignment_note = ?,
            agreed_due_date = ?, assigned_at = COALESCE(assigned_at, ?), assigned_by = ?,
            dispatched_at = COALESCE(dispatched_at, ?), dispatched_by = COALESCE(dispatched_by, ?)
      WHERE id = ?`,
    unit,
    pic,
    note,
    dueDate,
    now,
    actor,
    now,
    actor,
    id,
  );

  await appendHistory(id, "ditugaskan", actor, role, {
    detail:
      `Ditugaskan ke ${unit}${pic ? ` (${pic})` : ""}` +
      (dueDate ? `, tenggat ${dueDate}` : ", tanpa tenggat yang disepakati") +
      (note ? `. ${note}` : "."),
    now,
  });

  await logAudit({
    actor,
    role,
    action: `Penugasan tindakan ${id}`,
    details: `${existing.title} ditugaskan ke ${unit}${pic ? ` (${pic})` : ""}.`,
    status: "info",
  });

  return getAction(id);
}

/**
 * Konfirmasi penerimaan tugas. `source` membedakan pengakuan pelaksana sendiri
 * dari konfirmasi yang dicatat koordinator dari kanal kerja di luar aplikasi —
 * audit §7.A.6 menuntut sumber konfirmasi itu disebut, bukan disamarkan.
 */
export async function acknowledgeAction(
  id: string,
  input: { source: string; note?: string | null },
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  if (existing.status === "pending") {
    throw new ActionTransitionError(
      "Tindakan belum ditugaskan. Tetapkan unit pelaksana lebih dulu.",
    );
  }
  if (existing.status === "completed") {
    throw new ActionTransitionError("Tindakan sudah berstatus selesai.");
  }

  const now = new Date().toISOString();
  const source = input.source.trim();
  const note = input.note?.trim() || null;

  await run(
    `UPDATE tindakan
        SET status = 'in_progress',
            acknowledged_at = COALESCE(acknowledged_at, ?),
            acknowledged_by = ?, acknowledgement_source = ?
      WHERE id = ?`,
    now,
    actor,
    source,
    id,
  );

  await appendHistory(id, "dikonfirmasi", actor, role, {
    detail: `Penerimaan tugas dikonfirmasi — sumber: ${source}${note ? `. ${note}` : "."}`,
    now,
  });

  return getAction(id);
}

/** Kendala pelaksanaan. Statusnya tidak berubah: tugas tetap terbuka. */
export async function recordActionBlocker(
  id: string,
  note: string,
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;

  const text = note.trim();
  if (!text) {
    throw new ActionTransitionError("Kendala wajib dijelaskan agar dapat ditindaklanjuti.");
  }
  const now = new Date().toISOString();

  await run(
    "UPDATE tindakan SET blocker_note = ?, blocked_at = ? WHERE id = ?",
    text,
    now,
    id,
  );
  await appendHistory(id, "kendala", actor, role, { detail: text, now });

  return getAction(id);
}

/** Catatan perkembangan. Hanya menambah riwayat — tidak mengubah keadaan. */
export async function recordActionProgress(
  id: string,
  note: string,
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  const text = note.trim();
  if (!text) {
    throw new ActionTransitionError("Catatan pelaksanaan tidak boleh kosong.");
  }
  await appendHistory(id, "catatan", actor, role, { detail: text });
  return getAction(id);
}

/**
 * Penyelesaian tugas. Hasil wajib ditulis: audit §5.F04 menolak "Selesai" yang
 * hanya berarti seseorang menekan tombol. Butir SOP yang tercentang ikut
 * disimpan di sini — selama ia hanya hidup di state modal, tampilannya
 * menyerupai bukti pelaksanaan yang tidak pernah tersimpan.
 */
export async function completeAction(
  id: string,
  input: { resultNote: string; sopCompleted?: string[] },
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  if (existing.status === "pending") {
    throw new ActionTransitionError(
      "Tindakan belum ditugaskan. Tetapkan unit pelaksana lebih dulu.",
    );
  }

  const result = input.resultNote.trim();
  if (!result) {
    throw new ActionTransitionError(
      "Penyelesaian wajib menyertakan catatan hasil yang dapat dibaca orang lain.",
    );
  }

  const now = new Date().toISOString();
  const checked = input.sopCompleted ?? [];

  await run(
    `UPDATE tindakan
        SET status = 'completed', completed_at = COALESCE(completed_at, ?),
            completed_by = ?, result_note = ?, sop_completed = ?,
            blocker_note = NULL, blocked_at = NULL
      WHERE id = ?`,
    now,
    actor,
    result,
    JSON.stringify(checked),
    id,
  );

  await appendHistory(id, "selesai", actor, role, {
    detail:
      `Hasil: ${result}` +
      (checked.length > 0
        ? ` — ${checked.length} butir SOP tercatat terlaksana.`
        : " — tanpa butir SOP yang dicentang."),
    now,
  });

  await logAudit({
    actor,
    role,
    action: `Penyelesaian tindakan ${id}`,
    details: `${existing.title} diselesaikan. ${result}`,
    status: "success",
  });

  return getAction(id);
}

/** Membuka kembali tugas yang ditutup terlalu cepat. Alasan wajib. */
export async function reopenAction(
  id: string,
  reason: string,
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  if (existing.status !== "completed") {
    throw new ActionTransitionError("Tindakan ini belum berstatus selesai.");
  }
  const text = reason.trim();
  if (!text) {
    throw new ActionTransitionError("Membuka kembali tugas wajib menyertakan alasan.");
  }

  await run(
    `UPDATE tindakan
        SET status = 'in_progress', completed_at = NULL, completed_by = NULL
      WHERE id = ?`,
    id,
  );
  await appendHistory(id, "dibuka_kembali", actor, role, { detail: text });

  return getAction(id);
}

/**
 * Persetujuan publikasi (F15). Halaman layanan publik membaca rekomendasi
 * tindakan dan menerjemahkan statusnya menjadi kegiatan; tanpa keputusan
 * penerbitan tersendiri, usulan sistem terbaca warga sebagai kegiatan dinas.
 */
export async function setActionPublication(
  id: string,
  published: boolean,
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;
  if (published && existing.status === "pending") {
    throw new ActionTransitionError(
      "Usulan yang belum ditugaskan tidak dapat ditampilkan kepada warga.",
    );
  }

  const now = new Date().toISOString();
  await run(
    "UPDATE tindakan SET published_at = ?, published_by = ? WHERE id = ?",
    published ? now : null,
    published ? actor : null,
    id,
  );

  await appendHistory(
    id,
    published ? "dipublikasikan" : "publikasi_ditarik",
    actor,
    role,
    {
      detail: published
        ? "Ditinjau dan disetujui untuk ditampilkan di layanan publik."
        : "Ditarik dari layanan publik; kembali menjadi usulan internal.",
      now,
    },
  );

  await logAudit({
    actor,
    role,
    action: `Publikasi tindakan ${id}`,
    details: published
      ? `${existing.title} disetujui tampil di layanan publik.`
      : `${existing.title} ditarik dari layanan publik.`,
    status: "info",
  });

  return getAction(id);
}

async function appendHistory(
  id: string,
  event: ActionHistoryEvent,
  actor: string,
  role: string,
  options: { detail?: string; now?: string } = {},
): Promise<void> {
  await run(
    `INSERT INTO tindakan_riwayat (tindakan_id, ts, event, actor, role, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    options.now ?? new Date().toISOString(),
    event,
    actor,
    role,
    options.detail ?? "",
  );
}

export function listActionHistory(id: string): Promise<ActionHistoryRow[]> {
  return all<ActionHistoryRow>(
    "SELECT * FROM tindakan_riwayat WHERE tindakan_id = ? ORDER BY ts, id",
    id,
  );
}

export async function listActionHistoryFor(
  ids: string[],
): Promise<ActionHistoryRow[]> {
  if (ids.length === 0) return [];
  return all<ActionHistoryRow>(
    `SELECT * FROM tindakan_riwayat
      WHERE tindakan_id = ANY(?::text[])
      ORDER BY ts, id`,
    ids,
  );
}

/** Statistik kecil yang dipakai strip dashboard tanpa menarik seluruh antrean. */
export async function pendingActionCount(disease?: string): Promise<number> {
  const row = disease
    ? await one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM tindakan WHERE status = 'pending' AND disease = ?",
        disease.toUpperCase(),
      )
    : await one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM tindakan WHERE status = 'pending'",
      );
  return row?.n ?? 0;
}

/** Menghapus antrean — dipakai saat dataset di-seed ulang. */
export async function clearActions(): Promise<void> {
  await run("DELETE FROM tindakan");
}
