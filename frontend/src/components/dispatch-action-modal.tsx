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
import { describeDeadline, formatDateTime, formatMonth } from "@/lib/period";
import {
  COVERAGE_LABEL,
  effectiveDueDate,
  PRIORITY_LABEL,
  STATUS_LABEL,
} from "@/lib/action-queue";
import {
  acknowledgeAction,
  assignAction,
  completeAction,
  recordActionBlocker,
  recordActionProgress,
  reopenAction,
  setActionPublication,
} from "@/lib/api";

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
 * 5. Satu tombol "Tandai sebagai berjalan" diganti tab Pelaksanaan (audit F04,
 *    F05). Tombol itu adalah seluruh alur kerja yang pernah dimiliki produk
 *    ini: tidak ada tempat mencatat siapa yang ditugasi, apakah ia menerima
 *    penugasannya, kendala yang muncul, atau hasil akhirnya — sehingga
 *    pekerjaan lapangan berhenti tercatat tepat setelah dimulai. Centang SOP
 *    pun hanya hidup di memori tab ini dan hilang ketika modalnya ditutup.
 */

interface DispatchActionModalProps {
  recommendation: ActionRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil setelah satu kejadian tercatat, supaya antrean menarik data segar. */
  onChanged: (message: string) => void;
  /** Hari acuan konsol dari `/api/meta/period`. */
  systemToday: string | null;
  /** Nama petugas yang sedang masuk — tercatat di audit trail. */
  operator: string | null;
}

