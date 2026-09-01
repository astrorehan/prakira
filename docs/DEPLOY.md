# Penempatan PRAKIRA

Dua cara menjalankan sistem ini, dan keduanya dipakai:

| | Untuk apa | Perintah |
|---|---|---|
| **Daring** | Alamat publik yang bisa dibuka siapa pun | Render + Vercel + Supabase |
| **Luring** | Peragaan yang tidak boleh bergantung pada jaringan | `docker compose up` |

Yang luring bukan cadangan darurat. Jaringan aula pameran adalah risiko yang
tidak bisa dikendalikan siapa pun, dan tumpukan gratis punya tiga perilaku
tidur yang berbeda. Peragaan direncanakan luring; yang daring adalah yang
diberikan ke juri untuk dibuka sendiri.

---

## 1. Mode luring

Prasyarat: Docker dengan Compose v2.

```bash
docker compose build     # sekali, di tempat yang ada internet
docker compose up        # di mana saja, termasuk tanpa jaringan sama sekali
```

Lalu buka <http://localhost:3000>.

Urutannya penting: **membangun image tetap menarik base image dan dependensi
dari jaringan.** Yang berjalan luring adalah `up`, bukan `build`. Bangun
image-nya sehari sebelum berangkat, bukan di aula.

Yang berjalan: Postgres, layanan ML, gateway, dan frontend di satu mesin.
Penyemaian berjalan sendiri saat gateway pertama menyala — dataset kasus,
iklim, dan batas wilayah ikut di dalam image gateway; model `.pkl` ikut di
image layanan ML. Tidak ada langkah manual di antara `up` dan dashboard yang
hidup.

Masuk konsol memakai `dinkes@prakira.id` / `prakira2026`. Nilai itu tertulis
apa adanya di `docker-compose.yml` dengan sengaja: tumpukan ini hanya
mendengarkan di localhost dan tidak pernah dipasang di internet.

Data bertahan di volume `pgdata`. Untuk memulai dari nol:

```bash
docker compose down -v
```

**Latih ulang sebelum berangkat, bukan saat peragaan.** Alasannya sama dengan
di Render, di bagian bawah halaman ini.

---

## 2. Mode daring

Tiga penyedia, karena masing-masing gratis untuk beban ini:

```
Vercel (frontend)  ──►  Render (gateway)  ──►  Render (layanan ML)
                              │
                              ▼
                        Supabase (Postgres)
```

### 2.1 Supabase

Buat proyek, lalu salin connection string **Session pooler, port 5432** —
bukan Direct connection. Pooler membatasi koneksi per proyek, dan gateway ini
satu proses dengan kueri pendek, jadi kolam kecil sudah cukup
(`DATABASE_POOL_MAX`, bawaan 5).

Skema diterapkan sendiri oleh gateway saat start; tidak ada migrasi manual.

### 2.2 Render

`render.yaml` di akar repositori adalah Blueprint untuk kedua layanan.
Variabel bertanda `sync: false` harus diisi tangan di dasbor:

| Layanan | Variabel | Isi |
|---|---|---|
| `prakira-gateway` | `DATABASE_URL` | Connection string Supabase |
| | `SEED_ADMIN_EMAIL` | Email akun dinas |
| | `SEED_ADMIN_PASSWORD` | Kata sandi akun dinas |
| | `CORS_ORIGINS` | Asal frontend Vercel, mis. `https://prakira.vercel.app` |

Sisanya diisi Blueprint: `SESSION_SECRET` dan `ML_API_TOKEN` dibangkitkan,
`ML_SERVICE_URL` ditulis apa adanya karena `fromService property: host` hanya
mengembalikan nama internal.

Gateway **menolak start** bila `SESSION_SECRET`, `ML_API_TOKEN`,
`SEED_ADMIN_PASSWORD`, atau `DATABASE_URL` kosong saat `NODE_ENV=production`.
Itu disengaja: nilai bawaan yang aman untuk pengembangan bukan nilai yang aman
untuk alamat publik, dan kegagalan saat start jauh lebih mudah dilacak
daripada rahasia bawaan yang diam-diam terpakai.

### 2.3 Vercel

Root directory `frontend`. Satu variabel:

| Variabel | Isi |
|---|---|
| `API_PROXY_TARGET` | URL gateway Render, mis. `https://prakira-gateway.onrender.com` |

Sengaja bukan `NEXT_PUBLIC_`: nilainya hanya dipakai proses Next di server,
sehingga peramban memanggil `/api/*` same-origin, cookie sesi ikut tanpa
konfigurasi CORS, dan alamat internal gateway tidak ikut terkirim ke klien.

### 2.4 Penjaga tidur

`.github/workflows/keepalive.yml` menyentuh kedua layanan tiap 10 menit. Ia
perlu dua **variabel repositori** (Settings → Secrets and variables → Actions →
Variables — bukan Secrets, keduanya URL publik):

| Variabel | Isi |
|---|---|
| `GATEWAY_URL` | `https://prakira-gateway.onrender.com` |
| `ML_SERVICE_URL` | `https://prakira-ml.onrender.com` |

Tanpa keduanya alur itu berjalan dan tidak melakukan apa-apa, bukan gagal.

`/api/health` memanggil `isSeeded()`, yang menyentuh Postgres — jadi satu
permintaan ke gateway sekaligus menjaga Supabase terjaga dan Render hangat.

---

## 3. Yang tidak boleh dilakukan di produksi

**Jangan memperagakan `/retrain` langsung di Render.** Dua alasan yang
terpisah:

1. Cakram Render bersifat sementara. `/retrain` menulis `.pkl` ke disk, dan
   berkas itu lenyap saat instans dinyalakan ulang — termasuk restart yang
   dilakukan Render sendiri. Yang tersisa adalah model dari image, sementara
   metrik yang dipajang berasal dari pelatihan yang sudah hilang.
2. Pelatihan XGBoost pada RAM 512 MB kemungkinan besar kehabisan memori, dan
   instans yang mati di tengah peragaan tidak kembali dalam waktu yang cukup.

Latih ulang di mesin lokal, periksa metriknya, lalu commit `.pkl` dan
`metadata.json` hasilnya. Model yang dikirim adalah model yang dievaluasi —
dan itu bisa diperiksa siapa pun dari repositori.

---

## 4. Pemeriksaan cepat

```bash
curl -s https://prakira-gateway.onrender.com/api/health | jq
curl -s https://prakira-ml.onrender.com/health | jq
```

Gateway yang sehat menjawab `seeded: true` dan mendaftar penyakit yang
tersedia. Bila `seeded` bernilai `false`, penyemaian belum berjalan — periksa
log start, biasanya `DATABASE_URL` menunjuk basis data yang salah.

Permintaan pertama setelah layanan tidur butuh ±50 detik. Itu perilaku paket
gratis Render, bukan kerusakan; `ML_TIMEOUT_MS=60000` di `render.yaml` memang
disetel untuk itu.
