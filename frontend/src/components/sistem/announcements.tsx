"use client";

import * as React from "react";
import { ArrowRight, CircleDot, History } from "lucide-react";

import { cn } from "@/lib/utils";
import { AUDIT_LOGS } from "@/lib/mock-data";
import { Reveal } from "@/components/landing/reveal";

type Announcement = {
  date: string;
  category: "Pengumuman" | "Siaran Pers" | "Perubahan Layanan" | "Pemeliharaan";
  title: string;
  excerpt: string;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    date: "24 Agustus 2026",
    category: "Siaran Pers",
    title: "Status siaga DBD ditetapkan untuk tiga kecamatan menjelang puncak pancaroba",
    excerpt:
      "Dinas Kesehatan menetapkan status siaga di Pedurungan, Banyumanik, dan Tembalang setelah prakiraan model menunjukkan potensi kenaikan kasus 35 persen dalam 14 hari.",
  },
  {
    date: "22 Agustus 2026",
    category: "Perubahan Layanan",
    title: "Register data kecamatan kini tersedia dalam format CSV dan GeoJSON",
    excerpt:
      "Unduhan data terbuka diperbarui setiap Senin pukul 09.00 WIB dan mencakup interval prediksi, bukan hanya nilai tengah.",
  },
  {
    date: "19 Agustus 2026",
    category: "Pengumuman",
    title: "Pendaftaran peringatan dini WhatsApp dibuka untuk seluruh kelurahan",
    excerpt:
      "Warga dapat mendaftarkan satu nomor per kepala keluarga untuk menerima notifikasi ketika status kecamatan berubah.",
  },
  {
    date: "15 Agustus 2026",
    category: "Pemeliharaan",
    title: "Pemeliharaan terjadwal kanal sinkronisasi BMKG, 16 Agustus 01.00–03.00 WIB",
    excerpt:
      "Selama pemeliharaan, halaman status tetap dapat diakses dengan data terakhir yang tersimpan. Tidak ada layanan yang dihentikan.",
  },
  {
    date: "11 Agustus 2026",
    category: "Pengumuman",
    title: "Evaluasi akurasi model triwulan II 2026 dipublikasikan",
    excerpt:
      "Laporan berisi metrik kesalahan per penyakit, daftar kecamatan dengan riwayat data tipis, dan catatan keterbatasan model.",
  },
];

const CATEGORY_STYLE: Record<Announcement["category"], string> = {
  "Siaran Pers": "border-risk-high-br bg-risk-high-bg text-risk-high",
  Pengumuman: "border-brand-300/50 bg-brand-50 text-brand-700",
  "Perubahan Layanan": "border-sand-300 bg-sand-100 text-paper-700",
  Pemeliharaan: "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
};

const LOG_DOT: Record<string, string> = {
  success: "bg-risk-low",
  info: "bg-brand-500",
  warning: "bg-risk-medium",
};

export function Announcements() {
  return (
    <section id="pengumuman" className="scroll-mt-16 border-t border-sand-200 bg-grad-sand">
      <div className="container py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ── Pengumuman ── */}
          <div className="min-w-0 lg:col-span-7">
            <Reveal className="border-t border-sand-200 pt-6">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-500">
                05 · Pengumuman
              </p>
              <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
                Pengumuman &amp; siaran pers
              </h2>
            </Reveal>

            <ul className="mt-7">
              {ANNOUNCEMENTS.map((item, i) => (
                <Reveal as="li" key={item.title} delay={i * 60}>
                  <a
                    href="#informasi"
                    className="group flex flex-col gap-2 border-b border-sand-200 py-5 transition-colors duration-base first:border-t first:border-sand-200 hover:bg-white/60"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] tabular text-paper-500">
                        {item.date}
                      </span>
                      <span
                        className={cn(
                          "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                          CATEGORY_STYLE[item.category],
                        )}
                      >
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-body-lg font-medium text-balance text-foreground transition-colors duration-fast group-hover:text-brand-700">
                      {item.title}
                    </h3>
                    <p className="max-w-2xl text-caption text-paper-600">{item.excerpt}</p>
                    <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500 transition-colors duration-fast group-hover:text-brand-700">
                      Baca selengkapnya
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </a>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* ── Transparency log ──
              A system site can show its own pulse. The log is public because
              nothing in it identifies a patient. */}
          <div className="min-w-0 lg:col-span-5">
            <Reveal delay={120} className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
                <div className="flex items-center gap-2 border-b border-sand-200 bg-sand-50 px-5 py-3">
                  <History className="h-3.5 w-3.5 text-paper-500" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
                    Catatan aktivitas sistem
                  </span>
                </div>

                <ol className="px-5 py-2">
                  {AUDIT_LOGS.map((log) => (
                    <li key={log.id} className="flex gap-3 border-b border-sand-100 py-4 last:border-b-0">
                      <span className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            LOG_DOT[log.status] ?? "bg-paper-400",
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] tabular text-paper-400">
                          {log.timestamp} WIB
                        </p>
                        <p className="mt-1 text-caption font-medium text-foreground">{log.action}</p>
                        <p className="mt-0.5 text-caption text-paper-600">{log.details}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.07em] text-paper-400">
                          {log.role}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="flex items-start gap-2.5 border-t border-sand-200 bg-sand-50 px-5 py-4">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-400" aria-hidden />
                  <p className="text-[11px] text-paper-500">
                    Catatan bersifat publik dan tidak memuat data pribadi pasien. Setiap
                    perubahan angka pada halaman ini selalu meninggalkan jejak di sini.
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
