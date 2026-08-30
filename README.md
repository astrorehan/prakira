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
| Penyakit dengan data & model | **DBD**, **ISPA**, dan **Leptospirosis** |
| Granularitas | bulanan, per kecamatan |
| Riwayat DBD | Januari 2021 – Desember 2025 (60 bulan × 16 kecamatan) |
| Riwayat ISPA | Januari – Desember 2025 (12 bulan × 16 kecamatan) |
| Riwayat Leptospirosis | Januari 2021 – Desember 2025 (60 bulan × 16 kecamatan) |
| Variabel iklim | curah hujan (mm), suhu rata-rata (°C), kelembaban relatif (%) |

Diare ada di PRD tetapi **belum memiliki dataset historis**, sehingga belum
muncul di antarmuka prediksi. Daftar penyakit yang tampil di seluruh antarmuka
dibentuk dinamis dari isi tabel `observasi`, bukan ditulis mati di frontend:
menambahkan dataset baru cukup untuk memunculkannya di seluruh sistem.

Tidak ada koneksi langsung ke server BMKG. Data iklim masuk sebagai berkas
dataset yang di-seed ke basis data; halaman admin melaporkan pekerjaan ingest
yang benar-benar berjalan, bukan status koneksi yang tidak ada.

---

## Arsitektur

```
┌──────────────────────────────────────────────────────────┐
│                 Frontend — Next.js 14                    │
│   Port: 3000 · App Router · Tailwind · Leaflet · Recharts │
└────────────────────────────┬─────────────────────────────┘
                             │ Proksi internal: /api/*
┌────────────────────────────▼─────────────────────────────┐
│              Backend Gateway — Express.js                │
│   Port: 4200 · TypeScript · Session Auth · Rule Engine   │
└──────────────┬────────────────────────────┬──────────────┘
               │                            │
┌──────────────▼──────────────┐ ┌───────────▼──────────────┐
│    PostgreSQL (Supabase)    │ │   ML Service — FastAPI   │
│  Pool `pg` · Skema SQL Utuh │ │  Port: 8001 · Ensemble   │
└─────────────────────────────┘ └──────────────────────────┘
```

**Kenapa tiga layanan, bukan satu.** (a) Pemisahan bahasa mengikuti pemisahan
keahlian tim. (b) Proses training bisa memakan menit dan tidak boleh memblokir
permintaan dashboard. (c) Layanan ML bisa dimatikan atau diganti tanpa menyentuh
gateway — prediksi terakhir tetap tersaji dari basis data, dan responsnya
ditandai `stale` supaya UI mengakuinya.

**Basis Data: PostgreSQL (Supabase).** Gateway beroperasi di atas PostgreSQL
(Supabase) menggunakan kolam koneksi `pg.Pool` dengan translasi parameter kueri
otomatis `toPg` (`?` -> `$1..$n`) dan dukungan transaksi terisolasi (`transaction`).
Skema terdefinisi di `backend/src/db/schema.sql` (tabel `kecamatan`, `observasi`,
`prediksi`, `laporan_warga`, `tindakan`, `backtest_results`, `users`, `sessions`,
`audit_log`, `ingest_job`).

Justifikasi lengkap tiap pilihan teknologi dan kontrak API ada di
[`docs/PRD.md` §6](./docs/PRD.md).

---

## Isi repositori

```
prakira/
├─ backend/                 # Express gateway + PostgreSQL Supabase (port 4200)
│  ├─ src/db/schema.sql     # skema inti: wilayah, observasi, prediksi, laporan, tindakan, audit
│  ├─ src/routes/           # endpoint HTTP (meta, districts, model, actions, reports, auth, admin)
│  └─ src/services/         # mesin aturan tindakan, prioritas, eskalasi, klien ML, auth sesi
├─ frontend/                # Next.js 14 (port 3000) — lihat frontend/README.md
│  ├─ src/app/              # 20 rute publik & konsol dinas (dashboard, buletin, model, dll.)
│  └─ src/components/       # choropleth map, panel analisis, form laporan, draf dokumen
├─ ml-services/             # FastAPI + model ensemble terlatih (port 8001)
│  ├─ dataset_raw/          # sumber mentah (kasus, cuaca BMKG, wilayah BPS)
│  ├─ dataset_clean/        # deret bulanan siap latih (DBD, ISPA, Leptospirosis)
│  ├─ models/               # model .pkl + metadata.json
│  └─ training/             # skrip pelatihan & ensemble blending
├─ scripts/dev.mjs          # orkestrator startup ketiga layanan sekaligus
└─ docs/                    # PRD dan design system "Buletin"
```

