# PRAKIRA — Product Requirements Document

**Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim**
DSDC ANFORCOM 2026 · Subtema 2: *Eco-Health Monitoring & Early Warning Platforms*

| | |
|---|---|
| Versi | 1.0 |
| Tanggal | 24 Agustus 2026 |
| Status | Aktif — mengikat untuk sprint babak penyisihan |
| Pemilik dokumen | Tim PRAKIRA |
| Dokumen turunan | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) |

---

## 0. Kondisi Kritis (baca duluan)

| Tenggat | Tanggal | Sisa waktu dari 24 Agu 2026 |
|---|---|---|
| Pendaftaran Gelombang 2 ditutup | **24 Agustus 2026, 23.59 WIB** | **hari ini** |
| Batas akhir proposal + repo + video | **31 Agustus 2026, 23.59 WIB** | **7 hari** |
| Pengumuman finalis | 16 September 2026 | — |
| Technical Meeting | 22 September 2026 | — |
| Final offline (Undip, Semarang) | 26 September 2026 | — |

Konsekuensi langsung ke PRD ini:

1. Scope babak penyisihan **dikunci** di §4. Apa pun di luar `MUST` tidak dikerjakan sebelum 31 Agustus.
2. Rubrik penilaian (§2) adalah spesifikasi produk yang sesungguhnya. Setiap fitur di §5 wajib punya kolom "kontribusi rubrik".
3. Rulebook §7.9 mewajibkan **prototype dibuat di Figma**. Ini bukan opsional. Design system di [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) ditulis agar bisa dipindahkan ke Figma Variables 1:1.
4. Rulebook §8.1 melarang **menjiplak desain yang sudah ada**. Identitas visual PRAKIRA karena itu dibangun dari token sendiri — bukan hasil recolor template mana pun. Lihat §11-R7.

---

## 1. Ringkasan Produk

**Satu kalimat.** PRAKIRA memprediksi lonjakan kasus penyakit terkait iklim per kecamatan 2–4 minggu ke depan, lalu mengubah prediksi itu menjadi daftar tindakan berprioritas untuk Dinas Kesehatan dan Puskesmas.

**Masalah.** Penanganan penyakit iklim di kota Indonesia bersifat reaktif: data kasus direkap periodik (mingguan–bulanan), sehingga intervensi (fogging, PSN, klorinasi, logistik obat) baru bergerak setelah kurva kasus naik. Padahal pemicu iklimnya — curah hujan, suhu, kelembaban — sudah terukur 2–4 minggu sebelumnya.

**Solusi.** Tiga lapis:

1. **Prediksi** — model ML belajar hubungan lag antara cuaca historis dan kasus historis per kecamatan, menghasilkan skor risiko + kelas risiko + interval ketidakpastian.
2. **Aksi** — skor risiko diterjemahkan otomatis menjadi rekomendasi intervensi berprioritas, bukan sekadar angka di dashboard.
3. **Umpan balik warga** — warga melapor gejala/pemicu lingkungan, petugas puskesmas memverifikasi, laporan terverifikasi masuk sebagai fitur berbobot rendah ke model. Ini menutup lag data resmi.

**Bukan apa.** PRAKIRA bukan alat diagnosis, bukan rekam medis, bukan pengganti surveilans resmi. Output adalah estimasi risiko statistik untuk *decision support*. Pernyataan ini wajib muncul di UI, bukan hanya di proposal (§7).

---

## 2. Rubrik sebagai Spesifikasi

Bobot penilaian babak penyisihan (Rulebook §8.3):

| Kriteria | Bobot | Implikasi produk |
|---|---:|---|
| Impact Projection | **20%** | Butuh angka baseline nyata Kota Semarang + estimasi konservatif. §9 |
| Progres & Validasi Implementasi | **20%** | Fitur inti harus benar-benar jalan, bukan mockup. §4, §5 |
| Kesesuaian Tema/Subtema | **15%** | Harus mengikat ke *Circular Economy* + *Eco-Health*, bukan hanya health. §3.3 |
| Originalitas & Kreativitas | **15%** | Diferensiator = loop warga→verifikasi→retraining + layer pemicu lingkungan. §5.6 |
| Format & Struktur Proposal | **10%** | A4, TNR 12, spasi 1.5, margin 4-3-3-3, maks 30 hal. |
| Video | **10%** | 3–7 menit, 720p+, wajah anggota tampil sepanjang video. |
| Metodologi Pengembangan | **10%** | Arsitektur & pemilihan teknologi harus dijustifikasi. §6 |

Bobot final (26 Sep): Presentasi 30%, Keberhasilan Implementasi 25%, Tanya Jawab 20%, Pameran 15%, **Code Project 10%** (struktur, keterbacaan, dokumentasi). Konsekuensi: kebersihan repo dinilai — lihat §11-R8.

**Prinsip turunan:** dua kriteria terbesar (40%) sama-sama menghukum *overclaim*. Maka **kejujuran adalah fitur produk**, bukan disclaimer. Semua tampilan angka wajib membawa ketidakpastian dan cakupan datanya (§7).

---

## 3. Keputusan yang Dikunci

Tiga keputusan yang di dokumen konsep masih terbuka. Ditutup di sini agar sprint tidak mandek.

### 3.1 Kota studi kasus: **Kota Semarang**

16 kecamatan, data Profil Kesehatan tersedia, stasiun BMKG memadai (Klimatologi Semarang, Maritim Tanjung Emas, Stasiun Ahmad Yani), dan lokasi final lomba di Undip Semarang — konteks lokal bisa diverifikasi juri secara langsung.

### 3.2 Cakupan penyakit: **DBD, ISPA, Diare, + Leptospirosis**

Tiga inti tetap. Penyakit keempat: **Leptospirosis**, bukan Malaria.

Alasan:
- Semarang adalah wilayah endemis leptospirosis dengan beban kasus tertinggi di Jawa Tengah; malaria di wilayah kota praktis nol sehingga tidak ada sinyal untuk dipelajari model.
- Leptospirosis terikat langsung ke **rob dan banjir** — karakteristik paling khas Semarang. Ini memenuhi tuntutan rulebook untuk "menghindari proyek generik (solusi klise tanpa konteks lokal)".
- Rantai kausalnya melewati sampah dan sanitasi (populasi tikus ↔ timbulan sampah ↔ genangan), sehingga menjadi jembatan tema ke *Circular Economy* (§3.3).