type TabId = "protocol" | "execution" | "draft";

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
  onChanged,
  systemToday,
  operator,
}: DispatchActionModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("protocol");
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  /* Bidang pelaksanaan. Semuanya dikosongkan tiap kali tindakannya berganti. */
  const [unit, setUnit] = React.useState("");
  const [pic, setPic] = React.useState("");
  const [agreedDue, setAgreedDue] = React.useState("");
  const [assignNote, setAssignNote] = React.useState("");
  const [ackSource, setAckSource] = React.useState("");
  const [progressNote, setProgressNote] = React.useState("");
  const [blockerNote, setBlockerNote] = React.useState("");
  const [resultNote, setResultNote] = React.useState("");

  const id = recommendation?.id;

  /* Reset penuh tiap kali rekomendasi berganti. Penjagaan lama membuat status
     "terkirim" bocor dari satu tindakan ke tindakan berikutnya. */
  React.useEffect(() => {
    setActiveTab("protocol");
    setIsSubmitting(false);
    setError(null);
    setCopyState("idle");
    setPic("");
    setAgreedDue("");
    setAssignNote("");
    setAckSource("");
    setProgressNote("");
    setBlockerNote("");
    setResultNote("");
  }, [id]);

  /* Centang SOP dibaca dari yang tersimpan, bukan dimulai kosong tiap kali.
     Versi sebelumnya membuang centangnya begitu modal ditutup, sehingga
     petugas berikutnya tidak pernah tahu butir mana yang sudah dikerjakan. */
  React.useEffect(() => {
    const saved = recommendation?.result?.sopCompleted ?? [];
    setCheckedItems(Object.fromEntries(saved.map((item) => [item, true])));
    setUnit(recommendation?.assignment?.unit ?? recommendation?.pic_unit ?? "");
  }, [id, recommendation?.assignment?.unit, recommendation?.pic_unit, recommendation?.result]);

  if (!recommendation) return null;

  const checklist = recommendation.sop_checklist;
  const completedCount = checklist.filter((item) => checkedItems[item]).length;
  const progressPct =
    checklist.length === 0 ? 0 : Math.round((completedCount / checklist.length) * 100);
  const deadline = describeDeadline(effectiveDueDate(recommendation), systemToday);
  const action = recommendation;

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

  /** Menjalankan satu kejadian dan melaporkan apa yang tercatat, bukan lebih. */
  const record = async (
    run: () => Promise<unknown>,
    message: string,
    { close = false } = {},
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await run();
      onChanged(message);
      if (close) onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "protocol", label: "Ringkasan" },
    { id: "execution", label: action.assignment ? "Pelaksanaan" : "Penugasan" },
    { id: "draft", label: "Pesan" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Kepala modal */}
        <div className="shrink-0 border-b border-border bg-paper-50 p-5 pb-3.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-2.5 sm:grid-cols-2">
            <FactTile
              icon={Calendar}
              label="Persiapan"
              value={`${recommendation.lead_time_days} hari · target ${formatMonth(recommendation.prediction_month)}`}
            />
            <FactTile
              icon={Users}
              label="Sasaran"
              value={`${recommendation.target_kecamatan.length} kecamatan · ${formatNumber(recommendation.target_population)} jiwa`}
            />
          </div>
        </div>

        {/* Tab */}
        <div
          role="tablist"
          aria-label="Bagian rekomendasi"
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
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                <div>
                  <h4 className="text-caption font-semibold text-foreground">
                    Wilayah sasaran
                  </h4>
                  <p className="mt-0.5 text-caption leading-relaxed text-paper-700">
                    {recommendation.target_kecamatan.length} kecamatan · {recommendation.target_kecamatan.join(", ")}
                  </p>
                </div>
              </div>

              <details className="rounded-xl border border-border bg-paper-50 p-3.5">
                <summary className="cursor-pointer text-caption font-semibold text-foreground">
                  Dasar prakiraan
                </summary>
                <div className="mt-3 space-y-3 text-caption leading-relaxed text-paper-700">
                  <p>{recommendation.basis}</p>
                  {recommendation.climate_trigger && (
                    <p className="flex items-start gap-2">
                      <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                      <span>{recommendation.climate_trigger}</span>
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Tanpa intervensi:</span>{" "}
                    {recommendation.estimated_impact}
                  </p>
                  <p>
                    <span className="font-semibold">Cakupan data:</span>{" "}
                    {COVERAGE_LABEL[recommendation.data_coverage] ?? recommendation.data_coverage}
                  </p>
                </div>
              </details>

              <details open={Boolean(recommendation.assignment)} className="rounded-xl border border-border bg-surface p-3.5">
                <summary className="cursor-pointer text-caption font-semibold text-foreground">
                  Langkah pelaksanaan ({completedCount}/{checklist.length})
                </summary>
                <fieldset className="mt-3 space-y-2.5">
                  <legend className="sr-only">Langkah pelaksanaan</legend>

                  <div
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Langkah pelaksanaan dipilih"
                    className="h-2 w-full overflow-hidden rounded-full bg-paper-200"
                  >
                    <div
                      className="h-full rounded-full bg-brand-700 transition-[width] duration-base ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="space-y-2">
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
              </details>
            </div>
          )}

          {/* Penugasan dan catatan pelaksanaan. */}
          {activeTab === "execution" && (
            <div
              role="tabpanel"
              id="dispatch-panel-execution"
              aria-labelledby="dispatch-tab-execution"
              className="space-y-5 p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">{STATUS_LABEL[action.status]}</Badge>
                {action.assignment && !action.acknowledgement && (
                  <Badge variant="risk-medium">Belum dikonfirmasi</Badge>
                )}
                {action.blocker && <Badge variant="risk-high">Terkendala</Badge>}
              </div>

              {/* Penugasan. Tanpa unit dan orang, "berjalan" tidak menyebut
                  siapa pun yang bisa ditanya kabarnya. */}
              <section className="space-y-2.5 rounded-xl border border-border bg-surface p-3.5">
                <h4 className="text-caption font-semibold text-foreground">
                  {action.assignment ? "Penugasan" : "Pilih pelaksana"}
                </h4>
                {action.assignment ? (
                  <p className="text-caption leading-relaxed text-paper-700">
                    {action.assignment.unit}
                    {action.assignment.pic ? ` · ${action.assignment.pic}` : ""}
                    {action.assignment.agreedDueDate
                      ? ` · tenggat ${action.assignment.agreedDueDate}`
                      : ""}
                  </p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-caption font-medium text-paper-700">
                    <span>Unit atau puskesmas pelaksana</span>
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      aria-label="Unit atau puskesmas pelaksana"
                      className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="space-y-1 text-caption font-medium text-paper-700">
                    <span>Penanggung jawab (opsional)</span>
                    <input
                      value={pic}
                      onChange={(e) => setPic(e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="space-y-1 text-caption font-medium text-paper-700">
                    <span>Tenggat</span>
                    <input
                      type="date"
                      value={agreedDue}
                      onChange={(e) => setAgreedDue(e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="space-y-1 text-caption font-medium text-paper-700">
                    <span>Catatan (opsional)</span>
                    <input
                      value={assignNote}
                      onChange={(e) => setAssignNote(e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
                <p className="text-caption leading-relaxed text-paper-600">
                  Batas saran {deadline.date}. Catat di aplikasi, teruskan instruksi
                  lewat kanal dinas.
                </p>
                <Button
                  size="sm"
                  disabled={isSubmitting || unit.trim().length === 0}
                  onClick={() =>
                    record(
                      () =>
                        assignAction(action.id, {
                          unit: unit.trim(),
                          pic: pic.trim() || undefined,
                          dueDate: agreedDue || undefined,
                          note: assignNote.trim() || undefined,
                        }),
                      `Penugasan ke ${unit.trim()} dicatat.`,
                    )
                  }
                >
                  {action.assignment ? "Simpan perubahan" : "Catat penugasan"}
                </Button>
              </section>

              {/* Konfirmasi penerimaan. Dicatat beserta jalurnya — produk ini
                  tidak punya kanal kirim, jadi konfirmasi selalu datang dari
                  luar aplikasi dan sumbernya harus disebut. */}
              {action.assignment && (
                <section className="space-y-2.5 rounded-xl border border-border bg-surface p-3.5">
                  <h4 className="text-caption font-semibold text-foreground">
                    Konfirmasi penerimaan
                  </h4>
                  {action.acknowledgement ? (
                    <p className="text-caption leading-relaxed text-paper-700">
                      Dibenarkan lewat {action.acknowledgement.source} pada{" "}
                      {formatDateTime(action.acknowledgement.at)}
                      {action.acknowledgement.by
                        ? ` — dicatat ${action.acknowledgement.by}`
                        : ""}
                      .
                    </p>
                  ) : (
                    <>
                      <input
                        value={ackSource}
                        onChange={(e) => setAckSource(e.target.value)}
                        placeholder="Mis. telepon piket, rapat koordinasi, pesan grup"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmitting || ackSource.trim().length === 0}
                        onClick={() =>
                          record(
                            () =>
                              acknowledgeAction(action.id, {
                                source: ackSource.trim(),
                              }),
                            `${action.id} dikonfirmasi diterima pelaksana.`,
                          )
                        }
                      >
                        Catat konfirmasi
                      </Button>
                    </>
                  )}
                </section>
              )}

              {/* Pelaksanaan, kendala, dan hasil. */}
              {action.assignment && action.status !== "completed" && (
                <section className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
                  <h4 className="text-caption font-semibold text-foreground">
                    Catatan lapangan
                  </h4>

                  {action.blocker && (
                    <p className="rounded-lg border border-risk-high-br bg-risk-high-bg px-3 py-2 text-caption leading-relaxed text-risk-high">
                      Kendala: {action.blocker.note} ({formatDateTime(action.blocker.at)})
                    </p>
                  )}

                  <textarea
                    rows={2}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Apa yang dikerjakan hari ini."
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting || progressNote.trim().length === 0}
                    onClick={() =>
                      record(() => {
                        const note = progressNote.trim();
                        setProgressNote("");
                        return recordActionProgress(action.id, note);
                      }, `Catatan pelaksanaan ${action.id} tersimpan.`)
                    }
                  >
                    Catat pelaksanaan
                  </Button>

                  <textarea
                    rows={2}
                    value={blockerNote}
                    onChange={(e) => setBlockerNote(e.target.value)}
                    placeholder="Kendala yang menahan pekerjaan — mis. alat belum tersedia."
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting || blockerNote.trim().length === 0}
                    onClick={() =>
                      record(() => {
                        const note = blockerNote.trim();
                        setBlockerNote("");
                        return recordActionBlocker(action.id, note);
                      }, `Kendala ${action.id} tercatat.`)
                    }
                  >
                    Catat kendala
                  </Button>

                  <div className="border-t border-border pt-3">
                    <textarea
                      rows={2}
                      value={resultNote}
                      onChange={(e) => setResultNote(e.target.value)}
                      placeholder="Hasil pekerjaan — wajib diisi untuk menutup tindakan."
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="mt-1.5 text-caption text-paper-600">
                      {completedCount} dari {checklist.length} butir SOP tercentang
                      ikut tersimpan sebagai bukti kerja.
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      disabled={isSubmitting || resultNote.trim().length === 0}
                      onClick={() =>
                        record(
                          () =>
                            completeAction(action.id, {
                              resultNote: resultNote.trim(),
                              sopCompleted: checklist.filter((i) => checkedItems[i]),
                            }),
                          `${action.id} ditutup dengan catatan hasil.`,
                          { close: true },
                        )
                      }
                    >
                      Tandai selesai
                    </Button>
                  </div>
                </section>
              )}

              {action.status === "completed" && action.result && (
                <section className="space-y-2 rounded-xl border border-risk-low-br bg-risk-low-bg p-3.5">
                  <h4 className="text-caption font-semibold text-foreground">Hasil</h4>
                  <p className="text-caption leading-relaxed text-paper-800">
                    {action.result.note}
                  </p>
                  {action.result.sopCompleted.length > 0 && (
                    <p className="text-caption text-paper-700">
                      Butir SOP terpenuhi: {action.result.sopCompleted.join("; ")}.
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting || progressNote.trim().length === 0}
                    onClick={() =>
                      record(() => {
                        const reason = progressNote.trim();
                        setProgressNote("");
                        return reopenAction(action.id, reason);
                      }, `${action.id} dibuka kembali.`)
                    }
                  >
                    Buka kembali
                  </Button>
                  <input
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Alasan membuka kembali"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-caption text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </section>
              )}

              {/* F15: penerbitan ke permukaan publik adalah keputusan
                  tersendiri. Warga hanya melihat kegiatan yang sudah ditinjau,
                  bukan tiap usulan yang keluar dari mesin aturan. */}
              <section className="space-y-2 rounded-xl border border-border bg-paper-50 p-3.5">
                <h4 className="text-caption font-semibold text-foreground">
                  Informasi publik
                </h4>
                <p className="text-caption leading-relaxed text-paper-700">
                  {action.publication
                    ? `Terbit sejak ${formatDateTime(action.publication.publishedAt)}${action.publication.publishedBy ? ` — ${action.publication.publishedBy}` : ""}.`
                    : "Belum ditinjau untuk publikasi; halaman warga tidak menampilkannya."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() =>
                    record(
                      () => setActionPublication(action.id, !action.publication),
                      action.publication
                        ? `${action.id} ditarik dari halaman warga.`
                        : `${action.id} diterbitkan ke halaman warga.`,
                    )
                  }
                >
                  {action.publication ? "Tarik dari publikasi" : "Terbitkan untuk warga"}
                </Button>
              </section>

              {action.history.length > 0 && (
                <section className="space-y-1.5 border-t border-border pt-3">
                  <h4 className="text-caption font-semibold text-foreground">
                    Riwayat
                  </h4>
                  <ul className="space-y-1">
                    {action.history.map((entry) => (
                      <li key={entry.id} className="text-caption leading-relaxed text-paper-600">
                        {formatDateTime(entry.ts)} · {entry.event} · {entry.actor}
                        {entry.detail ? ` — ${entry.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
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
                  Aplikasi belum mengirim pesan. Salin draf ini ke kanal dinas.
                </span>
              </div>

              {/* Draf di atas ditujukan ke puskesmas; yang di bawah ditujukan ke
                  warga, satu kartu per kecamatan sasaran, beserta kode QR menuju
                  formulir laporan. Dipisah karena pembacanya berbeda dan
                  kalimatnya harus berbeda. */}
              <div className="border-t border-border pt-4">
                <h3 className="text-body-sm font-semibold text-foreground">
                  Pesan untuk warga
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
              <span>
                {action.assignment ? "Pelaksana" : "Saran unit"}: {action.assignment?.unit ?? recommendation.pic_unit}
                {action.assignment?.pic ? ` · ${action.assignment.pic}` : ""}
              </span>
            </span>
            {operator && (
              <span className="block text-caption text-paper-600">
                Pencatat: {operator}
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

            {/* Tidak ada lagi satu tombol yang menutup seluruh alur kerja.
                Yang tersisa adalah jalan pintas ke tempat kejadiannya dicatat. */}
            <Button
              size="sm"
              onClick={() => setActiveTab("execution")}
              disabled={activeTab === "execution"}
              className="flex-1 gap-1.5 sm:flex-initial"
            >
              {action.status === "completed" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Lihat hasil</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {action.assignment ? "Catat pelaksanaan" : "Atur penugasan"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
