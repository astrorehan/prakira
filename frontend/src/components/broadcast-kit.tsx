"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withKecamatan } from "@/lib/kecamatan-selection";
import { diseaseLabel } from "@/lib/utils";
import type { ActionRecommendation } from "@/types";

/**
 * Kit siaran per kecamatan — teks siap salin + QR menuju portal warga.
 *
 * Batas yang ditegakkan PRD §4: notifikasi WhatsApp masuk daftar WON'T. Yang
 * ada di sini karena itu **bukan** integrasi pengiriman pesan — tidak ada
 * nomor tujuan, tidak ada tombol kirim, dan tidak ada yang keluar dari
 * peramban. Yang disediakan hanya dua bahan yang memang bisa dibuat sistem
 * dengan jujur: kalimat yang tinggal ditempel petugas ke kanal yang sudah
 * dipakainya, dan satu kode QR per kecamatan yang mengarah ke formulir
 * laporan dengan kecamatannya sudah terisi.
 *
 * QR dibuat di peramban dari URL yang sama yang dipakai tautan biasa
 * (`/warga/lapor?kecamatan=…`), jadi tidak ada pemendek tautan, tidak ada
 * pelacak, dan tidak ada permintaan ke pihak ketiga. Sebuah kode QR yang
 * mengarah ke domain asing di poster dinas adalah cacat kepercayaan, bukan
 * kemudahan.
 *
 * Yang **tidak** ditulis di kalimat siaran: nomor surat, nama pejabat, dan
 * jam pelaksanaan. Tiga hal itu hanya bisa diisi dinas; mengarangnya membuat
 * pesan tampak resmi padahal tidak.
 */

const QR_OPTIONS = {
  margin: 1,
  width: 512,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#0E2225", light: "#FFFFFF" },
};

function reportUrl(kecamatan: string): string {
  const origin =
    typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${withKecamatan("/warga/lapor", kecamatan)}`;
}

/**
 * Kalimat siaran satu kecamatan.
 *
 * Sengaja pendek dan tanpa istilah teknis: ini yang dibaca warga, bukan yang
 * dibaca analis. Tidak ada "persentil", "MAE", atau "kelas risiko" — kata
 * terakhir itu diganti dengan padanan yang sudah dipakai portal warga.
 */
function broadcastLine(
  action: ActionRecommendation,
  kecamatan: string,
  url: string,
): string {
  const label = diseaseLabel(action.disease);
  return [
    `[Imbauan ${label} — Kecamatan ${kecamatan}]`,
    "",
    `Prakiraan risiko ${label} di wilayah kita naik pada periode ini. Petugas puskesmas dan kader sedang mendata titik pemicunya.`,
    "",
    `Yang bisa warga bantu: laporkan genangan, jentik, tumpukan sampah, atau saluran tersumbat di sekitar rumah lewat ${url}`,
    "",
    "Laporan yang masuk diperiksa petugas dan dapat kode lacak, jadi bisa ditanyakan kembali.",
    "",
    "Pesan ini draf sistem pendukung keputusan. Nomor surat, pejabat penanda tangan, dan jadwal pelaksanaan diisi dinas sebelum diedarkan.",
  ].join("\n");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Papan klip ditolak peramban — teksnya tetap terlihat di layar. */
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={copy}>
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Tersalin
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}

function DistrictCard({
  action,
  kecamatan,
}: {
  action: ActionRecommendation;
  kecamatan: string;
}) {
  const [qr, setQr] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const url = React.useMemo(() => reportUrl(kecamatan), [kecamatan]);

  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((data) => {
        if (alive) setQr(data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  const text = broadcastLine(action, kecamatan, url);

  return (
    <li className="flex gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-paper-0">
        {qr ? (
          /* Data URL hasil pembuatan lokal; `next/image` tidak dipakai karena
             sumbernya tidak melewati pengoptimal gambar. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt={`Kode QR menuju formulir laporan warga untuk Kecamatan ${kecamatan}`}
            className="h-full w-full rounded-lg object-contain p-1"
          />
        ) : failed ? (
          <span className="px-2 text-center text-caption text-paper-500">
            QR gagal dibuat
          </span>
        ) : (
          <QrCode className="h-6 w-6 animate-pulse text-paper-400" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold text-foreground">{kecamatan}</p>
        <p className="mt-0.5 break-all font-mono text-caption text-paper-600">
          {url}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyButton text={text} label="Salin teks siaran" />
          <CopyButton text={url} label="Salin tautan" />
        </div>
      </div>
    </li>
  );
}

export function BroadcastKit({ action }: { action: ActionRecommendation }) {
  const districts = action.target_kecamatan;

  if (districts.length === 0) {
    return (
      <p className="text-body-sm text-paper-600">
        Tindakan ini belum punya kecamatan sasaran, jadi tidak ada siaran yang
        bisa disiapkan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-xl text-caption leading-relaxed text-paper-600">
          Satu kartu per kecamatan sasaran. Kode QR mengarah ke formulir laporan
          warga dengan kecamatannya sudah terisi — tempelkan di papan
          pengumuman RW, atau salin tautannya ke kanal yang sudah dipakai
          puskesmas. Sistem ini tidak mengirim pesan ke siapa pun.
        </p>
        <Badge variant="outline">Tanpa integrasi pengiriman</Badge>
      </div>

      {/* Satu kolom, bukan dua. Komponen ini dipasang di dalam modal selebar
          672px: pada dua kolom tiap kartu menyisakan sekitar 300px, dan URL
          laporan yang panjang terpaksa pecah tiga baris sementara kedua
          tombolnya menumpuk. Daftar yang lebih panjang tapi terbaca lebih
          baik daripada daftar padat yang harus ditebak isinya. */}
      <ul className="grid gap-2.5">
        {districts.map((kecamatan) => (
          <DistrictCard key={kecamatan} action={action} kecamatan={kecamatan} />
        ))}
      </ul>
    </div>
  );
}
