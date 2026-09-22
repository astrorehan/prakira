"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Microscope } from "lucide-react";

import { cn, diseaseLabel } from "@/lib/utils";
import { clearWorkContext, useWorkContext } from "@/lib/work-context";

/**
 * Jalan pulang dari alat evaluasi ke pekerjaan yang ditinggalkan (F14).
 *
 * Tiga hal yang disampaikan sekaligus:
 *
 *  1. Halaman ini alat evaluasi, bukan prakiraan yang sedang berlaku. Petugas
 *     yang sampai ke sini dari konsol perlu diingatkan bahwa angkanya tidak
 *     boleh dibaca sebagai instruksi hari ini.
 *  2. Pekerjaan yang ditinggalkan masih ada namanya.
 *  3. Kembali mempertahankan penyakit, wilayah, dan periode yang tadi dipegang
 *     — bukan mengembalikan petugas ke halaman kosong yang harus difilter ulang.
 *
 * Tidak tampil untuk pembaca umum: tanpa konteks tersimpan, komponen ini tidak
 * merender apa pun, jadi permukaan publiknya tetap bersih.
 */
export function ReturnToWork({
  surface,
  className,
}: {
  /** Nama alat yang sedang dibuka — dipakai di kalimat pengingatnya. */
  surface: string;
  className?: string;
}) {
  const ctx = useWorkContext();
  if (!ctx) return null;

  const detail = [
    ctx.disease ? diseaseLabel(ctx.disease) : null,
    ctx.kecamatan ? `Kecamatan ${ctx.kecamatan}` : null,
    ctx.periode ?? null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "border-b border-brand-100 bg-brand-50/70 print:hidden",
        className,
      )}
    >
      <div className="container flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-start gap-2 text-body-sm text-paper-700">
          <Microscope
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="font-semibold text-foreground">{surface}</span> adalah
            alat evaluasi, bukan prakiraan yang sedang berlaku.
            {detail.length > 0 && (
              <>
                {" "}
                Pekerjaan yang ditinggalkan: {detail.join(" · ")}.
              </>
            )}
          </span>
        </p>

        <Link
          href={ctx.href}
          onClick={() => clearWorkContext()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-300/60 bg-surface px-3 py-2 text-body-sm font-medium text-brand-700 shadow-xs transition-colors duration-fast hover:bg-brand-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke {ctx.label}</span>
        </Link>
      </div>
    </div>
  );
}
