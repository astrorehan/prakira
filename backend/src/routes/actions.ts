/**
 * Antrean aksi dini. Membaca terbuka untuk konsol; setiap perubahan menuntut
 * sesi, karena penugasan, konfirmasi, kendala, dan hasil tercatat atas nama
 * seseorang di riwayat tindakan dan di audit trail.
 *
 * Rute perubahan sengaja berupa kejadian (`/assign`, `/acknowledge`,
 * `/complete`), bukan satu `PATCH status`. Penulisan status tunggal adalah
 * persis yang membuat produk hanya mencatat awal pekerjaan: tidak ada tempat
 * untuk menyebut siapa mengerjakan dan apa hasilnya.
 */
import { Router } from "express";
import {
  ActionTransitionError,
  acknowledgeAction,
  assignAction,
  completeAction,
  getAction,
  listActionHistory,
  listActionHistoryFor,
  listActions,
  recordActionBlocker,
  recordActionProgress,
  reopenAction,
  setActionPublication,
  type ActionHistoryRow,
} from "../services/actions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { reportingPeriod } from "../services/period.js";

export const actionsRouter = Router();

function serializeHistory(row: ActionHistoryRow) {
  return {
    id: row.id,
    ts: row.ts,
    event: row.event,
    actor: row.actor,
    role: row.role,
    detail: row.detail,
  };
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function serialize(
  row: Awaited<ReturnType<typeof listActions>>[number],
  history: ActionHistoryRow[] = [],
) {
  return {
    id: row.id,
    disease: row.disease,
    action_type: row.action_type,
    priority: row.priority,
    status: row.status,
    title: row.title,
    description: row.description,
    basis: row.basis,
    target_kecamatan: JSON.parse(row.target_kecamatan) as string[],
    target_population: row.target_population,
    due_date: row.due_date,
    lead_time_days: row.lead_time_days,
    estimated_impact: row.estimated_impact,
    climate_trigger: row.climate_trigger,
    sop_checklist: JSON.parse(row.sop_checklist) as string[],
    pic_unit: row.pic_unit,
    broadcast_draft: row.broadcast_draft,
    prediction_month: row.prediction_month,
    predicted_lower: row.predicted_lower,
    predicted_upper: row.predicted_upper,
    data_coverage: row.data_coverage,
    generated_at: row.generated_at,
    dispatched_at: row.dispatched_at,
    dispatched_by: row.dispatched_by,
    completed_at: row.completed_at,
    /* Penugasan sampai hasil. Tenggat yang disepakati dipisahkan dari
       `due_date` usulan mesin aturan supaya ketepatan waktu dihitung dari
       kesepakatan manusia. */
    assignment: row.assigned_unit && row.assigned_at
      ? {
          unit: row.assigned_unit,
          pic: row.assigned_pic,
          note: row.assignment_note,
          assignedAt: row.assigned_at,
          assignedBy: row.assigned_by,
          agreedDueDate: row.agreed_due_date,
        }
      : null,
    acknowledgement: row.acknowledged_at && row.acknowledgement_source
      ? {
          at: row.acknowledged_at,
          by: row.acknowledged_by,
          source: row.acknowledgement_source,
        }
      : null,
    blocker: row.blocker_note
      ? { note: row.blocker_note, at: row.blocked_at }
      : null,
    result: row.result_note
      ? {
          note: row.result_note,
          completedBy: row.completed_by,
          sopCompleted: parseList(row.sop_completed),
        }
      : null,
    publication: row.published_at
      ? {
          publishedAt: row.published_at,
          publishedBy: row.published_by,
        }
      : null,
    history: history.map(serializeHistory),
  };
}

actionsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease : undefined;
    const [all, meta] = await Promise.all([
      listActions(disease),
      reportingPeriod(disease),
    ]);
    /* F15: permukaan publik meminta `published=1` dan hanya menerima kegiatan
       yang sudah ditinjau untuk diterbitkan. Menyaring di sini, bukan di
       peramban, supaya usulan internal tidak ikut terkirim sama sekali. */
    const rows =
      req.query.published === "1"
        ? all.filter((row) => row.published_at !== null)
        : all;
    /* Riwayat cukup diambil untuk baris yang benar-benar akan dikirim. */
    const history = await listActionHistoryFor(rows.map((row) => row.id));
    const byAction = new Map<string, ActionHistoryRow[]>();
    for (const entry of history) {
      const bucket = byAction.get(entry.tindakan_id);
      if (bucket) bucket.push(entry);
      else byAction.set(entry.tindakan_id, [entry]);
    }

    res.json({
      meta,
      data: rows.map((row) => serialize(row, byAction.get(row.id) ?? [])),
    });
  }),
);

