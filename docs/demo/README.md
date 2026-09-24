# Persiapan live demo 4 peran (kasus Tugu)

Jalankan sekali sebelum gladi dan sekali lagi sebelum naik panggung:

```bash
npm run demo:prep
```

Skrip ini aman diulang. Yang disiapkan:

| Kebutuhan naskah | Hasil `demo:prep` |
| --- | --- |
| Akun puskesmas wilayah Tugu | `puskesmas.tugu@prakira.id` / `puskesmas123` (Puskesmas Mangkang) |
| Tugas di "Tugas Saya" | "Abatisasi titik genangan rawan rob" (PSN/DBD) dengan checklist SOP 6 langkah, sudah ditugaskan Dinkes ke Tugu. Bila tugas ini sudah diterima atau diselesaikan saat gladi, skrip membuatnya ulang dalam keadaan baru. |
| Rekap kasus yang masuk ke admin | Rekap Tugu Okt–Des 2025 (DBD, leptospirosis, ISPA) tercatat diimpor oleh Puskesmas Mangkang. Kartu "Ingest terakhir" di `/admin` menampilkan `impor-csv-ispa`, dan jejak audit memuat "Impor CSV kasus ISPA". Angkanya sama dengan dataset, jadi prakiraan tidak berubah. |

Di akhir, skrip mencetak status risiko Tugu dan laporan Tugu yang masih ada di antrean puskesmas. Selesaikan laporan itu saat gladi supaya di antrean hanya ada laporan live.

## Berkas CSV untuk Babak 2

- `rekap-tugu-ispa.csv`: pakai yang ini. Angka ISPA Tugu 1.971 / 2.100 / 1.685.
- `rekap-tugu-dbd.csv`, `rekap-tugu-leptospirosis.csv`: cadangan, berisi nol.

Di `/kasus`, tab impor CSV: pilih penyakit **ISPA**, lalu unggah `rekap-tugu-ispa.csv`. Pratinjau akan menunjukkan 3 baris valid dan 0 baris diganti. Kalau sempat, klik impor: kartu admin di Babak 4 akan menampilkan impor yang baru saja terjadi.

Akun puskesmas terkunci di Tugu. CSV berisi kecamatan lain akan ditolak per baris.
