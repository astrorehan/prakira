"use client";

import * as React from "react";
import { AlertTriangle, Clock, Info, RotateCcw, Send, Users, Zap } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";
import { updateActionStatus } from "@/lib/api";
import {
  sortQueue,
  summarizeQueue,
  toQueuedAction,
  type QueuedAction,
} from "@/lib/action-queue";
import { ActionQueue } from "./action-queue";
import { DispatchActionModal } from "./dispatch-action-modal";
import { ConsoleToast, useConsoleToast } from "./console/toast";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface EarlyActionCenterProps {
  recommendations: ActionRecommendation[];
  /** Hari acuan konsol dari `/api/meta/period`. */
  systemToday: string | null;
  /** Petugas yang sedang masuk - namanya ikut tercatat di jejak audit. */
  operator: string | null;
  /** Dipanggil setelah status berubah, supaya halaman menarik data segar. */
  onChanged?: () => void;
  className?: string;
}

type StatusFilter = "all" | "pending" | "in_progress" | "completed";

/** Kartu ringkas di kepala antrean. Angka dulu, keterangannya menyusul. */
function SummaryTile({
  icon: Icon,
  label,
  value,
  note,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "alert" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-3.5 shadow-xs",
        tone === "alert"
          ? "border-risk-critical-br"
          : tone === "warn"
            ? "border-risk-medium-br"
            : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            tone === "alert"
              ? "text-risk-critical"
              : tone === "warn"
                ? "text-risk-medium"
                : "text-paper-600",
          )}
          aria-hidden="true"
        />
        <span className="overline">{label}</span>
      </div>
      <div
        className={cn(
          "tabular mt-1.5 text-metric-sm",
          tone === "alert"
            ? "text-risk-critical"
            : tone === "warn"
              ? "text-risk-medium"
              : "text-foreground",
        )}
      >
        {value}
      </div>
      {note && <div className="mt-0.5 text-caption text-paper-600">{note}</div>}
    </div>
  );
}