| Layanan | Folder | Port dev | Teknologi Utama |
|---|---|---|---|
| Frontend | [`frontend/`](./frontend) | `3000` | Next.js 14 App Router, React 18, Tailwind CSS, Leaflet, Recharts |
| Express gateway | [`backend/`](./backend) | `4200` | Express, TypeScript, Node.js, PostgreSQL (`pg`) |
| FastAPI ML service | [`ml-services/`](./ml-services) | `8001` | FastAPI, Uvicorn, Python 3.12, Scikit-Learn, XGBoost, Pandas |

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
ulang seluruh model sekaligus:

```bash
ml-services/.venv/Scripts/python -m training.train --disease all
```

Atau latih per penyakit: `training.train_dbd`, `training.train_ispa`, `training.train_leptospirosis`.

### 2. Pasang dependensi Node

```bash
npm run install:all
```

### 3. Konfigurasi Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Isi `DATABASE_URL` pada `backend/.env` dengan connection string PostgreSQL Supabase
(Session Pooler port `5432`).

Akun awal dibuat gateway saat seeding: **`dinkes@prakira.id` / `prakira2026`**. Ganti lewat
`SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` sebelum dipakai di luar
pengembangan — di `NODE_ENV=production`, gateway menolak jalan tanpa
`SESSION_SECRET` dan `SEED_ADMIN_PASSWORD`.

### 4. Seeding Basis Data & Nyalakan Aplikasi

```bash
# Seeding basis data PostgreSQL
npm run seed

# Nyalakan seluruh layanan sekaligus
npm run dev
```

Buka http://localhost:3000. Basis data diisi dari dataset historis `ml-services/`
dan GeoJSON batas wilayah; prediksi dan backtest ditarik dari layanan ML lalu
disimpan.

Menjalankan sendiri-sendiri di terminal terpisah:
- **ML Service:** `cd ml-services && .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`
- **Backend:** `npm run dev:backend`
- **Frontend:** `npm run dev:frontend`

### Tanpa layanan ML

Gateway dan frontend tetap jalan. Observasi historis, register kecamatan, portal
warga, antrean verifikasi, dan matriks prioritas berfungsi penuh; kolom prakiraan
menampilkan indikator `stale` bahwa prediksi belum diperbarui. Itu
disengaja — tidak ada jalur cadangan yang diam-diam mengisi angka palsu.

---

## Endpoint Gateway

