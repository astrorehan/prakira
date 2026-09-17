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
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import { DataState } from "@/components/data-state";
import { EscalationPanel } from "@/components/escalation-panel";
import {
  sortForQueue,
  REPORT_KIND,
  REPORT_STATUS,
  FAMILY_ROUTING,
  type CitizenReport,
  type ReportKind,
  type ReportStatus,
} from "@/lib/reports";
import { formatDate, formatDateTime, relativeAge } from "@/lib/period";
import { ApiError, fetchReportPhoto, fetchReportQueue, reviewReport } from "@/lib/api";
import { useApi } from "@/lib/use-api";

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
 *
 * Yang berubah setelah ada gateway: antrean tidak lagi hidup di `localStorage`
 * perangkat ini. Laporan yang dikirim warga dari ponselnya benar-benar sampai
 * ke sini, keputusan petugas tercatat di jejak audit atas namanya, dan tombol
 * "Setel ulang data contoh" hilang bersama enam laporan benihnya - antrean
 * kosong pada pemasangan baru adalah keadaan yang jujur.
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

/**
 * Foto lampiran, diminta saat kartunya benar-benar terlihat.
 *
 * Sebelumnya foto ikut di setiap baris daftar: `GET /api/reports` menarik
 * setiap gambar dari setiap laporan sekaligus, termasuk yang sudah selesai
 * diverifikasi berbulan-bulan lalu. Seratus laporan berfoto menjadi respons
 * ±40 MB, dan halaman ini tampak menggantung sebelum satu baris pun muncul.
 *
 * Yang dimuat sekarang hanya yang sampai ke layar. Verifikator tetap melihat
 * fotonya tanpa menekan apa pun — alur kerjanya tidak berubah, hanya waktu
 * pengambilannya yang bergeser ke saat gambar itu benar-benar dibutuhkan.
 */
function ReportPhoto({ id }: { id: string }) {
  type State =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; src: string }
    | { status: "error"; message: string };

  const [state, setState] = React.useState<State>({ status: "idle" });
  const holder = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = holder.current;
    if (!node) return;

    let cancelled = false;
    const load = () => {
      setState({ status: "loading" });
      fetchReportPhoto(id)
        .then((res) => {
          if (!cancelled) setState({ status: "ready", src: res.data });
        })
        .catch((caught) => {
          if (cancelled) return;
          setState({
            status: "error",
            message:
              caught instanceof ApiError
                ? caught.message
                : "Foto tidak dapat dimuat.",
          });
        });
    };

    /* Tanpa IntersectionObserver fotonya dimuat langsung. Peramban yang tidak
       punya API itu tetap harus menampilkan lampirannya — bukti yang tidak
       muncul lebih buruk daripada permintaan yang terlalu awal. */
    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      /* Dimulai sedikit sebelum kartunya masuk layar, supaya gambarnya sudah
         ada saat petugas menggulir sampai ke sana. */
      { rootMargin: "300px" },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [id]);

  return (
    <div ref={holder} className="mt-3">
      {state.status === "ready" ? (
        /* Foto laporan warga sudah dikecilkan dan di-encode ulang di peramban
           pelapor; `next/image` tidak dipakai karena sumbernya data URL yang
           tidak melewati pengoptimal. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.src}
          alt={`Foto lampiran laporan ${id}`}
          className="max-h-56 w-auto rounded-xl border border-border object-contain"
        />
      ) : (
        <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-xl border border-dashed border-border bg-paper-50 px-3 text-caption text-paper-600">
          {state.status === "error" ? state.message : "Memuat foto lampiran…"}
        </div>
      )}
    </div>
  );
}

function ReportRow({
  report,
  onDecide,
}: {
  report: CitizenReport;
  onDecide: (
    id: string,
    status: "terverifikasi" | "ditolak",
    note?: string,
  ) => void | Promise<void>;
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
              <span className="tabular font-mono text-overline uppercase text-paper-600">
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
          {/* Baris hasil peragaan wajib terbaca sebagai peragaan di tempat ia
              muncul. Petugas yang membuka antrean dan menemukan delapan laporan
              baru berhak tahu mana yang datang dari warga. */}
          {report.simulated && (
            <Badge variant="citizen" className="gap-1">
              <FlaskConical className="h-3 w-3" aria-hidden="true" />
              Simulasi
            </Badge>
          )}
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

      {report.hasPhoto && <ReportPhoto id={report.id} />}

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
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <span className="self-center text-caption text-paper-600">
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
              <span className="ml-auto text-caption text-paper-600">
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

export function VerificationQueue() {
  const queue = useApi(() => fetchReportQueue(), []);
  const [status, setStatus] = React.useState<ReportStatus | "semua">("menunggu");
  const [wilayah, setWilayah] = React.useState("semua");
  const [decideError, setDecideError] = React.useState<string | null>(null);
  const toast = useConsoleToast();

  const reports = queue.data?.data ?? null;
  const summary = queue.data?.meta ?? {
    total: 0,
    menunggu: 0,
    terverifikasi: 0,
    ditolak: 0,
    lingkunganMenunggu: 0,
    oldestWaitHours: null as number | null,
  };

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
    async (id: string, next: "terverifikasi" | "ditolak", note?: string) => {
      setDecideError(null);
      try {
        await reviewReport(id, { status: next, note });
        queue.reload();
        toast.show(
          next === "terverifikasi"
            ? `${id} diterima. Pelapor bisa melihat perubahan ini di halaman lacak.`
            : `${id} ditolak. Alasannya terlihat pelapor.`,
        );
      } catch (caught) {
        setDecideError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [queue, toast],
  );

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

      {/* Pola sebelum satuan. Antrean di bawah tetap urut menunggu-terlama;
          yang ditambahkan di sini adalah pembacaan yang tidak muncul dari
          urutan itu — kecamatan mana yang sedang menumpuk. */}
      <EscalationPanel onChanged={queue.reload} />

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
          onClick={queue.reload}
          disabled={queue.refreshing}
          className="ml-auto gap-1.5"
        >
          <RotateCcw
            className={queue.refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            aria-hidden="true"
          />
          Muat ulang antrean
        </Button>
      </div>

      {decideError && (
        <p
          role="alert"
          className="rounded-xl border border-risk-high-br bg-risk-high-bg px-3.5 py-2.5 text-body-sm text-risk-high"
        >
          {decideError}
        </p>
      )}

      <DataState
        loading={queue.loading}
        error={queue.error}
        empty={!queue.loading && visible.length === 0}
        emptyMessage={
          (reports?.length ?? 0) === 0
            ? "Belum ada laporan warga yang masuk."
            : "Tidak ada laporan pada saringan ini. Ubah status atau wilayah untuk melihat laporan lain."
        }
        loadingMessage="Memuat antrean…"
        onRetry={queue.reload}
      >
        <div className="space-y-3">
          {visible.map((r) => (
            <ReportRow key={r.id} report={r} onDecide={decide} />
          ))}
        </div>
      </DataState>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand-300/45 bg-brand-50 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-caption leading-relaxed text-brand-900">
          <strong className="font-semibold">Batas versi ini.</strong> Pembatasan wilayah
          tugas ditampilkan sebagai saringan, bukan sebagai kontrol akses: setiap petugas
          yang sudah masuk dapat melihat seluruh antrean kota. Pemetaan petugas ke wilayah
          tugasnya belum ada di basis data.
        </p>
      </div>

      <ConsoleToast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
