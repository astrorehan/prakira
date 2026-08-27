"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bug,
  Droplets,
  Trash2,
  Waves,
  Thermometer,
  Camera,
  Check,
  Copy,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useKecamatanDirectory } from "@/lib/kecamatan";
import {
  REPORT_KIND,
  FAMILY_ROUTING,
  type ReportKind,
} from "@/lib/reports";
import type { CitizenReport, RateLimitState } from "@/types";
import { ApiError, fetchRateLimit, submitReport } from "@/lib/api";
import { preparePhoto, formatBytes, ACCEPTED_IMAGE_TYPES } from "@/lib/photo";
import { useRememberedKecamatan, withKecamatan } from "@/lib/kecamatan-selection";

/**
 * Formulir laporan warga — PRD §5.4 (M6).
 *
 * Enam bidang, tidak lebih: jenis, kecamatan, kelurahan, waktu, deskripsi,
 * foto. Yang sengaja **tidak** ada adalah bidang identitas pelapor. §5.4
 * menyebutnya opsional dan menuntut penyimpanan terpisah dari payload model;
 * tidak memintanya sama sekali memenuhi keduanya, menahan formulir tetap di
 * enam bidang, dan menghapus satu tempat data pribadi bisa bocor. Kalau nanti
 * ada backend yang perlu menghubungi pelapor, bidangnya ditambahkan bersama
 * penyimpanan terpisahnya — bukan sebelum.
 *
 * Kecamatan datang dari pilihan yang sudah dibuat pembaca di halaman depan.
 * Hero, papan 16 kecamatan, dan deteksi lokasi semuanya menanyakan hal yang
 * sama; menanyakannya lagi di sini berarti membuang jawabannya.
 *
 * Semua kendali di sini memakai `text-base sm:text-sm`, bukan `text-sm` seperti
 * primitif `Input`. Safari iOS memperbesar seluruh viewport begitu bidang
 * dengan ukuran huruf di bawah 16px difokuskan, lalu halamannya melompat dan
 * pembaca harus mencubit kembali. Di konsol itu tertahankan; di formulir publik
 * yang mayoritas diisi dari ponsel, itu gangguan tiap bidang.
 */

const KIND_ICON: Record<ReportKind, React.ElementType> = {
  gejala: Thermometer,
  jentik: Bug,
  genangan: Droplets,
  sampah: Trash2,
  saluran: Waves,
};

const KIND_ORDER: ReportKind[] = ["gejala", "jentik", "genangan", "sampah", "saluran"];

const MIN_DESCRIPTION = 15;

/* Tanggal kejadian mengacu ke kalender pelapor, bukan ke periode dataset:
   yang dilaporkan warga terjadi hari ini, bukan pada bulan terakhir yang
   sempat direkap dinas. Ini satu-satunya tempat "hari ini" berarti hari ini. */
function todayValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const PHOTO_ERROR: Record<string, string> = {
  type: "Format tidak didukung. Gunakan JPG, PNG, atau WebP.",
  size: "Berkas terlalu besar. Maksimal 8 MB.",
  decode: "Foto tidak bisa dibaca. Coba ambil ulang atau pilih berkas lain.",
};

/* ── Hasil kiriman ────────────────────────────────────────────────────────── */