Batas jujur: leptospirosis punya jumlah kasus tahunan jauh lebih kecil dari DBD. Model untuk leptospirosis **wajib ditampilkan dengan interval ketidakpastian lebar** dan diberi label cakupan data rendah. Jangan disamakan tampilannya dengan DBD.

### 3.3 Pengikat tema Circular Economy

Subtema 2 sudah cukup untuk lolos syarat. Tapi kriteria "Kesesuaian Tema" (15%) menilai tema **besar** ANFORCOM — *Circular Economy for Eco-Health Cities*. Pengikatnya:

> Penyakit iklim di Semarang adalah **biaya eksternal dari kegagalan siklus material dan air**: sampah tak terkelola → genangan → habitat vektor & tikus; sanitasi buruk → kontaminasi air → diare & leptospirosis.

Implementasi konkret di produk (bukan retorika): **Layer Pemicu Lingkungan** (§5.6b) — laporan warga yang berisi foto genangan / timbunan sampah / saluran tersumbat dipetakan sebagai titik pemicu, dan diteruskan sebagai tiket ke unit kebersihan/lingkungan. Satu laporan warga bisa menghasilkan dua aksi: aksi kesehatan (fogging/edukasi) **dan** aksi lingkungan (angkut sampah / normalisasi saluran). Itulah loop sirkularnya, dan itu bisa didemokan.

---

## 4. Scope Babak Penyisihan (dikunci)

Target rulebook: progres **50–75%**. Bukan 100%. Membangun 100% fitur setengah matang lebih buruk daripada 60% fitur yang benar-benar jalan.

### MUST — harus jalan end-to-end sebelum 31 Agustus

| # | Fitur | Definisi "jalan" |
|---|---|---|
| M1 | Peta risiko kecamatan | 16 kecamatan Semarang, GeoJSON asli, fill mengikuti kelas risiko, klik → panel detail |
| M2 | Grafik tren aktual vs prediksi | Deret historis + horizon 4 minggu + pita ketidakpastian |
| M3 | Ranking kecamatan | Tabel terurut skor risiko, filter penyakit & periode |
| M4 | Rekomendasi tindakan | Aturan deterministik dari (kelas risiko × penyakit × pemicu iklim) |
| M5 | Portal warga (cek risiko) | Tanpa login, pilih kecamatan → status + edukasi sesuai level |
| M6 | Form laporan warga | Submit gejala + lokasi + waktu + foto opsional, dapat kode lacak |
| M7 | Antrian verifikasi petugas | Daftar laporan per wilayah, aksi Terima/Tolak + catatan |
| M8 | Halaman transparansi model | Metrik backtest (MAE/RMSE/akurasi kelas), cakupan data per kecamatan, batasan |
| M9 | Impor data admin | Upload CSV kasus + preview + validasi kolom |

### SHOULD — kerjakan jika M1–M9 selesai sebelum 29 Agustus

| # | Fitur |
|---|---|
| S1 | Layer pemicu lingkungan di peta (§5.6b) — **terkirim**: penanda laporan lingkungan terverifikasi per kecamatan, dapat dimatikan, mati secara bawaan (§5.15) |
| S2 | Ekspor laporan PDF/Excel — **terkirim**: CSV lewat `lib/export.ts`, dokumen dinas lewat lembar cetak `/tindakan/nota/[id]` (§5.10) |
| S3 | Grafik korelasi iklim–kasus (scatter + lag) |
| S4 | Eskalasi otomatis "perlu perhatian" saat laporan menumpuk — **terkirim**: tiga aturan ambang deterministik di `/verifikasi`, beserta kendali peragaan lonjakan (§5.14) |

### WON'T — eksplisit tidak dikerjakan untuk penyisihan

Login sungguhan dengan JWT + RBAC penuh (pakai role-switcher demo); OTP WhatsApp; notifikasi broadcast; LSTM/Prophet; PostGIS spasial lanjutan; sistem reputasi pelapor; A/B testing retraining otomatis (cukup ditunjukkan sebagai hasil backtest statis); multi-kota.

Cantumkan daftar WON'T ini di proposal bagian *Batasan Perangkat Lunak*. Menyebut batas secara eksplisit menaikkan skor "validitas & realistis"; menyembunyikannya menurunkannya.

---

## 5. Spesifikasi Fitur

Format tiap fitur: tujuan → pengguna → kriteria penerimaan → permukaan UI → kontribusi rubrik.

### 5.1 Dashboard Risiko (M1–M4)

**Pengguna.** Analis Dinas Kesehatan Kota, Kepala Puskesmas.

**Kriteria penerimaan.**
- Memilih penyakit (4 opsi) dan horizon (1/2/3/4 minggu) memperbarui peta, tabel, dan grafik dalam satu aksi — tidak ada state yang tertinggal.
- Setiap kecamatan menampilkan: skor risiko 0–100, kelas (Rendah/Sedang/Tinggi), prediksi kasus dengan batas bawah–atas, *incidence rate* per 100.000, delta vs minggu lalu, dan **indikator cakupan data**.
- Kecamatan tanpa data cukup ditampilkan sebagai `Data tidak memadai`, **bukan** sebagai "Risiko Rendah". Ini bug kepercayaan yang paling mudah ditemukan juri.
- Kelas risiko tidak boleh dikodekan hanya dengan warna: wajib ada label teks + ikon (WCAG 1.4.1).

**Permukaan UI.** `/dashboard` — grid 12 kolom: peta (kolom 1–7), panel ringkas + ranking (8–12), grafik tren membentang penuh di bawah.

**Rubrik.** Progres & Validasi (20%), Implementasi.

### 5.2 Rekomendasi Tindakan (M4)

**Tujuan.** Menutup jarak antara "angka" dan "apa yang harus saya lakukan Senin pagi".

**Mesin aturan (deterministik, bukan ML).** Input: kelas risiko, penyakit, pemicu iklim dominan, populasi, riwayat intervensi terakhir. Output: 1–3 tindakan berprioritas dengan target kecamatan, jenis aksi, dan alasan yang dapat dibaca.

Contoh keluaran yang diharapkan:

> **Prioritas Tinggi — Fogging fokus + PSN serentak**
> 3 kecamatan: Semarang Barat, Ngaliyan, Tembalang.
> Dasar: kelas risiko DBD Tinggi pada horizon 2 minggu, dipicu curah hujan kumulatif 3 minggu terakhir 214 mm (persentil 88 historis) dan kelembaban rata-rata 84%.
> Ketidakpastian: prediksi 41–68 kasus. Cakupan data kecamatan: tinggi.

