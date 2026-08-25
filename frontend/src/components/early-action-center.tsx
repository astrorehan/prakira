"use client";

import * as React from "react";
import {
  Send,
  CheckCircle2,
  RotateCcw,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";
import { EarlyActionDeck } from "./early-action-deck";
import { DispatchActionModal } from "./dispatch-action-modal";
import { Button } from "./ui/button";

interface EarlyActionCenterProps {
  initialRecommendations?: ActionRecommendation[];
  onExecuteRecommendation?: (id: string, checklist: string[]) => void;
  className?: string;
}

/** "148.200 warga" -> 148200. Returns 0 when the field is absent. */
function parsePopulation(value?: string): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function EarlyActionCenter({
  initialRecommendations = [],
  onExecuteRecommendation,
  className,
}: EarlyActionCenterProps) {
  const [recommendations, setRecommendations] = React.useState<ActionRecommendation[]>(initialRecommendations);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [activeModalRec, setActiveModalRec] = React.useState<ActionRecommendation | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = React.useState(false);

  // Sync when initial recommendations change
  React.useEffect(() => {
    if (initialRecommendations && initialRecommendations.length > 0) {
      setRecommendations(initialRecommendations);
    }
  }, [initialRecommendations]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleOpenDispatch = (rec: ActionRecommendation) => {
    setActiveModalRec(rec);
  };

  const handleConfirmDispatch = (id: string, checklist: string[]) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "in_progress" as const,
              dispatched_at: new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }) + " WIB",
            }
          : r
      )
    );

    const rec = recommendations.find((r) => r.id === id);
    const targetNames = rec ? rec.target_kecamatan.join(", ") : "wilayah target";
    showToast(`Instruksi #${id} disiarkan ke Puskesmas ${targetNames}.`);

    if (onExecuteRecommendation) {
      onExecuteRecommendation(id, checklist);
    }
  };

  // Batch execute all pending items
  const handleBatchDispatchAll = () => {
    setIsBatchSubmitting(true);
    setTimeout(() => {
      const dispatched = pending.length;
      setRecommendations((prev) =>
        prev.map((r) =>
          r.status === "pending"
            ? {
                ...r,
                status: "in_progress" as const,
                dispatched_at: new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) + " WIB",
              }
            : r
        )
      );
      setIsBatchSubmitting(false);
      setBatchModalOpen(false);
      showToast(`${dispatched} instruksi disiarkan ke Satgas & Puskesmas terkait.`);
    }, 1000);
  };

  const pending = recommendations.filter((r) => r.status === "pending");
  const totalCount = recommendations.length;
  const pendingCount = pending.length;
  const inProgressCount = recommendations.filter((r) => r.status === "in_progress").length;
  const completedCount = recommendations.filter((r) => r.status === "completed").length;

  /* The confirmation dialog reads the same list it is about to dispatch, so the
     districts and the population it claims can never drift from the data. */
  const batchSummary = React.useMemo(() => {
    const districts = Array.from(new Set(pending.flatMap((r) => r.target_kecamatan)));
    const population = pending.reduce((sum, r) => sum + parsePopulation(r.target_population), 0);
    return { districts, population };
  }, [pending]);

  const filteredList = recommendations.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-paper-900 text-white p-4 shadow-pop border border-paper-700 animate-fade-in max-w-md">
          <CheckCircle2 className="h-5 w-5 text-risk-low shrink-0" />
          <p className="text-xs font-medium leading-snug">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-paper-400 hover:text-white text-xs ml-auto shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Toolbar: status tabs + batch dispatch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-paper-100/70 border border-paper-200/90 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all" as const, label: "Semua", count: totalCount },
            { id: "pending" as const, label: "Perlu Tindakan", count: pendingCount, alert: pendingCount > 0 },
            { id: "in_progress" as const, label: "Berjalan", count: inProgressCount },
            { id: "completed" as const, label: "Selesai", count: completedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                statusFilter === tab.id
                  ? "bg-paper-0 text-brand-900 shadow-xs border border-paper-300"
                  : "text-paper-600 hover:text-paper-900 hover:bg-paper-200/60"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  statusFilter === tab.id
                    ? tab.alert
                      ? "bg-risk-high-bg text-risk-high font-bold"
                      : "bg-brand-100 text-brand-800"
                    : "bg-paper-200 text-paper-600"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {pendingCount > 0 && (
          <Button
            size="sm"
            onClick={() => setBatchModalOpen(true)}
            className="bg-brand-700 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Zap className="h-3.5 w-3.5 text-white" />
            <span>Instruksikan Semua ({pendingCount})</span>
          </Button>
        )}
      </div>

      {/* 2. Action deck */}
      {filteredList.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-paper-0 border border-paper-200 shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-paper-100 text-paper-400 flex items-center justify-center mx-auto">
            <Info className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Tidak ada tindakan berstatus ini</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tampilkan Semua</span>
          </Button>
        </div>
      ) : (
        <EarlyActionDeck
          recommendations={filteredList}
          onOpenDispatch={handleOpenDispatch}
        />
      )}

      {/* 3. Single Dispatch Modal */}
      <DispatchActionModal
        recommendation={activeModalRec}
        open={Boolean(activeModalRec)}
        onOpenChange={(open) => {
          if (!open) setActiveModalRec(null);
        }}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* 4. Batch Dispatch Confirmation Dialog */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-paper-0 p-6 shadow-pop border border-paper-300 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-risk-high-bg text-risk-high border border-risk-high-br flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-foreground">
                  Instruksikan Semua Tindakan
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kirim instruksi siaga ke seluruh wilayah terdampak.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-paper-50 border border-paper-200 space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-paper-800">
                <span>Tindakan pending:</span>
                <span className="font-mono text-risk-high font-bold">{pendingCount}</span>
              </div>
              <div className="flex justify-between gap-4 text-paper-600">
                <span className="shrink-0">Kecamatan target:</span>
                <span className="font-medium text-foreground text-right">
                  {batchSummary.districts.join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-paper-600">
                <span>Warga terlindungi:</span>
                <span className="font-medium text-foreground">
                  ~{batchSummary.population.toLocaleString("id-ID")} jiwa
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sistem mengirim broadcast instruksi resmi dan SOP intervensi ke WhatsApp Kepala Puskesmas dan Satgas lapangan di wilayah tersebut.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(false)}
                disabled={isBatchSubmitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleBatchDispatchAll}
                disabled={isBatchSubmitting}
                className="bg-brand-700 hover:bg-brand-600 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                {isBatchSubmitting ? (
                  <>
                    <span className="animate-spin mr-1">⏳</span>
                    <span>Menyiarkan…</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-white" />
                    <span>Kirim {pendingCount} Instruksi</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
