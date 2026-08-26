"use client";

import * as React from "react";
import {
  Bug,
  Droplets,
  Trash2,
  Waves,
  Thermometer,
  Check,
  X,
  MapPin,
  Clock,
  Info,
  RotateCcw,
  Recycle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import {
  loadReports,
  resetReports,
  reviewReport,
  sortForQueue,
  summarize,
  formatDate,
  formatDateTime,
  relativeAge,
  REPORT_KIND,
  REPORT_STATUS,
  FAMILY_ROUTING,
  type CitizenReport,
  type ReportKind,
  type ReportStatus,
} from "@/lib/reports";

/**
 * Antrean verifikasi petugas — PRD §5.5 (M7).
 *
 * Sisi loop yang tidak bisa dipalsukan. Halaman `/warga/status` boleh
 * menampilkan kode lacak secantik apa pun; kalau tidak ada tempat yang membalik
 * statusnya, kode itu hanya menjanjikan proses yang tidak ada.
 *
 * Dua keputusan bentuk:
 *
 * 1. **Terima satu klik, tolak butuh alasan.** §5.4 mewajibkan penolakan
 *    disertai alasan yang terlihat pelapor, jadi Tolak membuka satu bidang
 *    catatan dan Terima tidak. Asimetri ini disengaja: menyetujui laporan yang
 *    benar harus lebih murah daripada menolaknya, kalau tidak antrean akan
 *    diselesaikan dengan tombol yang paling sedikit gesekannya.
 * 2. **Laporan pemicu lingkungan diberi tujuan tiket yang berbeda.** §5.6b:
 *    genangan, sampah, dan saluran tersumbat pergi ke unit lingkungan, bukan ke
 *    puskesmas. Petugas kesehatan yang membuka antrean ini perlu tahu mana yang
 *    bukan pekerjaannya sebelum ia membacanya.
 */

const KIND_ICON: Record<ReportKind, React.ElementType> = {
  gejala: Thermometer,
  jentik: Bug,
  genangan: Droplets,
  sampah: Trash2,
  saluran: Waves,
};

const STATUS_FILTERS: { key: ReportStatus | "semua"; label: string }[] = [
  { key: "menunggu", label: "Menunggu" },
  { key: "terverifikasi", label: "Terverifikasi" },
  { key: "ditolak", label: "Ditolak" },
  { key: "semua", label: "Semua" },
];

function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card className={cn("p-4", tone === "warn" && "border-risk-medium-br bg-risk-medium-bg")}>
      <div className="overline">{label}</div>
      <div className="tabular mt-1.5 text-metric leading-none text-foreground">{value}</div>
      <p className="mt-2 text-caption leading-relaxed text-paper-600">{hint}</p>
    </Card>
  );
}

/* ── Satu laporan ─────────────────────────────────────────────────────────── */

