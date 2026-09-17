"use client";

import * as React from "react";
import { Calculator, Copy, Check, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, diseaseLabel, formatNumber } from "@/lib/utils";
import type { DiseaseType, PriorityRow } from "@/types";

/**
 * Biaya tak-bertindak — kalkulator asumsi, bukan klaim.
 *
 * PRD §9 menyebut aturannya dengan tegas: proyeksi dampak ditulis sebagai
 * *"Jika X% kecamatan berisiko tinggi tertangani lebih awal, dengan
 * efektivitas Y% menurut [sumber], potensi kasus yang dapat dicegah adalah
 * Z"* — selalu dengan asumsi dan rentang, tidak pernah angka tunggal. Dan
 * pada tabel "data yang perlu dicari", baris biaya penanganan per kasus
 * ditandai *"jika tersedia"*: repositori ini memang belum punya tarif yang
 * bisa dirujuk.
 *
 * Karena itu kalkulator ini **berangkat kosong**. Tidak ada tarif bawaan,
 * tidak ada efektivitas bawaan. Menuliskan angka default berarti menaruh
 * rupiah karangan di layar juri dengan tampilan hasil hitungan — persis
 * kelas kesalahan yang sudah dibersihkan dari sistem ini (nomor surat palsu,
 * "AI confidence 94%", metrik LSTM yang tidak pernah dilatih).
 *
 * Yang disediakan kalkulator ini adalah kerangkanya: pengguna mengisi dua
 * asumsi beserta sumbernya, dan setiap keluaran membawa kalimat asumsi itu
 * ikut serta. Tanpa sumber, hasilnya tetap dihitung tapi diberi tanda bahwa
 * asumsinya belum bersumber — bukan disembunyikan, karena menyembunyikannya
 * hanya memindahkan angka tak-bersumber itu ke kepala orang.
 *
 * Nilainya disimpan di `localStorage` supaya peragaan tidak perlu mengetik
 * ulang. Itu penyimpanan lokal peramban, bukan basis data: angka asumsi satu
 * orang tidak boleh menjadi angka resmi sistem.
 */

const STORAGE_KEY = "prakira.impact-assumptions.v1";

type Assumptions = {
  costPerCase: string;
  costSource: string;
  effectivenessPct: string;
  effectivenessSource: string;
  coveragePct: string;
};

const EMPTY: Assumptions = {
  costPerCase: "",
  costSource: "",
  effectivenessPct: "",
  effectivenessSource: "",
  coveragePct: "70",
};

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned.trim() === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function rupiah(value: number): string {
  return `Rp${formatNumber(Math.round(value))}`;
}

type FieldProps = {
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  suffix?: string;
  inputMode?: "numeric" | "text";
};

function Field({
  label,
  hint,
  value,
  placeholder,
  onChange,
  suffix,
  inputMode = "text",
}: FieldProps) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-body-sm font-medium text-foreground"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-body-sm text-foreground outline-none transition-colors placeholder:text-paper-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {suffix && (
          <span className="shrink-0 text-caption text-paper-600">{suffix}</span>
        )}
      </div>
      <p className="text-caption text-paper-600">{hint}</p>
    </div>
  );
}

