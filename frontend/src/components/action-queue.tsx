"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  HelpCircle,
  Loader,
  MapPin,
  Printer,
  Rat,
  Users,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import type { DeadlineUrgency } from "@/lib/period";
import {
  ACTION_TYPE_LABEL,
  COVERAGE_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type QueuedAction,
} from "@/lib/action-queue";
import { formatDateTime } from "@/lib/period";
import type { DiseaseType } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

/**
 * Antrean triase aksi dini.
 *
 * Menggantikan akordeon horizontal. Akordeon itu menampilkan satu kartu penuh
 * dan menyisakan empat keping selebar 90px: untuk membandingkan prioritas —
 * satu-satunya pekerjaan di halaman ini — petugas harus mengklik satu per satu,
 * dan tingginya dipatok 370px sehingga isinya berdesakan. Daftar vertikal
 * menampilkan semuanya sekaligus, terurut, dan tumbuh mengikuti isi.
 *
 * Detail lengkap (SOP, kontak puskesmas, draf surat) tetap di modal — baris di
 * sini hanya perlu cukup untuk memutuskan mana yang dibuka lebih dulu.
 */

const DISEASE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DBD: Bug,
  ISPA: Wind,
  LEPTOSPIROSIS: Rat,
};

/* Tenggat: warna diiringi ikon dan kalimat, tidak pernah warna saja (§2.3). */
const DEADLINE_STYLE: Record<
  DeadlineUrgency,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  overdue: {
    className: "border-risk-critical-br bg-risk-critical-bg text-risk-critical",
    icon: AlertTriangle,
  },
  today: {
    className: "border-risk-high-br bg-risk-high-bg text-risk-high",
    icon: AlertTriangle,
  },
  soon: {
    className: "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
    icon: Clock,
  },
  ahead: { className: "border-border bg-paper-100 text-paper-600", icon: Clock },
  unknown: {
    className: "border-risk-none-br bg-risk-none-bg text-risk-none",
    icon: HelpCircle,
  },
};

const STATUS_STYLE: Record<
  QueuedAction["status"],
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { className: "text-risk-high", icon: Circle },
  in_progress: { className: "text-brand-600", icon: Loader },
  completed: { className: "text-risk-low", icon: CheckCircle2 },
};

const ACTION_LABEL: Record<QueuedAction["status"], string> = {
  pending: "Buka & tandai berjalan",
  in_progress: "Buka protokol",
  completed: "Lihat arsip",
};

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-paper-600" aria-hidden="true" />
      <span className="shrink-0 text-caption text-paper-600">{label}</span>
      <span className="min-w-0 truncate text-caption font-medium text-foreground">{children}</span>
    </div>
  );
}

