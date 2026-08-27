"use client";

import * as React from "react";
import { CircleDot, History } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/period";
import { fetchActivity } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { DataState } from "@/components/data-state";
import { Reveal } from "@/components/landing/reveal";

/**
 * Catatan aktivitas sistem.
 *
 * Bagian ini dulu berjudul "Pengumuman & siaran pers" dan memuat lima siaran
 * pers lengkap — status siaga yang ditetapkan, pendaftaran WhatsApp yang
 * dibuka, jadwal pemeliharaan, laporan evaluasi triwulan — semuanya ditulis
 * tangan sebagai konstanta dan diatribusikan ke Dinas Kesehatan Kota Semarang.
 * Siaran pers palsu di halaman yang menyebut dirinya portal layanan publik
 * adalah bentuk hardcode paling berbahaya di seluruh produk: ia terbaca
 * sebagai pernyataan resmi tentang keadaan darurat kesehatan.
 *
 * Yang tersisa adalah yang memang bisa dibuktikan sistem: denyut aktivitasnya
 * sendiri. Feed ini sengaja tanpa nama dan tanpa rincian — jejak audit lengkap
 * ada di balik sesi petugas, karena isinya memuat identitas.
 */

const LOG_DOT: Record<string, string> = {
  success: "bg-risk-low",
  info: "bg-brand-500",
  warning: "bg-risk-medium",
};

export function Announcements() {
  const activity = useApi(() => fetchActivity(12), []);
  const rows = activity.data?.data ?? [];

  return (
    <section id="pengumuman" className="scroll-mt-16 border-t border-sand-200 bg-grad-sand">
      <div className="container py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-5">
            <Reveal className="border-t border-sand-200 pt-6">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
                05 · Aktivitas sistem
              </p>
              <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
                Apa yang terjadi di balik angka
              </h2>
              <p className="mt-4 max-w-xl text-body-lg text-paper-600">
                Setiap pemuatan data, eksekusi model, dan keputusan verifikasi
                meninggalkan jejak. Daftar di samping adalah jejak itu, apa adanya.
              </p>
              <p className="mt-4 max-w-xl text-caption text-paper-600">
                Sistem ini belum menerbitkan siaran pers. Pengumuman resmi Dinas
                Kesehatan Kota Semarang terbit melalui kanal resminya sendiri.
              </p>
            </Reveal>
          </div>

          {/* Log publik: tidak ada satu pun baris yang mengidentifikasi orang. */}
          <div className="min-w-0 lg:col-span-7">
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
                <div className="flex items-center gap-2 border-b border-sand-200 bg-sand-50 px-5 py-3">
                  <History className="h-3.5 w-3.5 text-paper-600" aria-hidden />
                  <span className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                    Catatan aktivitas sistem
                  </span>
                </div>

                <DataState
                  loading={activity.loading}
                  error={activity.error}
                  empty={!activity.loading && rows.length === 0}
                  emptyMessage="Belum ada aktivitas tercatat pada pemasangan ini."
                  onRetry={activity.reload}
                  className="m-4"
                >
                  <ol className="px-5 py-2">
                    {rows.map((log) => (
                      <li
                        key={log.id}
                        className="flex gap-3 border-b border-sand-100 py-4 last:border-b-0"
                      >
                        <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              LOG_DOT[log.status] ?? "bg-paper-400",
                            )}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="tabular font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                            {formatDateTime(log.ts)}
                          </p>
                          <p className="mt-1 text-caption font-medium text-foreground">
                            {log.action}
                          </p>
                          <p className="mt-1 font-mono text-3xs uppercase tracking-[0.07em] text-paper-600">
                            {log.role}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </DataState>

                <div className="flex items-start gap-2.5 border-t border-sand-200 bg-sand-50 px-5 py-4">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
                  <p className="text-2xs text-paper-600">
                    Catatan bersifat publik dan tidak memuat nama petugas, identitas
                    pelapor, maupun isi laporan. Setiap perubahan angka pada halaman ini
                    selalu meninggalkan jejak di sini.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