function SubmittedCard({
  report,
  onAgain,
}: {
  report: CitizenReport;
  onAgain: () => void;
}) {
  const [copied, setCopied] = React.useState<"idle" | "done" | "failed">("idle");
  const family = REPORT_KIND[report.kind].family;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  };

  return (
    <div
      role="status"
      className="rounded-3xl border border-risk-low-br bg-grad-risk-low p-7 md:p-9"
    >
      <div className="flex items-center gap-2.5">
        <Check className="h-5 w-5 shrink-0 text-risk-low" aria-hidden="true" />
        <p className="text-overline uppercase tracking-[0.1em] text-risk-low">
          Laporan terkirim
        </p>
      </div>

      <h2 className="mt-4 text-h1 text-foreground">Simpan kode ini</h2>
      <p className="mt-2 max-w-lg text-body text-paper-700">
        Kode ini satu-satunya cara melacak laporan Anda. Kami tidak meminta nama
        maupun nomor telepon, jadi tidak ada cara lain menemukannya kembali.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="tabular rounded-2xl border border-white/70 bg-white/80 px-6 py-4 font-mono text-h1 tracking-[0.12em] text-foreground">
          {report.id}
        </span>
        <Button variant="outline" onClick={copy} className="gap-2">
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied === "done" ? "Tersalin" : copied === "failed" ? "Gagal menyalin" : "Salin kode"}
        </Button>
      </div>

      <dl className="mt-7 grid gap-4 border-t border-white/70 pt-6 sm:grid-cols-3">
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">Jenis</dt>
          <dd className="mt-1 text-body-sm font-medium text-foreground">
            {REPORT_KIND[report.kind].label}
          </dd>
        </div>
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">Wilayah</dt>
          <dd className="mt-1 text-body-sm font-medium text-foreground">
            {report.kecamatan}
            {report.kelurahan ? ` · ${report.kelurahan}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-overline uppercase tracking-[0.1em] text-paper-600">
            Diteruskan ke
          </dt>
          <dd className="mt-1 text-body-sm font-medium text-foreground">
            {FAMILY_ROUTING[family]}
          </dd>
        </div>
      </dl>

      <div className="mt-7 flex flex-wrap gap-3 border-t border-white/70 pt-6">
        <Button asChild className="group">
          <Link href={`/warga/status?kode=${encodeURIComponent(report.id)}`}>
            Lacak laporan ini
            <ArrowRight className="transition-transform duration-fast group-hover:translate-x-0.5" />
          </Link>
        </Button>
        <Button variant="outline" onClick={onAgain}>
          Kirim laporan lain
        </Button>
      </div>
    </div>
  );
}

/* ── Formulir ─────────────────────────────────────────────────────────────── */

export function CitizenReportForm() {
  const [remembered, chooseKecamatan] = useRememberedKecamatan();

  const [kind, setKind] = React.useState<ReportKind | null>(null);
  const [kecamatan, setKecamatan] = React.useState("");
  const [kelurahan, setKelurahan] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(todayValue());
  const [description, setDescription] = React.useState("");
  const [photo, setPhoto] = React.useState<{ dataUrl: string; bytes: number } | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<CitizenReport | null>(null);
  const [limit, setLimit] = React.useState<RateLimitState | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const directory = useKecamatanDirectory();

  /* Kuota dihitung server dari sidik jari perangkat, bukan dari `localStorage`
     yang bisa dibersihkan dengan satu klik. Dibaca sebelum orang mengetik,
     bukan setelah mereka selesai menulis dan menekan kirim. */
  React.useEffect(() => {
    let alive = true;
    fetchRateLimit()
      .then((state) => alive && setLimit(state))
      .catch(() => alive && setLimit(null));
    return () => {
      alive = false;
    };
  }, []);

  /* Pilihan dari halaman depan mengisi kecamatan, tapi hanya selama pembaca
     belum menyentuh bidangnya sendiri. */
  React.useEffect(() => {
    if (remembered) setKecamatan((current) => current || remembered);
  }, [remembered]);

  const prefilled = !!remembered && kecamatan === remembered;
  const descriptionOk = description.trim().length >= MIN_DESCRIPTION;
  const valid = !!kind && !!kecamatan && !!occurredAt && descriptionOk;
  const blocked = limit?.blocked ?? false;

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    const result = await preparePhoto(file);
    setPhotoBusy(false);
    if (result.ok) {
      setPhoto({ dataUrl: result.dataUrl, bytes: result.bytes });
    } else {
      setPhoto(null);
      setPhotoError(PHOTO_ERROR[result.reason]);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setSubmitError(null);
    if (!valid || blocked || !kind) return;

    setSubmitting(true);
    try {
      const result = await submitReport({
        kind,
        kecamatan,
        kelurahan: kelurahan.trim() || undefined,
        occurredAt,
        description,
        photo: photo?.dataUrl,
      });
      chooseKecamatan(kecamatan);
      setLimit(result.rateLimit);
      setSubmitted(result.data);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setLimit((current) => (current ? { ...current, blocked: true, remaining: 0 } : current));
      }
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "Laporan gagal terkirim. Coba lagi sebentar lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(null);
    setKind(null);
    setKelurahan("");
    setDescription("");
    setPhoto(null);
    setPhotoError(null);
    setSubmitError(null);
    setShowErrors(false);
    setOccurredAt(todayValue());
    fetchRateLimit()
      .then(setLimit)
      .catch(() => setLimit(null));
    if (fileRef.current) fileRef.current.value = "";
  };

  if (submitted) {
    return <SubmittedCard report={submitted} onAgain={reset} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-9">
      {/* Kuota */}
      {limit && limit.remaining < limit.max && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2.5 rounded-2xl border p-4",
            blocked
              ? "border-risk-medium-br bg-risk-medium-bg"
              : "border-sand-200 bg-sand-50",
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              blocked ? "text-risk-medium" : "text-paper-600",
            )}
            aria-hidden="true"
          />
          <p className="text-body-sm leading-relaxed text-paper-700">
            {blocked ? (
              <>
                <strong className="font-semibold">Kuota habis.</strong> Batasnya{" "}
                {limit.max} laporan per perangkat per {limit.windowHours} jam, supaya
                satu perangkat tidak bisa membanjiri antrean petugas. Kuota terbuka
                lagi sekitar pukul{" "}
                {limit.resetsAt
                  ? new Date(limit.resetsAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}{" "}
                WIB. Kalau ini keadaan mendesak, hubungi 119.
              </>
            ) : (
              <>
                Sisa kuota: <strong className="font-semibold">{limit.remaining}</strong>{" "}
                dari {limit.max} laporan.
              </>
            )}
          </p>
        </div>
      )}

      {/* 1 — Jenis */}
      <fieldset>
        <legend className="text-h3 text-foreground">Apa yang Anda lihat?</legend>
        <p className="mt-1 text-body-sm text-paper-600">
          Pilih satu. Laporan lingkungan diteruskan ke {FAMILY_ROUTING.lingkungan}, bukan
          ke puskesmas.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {KIND_ORDER.map((key) => {
            const meta = REPORT_KIND[key];
            const Icon = KIND_ICON[key];
            const active = kind === key;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors duration-fast",
                  "focus-within:border-brand-500 focus-within:shadow-focus",
                  active
                    ? "border-brand-500 bg-brand-50"
                    : "border-sand-200 bg-white hover:border-brand-300",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={key}
                  checked={active}
                  onChange={() => setKind(key)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    active
                      ? "border-brand-300 bg-white text-brand-700"
                      : "border-sand-200 bg-sand-50 text-paper-600",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold text-foreground">
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-caption leading-relaxed text-paper-600">
                    {meta.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {showErrors && !kind && (
          <p role="alert" className="mt-2 text-caption text-risk-high">
            Pilih dulu jenis laporannya.
          </p>
        )}
      </fieldset>

      {/* 2, 3 — Tempat */}
      <fieldset>
        <legend className="text-h3 text-foreground">Di mana?</legend>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kecamatan">Kecamatan</Label>
            <select
              id="kecamatan"
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              className="h-11 w-full rounded-xl border border-sand-200 bg-white px-4 text-base text-foreground shadow-sm sm:text-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">
                {directory.loading ? "Memuat daftar kecamatan…" : "Pilih kecamatan…"}
              </option>
              {directory.list.map((k) => (
                <option key={k.id} value={k.nama}>
                  {k.nama}
                </option>
              ))}
            </select>
            {prefilled ? (
              <p className="flex items-center gap-1.5 text-caption text-brand-700">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                Terisi dari kecamatan yang Anda cek sebelumnya. Ganti bila keliru.
              </p>
            ) : showErrors && !kecamatan ? (
              <p role="alert" className="text-caption text-risk-high">
                Kecamatan harus diisi supaya laporan sampai ke petugas yang tepat.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kelurahan">
              Kelurahan atau RT/RW{" "}
              <span className="font-normal text-paper-600">— boleh dikosongkan</span>
            </Label>
            <Input
              id="kelurahan"
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
              maxLength={80}
              placeholder="Mis. Tlogosari Kulon RW 04"
              className="border-sand-200 bg-white text-base sm:text-sm"
            />
            <p className="text-caption text-paper-600">
              Makin sempit wilayahnya, makin cepat petugas menemukannya.
            </p>
          </div>
        </div>
      </fieldset>

      {/* 4, 5 — Waktu & cerita */}
      <fieldset>
        <legend className="text-h3 text-foreground">Kapan dan seperti apa?</legend>

        <div className="mt-4 space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="occurredAt">Tanggal kejadian</Label>
            <Input
              id="occurredAt"
              type="date"
              value={occurredAt}
              max={todayValue()}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="border-sand-200 bg-white text-base sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Ceritakan singkat</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              aria-describedby="description-help"
              placeholder="Mis. jentik di tiga bak mandi rumah kosong sebelah masjid, airnya tidak pernah dikuras."
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-base leading-relaxed text-foreground shadow-sm sm:text-sm placeholder:text-paper-600 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div
              id="description-help"
              className="flex flex-wrap items-center justify-between gap-2 text-caption"
            >
              <span
                className={cn(
                  showErrors && !descriptionOk ? "text-risk-high" : "text-paper-600",
                )}
              >
                {showErrors && !descriptionOk
                  ? `Tulis minimal ${MIN_DESCRIPTION} karakter — petugas perlu tahu apa yang dicari.`
                  : "Sebut apa, berapa banyak, dan di sebelah mana."}
              </span>
              <span className="tabular text-paper-600">{description.trim().length}/500</span>
            </div>
          </div>
        </div>
      </fieldset>

      {/* 6 — Foto */}
      <fieldset>
        <legend className="text-h3 text-foreground">
          Foto{" "}
          <span className="text-body-sm font-normal text-paper-600">— boleh dilewati</span>
        </legend>
        <p className="mt-1 flex items-start gap-1.5 text-body-sm text-paper-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-risk-low" aria-hidden="true" />
          Foto dikecilkan dan digambar ulang di perangkat Anda sebelum dikirim, sehingga
          titik GPS yang biasanya menempel pada foto ponsel tidak ikut terbawa.
        </p>

        <div className="mt-4 flex flex-wrap items-start gap-4">
          <input
            ref={fileRef}
            id="photo"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={(e) => handlePhoto(e.target.files?.[0])}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            loading={photoBusy}
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {photo ? "Ganti foto" : "Pilih foto"}
          </Button>

          {photo && (
            <div className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-2.5">
              {/* Data URL hasil kanvas — tidak melewati pengoptimal next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt="Pratinjau foto laporan"
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="text-caption text-paper-600">
                <p className="font-medium text-foreground">Siap dikirim</p>
                <p className="tabular">{formatBytes(photo.bytes)} setelah dikecilkan</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Hapus foto"
                className="rounded-lg p-1.5 text-paper-600 transition-colors hover:bg-sand-100 hover:text-paper-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {photoError && (
          <p role="alert" className="mt-2 text-caption text-risk-high">
            {photoError}
          </p>
        )}
      </fieldset>

      {/* Kegagalan pengiriman disebut apa adanya. Formulir yang "berhasil"
          padahal gateway menolak adalah laporan yang hilang tanpa diketahui. */}
      {submitError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-risk-high-br bg-risk-high-bg p-3.5 text-body-sm leading-relaxed text-risk-high"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </p>
      )}

      {/* Kirim */}
      <div className="flex flex-col gap-3 border-t border-sand-200 pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" loading={submitting} disabled={blocked}>
          Kirim laporan
        </Button>
        <p className="text-caption leading-relaxed text-paper-600">
          Tanpa akun, tanpa nama, tanpa nomor telepon. Anda akan menerima kode lacak
          setelah mengirim.{" "}
          <Link
            href={withKecamatan("/warga", remembered)}
            className="font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Batal
          </Link>
        </p>
      </div>
    </form>
  );
}
