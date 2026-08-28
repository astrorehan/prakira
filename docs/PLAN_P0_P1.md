# Rencana Eksekusi: P0 Bug Fix & P1 Fitur Nilai Tinggi (Environmental Triggers & Buletin Resmi)

Dokumen ini mencatat rencana aksi terstruktur untuk iterasi **P0** dan **P1** pada platform **PRAKIRA** (DSDC ANFORCOM 2026), dengan mematuhi prinsip arsitektur sistem, privasi data (PRD §8), dan tanpa melakukan *hardcoding*.

---

## 1. Sasaran & Batasan Arsitektur

1. **P0 (Pemblokir Utama):** Memperbaiki dan menyempurnakan `frontend/src/components/choropleth-map.tsx` yang mengalami kerusakan sintaksis pada deklarasi signature dan tag JSX penutup.
2. **P1.A (Layer Pemicu Lingkungan / Environmental Triggers):** Menghubungkan laporan warga (`laporan_warga`) dengan peta dan panel analitik melalui agregasi sinyal pemicu terverifikasi (jentik, genangan, sampah, saluran) per kecamatan secara dinamis tanpa fabrikasi koordinat GPS palsu (menjaga privasi PRD §8 dan integritas data).
3. **P1.B (Mesin Cetak Buletin Resmi SKDR):** Membangun halaman cetak buletin resmi eksekutif di rute `/buletin` berbasis native CSS `@media print` dengan kop Pemerintah Kota Semarang, matriks wilayah prioritas, instruksi tindakan intervensi dari mesin aturan, dan lembar otorisasi dinas.
4. **Anti-Hardcoding:** Seluruh data mengalir dinamis dari endpoint backend (`/api/districts`, `/api/reports/triggers`, `/api/actions`, `/api/meta/period`).

---

## 2. Rencana Perubahan Komponen

### A. Backend Services & Routes
1. **`backend/src/services/reports.ts`**:
   - Tambahkan fungsi `getTriggerSummaryByDistrict()` untuk mengelompokkan laporan terverifikasi berdasarkan kecamatan dan jenis pemicu (`kind`).
2. **`backend/src/routes/reports.ts`**:
   - Tambahkan endpoint publik `GET /api/reports/triggers`.
3. **`backend/src/db/seed.ts`**:
   - Tambahkan `seedSampleReports()` agar database terisi contoh laporan lingkungan terverifikasi yang realistis di kecamatan Semarang saat `npm run seed`.

### B. Frontend Contracts & API Client
1. **`frontend/src/types/index.ts`**:
   - Tambahkan tipe `DistrictTriggerSummary`.
2. **`frontend/src/lib/api.ts`**:
   - Tambahkan fungsi `fetchTriggerSummary()`.

### C. P0 & P1.A - Peta & Panel Detail
1. **`frontend/src/components/choropleth-map.tsx`**:
   - Perbaiki signature fungsi, prop typing, dan penutup JSX.
   - Tambahkan layer marker agregasi pemicu lingkungan dengan tombol toggle layer.
   - Tampilkan informasi pemicu terverifikasi pada tooltip kecamatan.
2. **`frontend/src/components/district-detail-panel.tsx`**:
   - Tambahkan kartu ringkasan sinyal pemicu lingkungan terverifikasi per kecamatan.
3. **`frontend/src/app/dashboard/page.tsx`**:
   - Hubungkan pengambilan data trigger summary dan tambahkan tombol aksi cepat *"Cetak Buletin Resmi"*.

### D. P1.B - Halaman Buletin Resmi Siap Cetak
1. **`frontend/src/app/buletin/page.tsx`**:
   - Layout dokumen resmi SKDR dengan kop surat Dinas Kesehatan Kota Semarang.
   - Ringkasan KPI eksekutif, tabel kecamatan prioritas merah, dan checklist SOP aksi intervensi.
   - Desain print CSS presisi ukuran A4 tanpa glitch, tombol cetak `window.print()`, dan mode kembali ke dashboard.

---

## 3. Rencana Verifikasi
- `npm run type-check` (backend & frontend)
- `npm run lint`
- `npm run build`
- Verifikasi visual & print preview