**Kriteria penerimaan.** Setiap rekomendasi **wajib** menyertakan kalimat "Dasar:" yang menyebut variabel pemicunya. Rekomendasi tanpa alasan dilarang muncul.

**Rubrik.** Originalitas (15%), Impact Projection (20%) — karena inilah mekanisme yang mengubah prediksi jadi dampak.

### 5.3 Portal Warga (M5)

**Pengguna.** Warga Semarang, tanpa akun.

**Kriteria penerimaan.**
- Bisa dipakai tanpa login dan tanpa membaca istilah teknis. Tidak ada kata "MAE", "R²", "confidence interval" di permukaan ini.
- Pilih kecamatan → kartu status per penyakit + 3 tindakan pencegahan yang **berubah mengikuti level risiko** (level tinggi ≠ level rendah).
- Bahasa Indonesia sehari-hari, kalimat pendek. Target keterbacaan setara SD kelas 6.
- Banner permanen: "Ini perkiraan risiko wilayah, bukan diagnosis. Jika sakit, periksa ke fasilitas kesehatan."

**Permukaan UI.** `/warga` — memakai *surface* hangat (lihat Design System §Dual Surface), bukan tampilan konsol.

### 5.4 Laporan Warga (M6)

**Kriteria penerimaan.**
- Form ≤ 6 field: jenis keluhan/dugaan, kecamatan, kelurahan, waktu kejadian, deskripsi singkat, foto opsional.
- Submit → kode lacak (mis. `PKR-8F42C1`) yang bisa dicek di halaman status tanpa akun.
- Status yang terlihat pelapor: `Menunggu Verifikasi` → `Terverifikasi` / `Ditolak` (+ alasan).
- Rate limit: maks 3 laporan per perangkat per 24 jam. Ditolak dengan pesan jelas, bukan error diam.
- Foto di-strip EXIF sebelum disimpan (lokasi presisi tidak ikut tersimpan).
- Data pelapor tidak wajib. Jika diisi, disimpan terpisah dari payload yang dipakai model.

**Rubrik.** Originalitas (15%).

### 5.5 Antrian Verifikasi Petugas (M7)

**Kriteria penerimaan.**
- Petugas hanya melihat laporan di wilayah tugasnya.
- Keputusan satu klik (Terima / Tolak) + catatan singkat opsional. Target < 15 detik per laporan — beban kerja tambahan adalah risiko adopsi nyata (§11-R5).
- Laporan diterima → ditandai `Terverifikasi` dengan **bobot kepercayaan** berbeda dari data resmi dinas, dan ini terlihat di UI.
- Aksi tercatat di audit trail (siapa, kapan, apa).

### 5.6 Umpan Balik ke Model — diferensiator utama

**a. Loop retraining.** Laporan `Terverifikasi` diagregasi per kecamatan/minggu menjadi fitur tambahan `citizen_signal_w`, terpisah dari `official_cases_w`, dengan bobot lebih rendah. Endpoint `/retrain` menerima parameter `include_citizen: bool`.

**Kriteria penerimaan untuk penyisihan.** Tidak perlu retraining otomatis. Yang **wajib ada**: halaman perbandingan backtest `dengan sinyal warga` vs `tanpa sinyal warga` pada data yang sama, menampilkan MAE/RMSE kedua varian secara apa adanya — **termasuk bila sinyal warga tidak membantu**. Jika hasilnya netral atau memburuk, tampilkan dan jelaskan. Ini justru menaikkan skor validitas.

**b. Layer Pemicu Lingkungan (S1).** Laporan warga bertipe *pemicu lingkungan* (genangan, timbunan sampah, saluran tersumbat) dipetakan sebagai titik terpisah dari titik kasus, dan menghasilkan tiket ke unit lingkungan. Inilah pengikat *Circular Economy* yang bisa didemokan (§3.3).

### 5.7 Transparansi Model (M8)

Halaman `/model` — bukan halaman "tentang kami". Isi wajib:

| Blok | Isi |
|---|---|
| Ringkasan model | Algoritma, fitur, periode latih, tanggal latih terakhir |
| Performa | MAE, RMSE, akurasi klasifikasi kelas, per penyakit — bukan satu angka gabungan |
| Backtest | Grafik prediksi vs aktual pada periode uji, dengan garis pemisah train/test |
| Cakupan data | Peta/tabel kelengkapan data per kecamatan (tinggi/sedang/rendah) |
| Batasan | Daftar eksplisit dari §7 |

**Rubrik.** Ini halaman dengan rasio nilai-per-jam tertinggi di seluruh produk. Menyentuh Impact Projection (20%), Progres & Validasi (20%), dan Metodologi (10%) sekaligus.

**Catatan implementasi.** Rutenya **publik**, bukan rute konsol: halaman yang menjelaskan seberapa jauh angka prakiraan boleh dipercaya tidak boleh berada di balik kotak masuk petugas. Ia hanya membaca, tidak menampilkan identitas pelapor, dan tidak punya tombol yang menulis. Cakupan per kecamatan datang dari layanan ML dengan kunci kode BPS bertitik (`33.74.01`) lalu diterjemahkan gateway ke `kecamatan.id` (`KEC_SMG_01`) lewat kolom `ml_id`; tanpa terjemahan itu seluruh kecamatan terbaca `Tidak memadai` meski datanya lengkap.

### 5.8 Admin & Data (M9)

Upload CSV kasus → validasi kolom & tipe → preview 10 baris → konfirmasi. Sinkronisasi BMKG ditampilkan sebagai status (terakhir sinkron, jumlah stasiun, latensi). Audit trail untuk seluruh perubahan data.

---

### 5.9 Mesin Waktu (`/mesin-waktu`)

**Tujuan.** Menjawab pertanyaan yang tidak bisa dijawab satu angka MAE: *"bulan itu, di kecamatan saya, apakah sistem ini sudah mengatakannya lebih dulu?"*

**Sumber data.** Periode uji yang sama dengan §5.7 — data yang tidak pernah dilihat model saat dilatih — tapi dirinci per **bulan × kecamatan**. Layanan ML mengirimkannya sebagai `district_results` pada `/backtest`; gateway menyimpannya dan menghitung putusannya di `/api/model/rewind`.

**Empat putusan per pasangan bulan × kecamatan.**