| Metode | Path | Sesi | Keterangan |
|---|---|---|---|
| `GET` | `/api/health` | — | status gateway dan daftar penyakit |
| `GET` | `/api/meta/period` | — | bulan observasi terakhir & bulan prakiraan |
| `GET` | `/api/meta/diseases` | — | penyakit yang memiliki data observasi |
| `GET` | `/api/meta/kecamatan` | — | 16 kecamatan Kota Semarang + sentroid Shoelace |
| `GET` | `/api/meta/geojson` | — | batas wilayah poligon GeoJSON 16 kecamatan |
| `GET` | `/api/meta/activity` | — | denyut audit publik tanpa identitas pelapor |
| `GET` | `/api/meta/ml-status` | — | status keterjangkauan & model pada layanan ML |
| `GET` | `/api/districts?disease=` | — | data observasi & prediksi 16 kecamatan |
| `GET` | `/api/districts/all` | — | ringkasan risiko seluruh penyakit sekaligus |
| `GET` | `/api/districts/priority?disease=&bobot=` | — | peringkat prioritas dampak & beban populasi |
| `GET` | `/api/trend?disease=&months=` | — | deret tren bulanan kota + prakiraan |
| `GET` | `/api/climate?months=` | — | deret iklim (hujan, suhu, kelembaban) vs kasus |
| `GET` | `/api/model/backtest?disease=` | — | metrik evaluasi model (MAE, RMSE, R²) & batasan |
| `GET` | `/api/model/info` | — | informasi arsitektur model & status layanan |
| `GET` | `/api/model/limitations` | — | 5 batasan resmi sistem untuk transparansi publik |
| `GET` | `/api/model/coverage?disease=` | — | tingkat kelengkapan data historis per kecamatan |
| `GET` | `/api/model/rewind?disease=` | — | putusan Mesin Waktu per bulan × kecamatan & lead time |
| `GET` | `/api/model/explain?disease=&kecamatan_id=` | — | atribusi kontribusi fitur lokal ("Kenapa angka ini?") |
| `POST` | `/api/model/simulate` | — | simulator skenario cuaca what-if interaktif |
| `GET` | `/api/actions?disease=` | — | antrean rekomendasi tindakan intervensi dini |
| `GET` | `/api/actions/:id` | — | detail satu rekomendasi untuk lembar nota dinas |
| `PATCH` | `/api/actions/:id` | ✓ | ubah status tindakan (`pending`, `in_progress`, `completed`) |
| `GET` | `/api/reports/rate-limit` | — | sisa kuota pengiriman laporan perangkat |
| `POST` | `/api/reports` | — | kirim laporan warga (gejala/pemicu, rate-limited) |
| `GET` | `/api/reports/track/:code` | — | lacak status satu laporan via kode lacak |
| `GET` | `/api/reports/verified` | — | sinyal publik laporan terverifikasi (tanpa PII) |
| `GET` | `/api/reports/triggers` | — | agregasi pemicu lingkungan terverifikasi per kecamatan |
| `GET` | `/api/reports` | ✓ | antrean verifikasi laporan warga lengkap |
| `PATCH` | `/api/reports/:id/review` | ✓ | putuskan verifikasi (`terverifikasi` / `ditolak` + alasan) |
| `GET` | `/api/reports/escalations` | ✓ | deteksi eskalasi S4 (volume, konsentrasi, antrean) |
| `POST` | `/api/auth/login` | — | masuk sesi petugas via cookie `httpOnly` |
| `POST` | `/api/auth/logout` | — | keluar & hapus sesi cookie |
| `GET` | `/api/auth/session` | — | informasi sesi aktif pengguna |
| `GET` | `/api/admin/sync-status` | — | riwayat pekerjaan ingest dataset terakhir |
| `GET` | `/api/admin/audit` | ✓ | jejak audit lengkap aktivitas petugas |
| `GET` | `/api/admin/citizen-signal` | ✓ | ringkasan sinyal warga untuk evaluasi retraining |
| `POST` | `/api/admin/import` | ✓ | preview validasi (dry-run) & commit impor CSV kasus |
| `POST` | `/api/admin/refresh` | ✓ | tarik ulang prediksi & evaluasi backtest |
| `POST` | `/api/admin/retrain` | ✓ | latih ulang model ML (peran admin/dinas) |
| `POST` | `/api/admin/maintenance` | ✓ | bersihkan sesi & job kedaluwarsa |
| `POST` | `/api/admin/demo/surge` | ✓ | suntikkan laporan simulasi bertanda untuk demo eskalasi |
| `GET` | `/api/admin/demo/surge` | ✓ | pantau status laporan simulasi tertanam |
| `DELETE` | `/api/admin/demo/surge` | ✓ | bersihkan seluruh laporan simulasi tanpa menyentuh data warga |

---

## Catatan Penempatan & Produksi

- **Frontend (Next.js 14):** Dapat di-deploy ke Vercel dengan konfigurasi `API_PROXY_TARGET` atau `NEXT_PUBLIC_API_URL`.
- **Backend Gateway (Express):** Dijalankan pada Node.js runtime (misalnya Render Web Service atau Docker) terhubung ke PostgreSQL Supabase via pooler session (port `5432`).
- **ML Services (FastAPI):** Dijalankan pada environment Python 3.12 dengan Uvicorn worker di Render / container compute instance.

---

## Dokumentasi

- [`docs/PRD.md`](./docs/PRD.md) — ruang lingkup produk, rubrik sebagai
  spesifikasi, arsitektur, kontrak API, roadmap, register risiko.
- [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md) — spesifikasi token desain
  "Buletin", skala tipografi, radius, elevasi, aturan cetak dokumen dinas.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — panduan alur kerja git, konvensi
  commit, dan standar penulisan kode.
