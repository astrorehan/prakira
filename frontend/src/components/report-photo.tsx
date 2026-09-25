"use client";

import * as React from "react";
import { Download, Maximize2 } from "lucide-react";
import { ApiError, fetchReportPhoto } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
export function ReportPhoto({
  id,
  compact = false,
}: {
  id: string;
  /** Pratinjau lebih kecil untuk kartu sempit, mis. panel kecamatan di peta. */
  compact?: boolean;
}) {
  type State =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; src: string }
    | { status: "error"; message: string };

  const [state, setState] = React.useState<State>({ status: "idle" });
  const [viewing, setViewing] = React.useState(false);
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
    <div ref={holder} className={compact ? "mt-1.5" : "mt-3"}>
      {state.status === "ready" ? (
        <>
          {/* Pratinjau di kartu sengaja kecil; petugas yang perlu melihat
              jentik atau genangan dengan jelas membukanya ukuran penuh. */}
          <button
            type="button"
            onClick={() => setViewing(true)}
            className="group relative inline-block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Lihat foto lampiran laporan ${id} ukuran penuh`}
          >
            {/* Foto laporan warga sudah dikecilkan dan di-encode ulang di
                peramban pelapor; `next/image` tidak dipakai karena sumbernya
                data URL yang tidak melewati pengoptimal. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.src}
              alt={`Foto lampiran laporan ${id}`}
              className={cn(
                "w-auto cursor-zoom-in rounded-xl border border-border object-contain transition-opacity group-hover:opacity-90",
                compact ? "max-h-32" : "max-h-56",
              )}
            />
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-foreground/70 px-2 py-0.5 text-2xs font-medium text-white">
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
              {!compact && "Perbesar"}
            </span>
          </button>

          <Dialog open={viewing} onOpenChange={setViewing}>
            <DialogContent className="max-w-4xl gap-3 p-4 sm:p-5">
              <DialogTitle className="pr-8 text-body font-semibold">
                Foto lampiran <span className="font-mono">{id}</span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Foto yang dilampirkan warga pada laporan {id}, ukuran penuh.
              </DialogDescription>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.src}
                alt={`Foto lampiran laporan ${id}, ukuran penuh`}
                className="mx-auto max-h-[75dvh] w-auto max-w-full rounded-xl border border-border bg-paper-50 object-contain"
              />
              <div className="flex justify-end">
                {/* Data URL tidak bisa dibuka di tab baru (peramban
                    memblokirnya), jadi yang disediakan adalah unduhan. */}
                <a
                  href={state.src}
                  download={`foto-${id}.${extensionOf(state.src)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-caption font-medium text-brand-700 hover:bg-paper-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Unduh foto
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div
          className={cn(
            "flex w-full max-w-xs items-center justify-center rounded-xl border border-dashed border-border bg-paper-50 px-3 text-caption text-paper-600",
            compact ? "h-16" : "h-24",
          )}
        >
          {state.status === "error" ? state.message : "Memuat foto lampiran…"}
        </div>
      )}
    </div>
  );
}

function extensionOf(dataUrl: string): string {
  const match = /^data:image\/(jpeg|png|webp)/.exec(dataUrl);
  if (!match) return "jpg";
  return match[1] === "jpeg" ? "jpg" : match[1];
}