| Putusan | Definisi |
|---|---|
| Tertandai | Kelas aktual `tinggi` dan kelas prakiraan `tinggi` |
| Terlewat | Kelas aktual `tinggi`, prakiraan bukan — tidak ada instruksi yang terbit |
| Alarm palsu | Prakiraan `tinggi`, aktual bukan — sumber daya bergerak sia-sia |
| Kelas sama / meleset | Sisanya, di luar kelas `tinggi` |

**Kriteria penerimaan.**
- Sensitivitas dan alarm palsu berdiri **bersebelahan**. Menampilkan satu tanpa yang lain adalah overclaim, dan §2 menghukumnya.
- Tabel bulan aktif menaruh kecamatan yang **terlewat** di baris teratas, bukan di dasar tabel.
- Dua peta berdampingan pada bingkai yang sama: prakiraan dan rekap resmi. Tidak ada mode tombol — perbandingan tidak boleh bergantung pada ingatan pemirsa.
- Rute **publik**, dengan alasan yang sama seperti §5.7.

**Keunggulan waktu.** Ditampilkan sebagai ±30 hari, dan **bukan asumsi**: model memakai `cases_lag1..3`, jadi prakiraan bulan M dihitung begitu rekap bulan M−1 masuk, sementara rekap bulan M sendiri baru terbit setelah bulan M berakhir. Selisihnya persis satu siklus pelaporan. Berapa lama rekap tertunda setelah bulan berakhir tidak perlu diasumsikan karena penundaan itu berlaku sama pada kedua sisi dan saling meniadakan. Uraian ini ikut tercetak di halamannya, bukan disimpan di dokumen ini saja.

**Rubrik.** Impact Projection (20%) — inilah bukti bahwa peringatannya datang lebih awal; Progres & Validasi (20%); Originalitas (15%).

### 5.10 Draf Nota Dinas (`/tindakan/nota/[id]`)

**Tujuan.** Menutup jarak terakhir antara layar dan pekerjaan Senin pagi. Instruksi ke puskesmas berjalan sebagai nota dinas, bukan sebagai tangkapan layar dashboard.

**Isi.** Satu tindakan §5.2 disusun sebagai satu lembar A4: kop, kepala surat, kalimat "Dasar:" apa adanya, tabel kecamatan sasaran (penduduk, rentang prakiraan, kelas risiko, cakupan data), langkah SOP bernomor, tenggat, unit pelaksana, batas keandalan, dan blok tanda tangan.

**Yang sengaja dikosongkan** — tercetak sebagai garis isian: **nomor surat, pejabat pengirim, tanggal surat, dan penanda tangan**. Keempatnya ditetapkan unit tata usaha. Versi lama produk ini pernah menampilkan nomor surat `440/1892/DKK-P2P/VIII/2026` beserta nama kepala puskesmas; keduanya karangan, dan dokumen resmi berisi nomor palsu lebih berbahaya daripada dokumen yang jujur mengaku draf. Lencana **DRAF** tampil di kop, dan kaki dokumen menyatakan surat baru berlaku setelah diberi nomor dan ditandatangani.

**Cara mencetak.** Tidak ada pustaka penata halaman PDF di repositori ini dan tidak perlu ada: halaman ini adalah lembar A4 yang benar di layar dan di kertas, dan "Simpan sebagai PDF" sudah tersedia di dialog cetak setiap peramban. Aturan cetaknya di `DESIGN-SYSTEM.md` §11.1.

**Kriteria penerimaan.**
- Angka per kecamatan hanya ditempelkan bila bulan prediksinya sama dengan bulan nota; kalau tidak, selnya "—" dengan catatan. Angka dari bulan lain tidak boleh masuk surat dinas.
- Tidak ada nama orang, nomor telepon, nomor surat, atau angka "confidence" di mana pun pada lembar ini.

**Rubrik.** Impact Projection (20%), Originalitas (15%).

### 5.11 "Kenapa angka ini?" — kontribusi fitur lokal

**Tujuan.** Menjawab pertanyaan yang selalu menyusul setelah angka muncul: kenapa kecamatan ini segini, dan bukan segitu.

**Metode — dan apa yang bukan.** Yang dihitung adalah **substitusi median**, bukan SHAP dan tidak boleh disebut SHAP. Tiap kelompok fitur diganti nilai lazimnya di kecamatan yang sama, seluruh fitur turunannya (hujan kumulatif, interaksi, rata-rata bergerak, insidens) dihitung ulang, lalu model memprediksi ulang. Selisihnya adalah kontribusi kelompok itu.

Enam kelompok: curah hujan, suhu, kelembaban, riwayat kasus, bulan & musim, serta populasi & identitas kecamatan. Dua penyimpangan yang disengaja:

- **Bulan** tidak diganti median. Median variabel siklis tidak punya arti — median antara Desember dan Januari adalah Juli. Pembandingnya rata-rata prakiraan atas kedua belas bulan dengan fitur lain dikunci.
- **Populasi & identitas kecamatan** dibandingkan terhadap median **kota**, bukan median kecamatan. Keduanya konstan sepanjang riwayat satu kecamatan, jadi median kecamatan sama dengan nilainya sendiri dan ablasinya selalu nol — angka yang tampak seperti "identitas wilayah tidak berpengaruh" padahal tidak ada yang diuji.

**Kriteria penerimaan.**
- Tiap kontribusi ditampilkan sebagai pergeseran berarah (naik/turun) **dalam satuan kasus**, bukan sebagai potongan kue. Jumlah kontribusi tidak sama dengan prakiraan, dan itu dinyatakan di layar.
- Tiap baris membawa kalimat tandingannya: "tanpa faktor ini prakiraan jadi X kasus".
- Importance gain hasil pelatihan tetap ditampilkan **dengan label berbeda** — global, berlaku sekota, menjawab pertanyaan yang lain. Menyembunyikannya akan membuat kontribusi lokal terbaca sebagai "fitur terpenting model".
- Empat batas pembacaan tercetak di dialog yang sama, termasuk bahwa yang diterangkan adalah keputusan model, bukan mekanisme penularan.

**Permukaan UI.** Tombol "Kenapa angka ini?" pada panel detail kecamatan `/dashboard`; membuka dialog. Endpoint `POST /explain` (ML) → `GET /api/model/explain` (gateway). Tidak ada cadangan tersimpan: penjelasan basi menerangkan angka yang sudah berganti.

