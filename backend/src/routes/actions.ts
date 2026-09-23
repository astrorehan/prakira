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
  createManualAction,
  getAction,
  listAssignees,
  listActionHistory,
  listActionHistoryFor,
  listActionParts,
  listActionPartsFor,
  listActions,
  recordActionBlocker,
  recordActionProgress,
  reopenAction,
  setActionPublication,
  type ActionHistoryRow,
  type ActionPartRow,
} from "../services/actions.js";
import { requireRole, sessionScope } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { availableDiseases, reportingPeriod } from "../services/period.js";
import { ACTION_TYPE_LABEL, type ActionType } from "../services/action-rules.js";

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

function serializePart(part: ActionPartRow) {
  return {
    kecamatan: part.kecamatan,
    status: part.status,
    assignedAt: part.assigned_at,
    acknowledgement: part.acknowledged_at && part.acknowledgement_source
      ? {
          at: part.acknowledged_at,
          by: part.acknowledged_by,
          source: part.acknowledgement_source,
        }
      : null,
    blocker: part.blocker_note
      ? { note: part.blocker_note, at: part.blocked_at }
      : null,
    result: part.result_note
      ? {
          note: part.result_note,
          completedBy: part.completed_by,
          sopCompleted: parseList(part.sop_completed),
        }
      : null,
    completedAt: part.completed_at,
  };
}

type SerializedPart = ReturnType<typeof serializePart>;

/**
 * Keadaan pelaksanaan yang dilihat pembaca. Akun puskesmas melihat bagian
 * wilayahnya sendiri — itulah tugas yang ia kerjakan. Dinkes dan permukaan
 * lain melihat ringkasan seluruh kecamatan: diterima bila semua sudah
 * menerima, selesai bila semua sudah selesai.
 */
function progressView(
  row: { status: string; completed_at: string | null },
  parts: SerializedPart[],
  scope: string | undefined,
) {
  if (scope) {
    const own = parts.find((part) => part.kecamatan === scope);
    return {
      status: own ? own.status : row.status,
      completed_at: own ? own.completedAt : row.completed_at,
      acknowledgement: own?.acknowledgement ?? null,
      blocker: own?.blocker ?? null,
      result: own?.result ?? null,
    };
  }

  const latest = (values: (string | null | undefined)[]) =>
    values.filter((v): v is string => !!v).sort().at(-1) ?? null;
  const acknowledged = parts.length > 0 && parts.every((part) => part.acknowledgement);
  const done = parts.length > 0 && parts.every((part) => part.result);
  const blocked = parts.filter((part) => part.blocker);
  return {
    status: row.status,
    completed_at: row.completed_at,
    acknowledgement: acknowledged
      ? {
          at: latest(parts.map((part) => part.acknowledgement?.at)) as string,
          by: null,
          source: `${parts.length} puskesmas wilayah`,
        }
      : null,
    blocker: blocked.length > 0
      ? {
          note: blocked.map((part) => `${part.kecamatan}: ${part.blocker!.note}`).join(" · "),
          at: latest(blocked.map((part) => part.blocker!.at)),
        }
      : null,
    result: done
      ? {
          note: parts.map((part) => `${part.kecamatan}: ${part.result!.note}`).join("\n"),
          completedBy: null,
          /* Butir yang terlaksana di semua kecamatan. */
          sopCompleted: parts.reduce<string[]>(
            (common, part, index) =>
              index === 0
                ? part.result!.sopCompleted
                : common.filter((item) => part.result!.sopCompleted.includes(item)),
            [],
          ),
        }
      : null,
  };
}

function serialize(
  row: Awaited<ReturnType<typeof listActions>>[number],
  history: ActionHistoryRow[] = [],
  partRows: ActionPartRow[] = [],
  scope?: string,
) {
  const parts = partRows.map(serializePart);
  const targetKecamatan = JSON.parse(row.target_kecamatan) as string[];
  return {
    id: row.id,
    source: row.source,
    disease: row.disease,
    action_type: row.action_type,
    priority: row.priority,
    title: row.title,
    description: row.description,
    basis: row.basis,
    target_kecamatan: targetKecamatan,
    /* Sasaran yang belum diserahkan ke puskesmas mana pun. Puskesmas tidak
       perlu tahu wilayah lain yang masih menunggu keputusan Dinkes. */
    unassigned_kecamatan: scope
      ? []
      : targetKecamatan.filter((name) => !parts.some((part) => part.kecamatan === name)),
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
    ...progressView(row, parts, scope),
    /* Bagian per kecamatan: tiap puskesmas mengerjakan wilayahnya sendiri. */
    parts,
    publication: row.published_at
      ? {
          publishedAt: row.published_at,
          publishedBy: row.published_by,
        }
      : null,
    history: history.map(serializeHistory),
  };
}

