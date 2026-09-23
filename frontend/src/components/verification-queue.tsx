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
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConsoleToast, useConsoleToast } from "@/components/console/toast";
import { DataState } from "@/components/data-state";
import { QueueSkeleton } from "@/components/console/console-skeleton";
import { EscalationPanel } from "@/components/escalation-panel";
import { ForwardingQueue, RiskChip } from "@/components/forwarding-queue";
import { useSessionContext } from "@/components/session-provider";
import {
  sortForQueue,
  reportPriority,
  REPORT_KIND,
  REPORT_STATUS,
  FAMILY_ROUTING,
  type CitizenReport,
  type ReportKind,
  type ReportStatus,
} from "@/lib/reports";
import { formatDate, formatDateTime, relativeAge } from "@/lib/period";
import {
  ApiError,
  fetchRelatedReports,
  fetchReportPhoto,
  fetchReportQueue,
  reviewReport,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { EnvironmentHandlingMode } from "@/types";

/**
 * Antrean verifikasi petugas — PRD §5.5 (M7).
 *
 * Sisi loop yang tidak bisa dipalsukan. Halaman `/warga/status` boleh
 * menampilkan kode lacak secantik apa pun; kalau tidak ada tempat yang membalik
 * statusnya, kode itu hanya menjanjikan proses yang tidak ada.
 *
 * Dua keputusan bentuk:
 *
 * 1. **Laporan kesehatan diterima satu klik, saran opsional, tolak butuh alasan.**
 *    §5.4 mewajibkan penolakan disertai alasan yang terlihat pelapor. Saran
 *    untuk warga boleh ditambahkan bila petugas punya konteks lokal, tetapi
 *    tidak menghalangi penerimaan laporan yang sudah jelas.
 * 2. **Laporan pemicu lingkungan diberi pilihan tindak lanjut.** §5.6b:
 *    genangan, sampah, dan saluran tersumbat bisa diberi arahan aman untuk warga
 *    atau diteruskan ke unit lingkungan, bukan otomatis semuanya menjadi tiket.
 *    Petugas kesehatan yang membuka antrean ini perlu melihat pilihan itu sebelum
 *    memutuskan laporan.
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

/**
 * Urutan saringan menempatkan pekerjaan inti lebih dulu (audit F08).
 *
 * "Perlu diperiksa" adalah satu-satunya yang menuntut keputusan hari ini;
 * "perlu informasi" menunggu jawaban warga, sisanya arsip.
 */
const STATUS_FILTERS: { key: ReportStatus | "semua"; label: string }[] = [
  { key: "menunggu", label: "Perlu diperiksa" },
  { key: "perlu_informasi", label: "Menunggu jawaban" },
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
    status: "terverifikasi" | "ditolak" | "perlu_informasi",
    note?: string,
    handlingMode?: EnvironmentHandlingMode,
    infoRequest?: string,
  ) => void | Promise<void>;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [askingInfo, setAskingInfo] = React.useState(false);
  const [infoRequest, setInfoRequest] = React.useState("");
  const [related, setRelated] = React.useState<CitizenReport[] | null>(null);
  const [addingAdvice, setAddingAdvice] = React.useState(false);
  const [rejectionNote, setRejectionNote] = React.useState("");
  const [advice, setAdvice] = React.useState("");
  const [handlingMode, setHandlingMode] = React.useState<EnvironmentHandlingMode | null>(null);
  const rejectionNoteRef = React.useRef<HTMLTextAreaElement>(null);
  const adviceRef = React.useRef<HTMLTextAreaElement>(null);

  const kind = REPORT_KIND[report.kind];
  const status = REPORT_STATUS[report.status];
  const Icon = KIND_ICON[report.kind];
  const priority = reportPriority(report);
  /* Laporan yang sedang menunggu jawaban warga tetap dapat diputuskan: itu
     justru tujuan pertanyaannya. */
  const pending =
    report.status === "menunggu" || report.status === "perlu_informasi";
  const environmental = kind.family === "lingkungan";
  const agencyShort = report.routing.agency?.short ?? "instansi";
  const rejectionNoteId = `tolak-${report.id}`;
  const adviceId = `saran-${report.id}`;

  React.useEffect(() => {
    if (rejecting) rejectionNoteRef.current?.focus();
    if (addingAdvice || handlingMode === "mandiri_warga") adviceRef.current?.focus();
  }, [addingAdvice, handlingMode, rejecting]);

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
              {report.routing.agency?.short ?? FAMILY_ROUTING.lingkungan}
            </Badge>
          )}
          {report.status === "menunggu" && priority === "didahulukan" && (
            <Badge
              variant="secondary"
              className="gap-1"
              title="Lokasi dapat ditemukan dan wilayahnya berisiko tinggi atau laporannya berfoto."
            >
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
              Didahulukan
            </Badge>
          )}
          {report.status === "menunggu" && priority === "kurang_lengkap" && (
            <Badge
              variant="muted"
              title="Tanpa patokan lokasi dan tanpa foto, jadi diurutkan di belakang. Naik kembali setelah menunggu 3 hari."
            >
              Kurang lengkap
            </Badge>
          )}
          <RiskChip risk={report.risk} />
          <Badge variant={status.badge}>{status.label}</Badge>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-3 text-body-sm leading-relaxed text-paper-700">
        {report.description}
      </p>

      {/* F11: petugas yang akan berangkat ke lapangan perlu tahu apakah lokasinya
          bisa ditemukan sebelum ia memutuskan, bukan setelah sampai di sana. */}
      {(report.landmark || report.rtRw || report.completeness.missing.length > 0) && (
        <div className="mt-3 rounded-xl border border-border bg-paper-50 px-3 py-2 text-caption leading-relaxed text-paper-700">
          {report.rtRw && <span className="mr-3">RT/RW {report.rtRw}</span>}
          {report.landmark && <span>Patokan: {report.landmark}</span>}
          {report.completeness.missing.length > 0 && (
            <p className="mt-1 text-paper-600">
              Belum ada: {report.completeness.missing.join(", ")}.
              {!report.completeness.locatable &&
                " Lokasi belum cukup jelas untuk ditelusuri petugas."}
            </p>
          )}
        </div>
      )}

      {report.relatedReportId && (
        <p className="mt-2 text-caption text-paper-600">
          Melengkapi laporan{" "}
          <span className="font-mono uppercase">{report.relatedReportId}</span>.
        </p>
      )}

      {report.infoRequest && (
        <p className="mt-2 rounded-xl border border-risk-medium-br bg-risk-medium-bg px-3 py-2 text-caption leading-relaxed text-foreground">
          Diminta ke pelapor: {report.infoRequest}
          {report.infoRequestedAt
            ? ` · ${formatDateTime(report.infoRequestedAt)}`
            : ""}
        </p>
      )}

      {report.hasPhoto && <ReportPhoto id={report.id} />}

      {/* Duplikat digabungkan dengan menautkan, bukan dengan menghapus: setiap
          pelapor tetap memegang kode lacaknya sendiri (F11). */}
      <div className="mt-3">
        {related === null ? (
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await fetchRelatedReports(report.id);
                setRelated(response.data);
              } catch {
                setRelated([]);
              }
            }}
            className="text-caption font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Lihat laporan lain di sekitar kejadian ini
          </button>
        ) : related.length === 0 ? (
          <p className="text-caption text-paper-600">
            Tidak ada laporan sejenis lain di kecamatan ini.
          </p>
        ) : (
          <ul className="space-y-1">
            {related.map((other) => (
              <li key={other.id} className="text-caption text-paper-600">
                <span className="font-mono uppercase">{other.id}</span> ·{" "}
                {REPORT_STATUS[other.status].label} · masuk{" "}
                {relativeAge(other.submittedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <div className="mt-4 border-t border-border pt-3">
          {rejecting ? (
            <div className="space-y-2">
              <Label htmlFor={rejectionNoteId} className="text-caption">
                Alasan penolakan — dibaca pelapor
              </Label>
              <textarea
                id={rejectionNoteId}
                ref={rejectionNoteRef}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={2}
                placeholder="Mis. lokasi tidak bisa ditelusuri, atau sudah tercakup laporan lain."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={rejectionNote.trim().length < 8}
                  onClick={() => onDecide(report.id, "ditolak", rejectionNote)}
                >
                  Kirim penolakan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRejecting(false);
                    setRejectionNote("");
                  }}
                >
                  Batal
                </Button>
                {rejectionNote.trim().length < 8 && (
                  <span className="self-center text-caption text-paper-600">
                    Alasan minimal 8 karakter.
                  </span>
                )}
              </div>
            </div>
          ) : askingInfo ? (
            <div className="space-y-2">
              <Label htmlFor={`info-${report.id}`} className="text-caption">
                Informasi yang perlu dilengkapi — dibaca pelapor
              </Label>
              <textarea
                id={`info-${report.id}`}
                value={infoRequest}
                onChange={(e) => setInfoRequest(e.target.value)}
                rows={2}
                placeholder="Mis. sebutkan patokan terdekat, atau RT/RW lokasi genangan."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={infoRequest.trim().length < 8}
                  onClick={() =>
                    onDecide(
                      report.id,
                      "perlu_informasi",
                      undefined,
                      undefined,
                      infoRequest,
                    )
                  }
                >
                  Kirim permintaan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAskingInfo(false);
                    setInfoRequest("");
                  }}
                >
                  Batal
                </Button>
                <span className="self-center text-caption text-paper-600">
                  Pelapor menjawab dengan kode lacak yang sama.
                </span>
              </div>
            </div>
          ) : environmental ? (
            <div className="space-y-3">
              <div>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Pilihan tindak lanjut laporan lingkungan"
                >
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors",
                      handlingMode === "mandiri_warga"
                        ? "border-brand-500 bg-brand-50"
                        : "border-border bg-surface hover:border-brand-300",
                    )}
                  >
                    <input
                      type="radio"
                      name={`tindak-lanjut-${report.id}`}
                      value="mandiri_warga"
                      checked={handlingMode === "mandiri_warga"}
                      onChange={() => setHandlingMode("mandiri_warga")}
                      className="mt-0.5 accent-brand-700"
                    />
                    <span>
                      <span className="block text-body-sm font-medium text-foreground">
                        Arahan mandiri warga
                      </span>
                      <span className="mt-0.5 block text-caption text-paper-600">
                        Kecil &amp; aman ditangani warga
                      </span>
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors",
                      handlingMode === "dlh"
                        ? "border-teal-500 bg-teal-50"
                        : "border-border bg-surface hover:border-teal-300",
                    )}
                  >
                    <input
                      type="radio"
                      name={`tindak-lanjut-${report.id}`}
                      value="dlh"
                      checked={handlingMode === "dlh"}
                      onChange={() => setHandlingMode("dlh")}
                      className="mt-0.5 accent-teal-700"
                    />
                    <span>
                      <span className="block text-body-sm font-medium text-foreground">
                        Teruskan ke {agencyShort}
                      </span>
                      <span className="mt-0.5 block text-caption text-paper-600">
                        Meluas, berulang, atau berbahaya
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {handlingMode === "mandiri_warga" && (
                <div className="space-y-2">
                  <Label htmlFor={adviceId} className="text-caption">
                    Saran/arahan untuk warga <span className="font-normal text-paper-600">(opsional)</span>
                  </Label>
                  <textarea
                    id={adviceId}
                    ref={adviceRef}
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    rows={2}
                    placeholder="Mis. bersihkan wadah penampung air dan periksa jentik setiap minggu."
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={!handlingMode}
                  onClick={() =>
                    onDecide(
                      report.id,
                      "terverifikasi",
                      handlingMode === "mandiri_warga" ? advice.trim() || undefined : undefined,
                      handlingMode ?? undefined,
                    )
                  }
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {handlingMode === "dlh" ? `Terima & teruskan ke ${agencyShort}` : "Terima"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAskingInfo(true)}
                  className="gap-1.5"
                >
                  Minta informasi
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
              </div>
            </div>
          ) : addingAdvice ? (
            <div className="space-y-2">
              <Label htmlFor={adviceId} className="text-caption">
                Saran/arahan untuk warga <span className="font-normal text-paper-600">(opsional)</span>
              </Label>
              <textarea
                id={adviceId}
                ref={adviceRef}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                rows={2}
                placeholder="Mis. bersihkan wadah penampung air dan periksa jentik setiap minggu."
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-foreground shadow-sm placeholder:text-paper-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onDecide(report.id, "terverifikasi", advice)}
                >
                  Terima & tampilkan arahan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingAdvice(false);
                    setAdvice("");
                  }}
                >
                  Batal
                </Button>
                <span className="self-center text-caption text-paper-600">
                  Arahan otomatis tetap ditampilkan pada pelacakan jika dikosongkan.
                </span>
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
                onClick={() => setAddingAdvice(true)}
                className="gap-1.5"
              >
                Tambah saran
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAskingInfo(true)}
                className="gap-1.5"
              >
                Minta informasi
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
                Saran opsional; penolakan wajib beralasan.
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
          {report.routing.handlingMode === "mandiri_warga" ? " · Arahan mandiri warga" : ""}
          {report.forwarding
            ? report.forwarding.state === "diteruskan"
              ? ` · Diteruskan ke ${report.routing.agency?.short ?? report.forwarding.target}`
              : report.forwarding.pattern
                ? ` · Perlu diteruskan (${report.forwarding.pattern} laporan serupa)`
                : " · Perlu diteruskan"
            : ""}
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
  const { session } = useSessionContext();
  const canForward = session?.role === "dinas" || session?.role === "admin";

  const reports = queue.data?.data ?? null;
  const summary = queue.data?.meta ?? {
    total: 0,
    menunggu: 0,
    perluInformasi: 0,
    terverifikasi: 0,
    ditolak: 0,
    lingkunganMenunggu: 0,
    perluDiteruskan: 0,
    diteruskan: 0,
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
      perlu_informasi: scoped.filter((r) => r.status === "perlu_informasi")
        .length,
      terverifikasi: scoped.filter((r) => r.status === "terverifikasi").length,
      ditolak: scoped.filter((r) => r.status === "ditolak").length,
      semua: scoped.length,
    };
  }, [reports, wilayah]);

  const decide = React.useCallback(
        async (
          id: string,
          next: "terverifikasi" | "ditolak" | "perlu_informasi",
          note?: string,
          handlingMode?: EnvironmentHandlingMode,
          infoRequest?: string,
        ) => {
      setDecideError(null);
      try {
        const { data: reviewed } = await reviewReport(id, {
          status: next,
          note,
          handlingMode,
          infoRequest,
        });
        queue.reload();
        const pattern = reviewed.forwarding?.pattern;
        /* Pesan menyebut kejadian yang benar-benar tercatat (F05, F10).
           "Tiket DLH dibuat" dulu terbaca seolah laporannya sudah sampai ke
           instansi penerima, padahal penyampaiannya belum terjadi. */
        toast.show(
          next === "perlu_informasi"
            ? `${id} menunggu kelengkapan dari pelapor.`
            : next === "terverifikasi"
              ? handlingMode === "dlh"
                ? `${id} diterima dan masuk daftar penerusan.`
                : handlingMode === "mandiri_warga"
                  ? pattern
                    ? `${pattern} laporan serupa di wilayah ini — ${id} naik ke daftar penerusan.`
                    : `${id} diterima dengan arahan mandiri warga.`
                  : `${id} diterima. Pelapor bisa melihat perubahan ini di halaman lacak.`
              : `${id} ditolak. Alasannya terlihat pelapor.`,
        );
      } catch (caught) {
        setDecideError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [queue, toast],
  );

  if (queue.loading) return <QueueSkeleton kind="reports" />;

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
          hint="Diagregasikan per bulan untuk evaluasi model bersinyal warga."
        />
        <SummaryTile
          label="Ditolak"
          value={String(summary.ditolak)}
          hint="Alasannya terlihat pelapor di halaman lacak."
        />
        <SummaryTile
          label="Perlu diteruskan"
          value={String(summary.perluDiteruskan)}
          hint="Sudah diterima dan dirutekan ke instansi lain; penyampaiannya belum tercatat."
          tone={summary.perluDiteruskan > 0 ? "warn" : "default"}
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

      {(status === "semua" || status === "menunggu") && (
        <p className="-mt-2 text-caption text-paper-600">
          Laporan yang perlu diperiksa diurutkan: <strong className="font-medium text-paper-700">didahulukan</strong>{" "}
          (lokasi jelas, di wilayah berisiko tinggi atau berfoto), lalu biasa, lalu{" "}
          <strong className="font-medium text-paper-700">kurang lengkap</strong> (tanpa lokasi dan foto).
          Dalam tiap tingkat, yang paling lama menunggu lebih dulu. Tidak ada laporan yang ditolak otomatis.
        </p>
      )}

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

      {canForward && <ForwardingQueue reports={reports} onChanged={queue.reload} />}

      {/* Pola sebelum satuan, tetapi setelah pekerjaan inti: eskalasi adalah
          penanda bahwa satu kecamatan menumpuk, bukan antrean tersendiri. */}
      <EscalationPanel onChanged={queue.reload} onFocusDistrict={setWilayah} />

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
