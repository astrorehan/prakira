# PRAKIRA

**Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim — Kota Semarang**

DSDC ANFORCOM 2026 · Subtema 2: *Eco-Health Monitoring & Early Warning Platforms*

PRAKIRA memperkirakan lonjakan kasus penyakit terkait iklim per kecamatan untuk
**bulan berikutnya**, lalu menerjemahkan prakiraan itu menjadi daftar tindakan
berprioritas untuk Dinas Kesehatan dan puskesmas.

Masalahnya: penanganan penyakit iklim bersifat reaktif — data kasus direkap
mingguan sampai bulanan, sehingga intervensi (fogging, PSN, klorinasi, logistik
obat) baru bergerak setelah kurva kasus naik. Padahal pemicu iklimnya — curah
hujan, suhu, kelembaban — sudah terukur beberapa minggu sebelumnya.

Tiga lapis solusi:

1. **Prediksi** — model ML mempelajari hubungan lag antara iklim historis dan
   kasus historis per kecamatan; menghasilkan skor risiko, kelas risiko, dan
   interval ketidakpastian.
2. **Aksi** — skor risiko diterjemahkan mesin aturan deterministik jadi
   rekomendasi intervensi berprioritas, bukan sekadar angka di dashboard.
3. **Umpan balik warga** — warga melaporkan gejala dan pemicu lingkungan,
   petugas memverifikasi, laporan terverifikasi tersedia sebagai sinyal
   berbobot rendah untuk retraining.

> PRAKIRA bukan alat diagnosis, bukan rekam medis, dan bukan pengganti
> surveilans resmi. Outputnya adalah estimasi risiko statistik untuk
> *decision support*.

---

## Cakupan data saat ini

Yang ada di repositori ini, apa adanya:

| | |
|---|---|
| Penyakit dengan data & model | **DBD** dan **ISPA** |
| Granularitas | bulanan, per kecamatan |
| Riwayat DBD | Januari 2021 – Desember 2025 (60 bulan × 16 kecamatan) |
| Riwayat ISPA | Januari – Desember 2025 (12 bulan × 16 kecamatan) |
| Variabel iklim | curah hujan (mm), suhu rata-rata (°C), kelembaban relatif (%) |

Diare dan Leptospirosis ada di PRD tapi **belum punya satu baris data pun**,
jadi keduanya tidak muncul di UI. Daftar penyakit yang tampil di seluruh
antarmuka dibentuk dari isi tabel `observasi`, bukan ditulis di frontend:
menambahkan dataset baru cukup untuk memunculkannya di mana-mana.

Tidak ada integrasi langsung ke layanan BMKG. Data iklim masuk sebagai berkas
dataset yang di-seed ke basis data; halaman admin melaporkan pekerjaan ingest
yang benar-benar berjalan, bukan status koneksi yang tidak ada.

---

## Arsitektur

```
┌──────────────────────┐
│  Next.js 14 (App)    │  Dashboard konsol + portal warga + halaman layanan
│  Tailwind + tokens   │  Leaflet (peta) · Recharts (grafik)
└──────────┬───────────┘
           │ REST/JSON lewat proksi /api/*
┌──────────▼───────────┐
│  Express Gateway     │  Auth sesi, CRUD, rate-limit, mesin aturan tindakan,
│  backend/  :4200     │  jejak audit, impor CSV
└─────┬────────────┬───┘
      │            │
┌─────▼─────┐ ┌────▼──────────────┐
│  SQLite   │ │ FastAPI ML Service│  /predict /backtest /retrain
│ node:sqlite│ │ ml-services/ :8001│  scikit-learn, XGBoost, pandas
└───────────┘ └───────────────────┘
```

**Kenapa tiga layanan, bukan satu.** (a) Pemisahan bahasa mengikuti pemisahan
keahlian tim. (b) Proses training bisa memakan menit dan tidak boleh memblokir
permintaan dashboard. (c) Layanan ML bisa dimatikan atau diganti tanpa menyentuh
gateway — prediksi terakhir tetap tersaji dari basis data, dan responsnya
ditandai `stale` supaya UI mengakuinya.

**Kenapa SQLite, bukan PostgreSQL.** PRD §6 menyebut PostgreSQL, dan skema di
`backend/src/db/schema.sql` ditulis portabel ke sana. Yang dipakai sekarang
adalah `node:sqlite` bawaan Node 22.5+: tidak ada modul native yang perlu
dikompilasi dan tidak ada server basis data yang perlu dipasang, sehingga
`npm install` di mesin mana pun tidak bisa gagal karena toolchain. Untuk satu
kota dengan 16 kecamatan dan data bulanan, ukurannya juga bukan alasan pindah.

Justifikasi lengkap tiap pilihan teknologi dan kontrak API ada di
[`docs/PRD.md` §6](./docs/PRD.md).

---

## Isi repositori

```
prakira/
├─ backend/                 # Express gateway + SQLite (port 4200)
│  ├─ src/db/schema.sql     # skema inti: wilayah, observasi, prediksi, laporan, audit
│  ├─ src/routes/           # endpoint HTTP
│  └─ src/services/         # mesin aturan tindakan, klien layanan ML, sesi
├─ frontend/                # Next.js 14 (port 3000) — lihat frontend/README.md
├─ ml-services/             # FastAPI + model terlatih (port 8001)
│  ├─ dataset_raw/          # sumber mentah
│  ├─ dataset_clean/        # deret bulanan siap latih
│  ├─ models/               # .pkl + metadata.json
│  └─ training/             # skrip pelatihan
├─ scripts/dev.mjs          # menyalakan ketiga layanan sekaligus
└─ docs/                    # PRD dan design system
```

