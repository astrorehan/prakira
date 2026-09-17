"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  FlaskConical,
  Layers,
  Loader2,
  MapPin,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DataState } from "@/components/data-state";
import { useSessionContext } from "@/components/session-provider";
import {
  clearSurge,
  fetchEscalations,
  fetchKecamatanList,
  injectSurge,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { REPORT_KIND } from "@/lib/reports";
import { relativeAge } from "@/lib/period";
import { cn } from "@/lib/utils";
import type { Escalation, EscalationReasonKind, ReportKind } from "@/types";

/**
 * Eskalasi "perlu perhatian" (PRD §4, S4) + kendali peragaan lonjakan.
 *
 * Antrean verifikasi mengurutkan laporan satu per satu, dan pada urutan itu
 * sebuah pola hilang: lima laporan genangan dari kecamatan yang sama dalam
 * sepuluh hari tersebar di seluruh daftar dan terbaca sebagai lima keluhan
 * lepas. Panel ini membaca polanya dan menaruhnya di atas antrean.
 *
 * Aturan ambangnya ikut dicetak, bukan disembunyikan sebagai "algoritma".
 * Petugas yang melihat kecamatannya naik status berhak tahu ambang mana yang
 * terlampaui, dan berhak tidak setuju.
 *
 * Kendali peragaan hanya muncul untuk peran admin dan dinas — sama seperti
 * retraining di halaman admin — karena ia menulis ke antrean yang dilihat
 * semua petugas. Setiap baris yang disuntikkan bertanda `[SIMULASI]` di
 * deskripsinya dan bisa dicabut utuh lewat satu tombol.
 */

const REASON_ICON: Record<EscalationReasonKind, React.ElementType> = {
  volume: Layers,
  pemusatan: MapPin,
  tertahan: Clock,
};

const DEMO_KINDS: ReportKind[] = [
  "genangan",
  "jentik",
  "gejala",
  "sampah",
  "saluran",
];

function EscalationCard({ item }: { item: Escalation }) {
  const [open, setOpen] = React.useState(false);
  const jenis = item.jenisDominan ? REPORT_KIND[item.jenisDominan] : null;

  return (
    <Card className="border-risk-medium-br bg-risk-medium-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-sm font-semibold text-foreground">
              {item.kecamatan}
            </span>
            <Badge variant="risk-medium" size="sm">
              <TriangleAlert aria-hidden />
              Perlu perhatian
            </Badge>
            {jenis && (
              <Badge variant="outline" size="sm">
                Dominan: {jenis.label}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-caption text-paper-700">
            {item.total} laporan dihitung · {item.menunggu} menunggu ·{" "}
            {item.terverifikasi} terverifikasi
            {item.laporanTerakhir
              ? ` · terakhir masuk ${relativeAge(item.laporanTerakhir)}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full border border-paper-300 bg-surface px-3 py-1 text-caption text-paper-700 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          {item.reasons.length} alasan
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <ul className="mt-3 space-y-2 border-t border-risk-medium-br pt-3">
          {item.reasons.map((reason) => {
            const Icon = REASON_ICON[reason.kind];
            return (
              <li key={reason.kind} className="flex gap-2.5">
                <Icon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-medium"
                  aria-hidden
                />
                <p className="text-caption leading-relaxed text-paper-800">
                  <span className="font-semibold">{reason.label}.</span>{" "}
                  {reason.detail}
                </p>
              </li>
            );
          })}
          <li className="pt-1 text-caption text-paper-700">
            Rincian jenis:{" "}
            {Object.entries(item.perJenis)
              .map(
                ([kind, count]) =>
                  `${REPORT_KIND[kind as ReportKind]?.label ?? kind} ${count}`,
              )
              .join(" · ")}
            .
          </li>
        </ul>
      )}
    </Card>
  );
}

function DemoControls({
  onDone,
}: {
  onDone: () => void;
}) {
  const kecamatan = useApi(() => fetchKecamatanList(), []);
  const [target, setTarget] = React.useState("");
  const [kind, setKind] = React.useState<ReportKind>("genangan");
  const [count, setCount] = React.useState(8);
  const [busy, setBusy] = React.useState<"inject" | "clear" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!target && kecamatan.data && kecamatan.data.length > 0) {
      setTarget(kecamatan.data[0].nama);
    }
  }, [kecamatan.data, target]);

  const run = async () => {
    if (!target) return;
    setBusy("inject");
    setError(null);
    setMessage(null);
    try {
      const result = await injectSurge({ kecamatan: target, kind, count });
      const naik = result.data.baru;
      setMessage(
        naik.length > 0
          ? `${result.data.created.length} laporan simulasi masuk. ${naik
              .map((e) => e.kecamatan)
              .join(", ")} naik ke status perlu perhatian — ${naik[0].reasons.length} ambang terlampaui.`
          : `${result.data.created.length} laporan simulasi masuk. Belum ada kecamatan yang melewati ambang; naikkan jumlahnya atau pilih jenis yang sama.`,
      );
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    setBusy("clear");
    setError(null);
    setMessage(null);
    try {
      const result = await clearSurge();
      setMessage(
        result.meta.removed === 0
          ? "Tidak ada laporan simulasi yang tertanam."
          : `${result.meta.removed} laporan simulasi dihapus. Laporan warga tidak tersentuh.`,
      );
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-dashed border-paper-300 bg-paper-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
            <FlaskConical className="h-4 w-4 text-paper-600" aria-hidden />
            Peragaan lonjakan
          </h3>
          <p className="mt-1 max-w-xl text-caption leading-relaxed text-paper-700">
            Menyisipkan laporan bertanda <code>[SIMULASI]</code> untuk
            memperagakan eskalasi otomatis di depan penonton. Statusnya tetap
            <em> menunggu</em> — loop tidak dipotong, laporannya tetap harus
            lewat tangan verifikator. Penyisipan dan pencabutan tercatat di
            jejak audit.
          </p>
        </div>
        <Badge variant="outline">Admin &amp; dinas</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="demo-kecamatan" className="text-caption text-paper-600">
            Kecamatan
          </Label>
          <select
            id="demo-kecamatan"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-body-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(kecamatan.data ?? []).map((k) => (
              <option key={k.id} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="demo-jenis" className="text-caption text-paper-600">
            Jenis laporan
          </Label>
          <select
            id="demo-jenis"
            value={kind}
            onChange={(e) => setKind(e.target.value as ReportKind)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-body-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DEMO_KINDS.map((k) => (
              <option key={k} value={k}>
                {REPORT_KIND[k].label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="demo-jumlah" className="text-caption text-paper-600">
            Jumlah
          </Label>
          <input
            id="demo-jumlah"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-10 w-20 rounded-xl border border-border bg-surface px-3 text-body-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button size="sm" onClick={run} disabled={busy !== null || !target}>
          {busy === "inject" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          Suntik lonjakan
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={clear}
          disabled={busy !== null}
        >
          {busy === "clear" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          Hapus semua simulasi
        </Button>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-brand-300/50 bg-brand-50 px-3.5 py-2.5 text-caption text-brand-900">
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-risk-high-br bg-risk-high-bg px-3.5 py-2.5 text-caption text-risk-high"
        >
          {error}
        </p>
      )}
    </Card>
  );
}

export function EscalationPanel({ onChanged }: { onChanged?: () => void }) {
  const { session } = useSessionContext();
  const escalations = useApi(() => fetchEscalations(), []);
  const [rulesOpen, setRulesOpen] = React.useState(false);

  const canDemo = session?.role === "admin" || session?.role === "dinas";
  const items = escalations.data?.data ?? [];
  const meta = escalations.data?.meta;

  const refresh = React.useCallback(() => {
    escalations.reload();
    onChanged?.();
  }, [escalations, onChanged]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
          <TriangleAlert className="h-4 w-4 text-risk-medium" aria-hidden />
          Eskalasi otomatis
          {items.length > 0 && (
            <Badge variant="risk-medium" size="sm">
              {items.length} kecamatan
            </Badge>
          )}
        </h2>
        {meta && (
          <button
            type="button"
            onClick={() => setRulesOpen((v) => !v)}
            aria-expanded={rulesOpen}
            className="text-caption text-brand-700 underline-offset-4 hover:underline"
          >
            {rulesOpen ? "Sembunyikan aturan" : "Aturan apa yang dipakai?"}
          </button>
        )}
      </div>

      {rulesOpen && meta && (
        <Card className="p-4">
          <ul className="space-y-1.5">
            {meta.explanation.map((line) => (
              <li key={line} className="text-caption leading-relaxed text-paper-700">
                — {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-2.5 text-caption text-paper-600">
            {meta.scanned} laporan dipindai dalam jendela ini.
          </p>
        </Card>
      )}

      <DataState
        loading={escalations.loading}
        error={escalations.error}
        empty={!escalations.loading && items.length === 0}
        emptyMessage="Tidak ada kecamatan yang melewati ambang. Antrean tetap perlu dikerjakan satu per satu."
        loadingMessage="Memindai pola laporan per kecamatan…"
        onRetry={escalations.reload}
        className="min-h-[120px]"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <EscalationCard key={item.kecamatan} item={item} />
          ))}
        </div>
      </DataState>

      {canDemo && <DemoControls onDone={refresh} />}
    </section>
  );
}
