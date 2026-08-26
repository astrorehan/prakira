# PRAKIRA

**Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim — Kota Semarang**

DSDC ANFORCOM 2026 · Subtema 2: *Eco-Health Monitoring & Early Warning Platforms*

PRAKIRA memprediksi lonjakan kasus penyakit terkait iklim (DBD, ISPA, Diare) per
kecamatan **2–4 minggu ke depan**, lalu menerjemahkan prediksi itu menjadi daftar
tindakan berprioritas untuk Dinas Kesehatan dan Puskesmas.

Masalahnya: penanganan penyakit iklim bersifat reaktif — data kasus direkap
mingguan sampai bulanan, sehingga intervensi (fogging, PSN, klorinasi, logistik
obat) baru bergerak setelah kurva kasus naik. Padahal pemicu iklimnya — curah
hujan, suhu, kelembaban — sudah terukur 2–4 minggu sebelumnya.

Tiga lapis solusi:

1. **Prediksi** — model ML mempelajari hubungan lag antara cuaca historis dan
   kasus historis per kecamatan; menghasilkan skor risiko, kelas risiko, dan
   interval ketidakpastian.
2. **Aksi** — skor risiko otomatis diterjemahkan jadi rekomendasi intervensi
   berprioritas, bukan sekadar angka di dashboard.
3. **Umpan balik warga** — warga melaporkan gejala dan pemicu lingkungan,
   petugas puskesmas memverifikasi, laporan terverifikasi masuk sebagai fitur
   berbobot rendah ke model.

> PRAKIRA bukan alat diagnosis, bukan rekam medis, dan bukan pengganti
> surveilans resmi. Outputnya adalah estimasi risiko statistik untuk
> *decision support*.

---

## Arsitektur

```
┌──────────────────────┐
│  Next.js 14 (App)    │  SSR untuk dashboard, statis untuk portal publik
│  Tailwind + tokens   │  Leaflet (peta) · Recharts (grafik)
└──────────┬───────────┘
           │ REST/JSON
┌──────────▼───────────┐
│  Express.js Gateway  │  Auth, RBAC, CRUD, rate-limit, cron BMKG
└─────┬────────────┬───┘
      │            │
┌─────▼─────┐ ┌────▼──────────────┐
│PostgreSQL │ │ FastAPI ML Service│  /predict /retrain /backtest
│(+PostGIS) │ │ scikit-learn,     │
│           │ │ XGBoost, pandas   │
└───────────┘ └───────────────────┘
```

**Kenapa tiga layanan, bukan satu:** (a) pemisahan bahasa mengikuti pemisahan
keahlian tim, (b) proses training bisa memakan waktu menit dan tidak boleh
memblokir permintaan dashboard, (c) ML service bisa dimatikan atau diganti tanpa
menyentuh gateway — prediksi terakhir tetap tersaji dari database.

Justifikasi lengkap tiap pilihan teknologi dan kontrak API ada di
[`docs/PRD.md` §6](./docs/PRD.md).

---

## Isi repositori

```
prakira/
├─ docs/
│  ├─ PRD.md                # Product Requirements Document (sumber kebenaran)
│  └─ DESIGN-SYSTEM.md      # token warna, tipografi, spacing, aturan komponen
├─ frontend/                # Next.js 14 — lihat frontend/README.md
└─ CONTRIBUTING.md          # Panduan kontribusi dan alur pengembangan
```

| Layanan | Folder | Status | Port dev |
|---|---|---|---|
| Frontend | [`frontend/`](./frontend) | berjalan | `3000` |
| Express gateway | `gateway/` | belum diimplementasikan | `4200` |
| FastAPI ML service | `ml/` | belum diimplementasikan | `8000` |

Selama gateway dan ML service belum ada, frontend tetap bisa dijalankan dan
didemokan penuh: setiap pemanggilan API di `frontend/src/lib/api.ts` dibungkus
`try/catch` dengan fallback ke data mock Kota Semarang di
`frontend/src/lib/mock-data.ts`.

---

## Menjalankan

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:3000. Detail konfigurasi, skrip npm, dan peta folder ada
di [`frontend/README.md`](./frontend/README.md).

---

## Dokumentasi

- [`docs/PRD.md`](./docs/PRD.md) — ruang lingkup produk, rubrik sebagai
  spesifikasi, arsitektur, kontrak API, roadmap, register risiko.
- [`docs/DESIGN-SYSTEM.md`](./docs/DESIGN-SYSTEM.md) — token desain, skala
  tipografi, aturan komponen; ditulis agar bisa dipetakan 1:1 ke Figma
  Variables.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — panduan alur kerja git, konvensi commit,
  dan standar penulisan kode.