/* Pembagian kerja: Dinkes menugaskan, membuka kembali, dan memutuskan
   publikasi; puskesmas menerima, mengerjakan, dan melaporkan hasilnya. */

/**
 * Akun puskesmas hanya melihat tindakan yang sudah ditugaskan ke wilayahnya.
 * Menjadi sasaran saja belum cukup: sebelum Dinkes memutuskan, tindakan itu
 * masih usulan, dan Dinkes boleh memilih puskesmas lain lebih dulu.
 */
function assignedTo(parts: ActionPartRow[], kecamatan: string): boolean {
  return parts.some((part) => part.kecamatan === kecamatan);
}

actionsRouter.param("id", (req, _res, next, id: string) => {
  const scope = sessionScope(req);
  if (!scope) return next();
  listActionParts(id)
    .then((parts) => {
      if (!assignedTo(parts, scope)) {
        next(new HttpError(404, "Tindakan tidak ditemukan."));
      } else {
        next();
      }
    })
    .catch(next);
});

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
    const scope = sessionScope(req);
    const published = all.filter(
      (row) => req.query.published !== "1" || row.published_at !== null,
    );
    const partRows = await listActionPartsFor(published.map((row) => row.id));
    const partsByAction = new Map<string, ActionPartRow[]>();
    for (const part of partRows) {
      const bucket = partsByAction.get(part.tindakan_id);
      if (bucket) bucket.push(part);
      else partsByAction.set(part.tindakan_id, [part]);
    }
    const rows = published.filter(
      (row) => !scope || assignedTo(partsByAction.get(row.id) ?? [], scope),
    );
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
      data: rows.map((row) =>
        serialize(
          row,
          byAction.get(row.id) ?? [],
          partsByAction.get(row.id) ?? [],
          scope,
        ),
      ),
    });
  }),
);

/* Daftar puskesmas yang bisa ditugasi, untuk formulir penugasan Dinkes.
   Didaftarkan sebelum `/:id` supaya "assignees" tidak terbaca sebagai id. */
