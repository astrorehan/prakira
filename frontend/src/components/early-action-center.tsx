"use client";

import * as React from "react";
import {
  AlertTriangle,
  ClipboardPlus,
  Clock,
  Info,
  RotateCcw,
  Send,
  Users,
  Zap,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { ActionAssignee, ActionRecommendation } from "@/types";
import { assignAction, fetchAssignees } from "@/lib/api";
import {
  needsAssignment,
  sortQueue,
  summarizeQueue,
  toQueuedAction,
  type QueuedAction,
} from "@/lib/action-queue";
import { ActionQueue } from "./action-queue";
import { DispatchActionModal } from "./dispatch-action-modal";
import { ManualTaskDialog } from "./manual-task-dialog";
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
  /** Peran lapangan hanya melihat tindakan yang sudah ditugaskan kepadanya. */
  showMineFilter?: boolean;
  /** Menugaskan pelaksana adalah wewenang Dinkes. */
  canAssign?: boolean;
  /** Mengerjakan tugas adalah pekerjaan puskesmas. */
  canWork?: boolean;
  /** Penyakit yang bisa dipilih untuk tugas manual. */
  diseases?: string[];
  className?: string;
}

type StatusFilter =
  /* F09: petugas lapangan membuka tugasnya sendiri, bukan seluruh antrean kota.
     "Aktif" adalah penugasan yang benar-benar tercatat dan belum selesai. */
  | "mine"
  | "all"
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed";

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
        "min-w-0 rounded-xl border bg-surface p-3 shadow-xs sm:p-3.5",
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
            /* Di ponsel label dua kata butuh lebar ikon ini. */
            "hidden h-3.5 w-3.5 shrink-0 sm:block",
            tone === "alert"
              ? "text-risk-critical"
              : tone === "warn"
                ? "text-risk-medium"
                : "text-paper-600",
          )}
          aria-hidden="true"
        />
        <span className="overline min-w-0">{label}</span>
      </div>
      <div
        className={cn(
          "tabular mt-1.5 break-words text-lg font-semibold leading-tight sm:text-metric-sm",
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
  showMineFilter = true,
  canAssign = true,
  canWork = false,
  diseases = [],
  className,
}: EarlyActionCenterProps) {
  const [chosenFilter, setChosenFilter] = React.useState<StatusFilter | null>(null);
  /* Simpan id-nya, bukan salinan objek: setelah satu kejadian tercatat dan
     antrean dimuat ulang, modal harus membaca tindakan yang segar supaya
     tahapnya ikut maju. */
  const [activeModalId, setActiveModalId] = React.useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  /* Penugasan massal memilih barisnya satu per satu. Tanpa daftar pilihan,
     satu tombol menyetujui pekerjaan yang belum dibaca siapa pun (audit F05). */
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [manualOpen, setManualOpen] = React.useState(false);
  const [assignees, setAssignees] = React.useState<ActionAssignee[]>([]);
  const toast = useConsoleToast();

  /* Daftar puskesmas hanya dibutuhkan peran yang menugaskan. */
  React.useEffect(() => {
    if (!canAssign) return;
    let alive = true;
    fetchAssignees()
      .then((result) => alive && setAssignees(result.data))
      .catch(() => alive && setAssignees([]));
    return () => {
      alive = false;
    };
  }, [canAssign]);

  /* Akun puskesmas hanya menerima tindakan di wilayahnya (disaring gateway).
     Yang belum ditugaskan masih antrean Dinkes: menampilkannya di "Tugas saya"
     membuat petugas mengira ada pekerjaan yang belum boleh ia sentuh. */
  const visible = React.useMemo(
    () =>
      showMineFilter
        ? recommendations.filter((r) => r.assignment !== null)
        : recommendations,
    [recommendations, showMineFilter],
  );

  /* Tenggat dihitung sekali di sini, bukan di tiap baris saat render. */
  const queue = React.useMemo(
    () => sortQueue(visible.map((r) => toQueuedAction(r, systemToday))),
    [visible, systemToday],
  );

  const summary = React.useMemo(() => summarizeQueue(queue), [queue]);

  const activeModalRec = React.useMemo(
    () => recommendations.find((r) => r.id === activeModalId) ?? null,
    [recommendations, activeModalId],
  );

  const mineCount = summary.total - summary.completed;

  /* Petugas lapangan selalu membuka tugas aktifnya, meski kosong: dulu antrean
     jatuh ke "Semua" saat kosong dan memperlihatkan pekerjaan milik Dinkes. */
  const defaultFilter: StatusFilter = showMineFilter ? "mine" : "all";
  const statusFilter: StatusFilter = chosenFilter ?? defaultFilter;
  const setStatusFilter = setChosenFilter;

  const filtered = React.useMemo(
    () =>
      queue.filter((r) =>
        statusFilter === "all"
          ? true
          : statusFilter === "mine"
            ? r.status !== "completed"
            : statusFilter === "pending"
              ? needsAssignment(r)
              : r.status === statusFilter,
      ),
    [queue, statusFilter],
  );

  const pendingActions = React.useMemo(
    () => queue.filter((r) => r.status === "pending"),
    [queue],
  );
  const selectedIds = pendingActions
    .filter((r) => selected[r.id])
    .map((r) => r.id);

  /* Kejadian ditulis ke gateway, bukan ke state lokal. Sebelumnya perubahan
     hanya hidup di memori tab ini: menyegarkan halaman mengembalikan semua
     tindakan ke "menunggu instruksi", dan petugas kedua tidak pernah melihat
     keputusan petugas pertama. */
  const handleActionChanged = (message: string) => {
    toast.show(message);
    onChanged?.();
  };

  const assignedCount = queue.filter((r) => r.status === "assigned").length;

  /**
   * Penugasan beberapa tindakan sekaligus ke puskesmas wilayahnya masing-masing.
   *
   * Yang hilang di sini adalah "Tandai semua berjalan": tombol itu menuliskan
   * bahwa pekerjaan sudah dimulai untuk setiap tindakan yang kebetulan ada di
   * antrean, tanpa ada yang membacanya, tanpa pelaksana, dan tanpa seorang pun
   * yang membenarkan menerimanya. Yang tersisa adalah kejadian yang memang
   * boleh diputuskan seorang koordinator sekaligus: menyerahkan tiap kecamatan
   * sasaran ke puskesmasnya. Memilih sebagian puskesmas dilakukan per tindakan
   * di modalnya. Mulai dikerjakan tetap dicatat per tindakan oleh pelaksananya.
   */
  const handleBatchAssign = async () => {
    setIsBatchSubmitting(true);
    setBatchError(null);
    try {
      /* Berurutan, bukan paralel: kegagalan di tengah menyisakan keadaan yang
         bisa dijelaskan ("tiga dari lima tersimpan"), bukan campuran acak. */
      let saved = 0;
      for (const id of selectedIds) {
        await assignAction(id, {});
        saved += 1;
      }
      setBatchModalOpen(false);
      setSelected({});
      toast.show(`Penugasan ${saved} rekomendasi ke puskesmas wilayah dicatat.`);
      onChanged?.();
    } catch (caught) {
      setBatchError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const filters: { id: StatusFilter; label: string; count: number; alert?: boolean }[] = [
    ...(showMineFilter
      ? [
          {
            id: "mine" as const,
            label: "Aktif",
            count: mineCount,
            alert: mineCount > 0,
          },
        ]
      : [
          { id: "all" as const, label: "Semua", count: summary.total },
          {
            id: "pending" as const,
            label: "Belum ditugaskan",
            count: summary.pending,
            alert: summary.pending > 0,
          },
        ]),
    { id: "assigned", label: "Ditugaskan", count: assignedCount },
    { id: "in_progress", label: "Dikerjakan", count: summary.inProgress },
    { id: "completed", label: "Selesai", count: summary.completed },
  ];

  return (
    <div className={cn("space-y-5", className)}>
      {/* 1. Keadaan antrean dalam satu baris. Sebelumnya angka-angka ini hanya
             hidup sebagai lencana kecil di dalam tab filter, jadi "berapa jiwa
             yang tindakannya belum keluar" tidak terjawab di mana pun. */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {showMineFilter ? (
          <SummaryTile
            icon={Zap}
            label="Tugas aktif"
            value={String(mineCount)}
            note={`${summary.completed} selesai`}
          />
        ) : (
          <SummaryTile
            icon={Zap}
            label="Belum ditugaskan"
            value={String(summary.pending)}
            note={`dari ${summary.total} rekomendasi`}
            tone={summary.pending > 0 ? "warn" : "neutral"}
          />
        )}
        <SummaryTile
          icon={AlertTriangle}
          label="Lewat tenggat"
          value={String(summary.overdue)}
          note={summary.dueSoon > 0 ? `${summary.dueSoon} jatuh tempo ≤ 3 hari` : "Tidak ada"}
          tone={summary.overdue > 0 ? "alert" : "neutral"}
        />
        {/* F16: yang dihitung adalah penduduk wilayah yang tindakannya belum
            diputuskan — bukan orang yang "terlindungi", klaim yang tidak pernah
            diukur sistem ini. */}
        {showMineFilter ? (
          <SummaryTile
            icon={Users}
            label="Belum dikonfirmasi"
            value={String(summary.unacknowledged)}
            note={summary.unacknowledged > 0 ? "Benarkan penerimaan tugas" : "Semua sudah diterima"}
            tone={summary.unacknowledged > 0 ? "warn" : "neutral"}
          />
        ) : (
          <SummaryTile
            icon={Users}
            label="Penduduk sasaran"
            value={formatNumber(summary.populationPending)}
            note={
              summary.districtsPending.length > 0
                ? `${summary.districtsPending.length} kecamatan belum ditugaskan`
                : "Tidak ada wilayah menunggu"
            }
          />
        )}
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

        {canAssign && (
          <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
            {pendingActions.length > 0 && (
              <Button
                size="sm"
                variant={selectedIds.length > 0 ? "primary" : "outline"}
                disabled={selectedIds.length === 0}
                onClick={() => setBatchModalOpen(true)}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {selectedIds.length === 0
                    ? "Pilih rekomendasi"
                    : `Tugaskan ${selectedIds.length} rekomendasi`}
                </span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setManualOpen(true)}
              className="gap-1.5"
            >
              <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buat tugas</span>
            </Button>
          </div>
        )}
      </div>

      {/* Pemilihan sadar: satu baris satu centang, dengan judul dan wilayahnya
          terbaca, supaya penugasan massal tetap keputusan atas pekerjaan yang
          dilihat — bukan atas jumlah. */}
      {canAssign && pendingActions.length > 0 && (
        <fieldset className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
          <legend className="overline">Pilih rekomendasi untuk ditugaskan</legend>
          {pendingActions.map((rec) => (
            <label
              key={rec.id}
              className="flex cursor-pointer items-start gap-2.5 text-caption leading-relaxed text-paper-700"
            >
              <input
                type="checkbox"
                checked={Boolean(selected[rec.id])}
                onChange={() =>
                  setSelected((current) => ({
                    ...current,
                    [rec.id]: !current[rec.id],
                  }))
                }
                className="mt-0.5 accent-brand-700"
              />
              <span>
                <span className="font-medium text-foreground">{rec.title}</span> ·{" "}
                {rec.target_kecamatan.join(", ")} · tenggat {rec.deadline.date}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {/* 3. Antrean */}
      {filtered.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-10 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 text-paper-600">
            <Info className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-h3 text-foreground">
            {statusFilter === "mine"
              ? "Belum ada tugas untuk Anda"
              : showMineFilter
                ? "Tidak ada tugas di sini"
                : "Tidak ada rekomendasi di sini"}
          </h3>
          <p className="text-body-sm text-paper-600">
            {statusFilter === "mine"
              ? "Tugas muncul di sini setelah Dinkes menugaskan tindakan ke puskesmas Anda."
              : "Pilih status lain untuk melihat antrean."}
          </p>
          {statusFilter !== defaultFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(defaultFilter)}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showMineFilter ? "Lihat tugas aktif" : "Lihat semua rekomendasi"}</span>
            </Button>
          )}
        </div>
      ) : (
        <ActionQueue actions={filtered} onOpen={(a: QueuedAction) => setActiveModalId(a.id)} />
      )}

      {/* 4. Modal instruksi tunggal */}
      <DispatchActionModal
        recommendation={activeModalRec}
        open={Boolean(activeModalRec)}
        onOpenChange={(open) => {
          if (!open) setActiveModalId(null);
        }}
        onChanged={handleActionChanged}
        systemToday={systemToday}
        operator={operator}
        canAssign={canAssign}
        canWork={canWork}
        assignees={assignees}
      />

      {canAssign && (
        <ManualTaskDialog
          open={manualOpen}
          onOpenChange={setManualOpen}
          assignees={assignees}
          diseases={diseases}
          systemToday={systemToday}
          onCreated={handleActionChanged}
        />
      )}

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
                <DialogTitle className="text-h3">Tugaskan rekomendasi</DialogTitle>
                <DialogDescription className="text-caption">
                  {selectedIds.length} rekomendasi · tiap kecamatan ke puskesmas wilayahnya.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Ringkasan membaca daftar yang sama dengan yang akan dikirim, jadi
              kecamatan dan populasinya tidak bisa melenceng dari datanya. */}
          <dl className="space-y-2 rounded-xl border border-border bg-paper-50 p-3.5 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-paper-600">Rekomendasi</dt>
              <dd className="tabular font-semibold text-risk-high">
                {selectedIds.length}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-paper-600">Sasaran</dt>
              <dd className="text-right font-medium text-foreground">
                {summary.districtsPending.join(", ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-paper-600">Penduduk</dt>
              <dd className="tabular font-medium text-foreground">
                ~{formatNumber(summary.populationPending)} jiwa
              </dd>
            </div>
          </dl>

          {/* Tidak ada kanal pengiriman di sistem ini; yang berubah adalah
              status dan jejak auditnya. Menuliskan "broadcast WhatsApp" akan
              membuat petugas mengira pesannya sudah terkirim. */}
          <p className="text-caption leading-relaxed text-paper-600">
            Untuk memilih sebagian puskesmas saja, buka rekomendasinya satu per
            satu. Catat di aplikasi, teruskan instruksi lewat kanal dinas.
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
              onClick={handleBatchAssign}
              disabled={isBatchSubmitting}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isBatchSubmitting
                  ? "Menyimpan…"
                  : "Catat penugasan"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