**Rubrik.** Metodologi (10%), Originalitas (15%).

### 5.12 Simulator Cuaca (`/simulasi`)

**Tujuan.** Menunjukkan model yang hidup, bukan tabel statis: geser curah hujan, suhu, dan kelembaban, lalu lihat prakiraan dan peringkat 16 kecamatan dihitung ulang.

**Kriteria penerimaan.**
- Tiga penggeser: curah hujan −100..+200%, suhu ±5 °C, kelembaban ±30 poin. Batasnya ditegakkan dua kali — di skema permintaan dan di layanan skenario — supaya pemanggil non-UI tidak bisa melewatinya.
- Fitur turunan **wajib** dihitung ulang. Menaikkan `rainfall_lag1` tanpa memperbarui `rainfall_cumul_2m` dan `rain_x_humidity` menyodorkan baris yang mustahil ada di dunia nyata; model tetap menjawab dan jawabannya tidak berarti apa-apa.
- Nilai skenario yang keluar dari rentang data latih **ditandai per kecamatan** dan dihitung di ringkasan. Model berbasis pohon tidak mengekstrapolasi — jawabannya membeku di daun terluar.
- Kalimat "ini menjawab apa kata model, bukan apa yang akan terjadi" tampil **di atas** penggeser, bukan sebagai catatan kaki.
- Kecamatan tanpa cakupan data cukup tetap kosong: bukan nol, bukan "rendah".
- Penggeser ditahan 350 ms sebelum menembakkan permintaan. Satu permintaan = 32 prediksi.
- Angka yang tampil dibaca dari muatan yang sedang tampil, bukan dari posisi penggeser — kalau tidak, layar sempat menampilkan hasil netral yang lama dengan penggeser sudah bergerak.

**Permukaan UI.** Rute publik `/simulasi`. Endpoint `POST /simulate` (ML) → `POST /api/model/simulate` (gateway).

**Rubrik.** Originalitas (15%), Metodologi (10%).

### 5.13 Prioritas Terdampak (`/prioritas`)

**Tujuan.** Memperbaiki satu kelemahan jujur dari skor risiko sistem ini: skornya persentil terhadap sejarah kecamatan itu sendiri, jadi tiga kasus bisa berarti "tinggi" di kecamatan yang biasanya nol. Untuk pertanyaan "seberapa tidak biasa", itu benar. Untuk "kecamatan mana yang dijaga lebih dulu", ia bisa menaruh kecamatan 98 ribu jiwa di atas kecamatan 192 ribu jiwa.

**Rumus, sesederhana mungkin agar bisa diperiksa dengan kalkulator:**

```
indeks_mentah = (skor_risiko ÷ 100) × populasi × pengali_kepadatan
indeks        = indeks_mentah ÷ indeks_mentah_tertinggi × 100
```

`pengali_kepadatan` bernilai 1 pada mode populasi; pada mode kepadatan ia **akar** kepadatan relatif terhadap median kota. Akar, bukan nilai penuh: kepadatan Semarang Tengah 27× Mijen, dan pengali penuh akan mengunci puncak daftar apa pun risikonya.

**Kriteria penerimaan.**
- Dua peringkat ditampilkan **berdampingan** beserta pergeserannya. Mengganti diam-diam peringkat risiko dengan peringkat prioritas menyembunyikan justru bagian yang perlu dibaca: keduanya menjawab pertanyaan berbeda.
- Faktor kerentanan yang **tidak** ada datanya ditulis sekeras yang ada — proporsi balita & lansia, cakupan jaminan kesehatan, sanitasi per kecamatan, dan kepadatan hunian di dalam kecamatan. Struktur umur tidak ada pada `dataset_raw/wilayah/kecamatan_semarang.csv`, dan mengarangnya adalah kelas kesalahan yang sudah dibersihkan dari sistem ini.
- Kecamatan tanpa prediksi tidak diberi indeks dan tidak diberi peringkat.

**Permukaan UI.** Rute publik `/prioritas`; `GET /api/districts/priority?disease=&bobot=populasi|kepadatan`.

**Rubrik.** Impact Projection (20%), Originalitas (15%).

### 5.14 Eskalasi Otomatis & Peragaan Lonjakan (S4)

**Tujuan.** Antrean verifikasi mengurutkan laporan satu per satu; pada urutan itu sebuah **pola** hilang. Lima laporan genangan dari kecamatan yang sama dalam sepuluh hari tersebar di seluruh daftar dan terbaca sebagai lima keluhan lepas.

**Tiga aturan, deterministik, tanpa model:**

| Aturan | Ambang bawaan | Alasan angkanya |
|---|---|---|
| Volume | 5 laporan / kecamatan / 14 hari | Dengan batas kirim 3 laporan per perangkat per 24 jam, lima laporan dalam 14 hari tidak mungkin dari satu perangkat |
| Pemusatan satu jenis | 4 laporan sejenis | Pemusatan jenis lebih informatif daripada volume campuran, jadi ambangnya lebih rendah |
| Antrean tertahan | menunggu > 24 jam | Janji layanan, bukan temuan epidemiologis — dan dibedakan agar tidak terbaca sebagai sinyal penyakit |

**Kriteria penerimaan.**
- Laporan yang **ditolak** verifikator tidak pernah dihitung. Kalau tidak, satu orang yang mengirim berulang bisa menaikkan status kecamatannya sendiri.
- Eskalasi **tidak** menerbitkan tindakan dan tidak menyentuh tabel `tindakan`. Menerbitkan instruksi fogging dari lima laporan yang belum diverifikasi adalah otomatisasi yang tidak boleh ada di sistem kesehatan.
- Ambang yang dipakai ikut tercetak di UI. Petugas yang melihat kecamatannya naik berhak tahu ambang mana yang terlampaui — dan berhak tidak setuju.
- Ambangnya dapat ditimpa lewat parameter permintaan tanpa mengubah kode.

**Peragaan lonjakan.** Loop warga → verifikasi → eskalasi itu nyata, tapi memperagakannya butuh lonjakan yang tidak bisa ditunggu di depan penonton. Kendali injeksi tersedia untuk peran admin/dinas dengan tiga pagar yang tidak boleh dilepas:

1. **Setiap baris ditandai di data**, bukan hanya di ingatan operatornya: deskripsi berawalan `[SIMULASI]` dan `device_hash` konstanta, ditampilkan sebagai lencana "Simulasi" di antrean.
2. **Bisa dicabut utuh** lewat satu tombol; predikat penghapusannya `device_hash`, bukan awalan deskripsi yang bisa diedit.
3. **Tercatat di jejak audit** atas nama penggunanya, penyisipan maupun pencabutan.

