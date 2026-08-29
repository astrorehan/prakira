"use client";

import * as React from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CloudRain,
  Copy,
  FileText,
  Info,
  MapPin,
  Printer,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BroadcastKit } from "@/components/broadcast-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionRecommendation } from "@/types";
import { cn, formatNumber } from "@/lib/utils";
import { describeDeadline, formatMonth } from "@/lib/period";
import { COVERAGE_LABEL, PRIORITY_LABEL } from "@/lib/action-queue";

/**
 * Modal SOP & instruksi.
 *
 * Yang dibongkar dari versi sebelumnya, semuanya soal kejujuran data:
 *
 * 1. Tab "Kontak puskesmas" dihapus seluruhnya. Isinya tiga nama dokter,
 *    tiga nomor telepon, dan status "Siaga 1" yang ditulis tangan di berkas
 *    mock, lengkap dengan tautan `wa.me` ke nomor-nomor itu. Kontak dinas
 *    yang salah lebih berbahaya daripada kontak yang tidak ada — dan ini
 *    satu-satunya bagian produk yang bisa membuat seseorang menelepon nomor
 *    orang asing.
 * 2. `ai_confidence` (94,2%) dihapus; digantikan cakupan data dan interval
 *    prediksi, dua besaran yang benar-benar dihitung.
 * 3. Nomor surat `440/1892/DKK-P2P/VIII/2026` di draf pesan hilang. Gateway
 *    menyusun draf tanpa nomor surat dan tanpa pejabat penanda tangan, dan
 *    mengatakannya di badan pesan.
 * 4. Tombol kirim dulu `setTimeout(900)` lalu berpura-pura menyiarkan pesan
 *    WhatsApp. Sekarang ia menulis status ke gateway, dan teks di sekitarnya
 *    hanya menjanjikan apa yang benar-benar terjadi: statusnya tercatat dan
 *    drafnya bisa disalin.
 */

interface DispatchActionModalProps {
  recommendation: ActionRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Menulis status ke gateway. Melempar bila gagal. */
  onConfirmDispatch: (id: string, checklistCompleted: string[]) => Promise<void>;
  /** Hari acuan konsol dari `/api/meta/period`. */
  systemToday: string | null;
  /** Nama petugas yang sedang masuk — tercatat di audit trail. */
  operator: string | null;
}

