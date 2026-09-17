# Panduan Kontribusi PRAKIRA

Panduan berkontribusi pada **PRAKIRA** (*Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim — Kota Semarang*). Dokumen ini memuat standar teknis, alur pengembangan, konfigurasi lingkungan lokal, serta konvensi kode untuk seluruh kontributor agar kolaborasi berjalan terstruktur, andal, dan selaras dengan arsitektur sistem.

---

## Daftar Isi

1. [Prinsip & Batasan Sistem](#prinsip--batasan-sistem)
2. [Arsitektur Layanan](#arsitektur-layanan)
3. [Alur Pengembangan (Workflow Git)](#alur-pengembangan-workflow-git)
4. [Konvensi Pesan Commit](#konvensi-pesan-commit)
5. [Pengaturan Lingkungan Lokal](#pengaturan-lingkungan-lokal)
   - [Prasyarat](#prasyarat)
   - [Langkah 1: Setup Layanan ML (Python 3.12)](#langkah-1-setup-layanan-ml-python-312)
   - [Langkah 2: Pasang Dependensi Node](#langkah-2-pasang-dependensi-node)
   - [Langkah 3: Konfigurasi Environment Variables](#langkah-3-konfigurasi-environment-variables)
   - [Langkah 4: Seeding Basis Data](#langkah-4-seeding-basis-data)
   - [Langkah 5: Menjalankan Aplikasi](#langkah-5-menjalankan-aplikasi)
6. [Standar Penulisan Kode](#standar-penulisan-kode)
   - [Frontend (Next.js 15 App Router)](#1-frontend-nextjs-15-app-router)
   - [Backend Gateway (Express & TypeScript)](#2-backend-gateway-express--typescript)
   - [ML Services (FastAPI & Python)](#3-ml-services-fastapi--python)
   - [Integritas Data & Privasi (PRD §8)](#4-integritas-data--privasi-prd-8)
7. [Daftar Periksa & Validasi Pull Request](#daftar-periksa--validasi-pull-request)
8. [Dokumen Acuan & Bantuan](#dokumen-acuan--bantuan)

---

## Prinsip & Batasan Sistem

Sebelum mulai menulis kode, pahami batasan fundamental PRAKIRA:

- **Bukan Alat Diagnosis:** PRAKIRA menghasilkan estimasi risiko statistik tingkat kecamatan untuk mendukung pengambilan keputusan (*decision support*) bagi Dinas Kesehatan, puskesmas, dan edukasi warga — bukan pengganti diagnosis medis dan bukan rekam medis.
- **Kejujuran Data (Anti-Mocking):** Jangan pernah membuat jalur cadangan (*silent fallback*) yang mengisi layar dengan data karangan. Jika data belum tersedia atau layanan ML tidak terjangkau, sistem wajib jujur menampilkan keadaan kosong, data tidak memadai (`insufficient`), atau `stale` (PRD §7-H1/H2, §8).
- **Desain Otentik (Tanpa Template):** Identitas visual PRAKIRA dibangun di atas Design System **"Buletin"** dengan token semantik mandiri, tanpa menggunakan template instan atau hue di luar palet resmi (`docs/DESIGN-SYSTEM.md`).

---

## Arsitektur Layanan

PRAKIRA dirancang dengan arsitektur 3 layanan terpisah untuk memisahkan beban komputasi analitik, logika bisnis, dan antarmuka pengguna:

```
┌──────────────────────────────────────────────────────────┐
│                 Frontend — Next.js 15                    │
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
│   Tabel Kasus, Iklim, Audit │ │  Port: 8001 · Ensemble   │
└─────────────────────────────┘ └──────────────────────────┘
```

| Direktori | Layanan | Port Dev | Teknologi Utama |
|---|---|---|---|
| [`frontend/`](./frontend) | Portal Warga & Konsol Dinas | `3000` | Next.js 15, React 18, Tailwind CSS, Lucide, Leaflet, Recharts |
| [`backend/`](./backend) | API Gateway & Orchestrator | `4200` | Express, TypeScript, Node.js, PostgreSQL (Supabase `pg`) |
| [`ml-services/`](./ml-services) | Engine Prediksi & Backtest | `8001` | FastAPI, Uvicorn, Python 3.12, Scikit-Learn, XGBoost, Pandas |

---

## Alur Pengembangan (Workflow Git)

1. **Clone Repositori**
   ```bash
   git clone https://github.com/astrorehan/prakira.git
   cd prakira
   ```

2. **Sinkronisasi Branch Aktif**
   ```bash
   git checkout experimental
   git pull origin experimental
   ```

3. **Buat Branch Fitur / Perbaikan**
   Gunakan awalan branch yang sesuai:
   - `feat/nama-fitur` — untuk penambahan fungsionalitas baru
   - `fix/nama-bug` — untuk perbaikan galat atau kerusakan
   - `refactor/area-kode` — untuk restrukturisasi kode tanpa mengubah fungsionalitas
   - `docs/judul-dokumen` — untuk pembaruan dokumentasi
   - `chore/nama-tugas` — untuk pemeliharaan dependensi, konfigurasi, atau tooling

   Contoh:
   ```bash
   git checkout -b feat/layer-pemicu-lingkungan
   ```

4. **Kembangkan, Uji, dan Commit**
   Pastikan seluruh pengujian lokal lolos sebelum melakukan push.

---

## Konvensi Pesan Commit

Proyek ini menerapkan standar **Conventional Commits**:

```
<tipe>(<lingkup-opsional>): <deskripsi ringkas dan jelas>
```

### Tipe Commit:
- `feat`: Penambahan fitur atau kapabilitas baru.
- `fix`: Perbaikan bug atau galat logika.
- `docs`: Perubahan atau pembaruan dokumentasi.
- `style`: Penyesuaian pemformatan kode (spasi, linting) tanpa mengubah logika.
- `refactor`: Pengubahan struktur kode tanpa mengubah fungsionalitas eksternal.
- `perf`: Optimasi performa atau efisiensi komputasi.
- `test`: Penambahan atau pembaruan berkas pengujian.
- `chore`: Tugas pemeliharaan build script, paket dependensi, atau konfigurasi.

### Contoh:
- `feat(map): tambah layer agregasi pemicu lingkungan terverifikasi`
- `fix(gateway): buka port http listener sebelum pemanasan cache prediksi`
- `docs(prd): perbarui kontrak response endpoint /api/reports/triggers`
- `refactor(ml): rapikan pipeline ensemble blending untuk model ispa`

---

## Pengaturan Lingkungan Lokal

### Prasyarat
- **Node.js**: Versi `>= 22.5.0`
- **Python**: Versi `3.12.x`
- **npm**: Versi `>= 10.0.0`
- **Git**

---

### Langkah 1: Setup Layanan ML (Python 3.12)

1. Masuk ke direktori `ml-services/` atau buat *virtual environment* langsung dari root:
   ```bash
   python -m venv ml-services/.venv
   ```

2. Pasang pustaka dependensi:
   - **Windows (PowerShell):**
     ```powershell
     .\ml-services\.venv\Scripts\pip install -r ml-services/requirements.txt
     ```
   - **Linux / macOS:**
     ```bash
     ./ml-services/.venv/bin/pip install -r ml-services/requirements.txt
     ```

3. *(Opsional)* Latih ulang model bila scikit-learn mengalami perbedaan versi:
   ```powershell
   .\ml-services\.venv\Scripts\python -m training.train --disease all
   ```

---

### Langkah 2: Pasang Dependensi Node

Pasang dependensi untuk `backend` dan `frontend` sekaligus dari root:
```bash
npm run install:all
```

---

### Langkah 3: Konfigurasi Environment Variables

Salin template variabel lingkungan:

```bash
# Backend Gateway
cp backend/.env.example backend/.env

# Frontend Next.js
cp frontend/.env.local.example frontend/.env.local
```

#### Variabel Inti di `backend/.env`:
- `DATABASE_URL`: Connection string PostgreSQL Supabase (*Session Pooler* port `5432`).
- `ML_SERVICE_URL`: Alamat layanan ML (default lokal: `http://127.0.0.1:8001`).
- `CORS_ORIGINS`: Daftar origin yang diizinkan (default: `http://localhost:3000,http://127.0.0.1:3000`).
- `SEED_ADMIN_EMAIL` & `SEED_ADMIN_PASSWORD`: Akun awal dinas untuk login konsol.

#### Variabel Inti di `frontend/.env.local`:
- `API_PROXY_TARGET`: Target proxy gateway untuk rute `/api/*` (default: `http://127.0.0.1:4200`).

---

### Langkah 4: Seeding Basis Data

Pastikan skema dan data observasi iklim & penyakit terisi di basis data:
```bash
npm run seed
```

---

### Langkah 5: Menjalankan Aplikasi

#### Opsi A: Menjalankan Seluruh Layanan Sekaligus (Direkomendasikan)
Gunakan runner otomatis di [`scripts/dev.mjs`](./scripts/dev.mjs) yang mengorkestrasi startup berurutan dan pembersihan proses:
```bash
npm run dev
```

Runner akan menyalakan:
- `[ml]` di `http://127.0.0.1:8001`
- `[gateway]` di `http://localhost:4200`
- `[frontend]` di `http://localhost:3000`

#### Opsi B: Menjalankan Secara Modular (Terminal Terpisah)
Bila ingin mengisolasi log atau mendebug layanan tertentu:

1. **Terminal 1 — Layanan ML:**
   ```powershell
   cd ml-services
   .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```
2. **Terminal 2 — Backend Gateway:**
   ```powershell
   npm run dev:backend
   ```
3. **Terminal 3 — Frontend:**
   ```powershell
   npm run dev:frontend
   ```

---

## Standar Penulisan Kode

### 1. Frontend (Next.js 15 App Router)
- **TypeScript Ketat:** Hindari tipe `any`. Seluruh struktur data wajib didefinisikan di [`frontend/src/types/`](./frontend/src/types).
- **Pengambilan Data & State:** Gunakan hook `useApi` dan bungkus komponen data dengan `<DataState>` agar menangani 4 kondisi: `loading`, `error`, `empty`, dan `data` secara konsisten.
- **Desain Semantik:** Rujuk [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md). Jangan gunakan nilai *hardcoded hex* di kelas Tailwind atau inline styles.
- **Peta Spasial (Leaflet):** Komponen peta Leaflet harus dimuat menggunakan `next/dynamic` dengan opsi `{ ssr: false }` untuk mencegah galat window/DOM di sisi server.

### 2. Backend Gateway (Express & TypeScript)
- **Abstraksi Basis Data:** Gunakan fungsi pembungkus di [`backend/src/db/index.ts`](./backend/src/db/index.ts) (`db()`, `all()`, `one()`, `run()`, `transaction()`). Placeholder query ditulis dengan `?` dan diterjemahkan otomatis ke `$1..$n` oleh `toPg()`.
- **Penanganan Galat:** Gunakan wrapper `asyncRoute` untuk rute Express dan lempar error yang sesuai agar ditangkap oleh `errorHandler`.
- **Autentikasi & Keamanan:** Sesi dikelola via cookie `httpOnly` dengan *signature HMAC* aman. Seluruh endpoint mutasi wajib diverifikasi melalui middleware `requireAuth`.

### 3. ML Services (FastAPI & Python)
- **Skema Validasi:** Gunakan model Pydantic di `app/schemas/` untuk validasi parameter request dan response.
- **Ensemble Blending:** Penambahan algoritma baru harus diintegrasikan melalui modul `training/ensemble.py` dan memperbarui `metadata.json`.
- **Proteksi Endpoint Sensitif:** Endpoint yang mengubah state seperti `/retrain` wajib dilindungi oleh header token `x-ml-token`.

### 4. Integritas Data & Privasi (PRD §8)
- **Laporan Warga:** Dilarang memfabrikasi atau mengekspos koordinat GPS presisi milik warga secara publik. Agregasi sinyal pemicu lingkungan hanya disajikan pada tingkat agregat kecamatan.
- **Ketidakpastian Model:** Tampilkan nilai prediksi lengkap dengan interval batas bawah (`lower_bound`), batas atas (`upper_bound`), dan tingkat cakupan data (`data_coverage`).

---

## Daftar Periksa & Validasi Pull Request

Sebelum mengajukan Pull Request, pastikan seluruh pengujian berikut lolos tanpa peringatan (*zero errors/warnings*):

```bash
# 1. Validasi tipe data TypeScript (Backend & Frontend)
npm run type-check

# 2. Pemeriksaan kualitas & formatting kode ESLint
npm run lint

# 3. Validasi build produksi (Backend & Static Pages Next.js)
npm run build
```

### Checklist Pengajuan:
- [ ] Seluruh skrip validasi (`type-check`, `lint`, `build`) berhasil dieksekusi tanpa galat.
- [ ] Tidak ada berkas rahasia (`.env`, `.env.local`, file kredensial) yang masuk ke *staging git*.
- [ ] Tidak ada `console.log` sisa debugging atau data mock tersembunyi.
- [ ] Deskripsi PR menjelaskan konteks perubahan, motivasi, dan langkah pengujian manual.

---

## Dokumen Acuan & Bantuan

- **[`docs/PRD.md`](./docs/PRD.md)** — Spesifikasi produk lengkap, rubrik kompetisi, arsitektur data, dan kontrak API.
- **[`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md)** — Spesifikasi token warna, tipografi, radius, elevasi, dan panduan visual "Buletin".
- **[`README.md`](./README.md)** — Ringkasan umum proyek dan petunjuk awal.

Jika menemukan kendala atau ingin mendiskusikan usulan arsitektur baru, silakan buka [GitHub Issues](https://github.com/astrorehan/prakira/issues) atau diskusikan bersama tim pengembang PRAKIRA.
