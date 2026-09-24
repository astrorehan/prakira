"use client";

import * as React from "react";
import { ApiError, fetchReportPhoto } from "@/lib/api";

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
export function ReportPhoto({ id }: { id: string }) {
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
