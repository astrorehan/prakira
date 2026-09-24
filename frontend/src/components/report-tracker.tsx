"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Check, Clock, X, MapPin, Info, ArrowRight, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  normalizeTrackingCode,
  REPORT_KIND,
  REPORT_STATUS,
  FAMILY_ROUTING,
} from "@/lib/reports";
import { formatDate, formatDateTime } from "@/lib/period";
import { ApiError, trackReport } from "@/lib/api";
import { forgetReport, saveReport, useSavedReports } from "@/lib/saved-reports";
import type { CitizenReport } from "@/types";

/**
 * Kode yang diingat perangkat ini. Satu ketukan membuka statusnya; tombol
 * lupakan ada untuk perangkat yang dipakai bergantian.
 */
function SavedReports({
  activeId,
  onOpen,
}: {
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  const saved = useSavedReports();
  if (saved.length === 0) return null;

  return (
    <section aria-labelledby="laporan-tersimpan" className="max-w-xl">
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-paper-600" aria-hidden="true" />
        <h2 id="laporan-tersimpan" className="text-overline uppercase tracking-[0.1em] text-paper-600">
          Tersimpan di perangkat ini
        </h2>
      </div>
      <ul className="mt-3 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
        {saved.map((r) => (
          <li key={r.id} className="flex items-center gap-2 pr-2">
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              aria-current={r.id === activeId ? "true" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-sand-50",
                r.id === activeId && "bg-sand-50",
              )}
            >
              <span className="tabular font-mono text-body-sm font-semibold tracking-[0.08em] text-foreground">
                {r.id}
              </span>
              <span className="truncate text-caption text-paper-600">
                {REPORT_KIND[r.kind]?.label ?? r.kind} · {r.kecamatan} · {formatDate(r.submittedAt)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => forgetReport(r.id)}
              aria-label={`Lupakan kode ${r.id} dari perangkat ini`}
              className="shrink-0 rounded-full p-2 text-paper-600 transition-colors hover:bg-sand-100 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-paper-600">
        Hanya kode, jenis, dan wilayah yang disimpan — bukan isi laporan atau foto.
      </p>
    </section>
  );
}

/**
 * Pelacak laporan — PRD §5.4.
 *
 * "Submit → kode lacak yang bisa dicek di halaman status tanpa akun." Kode
 * itulah seluruh identitasnya: tidak ada nama, nomor, atau surel yang bisa
 * dipakai memulihkannya, karena tidak ada satu pun yang diminta saat mengirim.
 *
 * Halaman ini menampilkan garis waktu, bukan satu lencana. Pelapor yang
 * kembali ke sini ingin tahu apakah ada yang membaca laporannya — "Menunggu
 * verifikasi" sendirian tidak menjawab itu, sedangkan tanggal masuk di sebelah
 * kotak keputusan yang masih kosong menjawabnya.
 */

type Step = {
  label: string;
  detail: string;
  state: "done" | "current" | "idle" | "rejected";
  at?: string;
};

/**
 * Langkah penerusan menyebut keadaan yang benar-benar tercatat (audit F10).
 *
 * Sebelum petugas memutuskan, yang dijanjikan hanyalah pemeriksaan: menulis
 * "akan diteruskan ke DLH" di tahap itu menjanjikan pekerjaan instansi lain
 * yang belum tentu diminta. Setelah diputuskan pun ada dua keadaan berbeda —
 * "perlu diteruskan" (belum disampaikan) dan "diteruskan" (penyampaiannya
 * tercatat, lengkap dengan kanal dan waktunya).
 */
function buildSteps(report: CitizenReport): Step[] {
  const decided =
    report.status !== "menunggu" && report.status !== "perlu_informasi";
  const rejected = report.status === "ditolak";
  const forwarded = report.forwarding?.state === "diteruskan";
  const proposed = report.forwarding?.state === "diusulkan";
  const followUpLabel =
    !decided
      ? report.routing.family === "lingkungan"
        ? "Penentuan tindak lanjut"
        : "Rekap kesehatan"
      : report.routing.workflow === "penerusan_instansi"
      ? forwarded
        ? `Diteruskan ke ${report.forwarding?.target ?? "instansi penerima"}`
        : proposed
          ? "Diusulkan untuk diteruskan"
          : "Perlu diteruskan"
      : report.routing.workflow === "arahan_warga"
        ? "Arahan mandiri warga"
        : report.routing.workflow === "rekap_evaluasi"
          ? "Masuk rekap kesehatan"
          : "Penentuan tindak lanjut";
  const followUpDetail =
    !decided
      ? report.routing.family === "lingkungan"
        ? "Petugas memeriksa laporan dan menentukan tindak lanjut yang sesuai."
        : "Setelah diterima, laporan masuk rekap evaluasi kesehatan."
      : report.routing.workflow === "penerusan_instansi"
      ? forwarded
        ? `Disampaikan pada ${report.forwarding?.forwardedAt ? formatDateTime(report.forwarding.forwardedAt) : "waktu yang tercatat"}${report.forwarding?.channel ? ` lewat ${report.forwarding.channel}` : ""}. Penanganan teknis menjadi kewenangan instansi penerima.`
        : proposed
          ? "Petugas mengusulkan laporan ini diteruskan ke instansi penerima; Dinas Kesehatan sedang menimbang usulan itu."
          : "Petugas sudah memutuskan laporan ini perlu diteruskan; penyampaiannya ke instansi penerima belum tercatat."
      : report.routing.workflow === "arahan_warga"
        ? "Petugas memilih tindak lanjut melalui arahan yang aman dilakukan warga."
        : report.routing.workflow === "rekap_evaluasi"
          ? "Laporan terverifikasi masuk rekap evaluasi kesehatan."
          : "Petugas memeriksa laporan dan menentukan tindak lanjut yang sesuai.";

  return [
    {
      label: "Laporan diterima sistem",
      detail: `Masuk antrean ${report.kecamatan}.`,
      state: "done",
      at: report.submittedAt,
    },
    {
      label: "Diperiksa petugas",
      detail: decided
        ? `Diputuskan oleh ${report.reviewer ?? "petugas wilayah"}.`
        : "Petugas puskesmas wilayah Anda belum memberi keputusan.",
      state: decided ? "done" : "current",
      at: report.reviewedAt ?? undefined,
    },
    ...(report.status === "perlu_informasi"
      ? [
          {
            label: "Perlu informasi tambahan",
            detail:
              report.infoRequest ??
              "Petugas membutuhkan keterangan lain sebelum dapat memutuskan.",
            state: "current" as const,
            at: report.infoRequestedAt ?? undefined,
          },
        ]
      : []),
    rejected
      ? {
          label: "Ditolak",
          detail:
            report.reviewNote ??
            "Petugas tidak dapat membenarkan laporan ini. Anda bisa mengirim laporan baru dengan keterangan lebih rinci.",
          state: "rejected",
        }
      : {
          label: followUpLabel,
          detail: followUpDetail,
          state:
            report.status !== "terverifikasi"
              ? "idle"
              : report.routing.workflow === "penerusan_instansi" && !forwarded
                ? "current"
                : "done",
        },
  ];
}

const STEP_ICON = { done: Check, current: Clock, idle: Clock, rejected: X } as const;

const STEP_STYLE: Record<Step["state"], string> = {
  done: "border-risk-low-br bg-risk-low-bg text-risk-low",
  current: "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
  idle: "border-sand-200 bg-sand-50 text-paper-600",
  rejected: "border-risk-none-br bg-risk-none-bg text-risk-none",
};

const TICKET_STATUS_LABEL: Record<NonNullable<CitizenReport["ticket"]>["status"], string> = {
  baru: "Tiket baru",
  diterima: "Diterima unit lingkungan",
  dikerjakan: "Sedang dikerjakan",
  selesai: "Penanganan selesai",
  ditutup: "Tiket ditutup",
};

function ReportDetail({ report }: { report: CitizenReport }) {
  const kind = REPORT_KIND[report.kind];
  const status = REPORT_STATUS[report.status];
  const steps = buildSteps(report);

  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-7 md:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="tabular font-mono text-overline uppercase tracking-[0.12em] text-paper-600">
            {report.id}
          </p>
          <h2 className="mt-2 text-h1 text-foreground">{status.label}</h2>
          <p className="mt-3 max-w-lg text-body text-paper-600">{status.blurb}</p>
        </div>
        <Badge variant={status.badge} size="lg" className="shrink-0">
          {status.label}
        </Badge>
      </div>

      <dl className="mt-8 grid gap-5 border-t border-sand-200 pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">Jenis</dt>
          <dd className="mt-1 text-body-sm font-medium text-foreground">{kind.label}</dd>
        </div>
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">Lokasi</dt>
          <dd className="mt-1 flex items-start gap-1.5 text-body-sm font-medium text-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden="true" />
            <span>
              {report.kecamatan}
              {report.kelurahan ? ` · ${report.kelurahan}` : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Tanggal kejadian
          </dt>
          <dd className="mt-1 text-body-sm font-medium text-foreground">
            {formatDate(report.occurredAt)}
          </dd>
        </div>
      </dl>

      <p className="mt-6 rounded-2xl border border-sand-200 bg-sand-50 p-4 text-body-sm leading-relaxed text-paper-700">
        {report.description}
      </p>

      <ol className="mt-8 space-y-5 border-t border-sand-200 pt-7">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.state];
          return (
            <li key={step.label} className="flex gap-3.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  STEP_STYLE[step.state],
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-1">
                <p
                  className={cn(
                    "text-body-sm font-semibold",
                    step.state === "idle" ? "text-paper-600" : "text-foreground",
                  )}
                >
                  {step.label}
                  {step.at && (
                    <span className="ml-2 font-normal text-caption text-paper-600">
                      {formatDateTime(step.at)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-body-sm leading-relaxed text-paper-600">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {report.status === "terverifikasi" && (
        <>
          <div className="mt-7 flex items-start gap-2.5 rounded-2xl border border-brand-300/45 bg-grad-brand-soft p-4 text-body-sm leading-relaxed text-paper-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>
              {report.simulated
                ? "Ini laporan peragaan; tidak membuat tiket operasional."
                : report.routing.workflow === "penerusan_instansi"
                  ? report.forwarding?.state === "diteruskan"
                    ? `Laporan sudah disampaikan ke ${report.forwarding.target}; penanganan teknis merupakan kewenangan instansi penerima.`
                    : report.forwarding?.state === "diusulkan"
                      ? "Petugas mengusulkan laporan ini diteruskan; Dinas Kesehatan akan memutuskannya lebih dulu."
                      : "Petugas memutuskan laporan ini perlu diteruskan. Halaman ini akan menyebut waktu penyampaiannya begitu tercatat."
                  : report.routing.workflow === "arahan_warga"
                    ? "Petugas memilih arahan mandiri warga; laporan ini tidak diteruskan ke instansi lain."
                    : report.routing.workflow === "rekap_evaluasi"
                      ? `Laporan kesehatan masuk rekap evaluasi dan menjadi perhatian ${FAMILY_ROUTING.kesehatan}.`
                      : "Petugas belum menetapkan jalur tindak lanjut laporan ini."}{" "}
              Terima kasih — yang Anda lihat di gang memang tidak selalu terlihat di rekapitulasi bulanan.
            </span>
          </div>

          {report.ticket && (
            <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-body-sm text-teal-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">Tiket {report.ticket.id}</span>
                <span className="rounded-full border border-teal-300 bg-white/70 px-2.5 py-1 text-caption font-medium">
                  {TICKET_STATUS_LABEL[report.ticket.status]}
                </span>
              </div>
              <p className="mt-2 leading-relaxed">
                Tujuan: {report.ticket.destinationUnit}. Status terakhir diperbarui pada{" "}
                {formatDateTime(report.ticket.updatedAt)}. Penanganan teknis merupakan kewenangan instansi penerima.
              </p>
              {report.ticket.resolutionNote && (
                <p className="mt-2 border-t border-teal-200 pt-2 leading-relaxed">
                  Catatan penanganan: {report.ticket.resolutionNote}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-sand-200 bg-sand-50 p-5">
            <h3 className="text-body-sm font-semibold text-foreground">{report.guidance.title}</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-sm leading-relaxed text-paper-700">
              {report.guidance.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className="mt-3 border-t border-sand-200 pt-3 text-caption leading-relaxed text-paper-600">
              {report.guidance.caution}
            </p>
          </div>

          {report.reviewNote && (
            <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <h3 className="text-body-sm font-semibold text-foreground">
                Saran/arahan dari petugas
              </h3>
              <p className="mt-2 text-body-sm leading-relaxed text-paper-700">
                {report.reviewNote}
              </p>
            </div>
          )}
        </>
      )}

      {report.status === "perlu_informasi" && (
        <div className="mt-7 border-t border-sand-200 pt-6">
          <p className="text-body-sm leading-relaxed text-paper-700">
            Kirim kelengkapannya lewat formulir laporan; sebutkan kode{" "}
            <span className="font-mono uppercase">{report.id}</span> supaya
            petugas dapat menautkannya dengan laporan ini.
          </p>
          <Button asChild variant="outline" className="group mt-4">
            <Link href={`/warga/lapor?lengkapi=${encodeURIComponent(report.id)}`}>
              Lengkapi laporan ini
              <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      )}

      {report.status === "ditolak" && (
        <div className="mt-7 border-t border-sand-200 pt-6">
          <Button asChild variant="outline" className="group">
            <Link href="/warga/lapor">
              Kirim laporan baru
              <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function ReportTracker() {
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<CitizenReport | null>(null);
  const [searched, setSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  /* Dibedakan dari "tidak ditemukan": gateway yang padam dan kode yang salah
     ketik menuntut tindakan berbeda dari pelapor. */
  const [failure, setFailure] = React.useState<string | null>(null);

  const lookup = React.useCallback(async (raw: string) => {
    const id = normalizeTrackingCode(raw);
    setSearched(true);
    setFailure(null);
    setResult(null);
    if (!id) return;

    setLoading(true);
    try {
      const found = await trackReport(id);
      setResult(found.data);
      /* Kode yang terbukti ada ikut diingat, termasuk yang diketik dari catatan. */
      saveReport(found.data);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setResult(null);
      } else {
        setFailure(
          caught instanceof Error
            ? caught.message
            : "Status laporan tidak dapat diambil sekarang.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /* Kode dari `?kode=` — tautan yang diberikan halaman berhasil-kirim membawa
     kodenya, jadi pelapor tidak perlu mengetik ulang apa pun. Dibaca setelah
     mount supaya halaman ini tetap bisa dirender statis. */
  React.useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("kode");
    if (fromUrl) {
      setCode(fromUrl);
      lookup(fromUrl);
    }
  }, [lookup]);

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(code);
        }}
        className="max-w-xl"
      >
        <Label htmlFor="kode">Kode lacak</Label>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <Input
            id="kode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PKR-8F42C1"
            autoComplete="off"
            spellCheck={false}
            className="tabular h-14 border-sand-200 bg-white font-mono text-base uppercase tracking-[0.08em] sm:flex-1"
          />
          <Button type="submit" size="lg" loading={loading} className="shrink-0 gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Cek status
          </Button>
        </div>
        <p className="mt-2 text-caption text-paper-600">
          Huruf besar-kecil dan tanda hubung tidak masalah.
        </p>
      </form>

      <SavedReports
        activeId={result?.id ?? null}
        onOpen={(id) => {
          setCode(id);
          lookup(id);
        }}
      />

      {failure ? (
        <div
          role="alert"
          className="rounded-3xl border border-risk-high-br bg-risk-high-bg p-8 text-center"
        >
          <p className="text-h3 text-foreground">Status belum bisa diambil</p>
          <p className="mx-auto mt-2 max-w-md text-body-sm leading-relaxed text-paper-700">
            {failure}
          </p>
          <Button variant="outline" className="mt-5" onClick={() => lookup(code)}>
            Coba lagi
          </Button>
        </div>
      ) : result ? (
        <ReportDetail report={result} />
      ) : searched && !loading ? (
        <div
          role="status"
          className="rounded-3xl border border-sand-200 bg-white p-8 text-center"
        >
          <p className="text-h3 text-foreground">Kode tidak ditemukan</p>
          <p className="mx-auto mt-2 max-w-md text-body-sm leading-relaxed text-paper-600">
            Periksa kembali penulisannya. Kode lacak berbentuk PKR- diikuti enam
            huruf/angka.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/warga/lapor">Kirim laporan baru</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