actionsRouter.get(
  "/assignees",
  requireRole("dinas"),
  asyncRoute(async (_req, res) => {
    res.json({ data: await listAssignees() });
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
      data: await present(row, sessionScope(req)),
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

function optionalDate(value: unknown): string | null {
  const text = optionalText(value, "Tenggat");
  if (text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, "Tenggat harus berformat YYYY-MM-DD.");
  }
  return text;
}

/** Daftar teks; butir kosong dibuang, duplikat dirapatkan. */
function optionalList(value: unknown, field: string): string[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new HttpError(400, `${field} tidak valid.`);
  }
  return [...new Set((value as string[]).map((item) => item.trim()).filter(Boolean))];
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

/** Satu tindakan lengkap dengan riwayat dan bagiannya, dilihat dari sesi ini. */
async function present(
  row: Awaited<ReturnType<typeof listActions>>[number],
  scope: string | undefined,
) {
  const [history, parts] = await Promise.all([
    listActionHistory(row.id),
    listActionParts(row.id),
  ]);
  return serialize(row, history, parts, scope);
}

/**
 * Kecamatan yang dikerjakan akun puskesmas ini. Tanpa wilayah kerja, akun
 * tidak bisa mengerjakan bagian mana pun — lebih baik ditolak daripada
 * menebak atas nama wilayah lain.
 */
function workArea(req: Parameters<typeof sessionScope>[0]): string {
  const scope = sessionScope(req);
  if (!scope) {
    throw new HttpError(403, "Akun puskesmas ini belum punya wilayah kerja.");
  }
  return scope;
}

/**
 * Tugas manual Dinkes: dibuat dan langsung ditugaskan ke puskesmas pilihan.
 * Dasar penugasan wajib, sama seperti saran sistem wajib membawa "Dasar:".
 */
actionsRouter.post(
  "/",
  requireRole("dinas"),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const kecamatan = optionalList(body.kecamatan, "Daftar puskesmas") ?? [];
    if (kecamatan.length === 0) {
      throw new HttpError(400, "Pilih paling sedikit satu puskesmas.");
    }
    const dueDate = optionalDate(body.dueDate);
    if (!dueDate) throw new HttpError(400, "Tenggat wajib diisi.");

    const actionType = body.actionType ?? "lainnya";
    if (!(actionType in ACTION_TYPE_LABEL)) {
      throw new HttpError(400, "Jenis tindakan tidak dikenal.");
    }
    const priority = body.priority ?? "medium";
    if (!["high", "medium", "low"].includes(priority)) {
      throw new HttpError(400, "Prioritas harus high, medium, atau low.");
    }
    const disease = requireText(body.disease, "Penyakit").toUpperCase();
    if (!(await availableDiseases()).includes(disease)) {
      throw new HttpError(400, `Penyakit ${disease} tidak dikenal.`);
    }

    const created = await guarded(() =>
      createManualAction(
        {
          title: requireText(body.title, "Judul tugas"),
          description: optionalText(body.description, "Uraian tugas") ?? "",
          reason: requireText(body.reason, "Dasar penugasan"),
          disease,
          actionType: actionType as ActionType,
          priority,
          kecamatan,
          dueDate,
          sopChecklist: optionalList(body.sopChecklist, "Langkah SOP") ?? [],
          pic: optionalText(body.pic, "Nama PIC"),
          note: optionalText(body.note, "Catatan penugasan"),
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    res.status(201).json({ data: await present(created, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/assign",
  requireRole("dinas"),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const dueDate = optionalDate(body.dueDate);

    const updated = await guarded(() =>
      assignAction(
        req.params.id,
        {
          kecamatan: optionalList(body.kecamatan, "Daftar kecamatan"),
          unit: optionalText(body.unit, "Unit pelaksana"),
          pic: optionalText(body.pic, "Nama PIC"),
          dueDate,
          note: optionalText(body.note, "Catatan penugasan"),
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/acknowledge",
  requireRole("puskesmas"),
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const updated = await guarded(() =>
      acknowledgeAction(
        req.params.id,
        workArea(req),
        {
          source: requireText(body.source, "Sumber konfirmasi"),
          note: optionalText(body.note, "Catatan konfirmasi"),
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/blocker",
  requireRole("puskesmas"),
  asyncRoute(async (req, res) => {
    const note = requireText((req.body ?? {}).note, "Kendala");
    const updated = await guarded(() =>
      recordActionBlocker(
        req.params.id,
        workArea(req),
        note,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/progress",
  requireRole("puskesmas"),
  asyncRoute(async (req, res) => {
    const note = requireText((req.body ?? {}).note, "Catatan pelaksanaan");
    const updated = await guarded(() =>
      recordActionProgress(
        req.params.id,
        workArea(req),
        note,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/complete",
  requireRole("puskesmas"),
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
        workArea(req),
        {
          resultNote: requireText(body.resultNote, "Catatan hasil"),
          sopCompleted: sop as string[] | undefined,
        },
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

actionsRouter.post(
  "/:id/reopen",
  requireRole("dinas"),
  asyncRoute(async (req, res) => {
    const reason = requireText((req.body ?? {}).reason, "Alasan membuka kembali");
    const kecamatan = optionalText((req.body ?? {}).kecamatan, "Kecamatan");
    const updated = await guarded(() =>
      reopenAction(
        req.params.id,
        kecamatan,
        reason,
        req.session!.label,
        req.session!.role,
      ),
    );
    if (!updated) throw new HttpError(404, "Tindakan tidak ditemukan.");
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);

/**
 * Keputusan penerbitan informasi publik (F15). Terpisah dari status pekerjaan
 * dengan sengaja: warga hanya boleh melihat kegiatan yang sudah ditinjau untuk
 * publikasi, bukan setiap usulan yang keluar dari mesin aturan.
 */
actionsRouter.post(
  "/:id/publication",
  requireRole("dinas"),
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
    res.json({ data: await present(updated, sessionScope(req)) });
  }),
);