Laporan simulasi masuk berstatus `menunggu` seperti laporan mana pun. Menyuntikkan laporan yang sudah terverifikasi berarti memperagakan loop dengan memotong bagian yang justru jadi intinya.

**Permukaan UI.** `/verifikasi`; `GET /api/reports/escalations`, `POST|GET|DELETE /api/admin/demo/surge`.

**Rubrik.** Progres & Validasi (20%), Originalitas (15%).

### 5.15 Lapisan Pemicu Lingkungan di Peta (S1)

**Tujuan.** Menjelaskan kenapa sebuah kecamatan diingatkan — terutama untuk leptospirosis, yang tenggatnya terikat genangan dan rob, bukan siklus vektor.

**Yang dipetakan, dan yang bukan.** Ini **peta laporan warga terverifikasi**, bukan peta genangan. Kecamatan tanpa penanda berarti tidak ada laporan terverifikasi di sana, bukan berarti kering. Wilayah dengan warga lebih aktif melapor akan tampak lebih ramai, dan bias itu tidak bisa dikoreksi dari data ini sendiri — ketiganya tercetak di respons dan di UI.

**Kriteria penerimaan.**
- Hanya laporan berstatus `terverifikasi` dan berkeluarga lingkungan (genangan, sampah, saluran). Lapisan peta yang dibaca sebagai fakta lapangan tidak boleh berisi laporan yang belum diperiksa siapa pun.
- **Mati secara bawaan.** Menumpuknya di atas kelas risiko resmi tanpa diminta membuat dua sumber yang berbeda derajat keandalannya terbaca sebagai satu.
- Penanda memakai warna netral, bukan ramp risiko (DESIGN-SYSTEM §2.4).
- Jari-jari mengikuti akar jumlah: luas lingkaran yang dibaca mata, dan jari-jari linear melebih-lebihkan kecamatan teramai berlipat-lipat.

**Permukaan UI.** Tombol pada peta `/dashboard`; `GET /api/reports/environment-signal` (publik, agregat, tanpa deskripsi/foto/kode lacak).

### 5.16 Kit Siaran & Biaya Tak-Bertindak

**Kit siaran per kecamatan.** Notifikasi WhatsApp ada di daftar WON'T (§4), dan tetap di sana. Yang disediakan bukan integrasi pengiriman — tidak ada nomor tujuan, tidak ada tombol kirim, tidak ada yang keluar dari peramban — melainkan dua bahan yang bisa dibuat sistem dengan jujur: kalimat siaran siap tempel, dan satu kode QR per kecamatan sasaran menuju `/warga/lapor?kecamatan=…` dengan kecamatannya sudah terisi. QR dibuat di peramban dari URL yang sama dengan tautan biasanya: tidak ada pemendek tautan dan tidak ada pihak ketiga. Kode QR yang mengarah ke domain asing di poster dinas adalah cacat kepercayaan, bukan kemudahan.

**Biaya tak-bertindak.** Kerangka proyeksi dampak yang mengikuti aturan penulisan §9: selalu dengan asumsi, sumber, dan rentang. Kalkulator ini **berangkat kosong** — tidak ada tarif bawaan dan tidak ada efektivitas bawaan.

- Alasannya tertulis di §9 sendiri: baris "biaya penanganan per kasus" ditandai *"jika tersedia"*, dan repositori ini memang belum punya tarif yang bisa dirujuk. Menuliskan angka default berarti menaruh rupiah karangan di layar juri dengan tampilan hasil hitungan.
- Basis perhitungan hanya kecamatan kelas tinggi — kelompok yang memang memicu terbitnya tindakan. Menghitung seluruh kota mengklaim bahwa setiap kasus di mana pun dapat dicegah oleh intervensi yang bahkan tidak diterbitkan untuk wilayah itu.
- Rentang keluarannya berasal dari batas bawah–atas prakiraan model, dan itu dinyatakan — bukan dari ketidakpastian asumsi penggunanya.
- Bila salah satu asumsi belum bersumber, hasilnya tetap dihitung **dan diberi tanda**. Menyembunyikannya hanya memindahkan angka tak-bersumber itu ke kepala orang.
- Nilainya disimpan di `localStorage`: preferensi satu perangkat, bukan data sistem.

**Rubrik.** Impact Projection (20%).

---

## 6. Arsitektur & Justifikasi Teknologi

Rubrik Metodologi (10%) menilai **kesesuaian arsitektur dengan solusi** — bukan seberapa canggih stack-nya. Setiap pilihan di bawah punya alasan; alasan itu yang disalin ke proposal.

```
┌──────────────────────┐
│  Next.js 14 (App)    │  SSR untuk dashboard, statis untuk portal publik
│  Tailwind + tokens   │  Alasan: portal warga harus cepat & terindeks;
│  Leaflet · Recharts  │  dashboard butuh data segar per request.
└──────────┬───────────┘
           │ REST/JSON
┌──────────▼───────────┐
│  Express.js Gateway  │  Auth, RBAC, CRUD, rate-limit, cron BMKG
│                      │  Alasan: satu bahasa dengan frontend, tim web
│                      │  bisa bergerak tanpa menunggu tim model.
└─────┬────────────┬───┘
      │            │
┌─────▼─────┐ ┌────▼──────────────┐
│PostgreSQL │ │ FastAPI ML Service│  /predict /retrain /backtest
│(+PostGIS  │ │ scikit-learn,     │  Alasan: training berat dipisah agar
│ opsional) │ │ XGBoost, pandas   │  tidak memblokir API; tim model bekerja
└───────────┘ └───────────────────┘  independen; ekosistem ML ada di Python.
```

**Kenapa tiga layanan, bukan satu.** Bukan karena "microservice bagus", tapi karena: (a) pemisahan bahasa mengikuti pemisahan keahlian tim, (b) proses training bisa memakan menit dan tidak boleh memblokir permintaan dashboard, (c) ML service bisa dimatikan/diganti tanpa menyentuh gateway — prediksi terakhir tetap tersaji dari database.

**Kontrak `/predict`** (dikunci agar frontend dan ML bisa jalan paralel dengan mock):