export function ImpactCalculator({
  disease,
  monthLabel,
  rows,
}: {
  disease: DiseaseType;
  monthLabel: string;
  rows: PriorityRow[];
}) {
  const [values, setValues] = React.useState<Assumptions>(EMPTY);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setValues({ ...EMPTY, ...JSON.parse(stored) });
    } catch {
      /* Peramban privat atau penyimpanan diblokir: kalkulator tetap jalan,
         hanya tidak mengingat isian sebelumnya. */
    }
  }, []);

  const update = (patch: Partial<Assumptions>) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Diabaikan dengan sengaja — lihat catatan di atas. */
      }
      return next;
    });
  };

  /* Basisnya hanya kecamatan kelas tinggi: itulah kelompok yang memang memicu
     terbitnya tindakan di antrean. Menghitung seluruh kota akan mengklaim
     bahwa setiap kasus di mana pun dapat dicegah oleh intervensi yang bahkan
     tidak diterbitkan untuk wilayah itu. */
  const highRisk = rows.filter(
    (r) => r.tingkat_risiko === "tinggi" && r.kasus_prediksi !== null,
  );

  const lower = highRisk.reduce(
    (sum, r) => sum + (r.kasus_prediksi_lower ?? r.kasus_prediksi ?? 0),
    0,
  );
  const upper = highRisk.reduce(
    (sum, r) => sum + (r.kasus_prediksi_upper ?? r.kasus_prediksi ?? 0),
    0,
  );
  const population = highRisk.reduce((sum, r) => sum + r.populasi, 0);

  const cost = parseNumber(values.costPerCase);
  const effectiveness = parseNumber(values.effectivenessPct);
  const coverage = parseNumber(values.coveragePct);

  const ready =
    cost !== null &&
    cost > 0 &&
    effectiveness !== null &&
    effectiveness > 0 &&
    coverage !== null &&
    coverage > 0;

  const sourced =
    values.costSource.trim() !== "" && values.effectivenessSource.trim() !== "";

  const factor =
    ready && effectiveness !== null && coverage !== null
      ? (effectiveness / 100) * (coverage / 100)
      : 0;

  const avoidedLower = Math.round(lower * factor);
  const avoidedUpper = Math.round(upper * factor);
  const savedLower = ready && cost !== null ? avoidedLower * cost : 0;
  const savedUpper = ready && cost !== null ? avoidedUpper * cost : 0;

  const sentence = ready
    ? [
        `Jika ${formatNumber(coverage ?? 0)}% dari ${highRisk.length} kecamatan berkelas risiko tinggi ${diseaseLabel(disease)} pada ${monthLabel} tertangani satu siklus pelaporan lebih awal,`,
        `dengan efektivitas intervensi dini ${formatNumber(effectiveness ?? 0)}% menurut ${values.effectivenessSource.trim() || "[sumber belum diisi]"},`,
        `potensi kasus yang dapat dicegah adalah ${formatNumber(avoidedLower)}–${formatNumber(avoidedUpper)} kasus.`,
        `Dengan biaya penanganan ${rupiah(cost ?? 0)} per kasus menurut ${values.costSource.trim() || "[sumber belum diisi]"},`,
        `biaya yang dapat dihindari ${rupiah(savedLower)}–${rupiah(savedUpper)}.`,
        `Rentang berasal dari batas bawah–atas prakiraan model (${formatNumber(lower)}–${formatNumber(upper)} kasus), bukan dari ketidakpastian asumsi di atas.`,
      ].join(" ")
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sentence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Papan klip ditolak peramban; teksnya tetap terpilih di layar. */
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-paper-600" aria-hidden />
            Biaya tak-bertindak
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-paper-700">
            Kerangka proyeksi dampak sesuai aturan penulisan PRD §9: selalu
            dengan asumsi, sumber, dan rentang. Kalkulator ini sengaja tidak
            punya angka bawaan — tarif penanganan per kasus di Kota Semarang
            belum ada di dataset sistem ini, dan mengarangnya akan membuat
            seluruh angka di sebelahnya ikut tidak bisa dipercaya.
          </p>
        </div>
        <Badge variant="outline">Asumsi Anda, bukan data sistem</Badge>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Field
            label="Biaya penanganan per kasus"
            hint="Misalnya tarif INA-CBG rawat inap untuk penyakit ini, atau realisasi belanja dinas. Isi angka rupiah."
            value={values.costPerCase}
            placeholder="Contoh: 2.500.000"
            inputMode="numeric"
            suffix="Rp/kasus"
            onChange={(costPerCase) => update({ costPerCase })}
          />
          <Field
            label="Sumber angka biaya"
            hint="Nama dokumen, tahun, dan halaman. Sumber ini ikut tercetak di kalimat hasil."
            value={values.costSource}
            placeholder="Contoh: Permenkes tarif INA-CBG 2023, kelompok …"
            onChange={(costSource) => update({ costSource })}
          />
        </div>

        <div className="space-y-4">
          <Field
            label="Efektivitas intervensi dini"
            hint="Persentase kasus yang dicegah bila intervensi datang lebih awal, menurut literatur yang Anda rujuk."
            value={values.effectivenessPct}
            placeholder="Contoh: 25"
            inputMode="numeric"
            suffix="%"
            onChange={(effectivenessPct) => update({ effectivenessPct })}
          />
          <Field
            label="Sumber angka efektivitas"
            hint="Jurnal, laporan program, atau evaluasi dinas. Tanpa ini hasilnya diberi tanda belum bersumber."
            value={values.effectivenessSource}
            placeholder="Contoh: nama jurnal, tahun"
            onChange={(effectivenessSource) => update({ effectivenessSource })}
          />
          <Field
            label="Cakupan penanganan"
            hint="Berapa persen kecamatan target yang realistis tertangani tepat waktu."
            value={values.coveragePct}
            placeholder="70"
            inputMode="numeric"
            suffix="%"
            onChange={(coveragePct) => update({ coveragePct })}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        {highRisk.length === 0 ? (
          <p className="text-body-sm text-paper-600">
            Tidak ada kecamatan berkelas risiko tinggi untuk{" "}
            {diseaseLabel(disease)} pada {monthLabel}, jadi tidak ada basis
            perhitungan. Itu kabar baik, bukan kekurangan data.
          </p>
        ) : !ready ? (
          <div className="rounded-xl border border-dashed border-paper-300 bg-paper-50 p-4">
            <p className="text-body-sm text-paper-700">
              Basis perhitungan sudah siap:{" "}
              <span className="font-medium text-foreground">
                {highRisk.length} kecamatan
              </span>{" "}
              kelas tinggi, {formatNumber(population)} jiwa, prakiraan{" "}
              {formatNumber(lower)}–{formatNumber(upper)} kasus pada {monthLabel}
              . Isi biaya per kasus dan efektivitas intervensi di atas untuk
              melihat proyeksinya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-caption uppercase tracking-wide text-paper-600">
                  Basis
                </p>
                <p className="mt-1 font-mono text-h4 tabular-nums text-foreground">
                  {formatNumber(lower)}–{formatNumber(upper)}
                </p>
                <p className="mt-1 text-caption text-paper-600">
                  Prakiraan kasus di {highRisk.length} kecamatan kelas tinggi.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-caption uppercase tracking-wide text-paper-600">
                  Kasus dapat dicegah
                </p>
                <p className="mt-1 font-mono text-h4 tabular-nums text-foreground">
                  {formatNumber(avoidedLower)}–{formatNumber(avoidedUpper)}
                </p>
                <p className="mt-1 text-caption text-paper-600">
                  Pada efektivitas {formatNumber(effectiveness ?? 0)}% dan
                  cakupan {formatNumber(coverage ?? 0)}%.
                </p>
              </div>
              <div className="rounded-xl border border-brand-300/50 bg-brand-50 p-4">
                <p className="text-caption uppercase tracking-wide text-brand-700">
                  Biaya dapat dihindari
                </p>
                <p className="mt-1 font-mono text-h4 tabular-nums text-brand-800">
                  {rupiah(savedLower)}
                </p>
                <p className="mt-1 text-caption text-paper-700">
                  sampai {rupiah(savedUpper)} pada {monthLabel}.
                </p>
              </div>
            </div>

            {!sourced && (
              <div
                className={cn(
                  "flex gap-3 rounded-xl border p-4",
                  "border-risk-medium-br bg-risk-medium-bg",
                )}
              >
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium"
                  aria-hidden
                />
                <p className="text-body-sm text-paper-800">
                  Salah satu asumsi belum punya sumber. Angka di atas tetap
                  dihitung, tapi jangan dipakai di proposal sebelum sumbernya
                  ditulis — proyeksi tanpa rujukan adalah yang paling mudah
                  dipotong nilainya sebagai klaim berlebih.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-paper-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-caption font-medium uppercase tracking-wide text-paper-600">
                  Kalimat siap salin
                </p>
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Salin
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-body-sm leading-relaxed text-paper-800">
                {sentence}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
