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
  status: "pending" | "in_progress" | "completed";
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
      WHERE disease = ? AND prediction_month <> ? AND dispatched_at IS NULL`,
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

export async function updateActionStatus(
  id: string,
  status: ActionRow["status"],
  actor: string,
  role: string,
): Promise<ActionRow | null> {
  const existing = await getAction(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const dispatchedAt =
    status === "pending" ? null : (existing.dispatched_at ?? now);
  const completedAt =
    status === "completed" ? (existing.completed_at ?? now) : null;

  await run(
    `UPDATE tindakan
        SET status = ?, dispatched_at = ?, dispatched_by = ?, completed_at = ?
      WHERE id = ?`,
    status,
    dispatchedAt,
    status === "pending" ? null : actor,
    completedAt,
    id,
  );

  await logAudit({
    actor,
    role,
    action: `Status tindakan ${id}`,
    details: `${existing.status} -> ${status} (${existing.title}).`,
    status: "info",
  });

  return getAction(id);
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
