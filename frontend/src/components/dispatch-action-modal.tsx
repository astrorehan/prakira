"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CloudRain,
  Copy,
  ExternalLink,
  FileText,
  Info,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionRecommendation } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
import { describeDeadline } from "@/lib/period";
import { parsePopulation, PRIORITY_LABEL } from "@/lib/action-queue";

/**
 * Modal SOP & instruksi.
 *
 * Tiga hal yang dibongkar dari versi sebelumnya, semuanya soal kejujuran data:
 *
 * 1. Checklist kesiapan mencentang sendiri dua butir pertama "supaya terasa
 *    realistis". Di konsol pengiriman instruksi lapangan, itu berarti layar
 *    melaporkan verifikasi yang tidak pernah dilakukan siapa pun.
 * 2. Tab kontak menampilkan tiga puskesmas Pedurungan sebagai cadangan ketika
 *    `target_puskesmas` kosong — termasuk untuk tindakan di Semarang Barat.
 *    Kontak yang salah lebih berbahaya daripada kontak yang tidak ada.
 * 3. Angka model, lead time, dan populasi punya nilai cadangan yang dikarang.
 *
 * Selain itu: butir checklist dulu `div onClick` (tidak bisa dijangkau
 * keyboard) dan tab-nya `button` polos tanpa peran tab.
 */

interface DispatchActionModalProps {
  recommendation: ActionRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDispatch: (id: string, checklistCompleted: string[]) => void;
}

type TabId = "protocol" | "puskesmas" | "draft";

const DEFAULT_CHECKLIST = [
  "Koordinasi Kepala Puskesmas & Camat wilayah",
  "Mobilisasi satgas lapangan & kader posyandu",
  "Distribusi sarana intervensi pencegahan",
  "Monitoring & pelaporan hasil pasca-intervensi",
];

function FactTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 shadow-xs">
      <Icon className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
      <div className="min-w-0">
        <div className="overline">{label}</div>
        <div className="truncate text-caption font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function DispatchActionModal({
  recommendation,
  open,
  onOpenChange,
  onConfirmDispatch,
}: DispatchActionModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("protocol");
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  const id = recommendation?.id;
  const status = recommendation?.status;

  /* Reset penuh tiap kali rekomendasi berganti — termasuk yang tidak punya
     `sop_checklist`. Penjagaan lama membuat status "terkirim" bocor dari satu
     tindakan ke tindakan berikutnya. */
  React.useEffect(() => {
    setActiveTab("protocol");
    setCheckedItems({});
    setIsSubmitting(false);
    setCopyState("idle");
    setIsSuccess(status === "completed");
  }, [id, status]);

  if (!recommendation) return null;

  const checklist = recommendation.sop_checklist ?? DEFAULT_CHECKLIST;
  const completedCount = checklist.filter((item) => checkedItems[item]).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);
  const puskesmas = recommendation.target_puskesmas ?? [];
  const deadline = describeDeadline(recommendation.due_date);
  const population = parsePopulation(recommendation.target_population);
  const alreadyDispatched = recommendation.status !== "pending";

  const draftText =
    recommendation.broadcast_template ??
    `[INSTRUKSI RESMI DINAS KESEHATAN KOTA SEMARANG]\nPerihal: Intervensi Dini Pengendalian Lonjakan ${recommendation.disease}\n\nKepada Yth. Kepala Puskesmas Wilayah: ${recommendation.target_kecamatan.join(", ")}.\nBerdasarkan sistem prediksi iklim-kesehatan Prakira, terdeteksi kenaikan risiko signifikan. Segera laksanakan intervensi: ${recommendation.title} sebelum ${recommendation.due_date}.`;

  const toggleCheck = (item: string) =>
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopyState("copied");
    } catch {
      /* Konteks tidak aman atau izin ditolak — katakan apa adanya, jangan
         tampilkan "Tersalin!" untuk papan klip yang masih kosong. */
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2400);
  };

  const handleDispatch = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onConfirmDispatch(
        recommendation.id,
        checklist.filter((i) => checkedItems[i]),
      );
      setTimeout(() => onOpenChange(false), 1400);
    }, 900);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "protocol", label: `1. Protokol & SOP (${completedCount}/${checklist.length})` },
    { id: "puskesmas", label: `2. Kontak puskesmas (${puskesmas.length})` },
    { id: "draft", label: "3. Draf surat & broadcast" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Kepala modal */}
        <div className="shrink-0 border-b border-border bg-paper-50 p-5 pb-3.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded bg-paper-200/70 px-2 py-0.5 font-mono text-overline text-paper-600">
                SOP #{recommendation.id}
              </span>
              <Badge variant="outline">{recommendation.disease}</Badge>
              <Badge variant={recommendation.priority === "high" ? "risk-high" : "risk-medium"}>
                {PRIORITY_LABEL[recommendation.priority]}
              </Badge>
            </div>

            <span className="flex items-center gap-1.5 pr-6 text-caption text-paper-600">
              <Clock className="h-3.5 w-3.5 text-paper-600" aria-hidden="true" />
              <span className="tabular">
                {deadline.label} · {deadline.date}
              </span>
            </span>
          </div>

          <DialogTitle className="text-h3 leading-tight text-foreground">
            {recommendation.title}
          </DialogTitle>

          {/* Alasan model merekomendasikan ini. Hanya bidang yang benar-benar
              terisi yang tampil — kotak kosong lebih jujur dari angka karangan. */}
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-2.5 sm:grid-cols-3">
            {typeof recommendation.ai_confidence === "number" && (
              <FactTile
                icon={Sparkles}
                label="Keyakinan model"
                value={`${recommendation.ai_confidence.toLocaleString("id-ID")}%`}
              />
            )}
            {typeof recommendation.lead_time_days === "number" && (
              <FactTile
                icon={Calendar}
                label="Lead time"
                value={`${recommendation.lead_time_days} hari sebelum puncak`}
              />
            )}
            {population > 0 && (
              <FactTile
                icon={Users}
                label="Populasi terdampak"
                value={`${formatNumber(population)} jiwa`}
              />
            )}
          </div>
        </div>

        {/* Tab */}
        <div
          role="tablist"
          aria-label="Bagian instruksi"
          className="flex shrink-0 items-center overflow-x-auto border-b border-border bg-surface px-5"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`dispatch-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`dispatch-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-caption font-semibold transition-colors duration-fast ease-out",
                activeTab === tab.id
                  ? "border-brand-700 text-brand-700"
                  : "border-transparent text-paper-600 hover:text-paper-800",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tab 1 — protokol */}
          {activeTab === "protocol" && (
            <div
              role="tabpanel"
              id="dispatch-panel-protocol"
              aria-labelledby="dispatch-tab-protocol"
              className="space-y-4 p-6"
            >
              {recommendation.climate_trigger && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
                  <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <div>
                    <h4 className="text-caption font-semibold text-brand-900">
                      Pemicu parameter iklim BMKG
                    </h4>
                    <p className="mt-0.5 text-caption leading-relaxed text-brand-800">
                      {recommendation.climate_trigger}
                    </p>
                  </div>
                </div>
              )}

              {recommendation.estimated_impact && (
                <div className="flex items-start gap-3 rounded-xl border border-risk-low-br bg-risk-low-bg p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-risk-low" aria-hidden="true" />
                  <div>
                    <h4 className="text-caption font-semibold text-risk-low">
                      Proyeksi efektivitas intervensi
                    </h4>
                    <p className="mt-0.5 text-caption leading-relaxed text-paper-700">
                      {recommendation.estimated_impact}
                    </p>
                  </div>
                </div>
              )}

              <fieldset className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <legend className="overline">Checklist kesiapan lapangan</legend>
                  <span className="tabular text-caption font-semibold text-paper-600">
                    {completedCount} dari {checklist.length} terverifikasi ({progressPct}%)
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Kesiapan checklist"
                  className="h-2 w-full overflow-hidden rounded-full bg-paper-200"
                >
                  <div
                    className="h-full rounded-full bg-brand-700 transition-[width] duration-base ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {checklist.map((item) => (
                    <label
                      key={item}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors duration-fast ease-out",
                        checkedItems[item]
                          ? "border-brand-300 bg-brand-50/60 text-foreground"
                          : "border-border bg-surface text-paper-700 hover:bg-paper-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedItems[item])}
                        onChange={() => toggleCheck(item)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:shadow-focus",
                          checkedItems[item]
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-paper-400 bg-surface",
                        )}
                      >
                        {checkedItems[item] && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <span className="select-none text-caption font-medium leading-snug">
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* Tab 2 — kontak */}
          {activeTab === "puskesmas" && (
            <div
              role="tabpanel"
              id="dispatch-panel-puskesmas"
              aria-labelledby="dispatch-tab-puskesmas"
              className="space-y-4 p-6"
            >
              {puskesmas.length === 0 ? (
                <div className="space-y-2 rounded-xl border border-risk-none-br bg-risk-none-bg p-6 text-center">
                  <Info className="mx-auto h-5 w-5 text-risk-none" aria-hidden="true" />
                  <h4 className="text-body-sm font-semibold text-foreground">
                    Kontak puskesmas belum terdaftar
                  </h4>
                  <p className="text-caption text-paper-600">
                    Tindakan ini menargetkan {recommendation.target_kecamatan.join(", ")}. Lengkapi
                    data puskesmas wilayah sebelum instruksi disiarkan.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-caption text-paper-600">
                    Puskesmas dan satgas lapangan yang akan menerima instruksi untuk kecamatan
                    target:
                  </p>

                  <div className="space-y-3">
                    {puskesmas.map((pusk) => (
                      <div
                        key={pusk.name}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-xs sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-caption font-semibold text-foreground">
                              {pusk.name}
                            </h4>
                            <p className="text-caption text-paper-600">Kepala: {pusk.head}</p>
                            <span className="mt-1 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-paper-600" aria-hidden="true" />
                              <span className="tabular font-mono text-caption text-paper-600">
                                {pusk.phone}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                          <Badge
                            variant={pusk.readiness === "Siaga 1" ? "risk-high" : "risk-low"}
                          >
                            {pusk.readiness}
                          </Badge>
                          <a
                            href={`https://wa.me/${pusk.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-300/45 bg-brand-50 px-2.5 py-1 text-caption font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                          >
                            <span>Hubungi</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-paper-50 p-3 text-caption">
                <span className="text-paper-600">
                  Unit komando:{" "}
                  <strong className="text-foreground">
                    {recommendation.pic_unit ?? "Belum ditetapkan"}
                  </strong>
                </span>
                <span className="tabular font-mono text-paper-600">Hotline 119</span>
              </div>
            </div>
          )}

          {/* Tab 3 — draf */}
          {activeTab === "draft" && (
            <div
              role="tabpanel"
              id="dispatch-panel-draft"
              aria-labelledby="dispatch-tab-draft"
              className="space-y-4 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="overline" id="draft-label">
                  Draf pesan instruksi / surat edaran resmi
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="h-8 gap-1.5 px-3 text-caption"
                >
                  {copyState === "copied" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-risk-low" aria-hidden="true" />
                      <span>Tersalin</span>
                    </>
                  ) : copyState === "failed" ? (
                    <>
                      <Info className="h-3.5 w-3.5 text-risk-medium" aria-hidden="true" />
                      <span>Gagal menyalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Salin teks</span>
                    </>
                  )}
                </Button>
              </div>

              <textarea
                readOnly
                rows={7}
                aria-labelledby="draft-label"
                value={draftText}
                className="w-full resize-none rounded-xl border border-border bg-paper-50 p-3.5 font-mono text-caption leading-relaxed text-paper-800 focus-visible:outline-none"
              />

              <div className="flex items-center gap-2 rounded-xl border border-brand-300/45 bg-brand-50 p-3 text-caption text-brand-900">
                <FileText className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <span>
                  Pesan ini disiarkan ke notifikasi WhatsApp satgas dan kepala puskesmas terkait
                  saat tombol kirim ditekan.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Kaki modal */}
        <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-border bg-paper-50 px-5 py-3.5 sm:flex-row">
          <span className="flex items-center gap-2 text-caption text-paper-600">
            <ShieldAlert className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <span>Otorisasi: Kepala Bidang P2P Dinas Kesehatan Kota Semarang</span>
          </span>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              Tutup
            </Button>

            <Button
              size="sm"
              loading={isSubmitting}
              onClick={handleDispatch}
              disabled={isSubmitting || isSuccess || alreadyDispatched}
              className="flex-1 gap-1.5 sm:flex-initial"
            >
              {isSuccess || alreadyDispatched ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Instruksi sudah disiarkan</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isSubmitting ? "Mengirimkan…" : "Kirim instruksi resmi"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
