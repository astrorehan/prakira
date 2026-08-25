import Link from "next/link";
import { Activity, ArrowLeftRight, Lock, MapPin, Phone } from "lucide-react";

const COLUMNS: Array<{ title: string; note?: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Layanan publik",
    links: [
      { label: "Cek status wilayah", href: "#status" },
      { label: "Peringatan resmi", href: "#peringatan" },
      { label: "Lapor kasus & jentik", href: "/warga" },
      { label: "Langganan peringatan dini", href: "/hubungi-kami" },
      { label: "Unduh data terbuka", href: "#register" },
    ],
  },
  {
    title: "Informasi publik",
    links: [
      { label: "Cara sistem bekerja", href: "#informasi" },
      { label: "Akurasi & uji ulang model", href: "#informasi" },
      { label: "Batasan penggunaan", href: "#informasi" },
      { label: "PPID Dinas Kesehatan", href: "#informasi" },
      { label: "Tentang Prakira", href: "/tentang" },
    ],
  },
  {
    title: "Akses petugas",
    note: "Memerlukan akun instansi",
    links: [
      { label: "Dashboard prediksi", href: "/dashboard" },
      { label: "Analitik & riwayat iklim", href: "/analitik" },
      { label: "Manajemen data & BMKG", href: "/admin" },
    ],
  },
];

export function SistemFooter() {
  return (
    <footer className="border-t border-sand-200 bg-sand-100">
      <div className="container py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Instansi */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white">
                <Activity className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight text-foreground">Prakira</span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
                  Sistem Peringatan Dini Risiko Iklim
                </span>
              </span>
            </div>

            <p className="mt-5 max-w-sm text-caption text-paper-600">
              Diselenggarakan oleh Dinas Kesehatan Kota Semarang bersama Badan Meteorologi,
              Klimatologi, dan Geofisika untuk kewaspadaan dini penyakit terkait iklim.
            </p>

            <dl className="mt-6 space-y-3 text-caption">
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-400" aria-hidden />
                <dd className="text-paper-600">
                  Jl. Pandanaran No. 79, Mugassari, Semarang Selatan, Kota Semarang 50241
                </dd>
              </div>
              <div className="flex gap-2.5">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-400" aria-hidden />
                <dd className="tabular text-paper-600">
                  (024) 3511 866 · Darurat 119 ekstensi 9
                </dd>
              </div>
            </dl>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2 xl:col-span-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="text-caption text-paper-600 transition-colors duration-fast hover:text-brand-700"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-caption text-paper-600 transition-colors duration-fast hover:text-brand-700"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {col.note ? (
                <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.07em] text-paper-400">
                  <Lock className="h-3 w-3" aria-hidden />
                  {col.note}
                </p>
              ) : null}
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-sand-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper-500">
            © 2026 Pemerintah Kota Semarang · Dinas Kesehatan · Halaman diperbarui 24 Agustus 2026, 18:00 WIB
          </p>

          {/* Kept for side-by-side review: the campaign landing page is still live. */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-sand-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-600 transition-colors duration-fast hover:border-brand-300 hover:text-brand-700"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Lihat versi landing page
          </Link>
        </div>
      </div>
    </footer>
  );
}