| Layanan | Folder | Port dev |
|---|---|---|
| Frontend | [`frontend/`](./frontend) | `3000` |
| Express gateway | [`backend/`](./backend) | `4200` |
| FastAPI ML service | [`ml-services/`](./ml-services) | `8001` |

---

## Menjalankan

### 1. Layanan ML (Python 3.12 disarankan)

```bash
python -m venv ml-services/.venv
ml-services/.venv/Scripts/pip install -r ml-services/requirements.txt
```

Di macOS/Linux, ganti `Scripts` dengan `bin`.

Berkas `.pkl` di `ml-services/models/` harus dilatih dengan versi scikit-learn
yang sama dengan yang terpasang. Bila `/predict` menjawab galat unpickle, latih
ulang:

```bash
ml-services/.venv/Scripts/python -m training.train_dbd
```

Ulangi dengan `training.train_ispa` untuk model ISPA.

### 2. Pasang dependensi Node

```bash
npm run install:all
```

### 3. Konfigurasi

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Keduanya sudah berisi nilai yang jalan untuk pengembangan lokal. Akun awal
dibuat gateway saat seeding: **`dinkes@prakira.id` / `prakira2026`**. Ganti lewat
`SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` sebelum dipakai di luar
pengembangan — di `NODE_ENV=production`, gateway menolak jalan tanpa
`SESSION_SECRET` dan `SEED_ADMIN_PASSWORD`.

### 4. Nyalakan ketiganya

```bash
npm run dev
```

Buka http://localhost:3000. Basis data SQLite dibuat dan di-seed dari dataset
`ml-services/` pada start pertama; prediksi dan backtest ditarik dari layanan ML
lalu disimpan.

Menjalankan sendiri-sendiri: `npm run dev:backend`, `npm run dev:frontend`, dan
`ml-services/.venv/Scripts/python -m uvicorn app.main:app --port 8001`.

### Tanpa layanan ML

Gateway dan frontend tetap jalan. Observasi historis, register kecamatan, portal
warga, dan antrean verifikasi berfungsi penuh; kolom prakiraan kosong dan
dashboard menampilkan pemberitahuan bahwa prediksinya belum diperbarui. Itu
disengaja — tidak ada jalur cadangan yang diam-diam mengisi angka.

---

## Endpoint gateway

| Metode | Path | Sesi | Keterangan |
|---|---|---|---|
| `GET` | `/api/health` | — | status gateway dan daftar penyakit |
| `GET` | `/api/meta/period` | — | bulan observasi terakhir & bulan prakiraan |
| `GET` | `/api/meta/diseases` | — | penyakit yang punya data |
| `GET` | `/api/meta/kecamatan` | — | 16 kecamatan + sentroid |
| `GET` | `/api/meta/geojson` | — | batas wilayah |
| `GET` | `/api/meta/activity` | — | denyut sistem tanpa identitas |
| `GET` | `/api/meta/ml-status` | — | layanan ML terjangkau atau tidak |
| `GET` | `/api/districts?disease=` | — | satu penyakit, 16 kecamatan |
| `GET` | `/api/districts/all` | — | seluruh penyakit sekaligus |
| `GET` | `/api/trend?disease=` | — | deret bulanan kota + prakiraan |
| `GET` | `/api/climate?months=` | — | deret iklim vs kasus |
| `GET` | `/api/model/backtest` | — | metrik model + daftar batasan |
| `GET` | `/api/actions` | — | antrean rekomendasi tindakan |
| `PATCH` | `/api/actions/:id` | ✓ | ubah status tindakan |
| `POST` | `/api/reports` | — | kirim laporan warga (rate-limited) |
| `GET` | `/api/reports/track/:kode` | — | lacak satu laporan |
| `GET` | `/api/reports/verified` | — | laporan terverifikasi tanpa isinya |
| `GET` | `/api/reports` | ✓ | antrean verifikasi lengkap |
| `PATCH` | `/api/reports/:id/review` | ✓ | putuskan terima/tolak |
| `POST` | `/api/auth/login` · `/logout` | — | sesi cookie httpOnly |
| `GET` | `/api/admin/sync-status` | — | pekerjaan ingest terakhir |
| `GET` | `/api/admin/audit` | ✓ | jejak audit lengkap |
| `POST` | `/api/admin/import` | ✓ | pratinjau & impor CSV kasus |
| `POST` | `/api/admin/refresh` | ✓ | tarik ulang prediksi & backtest |
| `POST` | `/api/admin/retrain` | ✓ | latih ulang model (admin/dinas) |

---

## Catatan penempatan

`vercel.json` di akar hanya membangun frontend. Gateway memerlukan proses Node
yang hidup dan berkas SQLite yang bisa ditulis, jadi ia tidak bisa dipasang
sebagai serverless function tanpa mengganti lapisan basis datanya. Untuk
pemasangan terpisah: jalankan gateway di host mana pun yang mendukung proses
panjang, lalu isi `API_PROXY_TARGET` (proksi same-origin) atau
`NEXT_PUBLIC_API_URL` beserta `CORS_ORIGINS` di sisi gateway.

---

## Dokumentasi

- [`docs/PRD.md`](./docs/PRD.md) — ruang lingkup produk, rubrik sebagai
  spesifikasi, arsitektur, kontrak API, roadmap, register risiko.
- [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md) — token desain, skala
  tipografi, aturan komponen; ditulis agar bisa dipetakan 1:1 ke Figma
  Variables.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — panduan alur kerja git, konvensi
  commit, dan standar penulisan kode.
