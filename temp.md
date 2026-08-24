KONSEP PENGEMBANGAN PRAKIRA (Namanya prakira) 
Sistem Prediksi Risiko Penyakit Berbasis Iklim per Wilayah
DSDC ANFORCOM 2026 — Subtema: Eco-Health Monitoring & Early Warning Platforms 
Versi revisi — menambahkan cakupan penyakit iklim, modul laporan warga (self-reported case), alur verifikasi dinas
kesehatan, dan feedback loop retraining model. 
1. Ringkasan Sistem 
Sistem ini adalah platform berbasis web yang memprediksi risiko lonjakan kasus penyakit terkait iklim per
kecamatan, beberapa minggu ke depan. Prediksi dihasilkan dari model machine learning yang belajar pola
hubungan antara data cuaca historis (curah hujan, suhu, kelembaban) dan data kasus penyakit historis per
wilayah. Pengguna utama sistem adalah dinas kesehatan dan puskesmas, dengan versi ringkas untuk diakses
publik. 
Tujuan utamanya mengubah pola penanganan dari reaktif (bertindak setelah kasus naik) menjadi preventif
(bertindak sebelum lonjakan terjadi), dengan alokasi sumber daya seperti fogging, penyuluhan, dan stok obat
yang lebih tepat sasaran dan tepat waktu. 
Sistem kini juga membuka jalur partisipasi dua arah dari warga — bukan hanya menerima informasi, tetapi
juga dapat melaporkan indikasi gejala di lingkungannya, yang setelah diverifikasi oleh puskesmas/dinas akan
menjadi sinyal tambahan bagi model prediksi.  [BARU] 
1.1 Cakupan Penyakit Iklim 
Dokumen sebelumnya hanya mencakup tiga penyakit (DBD, ISPA, Diare). Berikut daftar penyakit iklim yang
dipertimbangkan, beserta alasan keterkaitan iklim dan status prioritas untuk babak penyisihan: 
Penyakit 
Keterkaitan Iklim 
Status Prioritas 
Demam Berdarah Dengue
(DBD)
Vektor nyamuk Aedes aegypti meningkat saat
musim hujan & genangan air
Inti (sudah ada) 
ISPA (Infeksi Saluran
Pernapasan Akut)
Terkait kualitas udara, perubahan suhu, dan
musim pancaroba
Inti (sudah ada) 
Diare 
Terkait kualitas air bersih dan sanitasi saat musim
hujan/banjir
Inti (sudah ada) 
Malaria 
Vektor nyamuk Anopheles terkait genangan air &
suhu lembap
Kandidat tambahan — perlu cek
ketersediaan data di kota target 
Chikungunya 
Vektor sama dengan DBD (Aedes), mengikuti
pola musim hujan
Kandidat tambahan — bisa satu
paket analisis dengan DBD 
Leptospirosis 
Terkait banjir dan genangan air yang
terkontaminasi urin tikus
Kandidat tambahan — relevan untuk
kota rawan banjir 
Kolera 
Terkait kualitas air minum & sanitasi saat musim
hujan
Opsional — data historis kota
biasanya sangat terbatas 
Demam Tifoid 
Terkait sanitasi dan kualitas air, meningkat saat
musim hujan
Opsional — gejala tumpang tindih
dengan diare, perlu kehati-hatian
klasifikasi 
Filariasis (Kaki Gajah) 
Vektor nyamuk, dipengaruhi kondisi iklim tropislembap

Opsional
—
kasus
tahunan
biasanya

sangat
sedikit,
data
mungkin
tidak

