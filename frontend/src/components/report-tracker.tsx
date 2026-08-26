"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Check, Clock, X, MapPin, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  findReport,
  formatDate,
  formatDateTime,
  normalizeTrackingCode,
  REPORT_KIND,
  REPORT_STATUS,
  FAMILY_ROUTING,
  type CitizenReport,
} from "@/lib/reports";

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

function buildSteps(report: CitizenReport): Step[] {
  const decided = report.status !== "menunggu";
  const rejected = report.status === "ditolak";

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
      at: report.reviewedAt,
    },
    rejected
      ? {
          label: "Ditolak",
          detail:
            report.reviewNote ??
            "Petugas tidak dapat membenarkan laporan ini. Anda bisa mengirim laporan baru dengan keterangan lebih rinci.",
          state: "rejected",
        }
      : {
          label: "Masuk hitungan prakiraan",
          detail:
            report.status === "terverifikasi"
              ? `Laporan terverifikasi ikut memperkaya prakiraan ${report.kecamatan} dengan bobot lebih rendah daripada data resmi dinas.`
              : "Hanya laporan yang diterima petugas yang ikut dihitung.",
          state: report.status === "terverifikasi" ? "done" : "idle",
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
        <p className="mt-7 flex items-start gap-2.5 rounded-2xl border border-brand-300/45 bg-grad-brand-soft p-4 text-body-sm leading-relaxed text-paper-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            Laporan bertipe {kind.family === "lingkungan" ? "pemicu lingkungan" : "kesehatan"}{" "}
            diteruskan ke {FAMILY_ROUTING[kind.family]}. Terima kasih — yang Anda lihat di
            gang memang tidak selalu terlihat di data mingguan.
          </span>
        </p>
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

  const lookup = React.useCallback((raw: string) => {
    const id = normalizeTrackingCode(raw);
    setSearched(true);
    setResult(id ? findReport(id) : null);
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
          <Button type="submit" size="lg" className="shrink-0 gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Cek status
          </Button>
        </div>
        <p className="mt-2 text-caption text-paper-600">
          Huruf besar-kecil dan tanda hubung tidak masalah.
        </p>
      </form>

      {result ? (
        <ReportDetail report={result} />
      ) : searched ? (
        <div
          role="status"
          className="rounded-3xl border border-sand-200 bg-white p-8 text-center"
        >
          <p className="text-h3 text-foreground">Kode tidak ditemukan</p>
          <p className="mx-auto mt-2 max-w-md text-body-sm leading-relaxed text-paper-600">
            Periksa kembali penulisannya. Laporan juga hanya bisa dilacak dari peramban
            yang dipakai mengirimnya — versi demo ini menyimpan laporan di perangkat, bukan
            di server.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/warga/lapor">Kirim laporan baru</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
