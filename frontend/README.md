# PRAKIRA — Frontend

Layanan frontend PRAKIRA. Next.js 14 (App Router) · TypeScript · Tailwind CSS ·
Radix UI · react-leaflet · Recharts.

Konteks produk dan arsitektur tiga layanan ada di [README utama](../README.md).

## Menjalankan secara lokal

Prasyarat: Node.js 18.17+ dan npm.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Buka http://localhost:3000.

**Gateway wajib hidup.** Tidak ada lagi data contoh yang mengisi layar saat
backend mati: setiap permukaan data punya keadaan gagal, dan itulah yang tampil.
Jalankan `npm run dev` dari akar repositori untuk menyalakan frontend, gateway,
dan layanan ML sekaligus.

`API_PROXY_TARGET` (bawaan `http://localhost:4200`) hanya dibaca proses Next di
server, sehingga peramban memanggil `/api/*` same-origin dan cookie sesi ikut
terkirim tanpa konfigurasi CORS. Isi `NEXT_PUBLIC_API_URL` sebagai gantinya bila
gateway dipasang di host lain tanpa proksi.

## Skrip npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | dev server di `:3000` |
| `npm run build` | production build |
| `npm start` | menjalankan hasil build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run type-check` | `tsc --noEmit` |

## Struktur folder

```
frontend/
└─ src/
   ├─ app/                      # Next.js App Router
   │  ├─ page.tsx               # landing publik
   │  ├─ dashboard/             # dashboard Dinkes — peta, KPI, ranking kecamatan
   │  ├─ analitik/              # korelasi iklim & backtest model
   │  ├─ warga/                 # portal warga — lapor & lacak laporan
   │  ├─ tindakan/              # antrean aksi dini
   │  ├─ verifikasi/            # antrean verifikasi laporan warga
   │  ├─ sistem/                # halaman layanan publik
   │  ├─ masuk/                 # sesi petugas
   │  ├─ admin/                 # impor data & jejak audit
   │  ├─ tentang/
   │  ├─ hubungi-kami/
   │  ├─ dev/                   # halaman internal: showcase design system
   │  ├─ layout.tsx
   │  └─ globals.css            # CSS custom properties (token design system)
   ├─ components/
   │  ├─ landing/               # section-section halaman depan
   │  ├─ ui/                    # primitif reusable (button, card, dialog, metric, …)
   │  └─ *.tsx                  # komponen domain (choropleth-map, kpi-card, …)
   ├─ lib/
   │  ├─ api.ts                 # klien HTTP ke gateway — melempar, tidak menambal
   │  ├─ use-api.ts             # hook empat keadaan: memuat, gagal, kosong, terisi
   │  ├─ use-city-data.ts       # ringkasan lintas penyakit untuk permukaan publik
   │  ├─ use-period.ts          # periode pelaporan dari gateway
   │  ├─ kecamatan.ts           # direktori 16 kecamatan + sentroid
   │  ├─ export.ts              # unduhan CSV yang benar-benar mengunduh
   │  └─ utils.ts               # cn(), formatter, pemetaan warna status risiko
   └─ types/
      └─ index.ts               # tipe bersama, cerminan respons gateway
```

Token desain (warna, tipografi, spacing) didefinisikan di `src/app/globals.css`
dan `tailwind.config.ts`; aturannya ada di
[`docs/DESIGN-SYSTEM.md`](../docs/DESIGN-SYSTEM.md).
