"use client";

import * as React from "react";
import { Check, Copy, Mail, MailCheck, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REPORT_KIND, type ReportKind } from "@/lib/reports";
import { formatDateTime } from "@/lib/period";

export type DispositionEmailData = {
  reportId: string;
  kind: ReportKind | string;
  kecamatan: string;
  kelurahan?: string | null;
  description: string;
  createdAt?: string;
  dispositionNumber?: string;
};

interface DispositionEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DispositionEmailData | null;
}

export function DispositionEmailModal({
  open,
  onOpenChange,
  data,
}: DispositionEmailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!data) return null;

  const isKnownKind = typeof data.kind === "string" && data.kind in REPORT_KIND;
  const kindLabel = isKnownKind ? REPORT_KIND[data.kind as ReportKind].label : data.kind;
  const dispNumber =
    data.dispositionNumber ||
    `DISP/DLH/${new Date().getFullYear()}/${data.reportId.replace(/^PKR-/, "")}`;
  const sendTime = data.createdAt ? formatDateTime(data.createdAt) : formatDateTime(new Date().toISOString());

  const emailText = `
SURAT DISPOSISI ELEKTRONIK LINTAS INSTANSI
Sistem Peringatan Dini PRAKIRA Kota Semarang

No. Disposisi : ${dispNumber}
Tanggal       : ${sendTime}
Pengirim      : Tim Surveilans Dinas Kesehatan Kota Semarang (surveilans.dinkes@semarangkota.go.id)
Kepada        : Kepala Dinas Lingkungan Hidup Kota Semarang (dlh@semarangkota.go.id)
Tembusan      : Bidang P2P Dinas Kesehatan Kota Semarang (p2p.dinkes@semarangkota.go.id)
Perihal       : [PRAKIRA - Pemicu Lingkungan] Rujukan Temuan ${kindLabel} - Kec. ${data.kecamatan}

Yth. Kepala Dinas Lingkungan Hidup Kota Semarang / UPT Kebersihan & Drainase,

Berdasarkan hasil verifikasi petugas kesehatan atas laporan masyarakat di sistem PRAKIRA, kami meneruskan rujukan temuan pemicu lingkungan berisiko wabah:

1. Kode Lacak Warga : ${data.reportId}
2. Lokasi Kejadian  : Kec. ${data.kecamatan}${data.kelurahan ? `, Kel. ${data.kelurahan}` : ""}
3. Kategori Masalah : ${kindLabel}
4. Keterangan Warga : "${data.description}"

Catatan Epidemiologis:
Temuan pemicu fisik lingkungan tersebut berpotensi tinggi memicu perkembangbiakan vektor nyamuk Aedes aegypti / bakteri Leptospira dalam horizon 2–4 minggu ke depan sesuai estimasi model iklim wilayah ini. Mohon bantuan intervensi fisik berupa pengangkutan sampah / pembersihan drainase di lokasi terkait.

Atas perhatian dan kerja sama lintas OPD, kami sampaikan terima kasih.

Dinas Kesehatan Kota Semarang
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="gap-1 border-teal-300 bg-teal-50 text-teal-800">
              <MailCheck className="h-3.5 w-3.5 text-teal-600" />
              Disposisi Terkirim (Simulasi)
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {dispNumber}
            </Badge>
          </div>
          <DialogTitle className="text-h3 text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-700" />
            Surat Rujukan Elektronik ke Dinas Lingkungan Hidup
          </DialogTitle>
          <DialogDescription className="text-body-sm text-paper-600">
            Laporan pemicu lingkungan otomatis diteruskan ke DLH Kota Semarang via korespondensi email resmi antar-OPD.
          </DialogDescription>
        </DialogHeader>

        {/* Kotak Tampilan Email */}
        <div className="rounded-xl border border-sand-300 bg-sand-50/70 p-4 font-sans text-body-sm space-y-3.5 text-paper-800">
          <div className="grid gap-1.5 border-b border-sand-200 pb-3 text-caption">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="w-20 font-semibold text-paper-600 shrink-0">Pengirim:</span>
              <span className="text-foreground">surveilans.dinkes@semarangkota.go.id (Dinas Kesehatan)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="w-20 font-semibold text-paper-600 shrink-0">Kepada:</span>
              <span className="font-medium text-teal-900">dlh@semarangkota.go.id (Dinas Lingkungan Hidup)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="w-20 font-semibold text-paper-600 shrink-0">Tembusan:</span>
              <span className="text-paper-600">p2p.dinkes@semarangkota.go.id, sekda@semarangkota.go.id</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="w-20 font-semibold text-paper-600 shrink-0">Perihal:</span>
              <span className="font-medium text-foreground">
                [PRAKIRA - Pemicu Lingkungan] Rujukan Temuan {kindLabel} - Kec. {data.kecamatan}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <span className="w-20 font-semibold text-paper-600 shrink-0">Waktu:</span>
              <span className="text-paper-600">{sendTime}</span>
            </div>
          </div>

          <div className="space-y-2.5 leading-relaxed text-paper-800 text-body-sm">
            <p>
              Yth. <strong>Kepala Dinas Lingkungan Hidup Kota Semarang</strong> / Kepala UPT Terkait,
            </p>
            <p>
              Berdasarkan hasil verifikasi lapangan petugas kesehatan sistem PRAKIRA atas laporan masyarakat, kami meneruskan rujukan temuan pemicu fisik lingkungan berikut:
            </p>

            <div className="rounded-lg border border-sand-300/80 bg-white p-3 space-y-1 text-caption">
              <p>
                <strong className="text-paper-700">Kode Lacak:</strong> <span className="font-mono">{data.reportId}</span>
              </p>
              <p>
                <strong className="text-paper-700">Wilayah:</strong> Kec. {data.kecamatan}
                {data.kelurahan ? `, Kel. ${data.kelurahan}` : ""}
              </p>
              <p>
                <strong className="text-paper-700">Kategori:</strong> {kindLabel}
              </p>
              <p className="pt-1 border-t border-sand-200 text-paper-800 italic">
                &ldquo;{data.description}&rdquo;
              </p>
            </div>

            <div className="rounded-lg bg-teal-50/70 border border-teal-200/80 p-3 text-caption text-teal-950 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong>Catatan Epidemiologis Eco-Health:</strong> Temuan genangan/sampah di lokasi ini berpotensi menjadi habitat perkembangbiakan vektor nyamuk atau sumber penularan penyakit berbasis lingkungan dalam 2–4 minggu ke depan. Mohon bantuan penjadwalan pembersihan fisik saluran/sampah.
              </div>
            </div>

            <p className="text-caption text-paper-600 pt-2">
              Surat rujukan ini diterbitkan secara elektronik oleh platform PRAKIRA Kota Semarang dan tercatat dalam arsip koordinasi lintas instansi.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <div className="text-caption text-paper-600 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Tersimpan di Jejak Audit Sistem
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-risk-low" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin Disposisi"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