```jsonc
{
  "kecamatan_id": "33.74.01",
  "disease": "DBD",
  "week_start": "2026-09-01",
  "horizon_weeks": 2,
  "predicted_cases": 54,
  "lower_bound": 41,
  "upper_bound": 68,
  "risk_score": 78,
  "risk_class": "tinggi",
  "data_coverage": "high",          // high | medium | low | insufficient
  "drivers": [
    { "feature": "rainfall_lag3_mm", "value": 214, "percentile": 88 },
    { "feature": "humidity_lag2_pct", "value": 84, "percentile": 79 }
  ],
  "model_version": "rf-dbd-2026.08.3"
}
```

`drivers` bukan hiasan: itu yang mengisi kalimat "Dasar:" di §5.2 dan yang membuat sistem ini bisa dipertanggungjawabkan saat sesi tanya jawab (20% nilai final).

**Skema database inti.** `wilayah`, `kasus_penyakit`, `data_cuaca`, `prediksi`, `laporan_warga`, `audit_log`. Detail kolom mengikuti dokumen konsep §3.4.

### 6.1 Status implementasi (27 Agustus 2026)

Bagian ini mencatat jarak antara spesifikasi di atas dan yang benar-benar
berjalan. Spesifikasinya tidak diubah untuk mengejar implementasi — yang
berbeda dicatat di sini, apa adanya.

