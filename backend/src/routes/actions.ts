/**
 * Antrean aksi dini. Membaca terbuka untuk konsol; mengubah status menuntut
 * sesi, karena setiap perubahan tercatat atas nama seseorang di audit trail.
 */
import { Router } from "express";
import {
  getAction,
  listActions,
  updateActionStatus,
} from "../services/actions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../middleware/error.js";
import { reportingPeriod } from "../services/period.js";

export const actionsRouter = Router();

const STATUSES = new Set(["pending", "in_progress", "completed"]);

function serialize(row: Awaited<ReturnType<typeof listActions>>[number]) {
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
  };
}

actionsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const disease =
      typeof req.query.disease === "string" ? req.query.disease : undefined;
    const rows = await listActions(disease);
    res.json({
      meta: await reportingPeriod(disease),
      data: rows.map(serialize),
    });
  }),
);

actionsRouter.patch(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const status = (req.body ?? {}).status;
    if (typeof status !== "string" || !STATUSES.has(status)) {
      throw new HttpError(
        400,
        "Status harus salah satu dari: pending, in_progress, completed.",
      );
    }

    const existing = await getAction(req.params.id);
    if (!existing) throw new HttpError(404, "Tindakan tidak ditemukan.");

    const updated = await updateActionStatus(
      req.params.id,
      status as "pending" | "in_progress" | "completed",
      req.session!.label,
      req.session!.role,
    );

    res.json({ data: updated ? serialize(updated) : null });
  }),
);
