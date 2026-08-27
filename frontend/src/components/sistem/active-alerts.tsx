"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { CalendarClock, Megaphone, Siren, Users } from "lucide-react";

import { cn, formatNumber } from "@/lib/utils";
import { fetchActions } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/period";
import { DataState } from "@/components/data-state";
import type { ActionRecommendation, DiseaseType, RiskLevel } from "@/types";
import { Reveal } from "@/components/landing/reveal";

/**
 * Peringatan resmi.
 *
 * Kartu-kartu ini dulu membaca lima rekomendasi tertulis di `mock-data.ts` dan
 * menerbitkan masing-masing dengan nomor surat buatan sendiri —
 * `PR/001/VIII/2026` — yang dibentuk dari indeks array. Nomor surat pada
 * permukaan yang menyebut dirinya "peringatan resmi Dinas Kesehatan" adalah
 * hal paling berbahaya yang bisa dikarang halaman ini, jadi ia hilang bersama
 * tombol "Unduh surat edaran" yang tidak pernah mengunduh apa pun. Yang
 * menggantikannya adalah id tindakan dari gateway, yang memang bisa ditelusuri.
 */

const LEVEL_BY_PRIORITY: Record<ActionRecommendation["priority"], RiskLevel> = {
  high: "tinggi",
  medium: "sedang",
  low: "rendah",
};

const LEVEL_STYLE: Record<RiskLevel, { rail: string; tag: string; word: string }> = {
  tinggi: {
    rail: "bg-risk-high-fill",
    tag: "border-risk-high-br bg-risk-high-bg text-risk-high",
    word: "Siaga",
  },
  sedang: {
    rail: "bg-risk-medium-fill",
    tag: "border-risk-medium-br bg-risk-medium-bg text-risk-medium",
    word: "Waspada",
  },
  rendah: {
    rail: "bg-risk-low-fill",
    tag: "border-risk-low-br bg-risk-low-bg text-risk-low",
    word: "Pemantauan",
  },
};

const STATUS_LABEL: Record<ActionRecommendation["status"], string> = {
  pending: "Menunggu pelaksanaan",
  in_progress: "Sedang dilaksanakan",
  completed: "Selesai dilaksanakan",
};

/* An internal instruction is not a public notice until it says what a resident
   should do. This is that translation layer. */
const CITIZEN_ACTION: Record<ActionRecommendation["action_type"], string[]> = {
  fogging: [
    "Buka pintu dan jendela saat petugas fogging memasuki lingkungan RT.",
    "Kuras bak mandi dan tampungan air minimal sekali seminggu.",
    "Ambil bubuk larvasida gratis di kantor kelurahan atau puskesmas terdekat.",
  ],
  psn: [
    "Ikuti kerja bakti PSN 3M Plus serentak di tingkat RT/RW.",
    "Periksa jentik di talang air, vas bunga, dan barang bekas sekitar rumah.",
  ],
  masker: [
    "Gunakan masker saat beraktivitas di luar ruangan, terutama pagi dan sore.",
    "Batasi aktivitas luar ruangan bagi balita, lansia, dan penderita asma.",
    "Ambil masker gratis di puskesmas wilayah terdampak.",
  ],
  klorinasi: [
    "Rebus air minum hingga mendidih sempurna sebelum dikonsumsi.",
    "Laporkan sumur atau sumber air yang terdampak rob ke petugas kesling.",
    "Ambil oralit dan zinc gratis di posko kesehatan kelurahan.",
  ],
  logistik_obat: [
    "Periksakan demam lebih dari dua hari ke puskesmas terdekat.",
    "Layanan diagnostik dini tersedia tanpa biaya di lima fasilitas kesehatan wilayah ini.",
  ],
  penyuluhan: [
    "Daftarkan nomor WhatsApp Anda untuk menerima peringatan dini wilayah.",
    "Sebarkan informasi resmi ini di grup RT/RW; abaikan pesan berantai tanpa sumber.",
  ],
};