function ActionRow({
  action,
  onOpen,
}: {
  action: QueuedAction;
  onOpen: (action: QueuedAction) => void;
}) {
  const isOpen = action.status !== "completed";

  /* Tindakan yang sudah selesai tidak bisa "terlambat" lagi — tekanan waktu
     berhenti saat pekerjaannya berhenti. Tanggalnya tetap tampil sebagai
     catatan, lencananya yang kembali netral. */
  const deadline = DEADLINE_STYLE[isOpen ? action.deadline.urgency : "ahead"];
  const DeadlineIcon = deadline.icon;
  const deadlineLabel = isOpen ? action.deadline.label : "Tenggat terpenuhi";
  const status = STATUS_STYLE[action.status];
  const StatusIcon = status.icon;
  const DiseaseIcon = DISEASE_ICON[action.disease] ?? Activity;

  return (
    <li>
      <article
        className={cn(
          "rounded-xl border bg-surface p-4 shadow-xs transition-colors duration-fast ease-out sm:p-5",
          action.deadline.urgency === "overdue" && isOpen
            ? "border-risk-critical-br"
            : "border-border",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="muted">{ACTION_TYPE_LABEL[action.action_type]}</Badge>
              <Badge variant="outline">
                <DiseaseIcon className="h-3 w-3" aria-hidden="true" />
                {action.disease}
              </Badge>
              <Badge variant={action.priority === "high" ? "risk-high" : "risk-medium"}>
                {PRIORITY_LABEL[action.priority]}
              </Badge>
              <span className="tabular font-mono text-overline text-paper-600">
                #{action.id}
              </span>
            </div>

            <h3 className="text-h3 text-foreground">{action.title}</h3>

            {/* Alasan tindakan ini ada. Rekomendasi tanpa pemicunya adalah
                perintah, bukan keputusan yang bisa ditimbang — §5.2 melarang
                rekomendasi tanpa kalimat "Dasar:" muncul sama sekali. */}
            <p className="max-w-3xl text-body-sm leading-relaxed text-paper-700">
              {action.basis}
            </p>

            {action.climate_trigger && (
              <p className="max-w-3xl text-caption leading-relaxed text-paper-600">
                {action.climate_trigger}
              </p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-0.5">
              <Fact icon={MapPin} label="Wilayah">
                {action.target_kecamatan.join(", ")}
              </Fact>

              {action.target_population > 0 && (
                <Fact icon={Users} label="Populasi">
                  {formatNumber(action.target_population)} jiwa
                </Fact>
              )}

              {/* Bidang opsional hanya tampil kalau datanya ada. Versi
                  sebelumnya memasang nilai cadangan (`|| 94.2`, `|| "120k"`),
                  yaitu mengarang angka untuk mengisi kotak — persis yang
                  dilarang §10.9. */}
              {typeof action.lead_time_days === "number" && (
                <Fact icon={Clock} label="Lead time">
                  {action.lead_time_days} hari
                </Fact>
              )}

              {/* Menggantikan "Keyakinan model 94,2%", angka yang dulu
                  ditulis tangan di berkas mock dan tidak pernah keluar dari
                  model mana pun. Cakupan data dihitung layanan ML dari
                  kelengkapan riwayat kecamatan target. */}
              <Fact icon={FileText} label="Cakupan">
                {COVERAGE_LABEL[action.data_coverage] ?? action.data_coverage}
              </Fact>
            </div>

            {action.estimated_impact && (
              <p className="text-caption leading-relaxed text-paper-600">
                {/* Bukan "proyeksi dampak": sistem tidak pernah mengukur efek
                    intervensinya sendiri. Yang bisa dikatakan adalah beban yang
                    diproyeksikan bila tidak ada yang dikerjakan. */}
                <span className="font-medium text-paper-700">Tanpa intervensi:</span>{" "}
                {action.estimated_impact}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-row flex-wrap items-center gap-3 lg:w-56 lg:flex-col lg:items-end">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium",
                deadline.className,
              )}
            >
              <DeadlineIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{deadlineLabel}</span>
            </span>

            <span className="tabular text-caption text-paper-600 lg:text-right">
              Tenggat {action.deadline.date}
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-caption font-medium",
                status.className,
              )}
            >
              <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{STATUS_LABEL[action.status]}</span>
            </span>

            {action.dispatched_at && (
              <span className="text-caption text-paper-600 lg:text-right">
                Dikirim {formatDateTime(action.dispatched_at)}
                {action.dispatched_by ? ` · ${action.dispatched_by}` : ""}
              </span>
            )}

            <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
              <Button
                size="sm"
                variant={action.status === "pending" ? "primary" : "outline"}
                onClick={() => onOpen(action)}
                className="flex-1 gap-1.5 lg:flex-initial"
              >
                <span>{ACTION_LABEL[action.status]}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>

              {/* Nota dinas dijangkau langsung dari baris antrean: petugas yang
                  sudah tahu isi tindakannya tidak perlu membuka modal SOP lebih
                  dulu hanya untuk mencetak suratnya. */}
              <Button
                asChild
                size="icon-sm"
                variant="ghost"
                title="Buka draf nota dinas"
              >
                <Link
                  href={`/tindakan/nota/${encodeURIComponent(action.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">
                    Buka draf nota dinas untuk {action.title}
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export function ActionQueue({
  actions,
  onOpen,
  className,
}: {
  actions: QueuedAction[];
  onOpen: (action: QueuedAction) => void;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {actions.map((action) => (
        <ActionRow key={action.id} action={action} onOpen={onOpen} />
      ))}
    </ul>
  );
}