function ReportRow({
  report,
  onDecide,
}: {
  report: CitizenReport;
  onDecide: (id: string, status: "terverifikasi" | "ditolak", note?: string) => void;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [note, setNote] = React.useState("");
  const noteRef = React.useRef<HTMLTextAreaElement>(null);

  const kind = REPORT_KIND[report.kind];
  const status = REPORT_STATUS[report.status];
  const Icon = KIND_ICON[report.kind];
  const pending = report.status === "menunggu";
  const noteId = `tolak-${report.id}`;

  React.useEffect(() => {
    if (rejecting) noteRef.current?.focus();
  }, [rejecting]);

  return (
    <Card className={cn("p-4", pending && "border-border-strong")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-paper-50">
            <Icon className="h-4 w-4 text-paper-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-semibold text-foreground">
                {kind.label}
              </span>
              <span className="tabular font-mono text-overline uppercase text-paper-500">
                {report.id}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-paper-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {report.kecamatan}
                {report.kelurahan ? ` · ${report.kelurahan}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                Kejadian {formatDate(report.occurredAt)}
              </span>
              <span>Masuk {relativeAge(report.submittedAt)}</span>
            </div>
          </div>
        </div>

        {/* Tanpa `shrink-0`: di 375px dua lencana berdampingan berukuran 380px,
            dan `shrink-0` membuat wadahnya menolak menyempit sehingga lencana
            status terdorong keluar layar alih-alih turun ke baris berikutnya. */}
        <div className="flex flex-wrap items-center gap-2">
          {kind.family === "lingkungan" && (
            <Badge variant="outline" className="gap-1">
              <Recycle className="h-3 w-3" aria-hidden="true" />
              {FAMILY_ROUTING.lingkungan}
            </Badge>
          )}
          <Badge variant={status.badge}>{status.label}</Badge>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-3 text-body-sm leading-relaxed text-paper-700">
        {report.description}
      </p>

      {report.photo && (
        /* Foto laporan warga sudah dikecilkan dan di-encode ulang di peramban
           pelapor; `next/image` tidak dipakai karena sumbernya data URL yang
           tidak melewati pengoptimal. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.photo}
          alt={`Foto lampiran laporan ${report.id}`}
          className="mt-3 max-h-56 w-auto rounded-xl border border-border object-contain"
        />
      )}

      {pending ? (
        <div className="mt-4 border-t border-border pt-3">
          {rejecting ? (
            <div className="space-y-2">
              <Label htmlFor={noteId} className="text-caption">
                Alasan penolakan — dibaca pelapor
              </Label>
              <textarea
                id={noteId}
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Mis. lokasi tidak bisa ditelusuri, atau sudah tercakup laporan lain."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={note.trim().length < 8}
                  onClick={() => onDecide(report.id, "ditolak", note)}
                >
                  Kirim penolakan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRejecting(false);
                    setNote("");
                  }}
                >
                  Batal
                </Button>
                {note.trim().length < 8 && (
                  <span className="self-center text-caption text-paper-500">
                    Alasan minimal 8 karakter.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => onDecide(report.id, "terverifikasi")}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Terima
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejecting(true)}
                className="gap-1.5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Tolak
              </Button>
              <span className="ml-auto text-caption text-paper-500">
                Terima tanpa catatan; penolakan wajib beralasan.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-border pt-3 text-caption text-paper-600">
          <span className="font-medium text-foreground">
            {report.status === "terverifikasi" ? "Diterima" : "Ditolak"}
          </span>{" "}
          oleh {report.reviewer ?? "petugas"}
          {report.reviewedAt ? ` · ${formatDateTime(report.reviewedAt)}` : ""}
          {report.reviewNote ? ` · ${report.reviewNote}` : ""}
        </div>
      )}
    </Card>
  );
}

/* ── Antrean ──────────────────────────────────────────────────────────────── */

export function VerificationQueue({ reviewer }: { reviewer: string }) {
  const [reports, setReports] = React.useState<CitizenReport[] | null>(null);
  const [status, setStatus] = React.useState<ReportStatus | "semua">("menunggu");
  const [wilayah, setWilayah] = React.useState("semua");
  const toast = useConsoleToast();

  /* localStorage tidak ada saat render server. `null` berarti belum dibaca —
     bukan "tidak ada laporan", yang akan menampilkan keadaan kosong palsu
     selama satu frame. */
  React.useEffect(() => {
    setReports(loadReports());
  }, []);

  const summary = React.useMemo(() => summarize(reports ?? []), [reports]);

  const wilayahOptions = React.useMemo(() => {
    const set = new Set((reports ?? []).map((r) => r.kecamatan));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [reports]);

  const visible = React.useMemo(() => {
    const list = (reports ?? []).filter(
      (r) =>
        (status === "semua" || r.status === status) &&
        (wilayah === "semua" || r.kecamatan === wilayah),
    );
    return sortForQueue(list);
  }, [reports, status, wilayah]);

  const counts = React.useMemo(() => {
    const scoped = (reports ?? []).filter(
      (r) => wilayah === "semua" || r.kecamatan === wilayah,
    );
    return {
      menunggu: scoped.filter((r) => r.status === "menunggu").length,
      terverifikasi: scoped.filter((r) => r.status === "terverifikasi").length,
      ditolak: scoped.filter((r) => r.status === "ditolak").length,
      semua: scoped.length,
    };
  }, [reports, wilayah]);

  const decide = React.useCallback(
    (id: string, next: "terverifikasi" | "ditolak", note?: string) => {
      setReports(reviewReport(id, { status: next, note }, reviewer));
      toast.show(
        next === "terverifikasi"
          ? `${id} diterima. Pelapor bisa melihat perubahan ini di halaman lacak.`
          : `${id} ditolak. Alasannya dikirim ke pelapor.`,
      );
    },
    [reviewer, toast],
  );

  const handleReset = React.useCallback(() => {
    setReports(resetReports());
    toast.show("Antrean dikembalikan ke enam laporan contoh.");
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Menunggu keputusan"
          value={String(summary.menunggu)}
          hint={
            summary.oldestWaitHours === null
              ? "Antrean bersih."
              : `Tertua menunggu ${summary.oldestWaitHours} jam.`
          }
          tone={summary.menunggu > 0 ? "warn" : "default"}
        />
        <SummaryTile
          label="Terverifikasi"
          value={String(summary.terverifikasi)}
          hint="Masuk model sebagai sinyal warga, berbobot lebih rendah dari data dinas."
        />
        <SummaryTile
          label="Ditolak"
          value={String(summary.ditolak)}
          hint="Alasannya terlihat pelapor di halaman lacak."
        />
        <SummaryTile
          label="Tiket lingkungan"
          value={String(summary.lingkunganMenunggu)}
          hint="Genangan, sampah, dan saluran — diteruskan ke Dinas Lingkungan Hidup."
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saring status">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors duration-fast",
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-surface text-paper-600 hover:border-brand-300 hover:text-brand-700",
                )}
              >
                {f.label}
                <span className="tabular ml-1.5 opacity-70">{counts[f.key]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="wilayah" className="text-caption text-paper-600">
            Wilayah tugas
          </Label>
          <select
            id="wilayah"
            value={wilayah}
            onChange={(e) => setWilayah(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-body-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="semua">Semua kecamatan</option>
            {wilayahOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="ml-auto gap-1.5"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Setel ulang data contoh
        </Button>
      </div>

      {reports === null ? (
        <Card className="p-8 text-center">
          <p className="text-body-sm text-paper-600">Memuat antrean…</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-body-sm font-medium text-foreground">
            Tidak ada laporan pada saringan ini.
          </p>
          <p className="mt-1 text-caption text-paper-600">
            Ubah status atau wilayah untuk melihat laporan lain.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <ReportRow key={r.id} report={r} onDecide={decide} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-caption leading-relaxed text-brand-900">
          <strong className="font-semibold">Batas versi demo.</strong> Belum ada layanan
          gateway di repositori ini, jadi antrean disimpan di peramban perangkat ini saja
          — laporan yang dikirim dari ponsel lain tidak akan muncul di sini. Keputusan
          Terima/Tolak benar-benar mengubah status yang dilihat pelapor di{" "}
          <span className="font-medium">/warga/status</span> pada peramban yang sama.
          Pembatasan wilayah tugas ditampilkan sebagai saringan, bukan sebagai kontrol
          akses; kontrol akses menunggu autentikasi yang belum ada.
        </p>
      </div>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
