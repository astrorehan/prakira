# PRAKIRA — Frontend

Layanan frontend PRAKIRA. Next.js 15 (App Router) · TypeScript · Tailwind CSS ·
Radix UI · react-leaflet · Recharts.

Konteks produk dan arsitektur tiga layanan ada di [README utama](../README.md).

## Menjalankan secara lokal

Prasyarat: Node.js 18.18+ (direkomendasikan Node.js 22.5+) dan npm.

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

`API_PROXY_TARGET` (bawaan `http://127.0.0.1:4200`) hanya dibaca proses Next di
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
   ├─ app/                      # Next.js 15 App Router
   │  ├─ page.tsx               # landing publik & portal informasi
   │  ├─ dashboard/             # dashboard Dinkes — peta choropleth, KPI, ranking, trigger layer, quick action buletin
   │  ├─ buletin/               # mesin cetak buletin resmi SKDR A4 (kop Dinkes, matriks prioritas, SOP, otorisasi)
   │  ├─ prioritas/             # matriks prioritas dampak & beban populasi (bobot populasi vs kepadatan)
   │  ├─ mesin-waktu/           # backtest rewind, analisis lead time ±30 hari, & peta perbandingan aktual vs prediksi
   │  ├─ model/                 # transparansi model ML (MAE/RMSE, R², batasan resmi, kurva blind test, cakupan data)
   │  ├─ simulasi/              # simulator skenario cuaca what-if (hujan, suhu, kelembaban)
   │  ├─ analitik/              # korelasi iklim vs kasus & tren historis
   │  ├─ tindakan/              # antrean rekomendasi aksi dini intervensi
   │  │  └─ nota/[id]/          # lembar draf nota dinas siap cetak A4 per tindakan
   │  ├─ verifikasi/            # antrean verifikasi laporan warga, eskalasi S4, & kendali demo surge
   │  ├─ warga/                 # portal publik warga Kota Semarang
   │  │  ├─ lapor/              # formulir pelaporan warga (gejala / pemicu lingkungan)
   │  │  └─ status/             # pelacakan status laporan via kode lacak
   │  ├─ sistem/                # halaman status operasional sistem & denyut audit publik
   │  ├─ masuk/                 # autentikasi sesi petugas dinas & puskesmas
   │  ├─ admin/                 # manajemen data (impor CSV kasus, status ingest, audit log, retrain, maintenance)
   │  ├─ tentang/               # profil platform, metodologi, dan latar belakang
   │  ├─ hubungi-kami/          # direktori kontak & layanan dinas
   │  ├─ dev/                   # halaman showcase design system & token inspection
   │  ├─ layout.tsx
   │  └─ globals.css            # CSS custom properties (token Design System "Buletin")
   ├─ components/
   │  ├─ landing/               # section halaman depan (hero, maps, features, cta, dll.)
   │  ├─ ui/                    # primitif reusable (button, card, dialog, metric, badge, dll.)
   │  └─ *.tsx                  # komponen domain (choropleth-map, kpi-card, district-detail-panel, dll.)
   ├─ lib/
   │  ├─ api.ts                 # klien HTTP ke gateway — melempar ApiError, tanpa fallback palsu
   │  ├─ use-api.ts             # hook 4 keadaan data: memuat, gagal, kosong, terisi
   │  ├─ use-city-data.ts       # ringkasan lintas penyakit untuk permukaan publik
   │  ├─ use-period.ts          # periode pelaporan dari gateway
   │  ├─ kecamatan.ts           # direktori 16 kecamatan + sentroid
   │  ├─ export.ts              # unduhan CSV data resmi
   │  └─ utils.ts               # cn(), formatter angka/rentang, profil penyakit, token semantik risiko
   └─ types/
      └─ index.ts               # kontrak antarmuka TypeScript bersama (cerminan respons gateway)
```

Token desain (warna, tipografi, spacing) didefinisikan di `src/app/globals.css`
dan `tailwind.config.ts`; aturannya ada di
[`docs/DESIGN-SYSTEM.md`](../docs/DESIGN-SYSTEM.md).