cukup
untuk
ML
Rekomendasi: mengingat bobot penilaian besar ada pada validitas & realistis (bukan ambisi cakupan),
disarankan menambah maksimal 1–2 penyakit baru yang datanya paling tersedia di kota target — kandidat 
terkuat adalah Malaria atau Leptospirosis, tergantung karakteristik wilayah studi kasus (rawan genangan vs
rawan banjir). Tim perlu memutuskan bersama sebelum finalisasi proposal. 
2. Fitur Utama 
2.1 Dashboard Prediksi Risiko (Dinas Kesehatan / Puskesmas) 
• Peta interaktif kota dengan warna zona risiko per kecamatan (rendah/sedang/tinggi) untuk tiap jenis
penyakit. 
• Grafik tren prediksi kasus 2-4 minggu ke depan, dibandingkan dengan data aktual minggu-minggu
sebelumnya. 
• Ranking kecamatan berdasarkan tingkat risiko, untuk membantu penentuan prioritas intervensi.
• Rekomendasi tindakan otomatis berbasis skor risiko (contoh: "3 kecamatan berisiko tinggi DBD minggu
depan, prioritaskan fogging dan PSN").
• Filter berdasarkan jenis penyakit, rentang waktu, dan kecamatan. 
2.2 Modul Analitik & Riwayat 
• Visualisasi korelasi historis antara curah hujan/suhu dengan jumlah kasus per wilayah.
• Perbandingan akurasi prediksi vs kasus aktual (backtesting) untuk transparansi model.
• Ekspor laporan periodik (mingguan/bulanan) dalam format PDF/Excel untuk keperluan rapat dinas. 
2.3 Portal Publik (Warga) 
• Halaman ringkas untuk mengecek status risiko wilayah tempat tinggal, tanpa perlu login.
• Edukasi singkat pencegahan per jenis penyakit, disesuaikan dengan level risiko yang sedang berlaku.
• Notifikasi opsional (email/WhatsApp broadcast dari dinas) saat suatu wilayah memasuki status risiko
tinggi. 
2.3.1 Modul Laporan Warga (Self-Reported Case) 
  [BARU]
Selama ini Portal Publik bersifat satu arah — warga hanya menerima informasi risiko dan edukasi, tanpa jalur
untuk melaporkan balik kondisi di lapangan. Modul ini membuka partisipasi warga sebagai sumber sinyal dini,
dengan tetap menjaga keandalan data lewat proses verifikasi berjenjang (lihat 2.4.1).
• Form laporan mandiri oleh warga: gejala yang dialami/diamati, jenis penyakit terduga, lokasi
(kecamatan/kelurahan, opsional titik peta), dan waktu kejadian.
• Dapat diakses dengan atau tanpa akun — namun laporan dengan akun/nomor terverifikasi (mis. OTP 
WhatsApp) diberi prioritas verifikasi lebih tinggi.
• Status laporan yang bisa dipantau pelapor: Menunggu Verifikasi → Terverifikasi → Ditolak.
• Mekanisme anti-spam/rate-limiting sederhana: pembatasan jumlah laporan per perangkat/akun per hari,
serta deteksi pola laporan mencurigakan (mis. banyak laporan identik dari lokasi yang sama dalam waktu
singkat).
• Opsi lampiran foto (mis. kondisi lingkungan seperti genangan air) untuk membantu proses verifikasi
petugas. 
2.4 Modul Admin & Manajemen Data 
• Input/impor data kasus penyakit periodik oleh admin dinas kesehatan (upload CSV atau input manual).
• Sinkronisasi otomatis data cuaca dari API BMKG.
• Log dan audit trail perubahan data, mengingat data ini bersifat sensitif dan dipakai untuk keputusan publik. 
2.4.1 Alur Verifikasi Berjenjang Laporan Warga 
  [BARU]
Laporan warga tidak langsung dianggap sebagai data valid — perlu melalui verifikasi petugas kesehatan
setempat sebelum dapat memengaruhi dashboard atau model prediksi.
• Laporan baru masuk ke antrian verifikasi pada dashboard petugas puskesmas sesuai wilayah laporan.
• Petugas puskesmas meninjau laporan (dapat cross-check ke rekam kunjungan pasien internal bila relevan),
lalu memberi keputusan: Terima / Tolak, disertai catatan singkat.
• Laporan yang diterima ditandai 'Terverifikasi' dan diberi bobot kepercayaan (confidence) berbeda dari data
resmi dinas, karena granularitas dan cara perolehannya berbeda.
• Eskalasi opsional: jika dalam satu wilayah muncul banyak laporan warga dalam waktu singkat namun
belum sempat diverifikasi satu per satu, sistem dapat menandai wilayah tersebut sebagai 'perlu perhatian'
ke dinas terkait, tanpa menunggu verifikasi tuntas — sebagai sinyal dini yang terpisah dari data yang
dipakai untuk retraining model. 
3. Arsitektur Sistem 
Mengikuti pola arsitektur tiga layanan (three-tier) yang sudah familiar untuk kompetisi seperti ini — frontend,
backend gateway, dan layanan machine learning terpisah — supaya masing-masing bagian bisa dikembangkan
dan diskalakan secara independen. 
3.1 Lapisan Frontend 
• Next.js (React) sebagai framework utama, dengan rendering campuran (SSR untuk dashboard, statis untuk
halaman edukasi publik). 
• Library peta: Leaflet.js atau Mapbox GL JS untuk visualisasi peta risiko per kecamatan (GeoJSON batas
wilayah). 
• Library chart: Recharts atau Chart.js untuk grafik tren dan perbandingan prediksi vs aktual.
• Tailwind CSS untuk styling, shadcn/ui untuk komponen dashboard (tabel, filter, kartu statistik). 
Tambahan: komponen form laporan warga (2.3.1) dan antrian verifikasi (2.4.1) pada dashboard petugas. 
[BARU] 
3.2 Lapisan Backend / Gateway 
• Express.js (Node.js) sebagai API gateway yang menjembatani frontend, database, dan ML service.
• Autentikasi berbasis JWT dengan role-based access control (admin dinas, petugas puskesmas, publik).
• Endpoint REST untuk CRUD data kasus, data cuaca, dan hasil prediksi.
• Cron job terjadwal untuk menarik data cuaca terbaru dari BMKG dan memicu ulang prediksi model secara
berkala (mis. mingguan). 
Tambahan: endpoint REST untuk laporan warga (submit, ubah status verifikasi, lihat antrian per wilayah) dan
middleware rate-limiting untuk mencegah spam laporan.  [BARU] 
3.3 Lapisan ML Service 
• FastAPI (Python) sebagai layanan terpisah yang menangani pelatihan model, inferensi, dan backtesting.
• Dipisah dari backend utama supaya proses training/inference yang berat tidak membebani API utama, dan
supaya tim yang mengerjakan model bisa bekerja independen dari tim web.
• Endpoint internal: /predict (menghasilkan prediksi terbaru), /retrain (memicu pelatihan ulang), /backtest
(evaluasi akurasi historis). 
Feedback Loop dari Laporan Warga Terverifikasi 
  [BARU]
• Data laporan warga yang berstatus 'Terverifikasi' diagregasi per kecamatan/periode dan dimasukkan
sebagai fitur tambahan (sinyal dini) pada proses training — terpisah dari data kasus resmi dinas. 
• Bobot (confidence weight) fitur dari laporan warga dibuat lebih rendah dibanding data resmi dinas pada
tahap awal, mengingat granularitas dan potensi noise yang lebih tinggi; bobot ini dapat disesuaikan seiring
evaluasi performa model. 
• Endpoint /retrain diperluas agar dapat menerima parameter yang menentukan apakah data laporan warga
disertakan atau tidak — memudahkan pengujian A/B untuk melihat kontribusi nyata sinyal warga terhadap
akurasi prediksi (dibandingkan lewat proses backtesting). 
3.4 Basis Data 
• PostgreSQL sebagai database utama — cocok untuk data relasional (wilayah, kasus, cuaca) dan
mendukung ekstensi PostGIS jika diperlukan analisis spasial lebih lanjut. 
• Skema inti: tabel wilayah (kecamatan, kode BPS, geometri), tabel kasus_penyakit (wilayah, jenis penyakit,
periode, jumlah), tabel data_cuaca (stasiun, periode, curah hujan, suhu, kelembaban), tabel prediksi
(wilayah, jenis penyakit, periode, skor risiko, confidence). 
Tabel baru: laporan_warga (id, pelapor/anonim, jenis_penyakit_terduga, wilayah, deskripsi_gejala,
lampiran_foto, waktu_lapor, status_verifikasi, verifikator_id, catatan_verifikasi, waktu_verifikasi).  [BARU] 
4. Pendekatan Machine Learning 
4.1 Data Input 
Jenis Data 
Sumber 
Granularitas 
Catatan 
Kasus DBD/ISPA/Diare (+
kandidat penyakit tambahan,
lihat 1.1) 
Dinkes Kota/Kabupaten, Profil
Kesehatan tahunan, portal data
terbuka daerah 
Kecamatan (kadang
kelurahan)
Sebagian perlu diekstrak
manual dari PDF laporan
tahunan 
Curah hujan, suhu,
kelembaban
BMKG (data.bmkg.go.id) 
Per stasiun
pengamatan
Perlu interpolasi
sederhana ke level
kecamatan berdasarkan
jarak ke stasiun 
Data wilayah & populasi 
BPS 
Kecamatan 
Untuk menghitung
incidence rate (kasus per
100.000 penduduk) 
Laporan warga terverifikasi
[BARU]
Modul Laporan Warga (2.3.1),
setelah verifikasi puskesmas/dinas
(2.4.1) 
Kecamatan/kelurahan,
near real-time
Sinyal dini pelengkap,
bukan pengganti data
resmi; bobot lebih rendah
karena potensi noise &
bias pelaporan 
4.2 Model 
• Tahap awal (baseline): Random Forest Regressor atau Gradient Boosting (XGBoost) untuk memprediksi
jumlah kasus mingguan per kecamatan, dengan fitur curah hujan, suhu, kelembaban 1-4 minggu
sebelumnya (lag features), serta fitur musiman (bulan, indikator pancaroba). 
• Tahap lanjutan (jika waktu dan data cukup): model time-series seperti LSTM atau Prophet untuk
menangkap pola musiman jangka panjang secara lebih halus. 
• Output diskretisasi menjadi 3 kelas risiko (rendah/sedang/tinggi) menggunakan threshold berbasis persentil
historis, supaya lebih mudah dibaca pengguna non-teknis. 
• Validasi model menggunakan backtesting: melatih model dengan data hingga periode tertentu, lalu
membandingkan prediksi dengan kasus aktual pada periode berikutnya yang sudah diketahui — hasil ini
ditampilkan di dashboard sebagai indikator kepercayaan model. 
4.3 Batasan yang Perlu Disampaikan Secara Jujur 
• Model ini bersifat pendukung keputusan (decision support), bukan alat diagnosis atau prediksi pasti —
outputnya adalah estimasi risiko berbasis pola statistik historis. 
• Akurasi model bergantung pada kualitas dan kelengkapan data historis yang tersedia per wilayah;
kecamatan dengan data historis lebih sedikit akan punya tingkat ketidakpastian lebih tinggi. 
• Korelasi cuaca-penyakit tidak otomatis berarti kausalitas tunggal — faktor lain seperti kepadatan penduduk
dan sanitasi turut berkontribusi dan bisa ditambahkan sebagai fitur lanjutan. 
Data laporan warga bersifat pelengkap dan rentan bias pelaporan (mis. wilayah dengan warga lebih aktif
melapor bisa tampak berisiko lebih tinggi meski faktor sebenarnya berbeda) — perlu dinyatakan eksplisit
sebagai keterbatasan, dan pembobotan fitur ini harus dievaluasi lewat backtesting sebelum diberi pengaruh
besar pada skor akhir.  [BARU] 
5. Ringkasan Tech Stack 
Layer 
Teknologi 
Frontend 
Next.js, React, Tailwind CSS, shadcn/ui, Leaflet.js/Mapbox, Recharts 
Backend Gateway 
Express.js (Node.js), JWT Auth, node-cron, rate-limiter (mis. express-rate-limit)
[BARU] 
ML Service 
FastAPI (Python), scikit-learn/XGBoost, pandas, (opsional: TensorFlow/PyTorch
untuk LSTM) 
Database 
PostgreSQL (+ PostGIS opsional untuk data spasial) 
Integrasi Eksternal 
API BMKG (data cuaca), data terbuka Dinkes/BPS (impor berkala), OTP
WhatsApp/SMS untuk verifikasi pelapor (opsional) [BARU] 
Infrastruktur 
Docker untuk containerization tiap service, deploy ke VPS/cloud (mis. Railway,
Render, atau VM kampus) 
Version Control & CI 
Git/GitHub, GitHub Actions untuk basic CI (lint & build check) 
6. Roadmap Pengembangan (untuk Babak Penyisihan) 
Target progres 50-75% sesuai ketentuan rulebook, disusun dalam tahapan berikut:
• Minggu 1-2 — Pengumpulan & Persiapan Data: mengumpulkan data kasus penyakit historis (ekstraksi
dari profil kesehatan/portal data terbuka), menarik data cuaca BMKG, membersihkan dan menyatukan
kedua dataset per kecamatan; memastikan cakupan penyakit final (lihat 1.1).
• Minggu 3-4 — Pengembangan Model Baseline: membangun model Random Forest/XGBoost sederhana, 
melakukan backtesting awal, menentukan threshold klasifikasi risiko. 
• Minggu 4-5 — Pengembangan Backend & Database: membangun skema database (termasuk tabel
laporan_warga), API gateway, endpoint autentikasi, integrasi dengan ML service. 
• Minggu 5-6 — Pengembangan Frontend: dashboard peta risiko, grafik tren, modul admin dasar, form
laporan warga, dan antrian verifikasi petugas. 
• Minggu 6-7 — Integrasi & Pengujian: menghubungkan seluruh layanan, pengujian end-to-end (termasuk
alur lapor → verifikasi → retraining), perbaikan bug, penyiapan video demo. 
• Minggu 7 — Finalisasi Proposal: penyusunan dokumen proposal lengkap sesuai sistematika rulebook,
termasuk Impact Projection dengan data pendukung yang sudah dikumpulkan. 
7. Catatan untuk Impact Projection 
Bagian ini punya bobot penilaian terbesar (20%) di babak penyisihan, jadi perlu didukung angka konkret, bukan
klaim umum. Beberapa arah yang bisa dipakai: 
• Jumlah kasus penyakit iklim tahunan (per jenis yang dicakup, lihat 1.1) di kota target (misalnya Semarang)
sebagai baseline dampak masalah, diambil dari Profil Kesehatan Kota. 
• Estimasi potensi penurunan kasus jika intervensi dilakukan lebih dini (bisa merujuk studi/jurnal
epidemiologi yang menunjukkan efektivitas fogging/PSN yang dilakukan tepat waktu vs terlambat). 
• Perbandingan biaya penanganan reaktif (fogging masal setelah wabah) vs preventif (intervensi terarah
berdasarkan prediksi), jika data biaya publik tersedia. 
• Potensi percepatan waktu deteksi dini berkat laporan warga terverifikasi, dibandingkan waktu tunggu data
resmi dinas yang biasanya direkap periodik — dapat diestimasi secara kualitatif jika belum ada data
kuantitatif. 
• Hindari klaim berlebihan (overclaim) — sampaikan proyeksi sebagai potensi yang realistis dan terukur,
bukan janji hasil pasti, sesuai kriteria penilaian yang menekankan validitas dan realistis. 
8. Risiko & Mitigasi 
Risiko 
Mitigasi 
Data kasus penyakit per kecamatan tidak konsisten
formatnya antar tahun/sumber
Standardisasi lewat proses ETL manual di awal,
dokumentasikan asumsi yang diambil 
Data historis terbatas (kota kecil, tahun sedikit)
menurunkan akurasi model
Fokus pada 1 kota dengan data paling lengkap (mis.
Semarang) sebagai studi kasus utama 
Interpolasi cuaca per kecamatan dari stasiun terbatas
kurang presisi
Jelaskan sebagai keterbatasan yang wajar, sertakan
sebagai future work untuk sensor cuaca lokal 
Juri mempertanyakan validitas medis dari korelasi
cuaca-penyakit
Rujuk pada literatur epidemiologi yang sudah ada
(banyak jurnal domestik yang mendukung korelasi ini) 
[BARU] Laporan warga palsu, iseng, atau spam
mencemari data
Verifikasi wajib berjenjang oleh petugas puskesmas
(2.4.1), rate-limiting per akun/perangkat, sistem
reputasi pelapor (opsional lanjutan) 
[BARU] Kebocoran atau penyalahgunaan data
kesehatan pribadi pelapor
Anonimisasi data sebelum dipakai model, akses
laporan mentah dibatasi hanya untuk verifikator
berwenang, enkripsi data sensitif di database 
[BARU] Bias wilayah — kecamatan dengan warga
lebih aktif melapor tampak lebih berisiko meski faktor
sebenarnya berbeda 
Beri bobot lebih rendah pada fitur laporan warga saat
training, evaluasi kontribusinya lewat backtesting/A-B
testing sebelum dipakai penuh 
[BARU] Beban kerja tambahan bagi petugas
puskesmas untuk memverifikasi laporan masuk
Desain antrian verifikasi sederhana & cepat
(approve/reject satu klik dengan catatan singkat), batasi
ke wilayah tugas masing-masing petugas 
Dokumen ini disusun sebagai bahan diskusi internal tim untuk pengembangan proposal DSDC ANFORCOM 2026. Detail
teknis dapat disesuaikan seiring proses pengumpulan data dan pembagian tugas tim. Bagian bertanda [BARU] merupakan
penambahan hasil diskusi lanjutan terkait cakupan penyakit iklim, partisipasi warga, dan feedback loop model. 