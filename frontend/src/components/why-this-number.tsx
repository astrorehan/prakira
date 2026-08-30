"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  HelpCircle,
  Info,
  Minus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataState } from "@/components/data-state";
import { fetchExplain } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, diseaseLabel, formatNumber } from "@/lib/utils";
import { formatFeatureName } from "@/lib/stats";
import type { DiseaseType, ExplainFamily } from "@/types";

/**
 * "Kenapa angka ini?" — kontribusi fitur pada satu prakiraan kecamatan.
 *
 * Panel kecamatan sudah menyebut *pemicu dominan*, tapi itu daftar fitur iklim
 * dengan importance tertinggi menurut model secara keseluruhan — global, sama
 * untuk semua kecamatan. Yang ditampilkan di sini berbeda dan lokal: berapa
 * kasus prakiraan bergeser kalau kelompok fitur tertentu diganti nilai
 * lazimnya **di kecamatan itu sendiri**.
 *
 * Tiga keputusan tampilan yang menahan halaman ini tetap jujur:
 *
 * 1. **Batang dibaca sebagai pergeseran, bukan sebagai porsi kue.** Tiap batang
 *    diberi arah (naik/turun) dan angka kasusnya, karena kontribusinya memang
 *    tidak terbagi habis — jumlahnya tidak sama dengan prakiraan.
 * 2. **Kalimat tandingannya ditulis lengkap.** "Tanpa faktor ini prakiraan jadi
 *    X" adalah bentuk yang bisa diperiksa; persentase telanjang tidak.
 * 3. **Importance global tetap ditampilkan, dengan label berbeda.** Menyembunyikannya
 *    akan membuat pembaca mengira kontribusi lokal ini adalah "fitur terpenting
 *    model", dan itu pertanyaan yang lain.
 *
 * Dibungkus dialog, bukan disisipkan ke panel: panel kecamatan sudah padat, dan
 * penjelasan ini adalah bacaan sengaja, bukan informasi sekilas.
 */

type WhyThisNumberProps = {
  disease: DiseaseType;
  kecamatanId: string;
  kecamatanNama: string;
  /** Bila kecamatan belum punya prakiraan, tombolnya dimatikan. */
  hasPrediction: boolean;
  className?: string;
};

function DirectionIcon({ delta }: { delta: number }) {
  /* Ambangnya sama dengan pembulatan `formatDelta`: tanpa ini sebuah
     kontribusi −0,001 tampil sebagai panah turun di sebelah angka "0,00". */
  if (Math.abs(delta) < 0.005) return <Minus className="h-3 w-3" aria-hidden />;
  return delta > 0 ? (
    <ArrowUp className="h-3 w-3" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3" aria-hidden />
  );
}