type TabId = "protocol" | "draft";

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
  systemToday,
  operator,
}: DispatchActionModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("protocol");
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  const id = recommendation?.id;

  /* Reset penuh tiap kali rekomendasi berganti. Penjagaan lama membuat status
     "terkirim" bocor dari satu tindakan ke tindakan berikutnya. */
  React.useEffect(() => {
    setActiveTab("protocol");
    setCheckedItems({});
    setIsSubmitting(false);
    setError(null);
    setCopyState("idle");
  }, [id]);

  if (!recommendation) return null;

  const checklist = recommendation.sop_checklist;
  const completedCount = checklist.filter((item) => checkedItems[item]).length;
  const progressPct =
    checklist.length === 0 ? 0 : Math.round((completedCount / checklist.length) * 100);
  const deadline = describeDeadline(recommendation.due_date, systemToday);
  const alreadyDispatched = recommendation.status !== "pending";

  const toggleCheck = (item: string) =>
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(recommendation.broadcast_draft);
      setCopyState("copied");
    } catch {
      /* Konteks tidak aman atau izin ditolak — katakan apa adanya, jangan
         tampilkan "Tersalin!" untuk papan klip yang masih kosong. */
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2400);
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmDispatch(
        recommendation.id,
        checklist.filter((i) => checkedItems[i]),
      );
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "protocol", label: `1. Protokol & SOP (${completedCount}/${checklist.length})` },
    { id: "draft", label: "2. Draf pesan" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Kepala modal */}
        <div className="shrink-0 border-b border-border bg-paper-50 p-5 pb-3.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded bg-paper-200/70 px-2 py-0.5 font-mono text-overline text-paper-600">
                {recommendation.id}
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

          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-2.5 sm:grid-cols-3">
            <FactTile
              icon={Calendar}
              label="Lead time"
              value={`${recommendation.lead_time_days} hari sebelum ${formatMonth(recommendation.prediction_month)}`}
            />
            <FactTile
              icon={Users}
              label="Populasi target"
              value={`${formatNumber(recommendation.target_population)} jiwa`}
            />
            <FactTile
              icon={ShieldAlert}
              label="Cakupan data"
              value={
                COVERAGE_LABEL[recommendation.data_coverage] ?? recommendation.data_coverage
              }
            />
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
              {/* Kalimat "Dasar:" dari mesin aturan. §5.2 melarang rekomendasi
                  tanpa alasan muncul sama sekali, jadi tempatnya di paling atas. */}
              <div className="flex items-start gap-3 rounded-xl border border-border bg-paper-50 p-3.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <p className="text-caption leading-relaxed text-paper-800">
                  {recommendation.basis}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <h4 className="text-caption font-semibold text-foreground">
                    Kecamatan target
                  </h4>
                  <p className="mt-0.5 text-caption leading-relaxed text-paper-700">
                    {recommendation.target_kecamatan.join(", ")}
                  </p>
                </div>
              </div>

              {recommendation.climate_trigger && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
                  <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <div>
                    <h4 className="text-caption font-semibold text-brand-900">
                      Kondisi iklim bulan observasi
                    </h4>
                    <p className="mt-0.5 text-caption leading-relaxed text-brand-800">
                      {recommendation.climate_trigger}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-risk-medium-br bg-risk-medium-bg p-3.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden="true" />
                <div>
                  {/* "Proyeksi efektivitas intervensi" adalah klaim yang tidak
                      pernah diukur. Yang bisa dikatakan sistem adalah beban
                      yang diproyeksikan bila tidak ada intervensi. */}
                  <h4 className="text-caption font-semibold text-foreground">
                    Beban yang diproyeksikan tanpa intervensi
                  </h4>
                  <p className="mt-0.5 text-caption leading-relaxed text-paper-700">
                    {recommendation.estimated_impact}
                  </p>
                </div>
              </div>

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

          {/* Tab 2 — draf */}
          {activeTab === "draft" && (
            <div
              role="tabpanel"
              id="dispatch-panel-draft"
              aria-labelledby="dispatch-tab-draft"
              className="space-y-4 p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="overline" id="draft-label">
                  Draf pesan instruksi
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
                rows={10}
                aria-labelledby="draft-label"
                value={recommendation.broadcast_draft}
                className="w-full resize-none rounded-xl border border-border bg-paper-50 p-3.5 font-mono text-caption leading-relaxed text-paper-800 focus-visible:outline-none"
              />

              {/* Tidak ada integrasi WhatsApp di sistem ini. Menjanjikannya di
                  layar berarti petugas mengira pesannya sudah terkirim. */}
              <div className="flex items-start gap-2 rounded-xl border border-border bg-paper-50 p-3 text-caption text-paper-700">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-paper-600" aria-hidden="true" />
                <span>
                  Sistem tidak mengirim pesan ke kanal mana pun. Salin draf ini ke
                  kanal resmi dinas, lalu tandai tindakannya sebagai berjalan supaya
                  statusnya tercatat di jejak audit.
                </span>
              </div>

              {/* Draf di atas ditujukan ke puskesmas; yang di bawah ditujukan ke
                  warga, satu kartu per kecamatan sasaran, beserta kode QR menuju
                  formulir laporan. Dipisah karena pembacanya berbeda dan
                  kalimatnya harus berbeda. */}
              <div className="border-t border-border pt-4">
                <h3 className="text-body-sm font-semibold text-foreground">
                  Kit siaran warga per kecamatan
                </h3>
                <div className="mt-3">
                  <BroadcastKit action={recommendation} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kaki modal */}
        <div className="flex shrink-0 flex-col items-start justify-between gap-3 border-t border-border bg-paper-50 px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="flex items-center gap-2 text-caption text-paper-600">
              <ShieldAlert className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <span>Unit pelaksana: {recommendation.pic_unit}</span>
            </span>
            {operator && (
              <span className="block text-caption text-paper-600">
                Tercatat atas nama {operator}
              </span>
            )}
            {error && (
              <span role="alert" className="block text-caption font-medium text-risk-high">
                {error}
              </span>
            )}
          </div>

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

            {/* Draf pesan menutup kanal cepat; nota dinas menutup kanal resmi.
                Tab baru, karena petugas biasanya belum selesai dengan modal
                ini saat menyiapkan suratnya. */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 sm:flex-initial"
            >
              <Link
                href={`/tindakan/nota/${encodeURIComponent(recommendation.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Nota dinas</span>
              </Link>
            </Button>

            <Button
              size="sm"
              loading={isSubmitting}
              onClick={handleDispatch}
              disabled={isSubmitting || alreadyDispatched}
              className="flex-1 gap-1.5 sm:flex-initial"
            >
              {alreadyDispatched ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Sudah diinstruksikan</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isSubmitting ? "Menyimpan…" : "Tandai sebagai berjalan"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