export function EarlyActionCenter({
  recommendations,
  systemToday,
  operator,
  onChanged,
  className,
}: EarlyActionCenterProps) {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [activeModalRec, setActiveModalRec] = React.useState<ActionRecommendation | null>(null);
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const toast = useConsoleToast();

  /* Tenggat dihitung sekali di sini, bukan di tiap baris saat render. */
  const queue = React.useMemo(
    () => sortQueue(recommendations.map((r) => toQueuedAction(r, systemToday))),
    [recommendations, systemToday],
  );

  const summary = React.useMemo(() => summarizeQueue(queue), [queue]);

  const filtered = React.useMemo(
    () => queue.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [queue, statusFilter],
  );

  /* Status ditulis ke gateway, bukan ke state lokal. Sebelumnya perubahan
     hanya hidup di memori tab ini: menyegarkan halaman mengembalikan semua
     tindakan ke "menunggu instruksi", dan petugas kedua tidak pernah melihat
     keputusan petugas pertama. */
  const handleConfirmDispatch = async (id: string, checklist: string[]) => {
    await updateActionStatus(id, "in_progress");
    const rec = recommendations.find((r) => r.id === id);
    const targets = rec ? rec.target_kecamatan.join(", ") : "wilayah target";
    toast.show(
      `${id} ditandai berjalan untuk ${targets}` +
        (checklist.length > 0 ? ` - ${checklist.length} butir SOP tercentang.` : "."),
    );
    onChanged?.();
  };

  const handleBatchDispatchAll = async () => {
    setIsBatchSubmitting(true);
    setBatchError(null);
    const pendingIds = queue.filter((r) => r.status === "pending").map((r) => r.id);

    try {
      /* Berurutan, bukan paralel: kegagalan di tengah menyisakan keadaan yang
         bisa dijelaskan ("tiga dari lima tersimpan"), bukan campuran acak. */
      let saved = 0;
      for (const id of pendingIds) {
        await updateActionStatus(id, "in_progress");
        saved += 1;
      }
      setBatchModalOpen(false);
      toast.show(`${saved} tindakan ditandai berjalan.`);
      onChanged?.();
    } catch (caught) {
      setBatchError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const filters: { id: StatusFilter; label: string; count: number; alert?: boolean }[] = [
    { id: "all", label: "Semua", count: summary.total },
    {
      id: "pending",
      label: "Perlu tindakan",
      count: summary.pending,
      alert: summary.pending > 0,
    },
    { id: "in_progress", label: "Berjalan", count: summary.inProgress },
    { id: "completed", label: "Selesai", count: summary.completed },
  ];

  return (
    <div className={cn("space-y-5", className)}>
      {/* 1. Keadaan antrean dalam satu baris. Sebelumnya angka-angka ini hanya
             hidup sebagai lencana kecil di dalam tab filter, jadi "berapa jiwa
             yang tindakannya belum keluar" tidak terjawab di mana pun. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          icon={Zap}
          label="Perlu instruksi"
          value={String(summary.pending)}
          note={`dari ${summary.total} rekomendasi`}
          tone={summary.pending > 0 ? "warn" : "neutral"}
        />
        <SummaryTile
          icon={AlertTriangle}
          label="Lewat tenggat"
          value={String(summary.overdue)}
          note={summary.dueSoon > 0 ? `${summary.dueSoon} jatuh tempo ≤ 3 hari` : "Tidak ada"}
          tone={summary.overdue > 0 ? "alert" : "neutral"}
        />
        <SummaryTile
          icon={Users}
          label="Warga menunggu"
          value={formatNumber(summary.populationPending)}
          note={
            summary.districtsPending.length > 0
              ? `${summary.districtsPending.length} kecamatan`
              : "Semua wilayah tercakup"
          }
        />
        <SummaryTile
          icon={Clock}
          label="Tenggat terdekat"
          value={summary.nextDeadline?.label ?? "—"}
          note={summary.nextDeadline?.date ?? "Tidak ada tindakan terbuka"}
        />
      </div>

      {/* 2. Filter status + instruksi massal */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-paper-100/70 p-2.5 sm:flex-row sm:items-center">
        <div
          role="group"
          aria-label="Saring berdasarkan status"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {filters.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors duration-fast ease-out",
                  active
                    ? "border border-paper-300 bg-surface text-foreground shadow-xs"
                    : "border border-transparent text-paper-600 hover:bg-paper-200/60 hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 text-overline font-semibold",
                    tab.alert ? "bg-risk-high-bg text-risk-high" : "bg-paper-200 text-paper-600",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {summary.pending > 0 && (
          <Button
            size="sm"
            onClick={() => setBatchModalOpen(true)}
            className="shrink-0 gap-1.5 self-start sm:self-auto"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tandai semua berjalan ({summary.pending})</span>
          </Button>
        )}
      </div>

      {/* 3. Antrean */}
      {filtered.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-10 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 text-paper-600">
            <Info className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-h3 text-foreground">Tidak ada tindakan berstatus ini</h3>
          <p className="text-body-sm text-paper-600">
            Antrean berisi {summary.total} rekomendasi pada periode berjalan.
          </p>
          <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tampilkan semua</span>
          </Button>
        </div>
      ) : (
        <ActionQueue actions={filtered} onOpen={(a: QueuedAction) => setActiveModalRec(a)} />
      )}

      {/* 4. Modal instruksi tunggal */}
      <DispatchActionModal
        recommendation={activeModalRec}
        open={Boolean(activeModalRec)}
        onOpenChange={(open) => {
          if (!open) setActiveModalRec(null);
        }}
        onConfirmDispatch={handleConfirmDispatch}
        systemToday={systemToday}
        operator={operator}
      />

      {/* 5. Konfirmasi instruksi massal.
             Dulu berupa `<div className="fixed inset-0">` buatan tangan: tanpa
             jebakan fokus, tanpa Esc, tanpa peran dialog. Radix memberi semua
             itu gratis, dan modal SOP di sebelahnya sudah memakainya. */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-risk-high-br bg-risk-high-bg text-risk-high">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-h3">Tandai semua tindakan berjalan</DialogTitle>
                <DialogDescription className="text-caption">
                  Ubah status seluruh tindakan yang masih menunggu.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Ringkasan membaca daftar yang sama dengan yang akan dikirim, jadi
              kecamatan dan populasinya tidak bisa melenceng dari datanya. */}
          <dl className="space-y-2 rounded-xl border border-border bg-paper-50 p-3.5 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-paper-600">Tindakan menunggu</dt>
              <dd className="tabular font-semibold text-risk-high">{summary.pending}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-paper-600">Kecamatan target</dt>
              <dd className="text-right font-medium text-foreground">
                {summary.districtsPending.join(", ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-paper-600">Warga terlindungi</dt>
              <dd className="tabular font-medium text-foreground">
                ~{formatNumber(summary.populationPending)} jiwa
              </dd>
            </div>
          </dl>

          {/* Tidak ada kanal pengiriman di sistem ini; yang berubah adalah
              status dan jejak auditnya. Menuliskan "broadcast WhatsApp" akan
              membuat petugas mengira pesannya sudah terkirim. */}
          <p className="text-caption leading-relaxed text-paper-600">
            Status seluruh tindakan menunggu diubah menjadi berjalan dan tercatat di
            jejak audit atas nama {operator ?? "petugas yang masuk"}. Draf pesannya
            tetap harus disalin ke kanal resmi dinas.
          </p>

          {batchError && (
            <p role="alert" className="text-caption font-medium text-risk-high">
              {batchError}
            </p>
          )}

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
              disabled={isBatchSubmitting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              loading={isBatchSubmitting}
              onClick={handleBatchDispatchAll}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isBatchSubmitting
                  ? "Menyimpan…"
                  : `Tandai ${summary.pending} tindakan`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