| Spesifikasi | Terkirim | Catatan |
|---|---|---|
| PostgreSQL (+PostGIS opsional) | **SQLite** lewat `node:sqlite` | Skema di `backend/src/db/schema.sql` ditulis portabel. Tidak ada modul native yang perlu dikompilasi dan tidak ada server basis data yang perlu dipasang — `npm install` di mesin juri tidak bisa gagal karena toolchain |
| Granularitas mingguan (`week_start`, `horizon_weeks`) | **bulanan** (`month_start`) | Dataset kasus yang tersedia direkap bulanan; model dilatih bulanan. Seluruh UI menyebut bulan, bukan minggu |
| Empat penyakit (DBD, ISPA, Diare, Leptospirosis) | **DBD dan ISPA** | Dua sisanya belum punya satu baris data. Daftar penyakit di UI dibentuk dari isi tabel `observasi`, jadi menambah dataset cukup untuk memunculkannya |
| Cron sinkronisasi BMKG di gateway | **belum ada** | Data iklim masuk sebagai berkas dataset yang di-seed. Halaman admin melaporkan pekerjaan ingest yang benar-benar berjalan, bukan status koneksi yang tidak ada |
| Login penuh JWT + RBAC (§4 WON'T) | **sesi cookie httpOnly + penjaga rute** | Bukan JWT dan bukan RBAC penuh: satu peran menulis, seluruh peran membaca. Cukup untuk menjaga rute konsol dan mencatat siapa yang memutuskan di jejak audit |
| §5.6a perbandingan backtest dengan/tanpa sinyal warga | **belum ada** | Agregasi sinyal warga sudah tersedia di `/api/admin/citizen-signal`; perbandingannya belum dijalankan karena belum ada laporan terverifikasi dalam jumlah yang bermakna |

---

## 7. Kejujuran sebagai Persyaratan Produk

Bukan bagian "etika" — ini persyaratan fungsional yang dites.

| ID | Persyaratan | Cara verifikasi |
|---|---|---|
| H1 | Setiap angka prediksi tampil bersama batas bawah–atas | Tidak ada `predicted_cases` telanjang di UI mana pun |
| H2 | Kecamatan berdata tipis diberi label `Data tidak memadai`, bukan kelas risiko | Uji dengan kecamatan yang sengaja dikosongkan |
| H3 | Banner "bukan alat diagnosis" pada semua permukaan publik | Cek `/warga`, `/warga/lapor`, `/warga/status` |
| H4 | Sinyal warga ditandai visual berbeda dari data resmi | Legenda peta & tabel |
| H5 | Halaman `/model` menampilkan metrik apa adanya, termasuk yang jelek | Review manual sebelum submit |
| H6 | Bias pelaporan dinyatakan eksplisit di `/model` | Teks wajib ada |

**Batasan yang wajib tercantum** (di UI dan proposal):
1. Model bersifat *decision support*, bukan diagnosis atau kepastian.
2. Akurasi bergantung kelengkapan data historis; kecamatan berdata sedikit punya ketidakpastian lebih besar.
3. Korelasi cuaca–penyakit bukan kausalitas tunggal; kepadatan penduduk dan sanitasi turut berperan.
4. Laporan warga rentan bias pelaporan — wilayah dengan warga lebih aktif dapat tampak lebih berisiko.
5. Interpolasi cuaca dari stasiun terbatas ke level kecamatan menurunkan presisi.

---

## 8. Persyaratan Non-Fungsional

| Aspek | Target | Alasan |
|---|---|---|
| Aksesibilitas | WCAG 2.1 AA; kontras teks ≥ 4.5:1; risiko tidak dikodekan warna saja; navigasi keyboard penuh | Produk layanan publik; juga poin kreativitas |
| Performa | LCP < 2.5s pada 3G cepat untuk `/warga`; bundel peta di-*lazy load* | Warga mengakses dari HP, bukan laptop |
| Responsif | Portal warga: *mobile first*. Dashboard: ≥ 1280px, degradasi rapi ke tablet | Petugas puskesmas memverifikasi dari HP |
| Bahasa | Indonesia sepenuhnya, termasuk pesan error dan status kosong | — |
| Privasi | Foto di-strip EXIF; identitas pelapor terpisah dari payload model; akses laporan mentah hanya verifikator | §11-R6 |
| Reduced motion | Seluruh animasi mati saat `prefers-reduced-motion` | Aksesibilitas |
| Kondisi kosong/gagal | Setiap tampilan data punya state: kosong, memuat, gagal, data tidak memadai | Juri akan mengklik hal-hal yang belum ada datanya |

---

## 9. Impact Projection — apa yang harus dikumpulkan

Bobot terbesar (20%) dan paling mudah gagal karena klaim tanpa angka. Yang perlu dicari, dengan sumber:

| Angka | Sumber | Fungsi dalam argumen |
|---|---|---|
| Kasus DBD/ISPA/Diare/Lepto tahunan Kota Semarang, 3–5 tahun terakhir | Profil Kesehatan Kota Semarang, Dinkes Prov. Jateng | Baseline besaran masalah |
| Jumlah kecamatan & populasi per kecamatan | BPS Kota Semarang | Denominator *incidence rate* |
| Jeda waktu pelaporan kasus resmi (mingguan/bulanan) | Wawancara/dokumen Dinkes, atau asumsi tertulis | Membuktikan adanya lag yang ditutup sistem |
| Efektivitas intervensi dini vs terlambat | Jurnal epidemiologi domestik | Menghubungkan prediksi ke penurunan kasus |
| Biaya fogging per fokus / per kecamatan | Data belanja publik jika tersedia | Argumen efisiensi preventif vs reaktif |

**Aturan menulis proyeksi.** Bentuknya: *"Jika X% kecamatan berisiko tinggi tertangani 2 minggu lebih awal, dengan efektivitas intervensi dini sebesar Y% menurut [sumber], potensi kasus yang dapat dicegah adalah Z per musim."* Selalu tampilkan asumsi dan rentang, bukan angka tunggal. Jangan menulis "menurunkan kasus 40%" tanpa syarat — itu tepat sasaran untuk dipotong nilainya sebagai *overclaim*.

---

## 10. Rencana 7 Hari (24–31 Agustus 2026)

Diurutkan berdasarkan risiko, bukan kenyamanan. Yang paling mungkin gagal dikerjakan paling awal.

| Hari | Fokus | Keluaran yang bisa dilihat |
|---|---|---|
| **D1** 24 Agu | Kunci pendaftaran. Kunci data: unduh Profil Kesehatan + BMKG, ETL kasar ke CSV per kecamatan/minggu. Terapkan token design system baru. | Dataset v0 + UI sudah berganti identitas visual |
| **D2** 25 Agu | Model baseline (RandomForest) + threshold persentil + backtest awal. Frontend: peta + GeoJSON 16 kecamatan asli. | `/predict` mengembalikan angka nyata; peta terisi |
| **D3** 26 Agu | Dashboard M1–M4 tersambung ke data nyata. Mesin rekomendasi. | `/dashboard` berfungsi penuh |
| **D4** 27 Agu | Portal warga M5, form laporan M6, antrian verifikasi M7. | Alur lapor → verifikasi berjalan |
| **D5** 28 Agu | Halaman `/model` M8, impor admin M9, seluruh *empty/error state*. | Aplikasi tidak punya jalan buntu |
| **D6** 29 Agu | Rekam video demo (3–7 menit). Bersihkan repo, README, dokumentasi kode. SHOULD dikerjakan hanya jika ada sisa waktu. | Video terunggah, repo layak dinilai |
| **D7** 30–31 Agu | Tulis & rapikan proposal (sistematika rulebook §8.1), Figma prototype, submit. Sisakan buffer 6 jam. | Submit sebelum 18.00 WIB 31 Agu |

**Aturan sprint.** Setiap hari berakhir dengan aplikasi yang *bisa dijalankan*. Tidak ada cabang yang menggantung semalaman. Video direkam H-2, bukan H-0 — ini kesalahan paling umum dan bernilai 10%.

---

## 11. Risiko & Mitigasi

| ID | Risiko | Mitigasi |
|---|---|---|
| R1 | Data kasus per kecamatan tidak konsisten antar tahun/sumber | ETL manual + dokumentasi asumsi tertulis; asumsi ditampilkan di `/model` |
| R2 | Data historis terlalu tipis untuk leptospirosis | Tampilkan dengan interval lebar + label cakupan rendah; siap turunkan ke 3 penyakit jika model tidak konvergen |
| R3 | Interpolasi cuaca dari sedikit stasiun kurang presisi | Nyatakan sebagai batasan + *future work* sensor lokal |
| R4 | Juri mempertanyakan validitas medis korelasi cuaca–penyakit | Sitasi jurnal epidemiologi domestik di proposal & `/model` |
| R5 | Beban verifikasi membebani petugas puskesmas | Antrian satu klik < 15 detik/laporan, dibatasi wilayah tugas |
| R6 | Kebocoran data kesehatan pelapor | Anonimisasi sebelum masuk model, EXIF di-strip, akses mentah dibatasi verifikator |
| R7 | **UI dinilai menjiplak desain yang sudah ada** | Ganti sistem visual secara struktural — palet, tipografi, radius, densitas, dan pola surface ganda. Lihat [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) |
| R8 | **Repo berantakan menurunkan nilai Code Project (10% final)** | **Sebagian selesai:** skrip codegen sekali-pakai di root sudah dihapus, `tsconfig.tsbuildinfo` di luar VCS, repo dipecah jadi `frontend/` + `docs/` dengan README arsitektur di root. Sisa: `CONTRIBUTING.md` |
| R9 | Waktu habis di fitur non-inti | Daftar WON'T di §4 mengikat; SHOULD hanya dikerjakan setelah 29 Agu |
| R10 | Video terlambat / tidak memenuhi syarat | Rekam D6; cek 720p, 3–7 menit, wajah tampil, judul & tag sesuai format |

---

## 12. Peta Rubrik ke Fitur

| Kriteria (bobot) | Ditopang oleh |
|---|---|
| Impact Projection (20%) | §9, §5.2 rekomendasi, §5.7 `/model` |
| Progres & Validasi (20%) | M1–M9 berfungsi nyata, §7 kejujuran |
| Kesesuaian Tema (15%) | §3.3 pengikat sirkular, §5.6b layer pemicu lingkungan |
| Originalitas (15%) | §5.4–5.6 loop warga→verifikasi→model, dual-surface design |
| Format Proposal (10%) | §10 D7 |
| Video (10%) | §10 D6 |
| Metodologi (10%) | §6 arsitektur berjustifikasi, kontrak API |
| Code Project (10%, final) | §11-R8 |

---

## Lampiran A — Glosarium

| Istilah | Arti |
|---|---|
| Skor risiko | Bilangan 0–100 hasil normalisasi prediksi terhadap distribusi historis kecamatan |
| Kelas risiko | Diskretisasi skor menjadi Rendah/Sedang/Tinggi berdasarkan persentil historis |
| *Data coverage* | Ukuran kelengkapan data historis suatu kecamatan; menentukan lebar ketidakpastian |
| *Driver* | Variabel iklim dengan kontribusi terbesar pada prediksi minggu tersebut |
| Sinyal warga | Agregat laporan warga terverifikasi per kecamatan/minggu; fitur berbobot rendah |
| Pemicu lingkungan | Laporan warga tentang kondisi lingkungan (genangan, sampah, saluran) |
