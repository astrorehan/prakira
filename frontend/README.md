# PRAKIRA — Frontend

Layanan frontend PRAKIRA. Next.js 14 (App Router) · TypeScript · Tailwind CSS ·
Radix UI · react-leaflet · Recharts.

Konteks produk dan arsitektur tiga layanan ada di [README utama](../README.md).

## Menjalankan secara lokal

Prasyarat: Node.js 18.17+ dan npm.

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Tanpa konfigurasi tambahan aplikasi langsung jalan memakai data mock, jadi
gateway dan ML service tidak wajib hidup. Untuk menyambungkan ke gateway:

```bash
cp .env.local.example .env.local
```

Lalu isi `NEXT_PUBLIC_API_URL`. `next.config.mjs` mem-proxy `/api/*` ke nilai
tersebut (default `http://localhost:4200`, yaitu Express gateway — bukan FastAPI
di `:8000`).

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
   │  ├─ warga/                 # portal warga — cek risiko, lapor gejala
   │  ├─ admin/                 # impor data & verifikasi laporan
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
   │  ├─ api.ts                 # klien HTTP ke gateway, dengan fallback mock
   │  ├─ mock-data.ts           # dataset contoh Kota Semarang
   │  └─ utils.ts               # cn(), formatter, pemetaan warna status risiko
   └─ types/
      └─ index.ts               # tipe bersama, mengikuti skema backend
```

Token desain (warna, tipografi, spacing) didefinisikan di `src/app/globals.css`
dan `tailwind.config.ts`; aturannya ada di
[`docs/DESIGN-SYSTEM.md`](../docs/DESIGN-SYSTEM.md).