function formatDelta(delta: number): string {
  const abs = formatNumber(Math.abs(delta), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (Math.abs(delta) < 0.005) return "0,00";
  return `${delta > 0 ? "+" : "−"}${abs}`;
}

function FamilyRow({
  family,
  widest,
}: {
  family: ExplainFamily;
  widest: number;
}) {
  const [open, setOpen] = React.useState(false);
  const magnitude = Math.abs(family.delta);
  const width = widest > 0 ? Math.max((magnitude / widest) * 100, 2) : 2;
  const up = family.delta > 0;

  return (
    <li className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-paper-50"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body-sm font-medium text-foreground">
            {family.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-body-sm tabular-nums",
              magnitude < 0.005
                ? "text-paper-500"
                : up
                  ? "text-risk-high"
                  : "text-risk-low",
            )}
          >
            <DirectionIcon delta={family.delta} />
            {formatDelta(family.delta)} kasus
          </span>
        </div>

        {/* Batang dua arah dari sumbu tengah: naik ke kanan, turun ke kiri.
            Satu batang searah akan membuat kontribusi yang menurunkan angka
            terbaca sama dengan yang menaikkannya. */}
        <div className="mt-2 flex h-2 items-center gap-px" aria-hidden>
          <div className="flex h-full flex-1 justify-end">
            {!up && (
              <span
                className="h-full rounded-l-sm bg-risk-low-fill"
                style={{ width: `${width}%` }}
              />
            )}
          </div>
          <span className="h-3 w-px bg-paper-300" />
          <div className="flex h-full flex-1">
            {up && (
              <span
                className="h-full rounded-r-sm bg-risk-high-fill"
                style={{ width: `${width}%` }}
              />
            )}
          </div>
        </div>

        <p className="mt-2 text-caption text-paper-600">
          Tanpa faktor ini prakiraan jadi{" "}
          <span className="font-mono tabular-nums text-paper-800">
            {formatNumber(family.counterfactual_cases, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>{" "}
          kasus
          {family.share_pct !== null && (
            <> · {formatNumber(family.share_pct, { maximumFractionDigits: 1 })}% dari total pergerakan</>
          )}
          . {open ? "Tutup rincian." : "Ketuk untuk rincian fitur."}
        </p>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-caption leading-relaxed text-paper-600">
            {family.note}
          </p>

          <table className="mt-3 w-full text-caption">
            <thead>
              <tr className="text-left text-paper-500">
                <th className="pb-1 font-medium">Fitur</th>
                <th className="pb-1 text-right font-medium">Bulan ini</th>
                <th className="pb-1 text-right font-medium">
                  Median {family.reference_scope}
                </th>
                <th className="pb-1 text-right font-medium">Persentil</th>
              </tr>
            </thead>
            <tbody>
              {family.features.map((feature) => (
                <tr key={feature.feature} className="border-t border-border/70">
                  <td className="py-1.5 pr-2 text-paper-700">{feature.label}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-foreground">
                    {formatNumber(feature.value, {
                      maximumFractionDigits: 1,
                    })}
                    {feature.unit}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-paper-600">
                    {feature.reference === null
                      ? "—"
                      : `${formatNumber(feature.reference, { maximumFractionDigits: 1 })}${feature.unit}`}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-paper-600">
                    {feature.percentile === null ? "—" : feature.percentile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}

export function WhyThisNumber({
  disease,
  kecamatanId,
  kecamatanNama,
  hasPrediction,
  className,
}: WhyThisNumberProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasPrediction}
        title={
          hasPrediction
            ? `Lihat kontribusi tiap faktor pada prakiraan ${kecamatanNama}`
            : "Belum ada prakiraan untuk kecamatan ini."
        }
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-brand-300/60 bg-brand-50 px-3 py-1.5 text-3xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-paper-200 disabled:bg-paper-100 disabled:text-paper-500",
          className,
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        Kenapa angka ini?
      </button>

      {/* Dipasang hanya saat terbuka: `useApi` di dalamnya menembak permintaan
          pada pemasangan, dan enam belas panel yang memuat penjelasan tanpa
          diminta adalah enam belas permintaan yang tidak dibaca siapa pun. */}
      {open && (
        <ExplainDialog
          open={open}
          onOpenChange={setOpen}
          disease={disease}
          kecamatanId={kecamatanId}
          kecamatanNama={kecamatanNama}
        />
      )}
    </>
  );
}

function ExplainDialog({
  open,
  onOpenChange,
  disease,
  kecamatanId,
  kecamatanNama,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  disease: DiseaseType;
  kecamatanId: string;
  kecamatanNama: string;
}) {
  const explain = useApi(
    () => fetchExplain(disease, kecamatanId),
    [disease, kecamatanId],
  );

  const families = explain.data?.data.families ?? [];
  const widest = families.reduce(
    (max, f) => Math.max(max, Math.abs(f.delta)),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <Badge variant="secondary" className="mb-2">
            Kontribusi fitur · {diseaseLabel(disease)}
          </Badge>
          <DialogTitle className="text-h3 leading-tight text-foreground">
            Kenapa prakiraan {kecamatanNama} segini?
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-body-sm text-paper-700">
            {explain.data
              ? `Prakiraan ${explain.data.meta.monthLabel}: ${formatNumber(explain.data.data.baseline_cases, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kasus (dibulatkan ${explain.data.data.baseline_rounded}). Tiap baris di bawah menunjukkan berapa angka itu bergeser bila faktornya diganti nilai lazim di kecamatan ini.`
              : "Menghitung kontribusi tiap kelompok fitur pada prakiraan kecamatan ini."}
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <DataState
            loading={explain.loading}
            error={explain.error}
            empty={!explain.loading && families.length === 0}
            emptyMessage="Model tidak mengembalikan kontribusi fitur untuk kecamatan ini."
            loadingMessage="Menghitung ulang prakiraan tanpa tiap faktor…"
            onRetry={explain.reload}
          >
            {explain.data && (
              <div className="space-y-5">
                <div className="rounded-xl border border-brand-300/50 bg-brand-50 p-3.5">
                  <div className="flex gap-2.5">
                    <Info
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                      aria-hidden
                    />
                    <p className="text-caption leading-relaxed text-paper-700">
                      Pembandingnya adalah bulan yang lazim{" "}
                      {explain.data.data.reference_scope === "kecamatan"
                        ? `di ${kecamatanNama} sendiri (${explain.data.data.reference_months} bulan riwayat)`
                        : "di seluruh kota, karena riwayat kecamatan ini terlalu pendek"}{" "}
                      — bukan nol. Metode: {explain.data.meta.method}, bukan
                      SHAP.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {families.map((family) => (
                    <FamilyRow
                      key={family.key}
                      family={family}
                      widest={widest}
                    />
                  ))}
                </ul>

                {explain.data.data.global_importance.length > 0 && (
                  <section className="rounded-xl border border-border bg-paper-50 p-4">
                    <h3 className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                      <BarChart3 className="h-4 w-4 text-paper-600" aria-hidden />
                      Bobot fitur saat pelatihan
                    </h3>
                    <p className="mt-1 text-caption text-paper-600">
                      Berlaku untuk seluruh kota, bukan untuk {kecamatanNama}.
                      Ini menjawab &ldquo;fitur apa yang paling sering dipakai
                      model&rdquo;, bukan &ldquo;kenapa kecamatan ini
                      segini&rdquo;.
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {explain.data.data.global_importance
                        .slice(0, 5)
                        .map((item) => (
                          <li
                            key={item.feature}
                            className="flex items-center gap-3"
                          >
                            <span className="w-40 shrink-0 truncate text-caption text-paper-700">
                              {formatFeatureName(item.feature)}
                            </span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-200">
                              <span
                                className="block h-full rounded-full bg-brand-700"
                                style={{
                                  width: `${Math.min(item.importance * 100 * 3, 100)}%`,
                                }}
                              />
                            </span>
                            <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-paper-600">
                              {formatNumber(item.importance * 100, {
                                maximumFractionDigits: 1,
                              })}
                              %
                            </span>
                          </li>
                        ))}
                    </ul>
                  </section>
                )}

                <section>
                  <h3 className="text-body-sm font-semibold text-foreground">
                    Batas pembacaan
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {explain.data.meta.notes.map((note) => (
                      <li
                        key={note}
                        className="flex gap-2 text-caption leading-relaxed text-paper-600"
                      >
                        <span
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-paper-400"
                          aria-hidden
                        />
                        {note}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </DataState>
        </div>
      </DialogContent>
    </Dialog>
  );
}