/* Satu tindakan, untuk permukaan yang memang hanya butuh satu — halaman nota
   dinas membuka satu id langsung dari tautan, tanpa perlu menarik seluruh
   antrean lalu membuang sisanya. Tetap terbuka untuk dibaca: isinya instruksi
   wilayah, bukan identitas pelapor. */
actionsRouter.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const row = await getAction(req.params.id);
    if (!row) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({
      meta: await reportingPeriod(row.disease),
      data: serialize(row, await listActionHistory(row.id)),
    });
  }),
);

/** Teks wajib, dengan pesan kesalahan yang menyebut kolomnya. */
function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${field} wajib diisi.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} tidak valid.`);
  }
  return value.trim() || null;
}

/** Membungkus pelanggaran urutan kerja menjadi 409, bukan 500. */
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ActionTransitionError) {
      throw new HttpError(409, error.message);
    }
    throw error;
  }
}

actionsRouter.post(
  "/:id/assign",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const unit = requireText(body.unit, "Unit pelaksana");
    const dueDate = optionalText(body.dueDate, "Tenggat");
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new HttpError(400, "Tenggat harus berformat YYYY-MM-DD.");
    }

    const updated = await guarded(() =>
      assignAction(
        req.params.id,
        {
          unit,
          pic: optionalText(body.pic, "Nama PIC"),
          dueDate,
          note: optionalText(body.note, "Catatan penugasan"),
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

actionsRouter.post(
  "/:id/acknowledge",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const updated = await guarded(() =>
      acknowledgeAction(
        req.params.id,
        {
          source: requireText(body.source, "Sumber konfirmasi"),
          note: optionalText(body.note, "Catatan konfirmasi"),
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

actionsRouter.post(
  "/:id/blocker",
  requireAuth,
  asyncRoute(async (req, res) => {
    const note = requireText((req.body ?? {}).note, "Kendala");
    const updated = await guarded(() =>
      recordActionBlocker(
        req.params.id,
        note,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

actionsRouter.post(
  "/:id/progress",
  requireAuth,
  asyncRoute(async (req, res) => {
    const note = requireText((req.body ?? {}).note, "Catatan pelaksanaan");
    const updated = await guarded(() =>
      recordActionProgress(
        req.params.id,
        note,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

actionsRouter.post(
  "/:id/complete",
  requireAuth,
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const sop = body.sopCompleted;
    if (
      sop !== undefined &&
      (!Array.isArray(sop) || sop.some((item) => typeof item !== "string"))
    ) {
      throw new HttpError(400, "Daftar butir SOP tidak valid.");
    }

    const updated = await guarded(() =>
      completeAction(
        req.params.id,
        {
          resultNote: requireText(body.resultNote, "Catatan hasil"),
          sopCompleted: sop as string[] | undefined,
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

actionsRouter.post(
  "/:id/reopen",
  requireAuth,
  asyncRoute(async (req, res) => {
    const reason = requireText((req.body ?? {}).reason, "Alasan membuka kembali");
    const updated = await guarded(() =>
      reopenAction(
        req.params.id,
        reason,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);

/**
 * Keputusan penerbitan informasi publik (F15). Terpisah dari status pekerjaan
 * dengan sengaja: warga hanya boleh melihat kegiatan yang sudah ditinjau untuk
 * publikasi, bukan setiap usulan yang keluar dari mesin aturan.
 */
actionsRouter.post(
  "/:id/publication",
  requireAuth,
  asyncRoute(async (req, res) => {
    const published = (req.body ?? {}).published;
    if (typeof published !== "boolean") {
      throw new HttpError(400, "Nilai 'published' harus true atau false.");
    }
    const updated = await guarded(() =>
      setActionPublication(
        req.params.id,
        published,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: serialize(updated, await listActionHistory(updated.id)) });
  }),
);
