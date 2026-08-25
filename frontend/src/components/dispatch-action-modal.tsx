"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionRecommendation } from "@/types";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Phone,
  Copy,
  Check,
  Send,
  ShieldAlert,
  CloudRain,
  Flame,
  FileText,
  AlertTriangle,
  ExternalLink,
  Users,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DispatchActionModalProps {
  recommendation: ActionRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDispatch: (id: string, checklistCompleted: string[]) => void;
}

export function DispatchActionModal({
  recommendation,
  open,
  onOpenChange,
  onConfirmDispatch,
}: DispatchActionModalProps) {
  const [activeTab, setActiveTab] = React.useState<"protocol" | "puskesmas" | "draft">("protocol");
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [copiedDraft, setCopiedDraft] = React.useState(false);

  // Initialize checklist when recommendation opens
  React.useEffect(() => {
    if (recommendation?.sop_checklist) {
      const initial: Record<string, boolean> = {};
      recommendation.sop_checklist.forEach((item, index) => {
        // Pre-check first two items for realistic UX
        initial[item] = index < 2;
      });
      setCheckedItems(initial);
      setIsSuccess(recommendation.status === "completed");
    }
  }, [recommendation]);

  if (!recommendation) return null;

  const isHighPriority = recommendation.priority === "high";
  const checklist = recommendation.sop_checklist || [
    "Koordinasi Kepala Puskesmas & Camat Wilayah",
    "Mobilisasi Satgas Lapangan & Kader Posyandu",
    "Distribusi Sarana Intervensi Pencegahan",
    "Monitoring & Pelaporan Hasil Pasca Intervensi",
  ];

  const completedCount = checklist.filter((item) => checkedItems[item]).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleCopyDraft = () => {
    const text = recommendation.broadcast_template || recommendation.description;
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleDispatch = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      const verifiedList = checklist.filter((i) => checkedItems[i]);
      onConfirmDispatch(recommendation.id, verifiedList);
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
      }, 1400);
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 border-paper-300 shadow-pop rounded-2xl bg-paper-0 overflow-hidden">
        {/* Modal Top Banner (Pinned) */}
        <div className="p-5 pb-3.5 border-b border-paper-200 bg-paper-50/80 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-paper-500 bg-paper-200/70 px-2 py-0.5 rounded">
                SOP-INTERVENSI #{recommendation.id}
              </span>
              <Badge
                variant={
                  recommendation.disease === "DBD"
                    ? "disease-dbd"
                    : recommendation.disease === "ISPA"
                    ? "disease-ispa"
                    : "disease-diare"
                }
                size="sm"
              >
                {recommendation.disease}
              </Badge>
              <Badge
                variant={isHighPriority ? "risk-high" : "risk-medium"}
                size="sm"
              >
                {isHighPriority ? "Prioritas Tinggi" : "Prioritas Sedang"}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-paper-600 font-mono pr-6">
              <Clock className="h-3.5 w-3.5 text-paper-400" />
              <span>Tenggat: {recommendation.due_date}</span>
            </div>
          </div>

          <DialogTitle className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight">
            {recommendation.title}
          </DialogTitle>

          {/* AI Explainability Strip */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-paper-200/80">
            <div className="flex items-center gap-2 bg-paper-0 rounded-lg p-2 border border-paper-200 shadow-xs">
              <Sparkles className="h-4 w-4 text-brand-700 shrink-0" />
              <div>
                <div className="text-[10px] font-mono text-paper-500 uppercase">Akurasi Model AI</div>
                <div className="text-xs font-semibold text-brand-700">{recommendation.ai_confidence || 94.2}% XGBoost</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-paper-0 rounded-lg p-2 border border-paper-200 shadow-xs">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] font-mono text-paper-500 uppercase">Lead Time Intervensi</div>
                <div className="text-xs font-semibold text-foreground">
                  {recommendation.lead_time_days || 14} Hari Sebelum Puncak
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-paper-0 rounded-lg p-2 border border-paper-200 shadow-xs">
              <Users className="h-4 w-4 text-risk-low shrink-0" />
              <div>
                <div className="text-[10px] font-mono text-paper-500 uppercase">Populasi Terdampak</div>
                <div className="text-xs font-semibold text-foreground">
                  {recommendation.target_population || "120.000 warga"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside Modal (Pinned) */}
        <div className="flex items-center px-5 border-b border-paper-200 bg-paper-0 shrink-0">
          <button
            onClick={() => setActiveTab("protocol")}
            className={cn(
              "py-2.5 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === "protocol"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-paper-500 hover:text-paper-800"
            )}
          >
            1. Protokol & SOP Kesiapan ({completedCount}/{checklist.length})
          </button>
          <button
            onClick={() => setActiveTab("puskesmas")}
            className={cn(
              "py-2.5 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === "puskesmas"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-paper-500 hover:text-paper-800"
            )}
          >
            2. Kontak Puskesmas ({recommendation.target_kecamatan.length} Wilayah)
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            className={cn(
              "py-2.5 px-3 text-xs font-semibold border-b-2 transition-all",
              activeTab === "draft"
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-paper-500 hover:text-paper-800"
            )}
          >
            3. Draft Surat & Broadcast WA
          </button>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto">

        {/* Tab 1: SOP Checklist & Rationale */}
        {activeTab === "protocol" && (
          <div className="p-6 space-y-4">
            {/* Climate & Epidemiological Triggers */}
            {recommendation.climate_trigger && (
              <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200/80 flex items-start gap-3">
                <CloudRain className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-semibold text-brand-900">Pemicu Parameter Iklim BMKG:</h5>
                  <p className="text-xs text-brand-800 mt-0.5 leading-relaxed">
                    {recommendation.climate_trigger}
                  </p>
                </div>
              </div>
            )}

            {/* Estimated Impact Box */}
            {recommendation.estimated_impact && (
              <div className="p-3.5 rounded-xl bg-risk-low-bg border border-risk-low-br flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-semibold text-risk-low">Proyeksi Efektivitas Intervensi:</h5>
                  <p className="text-xs text-paper-700 mt-0.5 leading-relaxed">
                    {recommendation.estimated_impact}
                  </p>
                </div>
              </div>
            )}

            {/* Checklist Section */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                  Checklist Kesiapan Intervensi Lapangan
                </label>
                <span className="text-xs font-mono font-semibold text-paper-600">
                  {completedCount} dari {checklist.length} Terverifikasi ({progressPct}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-paper-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand-700 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="space-y-2 mt-3">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(item)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      checkedItems[item]
                        ? "bg-brand-50/50 border-brand-300 text-foreground"
                        : "bg-paper-0 border-paper-200 text-paper-700 hover:bg-paper-50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                        checkedItems[item]
                          ? "bg-brand-700 border-brand-700 text-white"
                          : "border-paper-400 bg-paper-0"
                      )}
                    >
                      {checkedItems[item] && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs leading-snug font-medium select-none">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Puskesmas Contacts & Readiness */}
        {activeTab === "puskesmas" && (
          <div className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">
              Daftar Puskesmas dan Satgas lapangan yang akan menerima instruksi penanganan untuk kecamatan target:
            </div>

            <div className="space-y-3">
              {(recommendation.target_puskesmas || [
                { name: "Puskesmas Pedurungan", head: "dr. Sugiyanto, M.Kes", phone: "+62 812-2849-0112", readiness: "Siaga 1" as const },
                { name: "Puskesmas Banyumanik", head: "dr. Endang Sri Wahyuni", phone: "+62 813-9021-4458", readiness: "Siaga 1" as const },
                { name: "Puskesmas Rowosari (Tembalang)", head: "dr. Ahmad Fauzi", phone: "+62 811-2703-9981", readiness: "Siap Operasi" as const },
              ]).map((pusk, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-paper-200 bg-paper-0 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-foreground">{pusk.name}</h5>
                      <p className="text-[11px] text-muted-foreground">Kepala: {pusk.head}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Phone className="h-3 w-3 text-paper-400" />
                        <span className="font-mono text-[11px] text-paper-600">{pusk.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        pusk.readiness === "Siaga 1"
                          ? "bg-risk-high-bg text-risk-high border-risk-high-br"
                          : "bg-risk-low-bg text-risk-low border-risk-low-br"
                      )}
                    >
                      {pusk.readiness}
                    </span>
                    <a
                      href={`https://wa.me/${pusk.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors"
                    >
                      <span>Hubungi</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-paper-50 rounded-xl border border-paper-200 flex items-center justify-between text-xs">
              <span className="text-paper-600">Unit Komando: <strong>{recommendation.pic_unit || "Satgas Vektor DKK Semarang"}</strong></span>
              <span className="font-mono text-paper-500">Hotline 119</span>
            </div>
          </div>
        )}

        {/* Tab 3: Draft Surat Tugas & Broadcast WA */}
        {activeTab === "draft" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                Draft Pesan Instruksi / Surat Edaran Resmi
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyDraft}
                className="h-7 text-xs gap-1.5"
              >
                {copiedDraft ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-risk-low" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Teks</span>
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={6}
                value={
                  recommendation.broadcast_template ||
                  `[INSTRUKSI RESMI DINAS KESEHATAN KOTA SEMARANG]\nNomor: 440/1892/DKK-P2P/VIII/2026\nPerihal: Intervensi Dini Pengendalian Lonjakan ${recommendation.disease}\n\nKepada Yth. Kepala Puskesmas Wilayah: ${recommendation.target_kecamatan.join(", ")}.\nBerdasarkan sistem prediksi iklim-kesehatan Prakira, terdeteksi kenaikan risiko signifikan. Segera laksanakan intervensi: ${recommendation.title} sebelum ${recommendation.due_date}.`
                }
                className="w-full text-xs font-mono bg-paper-50 p-3.5 rounded-xl border border-paper-200 text-paper-800 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-brand-50/70 border border-brand-200/80 rounded-xl text-xs text-brand-900">
              <FileText className="h-4 w-4 text-brand-700 shrink-0" />
              <span>
                Pesan ini akan otomatis disiarkan ke sistem notifikasi WhatsApp Satgas & Kepala Puskesmas terkait saat Anda menekan tombol kirim.
              </span>
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer (Pinned) */}
        <div className="p-3.5 px-5 border-t border-paper-200 bg-paper-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-paper-600">
            <ShieldAlert className="h-4 w-4 text-brand-700" />
            <span>Otorisasi: Kepala Bidang P2P Dinas Kesehatan Kota Semarang</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs flex-1 sm:flex-initial"
            >
              Batal
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleDispatch}
              disabled={isSubmitting || isSuccess}
              className="text-xs text-white font-semibold bg-brand-700 hover:bg-brand-600 gap-1.5 flex-1 sm:flex-initial shadow-sm"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span className="text-white">Instruksi Berhasil Disiarkan!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <span className="animate-spin mr-1">⏳</span>
                  <span className="text-white">Mengirimkan Instruksi...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-white" />
                  <span className="text-white">Kirim Instruksi Resmi Sekarang</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
