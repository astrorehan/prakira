# Panduan Kontribusi PRAKIRA

Terima kasih atas minat Anda untuk berkontribusi pada PRAKIRA (Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim — Kota Semarang). Dokumen ini berisi panduan, konvensi, dan alur kerja yang perlu diikuti oleh seluruh kontributor agar kolaborasi berjalan terstruktur dan efisien.

---

## Daftar Isi

1. [Prinsip dan Batasan Proyek](#prinsip-dan-batasan-proyek)
2. [Cara Berkontribusi](#cara-berkontribusi)
3. [Alur Pengembangan (Workflow)](#alur-pengembangan-workflow)
4. [Konvensi Pesan Commit](#konvensi-pesan-commit)
5. [Pengaturan Lingkungan Lokal](#pengaturan-lingkungan-lokal)
6. [Standar Penulisan Kode](#standar-penulisan-kode)
7. [Proses Pengajuan Pull Request](#proses-pengajuan-pull-request)
8. [Bantuan dan Diskusi](#bantuan-dan-diskusi)

---

## Prinsip dan Batasan Proyek

Sebelum memulai, mohon perhatikan beberapa hal mendasar terkait ruang lingkup sistem:

- PRAKIRA berfokus pada prediksi risiko berbasis iklim dan rekomendasi tindakan intervensi dini untuk dinas kesehatan, puskesmas, serta edukasi publik.
- PRAKIRA bukan alat diagnosis klinis, bukan rekam medis elektronik, dan bukan pengganti sistem surveilans resmi pemerintah.
- Seluruh keputusan arsitektur dan fungsionalitas harus selaras dengan dokumen acuan:
  - `docs/PRD.md`: Spesifikasi produk, alur logika, kontrak API, dan register risiko.
  - `docs/DESIGN-SYSTEM.md`: Token warna, tipografi, jarak, dan aturan komponen UI.

---

## Cara Berkontribusi

Anda dapat berkontribusi melalui beberapa cara:

1. **Melaporkan Masalah (Bug Report)**: Jika menemukan galat atau perilaku tak terduga, buat Issue baru dengan menyertakan langkah reproduksi, lingkungan (OS/browser), dan hasil yang diharapkan.
2. **Mengusulkan Fitur Baru**: Ajukan ide fitur melalui Issue dengan menjelaskan latar belakang kebutuhan, target pengguna, dan skenario pemanfaatan.
3. **Memperbaiki atau Menambah Dokumentasi**: Dokumentasi yang jelas sangat penting. Koreksi salah ketik, perbaikan panduan teknis, dan klarifikasi PRD selalu disambut baik.
4. **Mengirimkan Kode (Pull Request)**: Perbaikan bug, peningkatan performa, atau penambahan fitur sesuai roadmap.

---

## Alur Pengembangan (Workflow)

1. **Fork atau Clone Repositori**
   ```bash
   git clone https://github.com/astrorehan/prakira.git
   cd prakira
   ```

2. **Sinkronisasi Branch Utama**
   Pastikan branch dasar Anda mutakhir sebelum membuat branch baru.
   ```bash
   git checkout experimental
   git pull origin experimental
   ```

3. **Buat Branch Baru**
   Gunakan format penamaan branch berikut:
   - `feat/nama-fitur`: untuk penambahan fitur baru
   - `fix/nama-bug`: untuk perbaikan bug
   - `refactor/area-perubahan`: untuk restrukturisasi kode tanpa mengubah fungsionalitas
   - `docs/judul-dokumen`: untuk pembaruan dokumentasi
   - `chore/nama-tugas`: untuk tugas pemeliharaan dependensi atau konfigurasi

   Contoh:
   ```bash
   git checkout -b feat/triage-rekomendasi
   ```

4. **Lakukan Perubahan dan Pengujian**
   Terapkan perubahan kode secara bertahap dan jalankan pengujian lokal.

5. **Commit dan Push ke Remote**
   ```bash
   git add .
   git commit -m "feat(dashboard): tambah filter multi-kecamatan pada peta choropleth"
   git push origin feat/triage-rekomendasi
   ```

---

## Konvensi Pesan Commit

Proyek ini menerapkan standar **Conventional Commits**:

Format:
```
<tipe>(<lingkup-opsional>): <deskripsi singkat dalam bahasa indonesia atau inggris yang jelas>
```

Tipe yang digunakan:
- `feat`: Penambahan fitur baru.
- `fix`: Perbaikan bug atau galat logika.
- `docs`: Perubahan atau penambahan dokumentasi.
- `style`: Penyesuaian pemformatan kode (spasi, titik koma) tanpa mengubah logika.
- `refactor`: Pengubahan struktur kode internal tanpa mengubah perilaku eksternal.
- `perf`: Optimasi performa.
- `test`: Penambahan atau penyesuaian unit/integration test.
- `chore`: Pemeliharaan build script, dependensi, atau konfigurasi tooling.

Contoh pesan commit yang baik:
- `feat(analitik): implementasi scatter plot korelasi iklim dinamis`
- `fix(map): perbaiki rendering tooltip pada kecamatan dengan risiko tinggi`
- `docs: perbarui spesifikasi kontrak endpoint pada PRD`
- `refactor(lib): rapikan fungsi transformasi data prediksi`

---

## Pengaturan Lingkungan Lokal

### Prasyarat
- Node.js versi 18.17 atau lebih baru
- npm versi 9 atau lebih baru
- Git

### Menjalankan Frontend
Layanan antarmuka web berada di dalam direktori `frontend/`.

1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```

2. Pasang seluruh dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan pada `http://localhost:3000`.

4. Skrip npm yang tersedia:
   - `npm run dev`: Menjalankan development server.
   - `npm run build`: Memvalidasi dan membuat build produksi.
   - `npm run lint`: Menjalankan pemeriksaan ESLint.
   - `npm run type-check`: Menjalankan validasi tipe data TypeScript (`tsc --noEmit`).

---

## Standar Penulisan Kode

### 1. Frontend (Next.js & React)
- **Struktur Halaman**: Menggunakan App Router (`src/app/`).
- **TypeScript Ketat**: Hindari penggunaan tipe `any`. Selalu definisikan tipe/antarmuka data di `src/types/` atau di modul terkait.
- **Design System & Tailwind**:
  - Gunakan token warna semantik yang telah ditentukan (`bg-brand-moss`, `text-slate-900`, dll.).
  - Jangan menulis inline styles kecuali untuk perhitungan posisi dinamis yang tidak memungkinkan lewat kelas Tailwind.
  - Rujuk aturan pada `docs/DESIGN-SYSTEM.md`.
- **Komponen UI**:
  - Komponen generik ditempatkan di `src/components/ui/`.
  - Komponen berbasis domain (peta, KPI, filter) ditempatkan di direktori komponen yang sesuai.
- **Fallback Data Mock**:
  - Seluruh integrasi API di `src/lib/api.ts` harus menyediakan penanganan `try/catch` dengan fallback ke `src/lib/mock-data.ts` agar antarmuka tetap dapat diuji saat gateway belum aktif.

### 2. Backend & Layanan ML (Masa Depan)
- **Express Gateway (`gateway/`)**: Mengikuti kontrak rute REST dan autentikasi yang tercantum di PRD.
- **FastAPI ML Service (`ml/`)**: Menjaga isolasi komputasi model prediksi, format input/output JSON terstandar, dan menyertakan validasi Pydantic.

---

## Proses Pengajuan Pull Request

Sebelum membuat Pull Request (PR), pastikan Anda telah menyelesaikan daftar periksa berikut:

1. **Pemeriksaan Kualitas Kode**:
   Jalankan perintah berikut di dalam direktori `frontend/` dan pastikan tidak ada error:
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

2. **Kebersihan Kode**:
   - Hapus `console.log`, komentar sementara, dan kode eksperimen yang tidak terpakai.
   - Pastikan tidak ada file rahasia (seperti `.env.local` atau kredensial) yang tidak sengaja ter-commit.

3. **Membuat Pull Request**:
   - Buat PR yang mengarah ke branch `experimental` (atau branch default yang aktif).
   - Berikan judul PR yang deskriptif dan ringkas.
   - Jelaskan latar belakang perubahan, daftar perubahan teknis, dan petunjuk pengujian manual yang dapat dilakukan reviewer.
   - Cantumkan nomor issue yang diselesaikan jika ada (misal: `Closes #12`).

4. **Tinjauan Kode (Code Review)**:
   - Pengelola repositori akan meninjau perubahan Anda.
   - Tanggapi umpan balik secara konstruktif dan lakukan commit perbaikan jika diperlukan.

---

## Bantuan dan Diskusi

Jika Anda memiliki pertanyaan seputar arsitektur, menemukan ketidaksesuaian spesifikasi, atau membutuhkan bantuan teknis:
- Buka thread diskusi atau Issue baru di repositori GitHub ini.
- Diskusikan rancangan fitur terlebih dahulu sebelum menulis perubahan besar agar selaras dengan roadmap proyek.