function NoticeCard({ rec }: { rec: ActionRecommendation }) {
  const level = LEVEL_BY_PRIORITY[rec.priority];
  const style = LEVEL_STYLE[level];
  const done = rec.status === "completed";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition-opacity duration-base",
        done && "opacity-70",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", done ? "bg-paper-300" : style.rail)} />

      <div className="pl-6 pr-5 py-5 sm:pl-7 sm:pr-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
            {rec.id}
          </span>
          <span
            className={cn(
              "rounded border px-2 py-0.5 font-mono text-3xs uppercase tracking-[0.06em]",
              done ? "border-sand-200 bg-sand-50 text-paper-600" : style.tag,
            )}
          >
            {done ? "Arsip" : style.word}
          </span>
          <span className="rounded border border-sand-200 bg-sand-50 px-2 py-0.5 font-mono text-3xs uppercase tracking-[0.06em] text-paper-600">
            {rec.disease}
          </span>
          <span className="ml-auto text-caption text-paper-600">{STATUS_LABEL[rec.status]}</span>
        </div>

        <h3 className="mt-3 text-h3 text-balance text-foreground">{rec.title}</h3>
        <p className="mt-2 max-w-3xl text-body text-paper-600">{rec.description}</p>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-sand-200 pt-4 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <Siren className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
            <div className="min-w-0">
              <dt className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                Wilayah terdampak
              </dt>
              <dd className="mt-0.5 text-caption font-medium text-foreground">
                {rec.target_kecamatan.join(", ")}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
            <div className="min-w-0">
              <dt className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                Batas pelaksanaan
              </dt>
              <dd className="mt-0.5 text-caption font-medium text-foreground">
                {formatDate(rec.due_date)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-600" aria-hidden />
            <div className="min-w-0">
              <dt className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
                Populasi wilayah target
              </dt>
              <dd className="mt-0.5 text-caption font-medium text-foreground">
                {formatNumber(rec.target_population)} jiwa
              </dd>
            </div>
          </div>
        </dl>

        <div className="mt-5 rounded-xl border border-sand-200 bg-sand-50/70 p-4">
          <p className="font-mono text-3xs uppercase tracking-[0.08em] text-paper-600">
            Yang perlu dilakukan warga
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {(CITIZEN_ACTION[rec.action_type] ?? []).map((line) => (
              <li key={line} className="flex gap-2.5 text-caption text-paper-700">
                <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Kalimat "Dasar:" dari mesin aturan — sama persis dengan yang dibaca
            petugas di konsol, sehingga warga dan dinas melihat alasan yang sama. */}
        <p className="mt-4 max-w-3xl text-2xs leading-relaxed text-paper-600">
          {rec.basis}
        </p>
      </div>
    </article>
  );
}

export function ActiveAlerts() {
  const [filter, setFilter] = useState<DiseaseType | "Semua">("Semua");
  const actions = useApi(() => fetchActions(), []);

  const all = useMemo(() => actions.data?.data ?? [], [actions.data]);
  const diseases = useMemo(
    () => Array.from(new Set(all.map((r) => r.disease))),
    [all],
  );
  const filters: Array<DiseaseType | "Semua"> = ["Semua", ...diseases];

  const list = useMemo(
    () => (filter === "Semua" ? all : all.filter((r) => r.disease === filter)),
    [all, filter],
  );

  const aktif = all.filter((r) => r.status !== "completed").length;

  return (
    <section id="peringatan" className="scroll-mt-16 border-t border-sand-200 bg-grad-paper">
      <div className="container py-14 md:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-sand-200 pt-6">
            <div className="max-w-2xl">
              <p className="font-mono text-overline uppercase tracking-[0.1em] text-paper-600">
                02 · Peringatan resmi
              </p>
              <h2 className="mt-4 text-h2 text-balance text-foreground md:text-h1">
                <span className="tabular">{aktif}</span> peringatan sedang berlaku
              </h2>
              <p className="mt-4 max-w-xl text-body-lg text-paper-600">
                Setiap peringatan disusun mesin aturan dari prakiraan model, lengkap
                dengan wilayah terdampak, batas waktu, dan langkah yang bisa dilakukan
                warga. Statusnya diubah petugas dinas lewat konsol.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Saring peringatan menurut penyakit"
              className="inline-flex rounded-xl border border-sand-200 bg-white p-1"
            >
              {filters.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-caption font-medium transition-colors duration-fast",
                    filter === f
                      ? "bg-brand-700 text-white"
                      : "text-paper-600 hover:bg-sand-50 hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <DataState
          loading={actions.loading}
          error={actions.error}
          empty={!actions.loading && list.length === 0}
          emptyMessage="Tidak ada peringatan yang sedang berlaku untuk periode ini."
          onRetry={actions.reload}
          className="mt-8"
        >
          <div className="mt-8 space-y-4">
            {list.map((rec, i) => (
              <Reveal key={rec.id} delay={i * 70}>
                <NoticeCard rec={rec} />
              </Reveal>
            ))}
          </div>
        </DataState>

        <Reveal className="mt-6 flex items-start gap-2.5 rounded-xl border border-sand-200 bg-sand-50 p-4">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <p className="text-caption text-paper-600">
            Peringatan di halaman ini dihasilkan mesin aturan dari prakiraan model dan
            belum berstatus surat edaran resmi. Nomor surat dan pengesahannya diterbitkan
            Dinas Kesehatan Kota Semarang melalui kanal resminya sendiri.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
