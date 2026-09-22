# Rancangan Edit Video — PRAKIRA (DSDC ANFORCOM 2026)

**Tema: "Kanvas Buletin"** — latar terang, satu kartu mengambang, pil putih bulat penuh.
Pendamping [`konsep-video.html`](./konsep-video.html) · token diambil dari [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)

> Storyboard dan naskah di `konsep-video.html` **tidak diubah**. Dokumen ini hanya lapisan
> visual + gerak + jadwal kerja di atasnya.

---

## 0. Branch rekaman — baca ini sebelum menyalakan OBS

**Semua rute di storyboard benar dan ada.** Yang perlu diperhatikan cuma satu: rutenya hidup
di branch **`feat/explainability-simulator-prioritas`**, bukan di `master`.

```bash
git checkout feat/explainability-simulator-prioritas
```

Aman dilakukan: branch ini adalah `master` **+ 4 commit**, dan `merge-base`-nya persis di
`73cc7aa` (HEAD `master` sekarang). Artinya branch ini **superset** — tidak ada satu pun isi
`master` yang hilang, termasuk Leptospirosis dan tile peta CARTO.

| Rute | Ada di `master`? | Ada di branch? | Dipakai scene |
|---|---|---|---|
| `/`, `/dashboard`, `/tindakan`, `/warga*`, `/verifikasi`, `/analitik`, `/tentang` | ✅ | ✅ | 01–06 |
| **`/model`** — "Transparansi Model" | ❌ | ✅ | **05** |
| **`/prioritas`** — "Prioritas Terdampak" | ❌ | ✅ | cadangan |
| `/simulasi` · `/mesin-waktu` · `/buletin` | ❌ | ✅ | belum dipakai |

> **Kenapa ini penting.** Scene 05 sudah direkam dan menampilkan `/model`, berarti take itu
> diambil dari branch ini. Scene 03 **wajib direkam dari branch yang sama**, kalau tidak nav
> konsol dan daftar penyakitnya beda antar-scene dan ketahuan di video.

### Scene 03 — `/tindakan`, bukan `/prioritas`

Storyboard menulis "(`/tindakan` atau `/prioritas`)". Keduanya ada, tapi isinya berbeda:

- **`/tindakan`** → `EarlyActionCenter`. Antrean tindakan, tab **"Selesai"**, tombol
  **"Tandai semua berjalan"**. **Ini yang cocok dengan naskah Scene 03.**
- **`/prioritas`** → `PriorityBoard`, "Prioritas Terdampak". Halaman lain: risiko × populasi,
  dua peringkat berdampingan + kalkulator dampak. Bukan Early Action Center.

Satu koreksi kecil untuk kolom Aksi Kursor: tombol aslinya berbunyi **"Tandai semua berjalan"**,
bukan "Tandai Selesai / Disposisi". Naskah suara Scene 03 tidak menyebut tombol ini, jadi
VO-nya aman — cukup betulkan catatan aksi kursornya.

**Bonus kalau sempat:** `/prioritas` sangat kuat untuk rubrik Originalitas — ia menampilkan
kelemahan skor risikonya sendiri secara terbuka (persentil terhadap sejarah kecamatan bisa
menaruh kecamatan 98 ribu jiwa di atas yang 192 ribu jiwa). Sisipan 6 detik di ujung Scene 03
kalau waktu memungkinkan. Jangan dipaksakan.

---

## 1. Sistem visual

### 1.1 Prinsip

Empat aturan. Kalau ragu, kembali ke sini.

1. **Latar terang, bukan gelap.** Produknya instrumen lembaga publik. Latar gelap membuatnya terlihat seperti dasbor kripto.
2. **Satu benda mengambang.** Rekaman layar adalah satu kartu. Tidak ada kartu kedua yang mengambang bersamaan.
3. **Putih adalah chrome, warna adalah data.** Semua pil/bar UI video = putih murni. Satu-satunya warna jenuh di layar berasal dari aplikasi itu sendiri (ramp risiko).
4. **Gerak menjelaskan, bukan menghias.** Tidak ada spin, glitch, zoom-blur, light leak, atau transisi bawaan CapCut yang ramai.

### 1.2 Palet (semua dari token produk)

| Peran | Hex | Token |
|---|---|---|
| Latar kanvas (atas) | `#FFFFFF` | `paper-0` |
| Latar kanvas (bawah) | `#EFF5F9` | `sand-50` |
| Sapuan aurora | `#7FB8C0` @ 14% & `#0B4A57` @ 8% | `brand-300` / `brand-700` |
| Permukaan pil & kartu | `#FFFFFF` | `paper-0` |
| Garis rambut | `rgba(14,34,37,.06)` | `shadow-hairline` |
| Teks utama | `#0E2225` | `paper-900` |
| Teks sekunder | `#5A6C6E` | `paper-600` |
| Aksen aktif / progress | `#0B4A57` | `brand-700` |
| Aksen tautan / garis penunjuk | `#17808F` | `brand-500` |
| Chip eyebrow | `#D6E9EC` | `brand-100` |
| Risiko — Rendah / Waspada / Siaga | `#1F5132` / `#D4933A` / `#A8442C` | `risk-*` |

**Dilarang:** hue di luar tabel ini. Tidak ada ungu, tidak ada neon, tidak ada emas.

### 1.3 Bayangan

Bertinta merek `#0E2225`, bukan hitam.

```
kartu utama  : 0 2px 4px rgba(14,34,37,.04), 0 40px 80px -24px rgba(14,34,37,.20)
pil putih    : 0 1px 2px rgba(14,34,37,.04), 0 12px 28px -12px rgba(14,34,37,.14)
facecam      : 0 4px 8px rgba(14,34,37,.06), 0 28px 56px -20px rgba(14,34,37,.22)
```

### 1.4 Tipografi

**Inter** saja (variable). `font-feature-settings: "cv05" 1,"cv08" 1,"ss03" 1,"calt" 1`, `cv11` mati.
Angka apa pun: `tabular-nums slashed-zero`.

| Peran | Ukuran @1080p | Bobot | Tracking |
|---|---:|---:|---|
| Judul kartu penuh (title/closing) | 92px | 700 | −0.025em |
| Sub-judul kartu penuh | 34px | 500 | 0 |
| Angka dampak (counter) | 128px | 700 | −0.03em |
| Label pil bab | 28px | 600 | +0.01em |
| Eyebrow / chip uppercase | 20px | 600 | +0.12em |
| Nama presenter (lower third) | 34px | 600 | 0 |
| Peran presenter | 24px | 500 | 0 |
| Chip rute | 24px | 500 | +0.02em |
| Callout | 26px | 600 | 0 |

---

## 2. Tata letak layar (angka pasti, 1920×1080)

> **Rasio terkunci 16:9, desktop-only.** Kanvas video 1920×1080 dan kartu rekaman layar
> 1600×900 sama-sama tepat 16:9 — rekaman layar masuk **tanpa crop, tanpa letterbox,
> tanpa pillarbox**. Jangan pernah ubah salah satunya sendirian.
>
> Konsekuensinya: **jangan demokan tampilan mobile / responsif.** PRAKIRA adalah konsol
> kerja desktop. Memperkecil jendela browser untuk memamerkan responsivitas cuma
> memakan detik yang mahal dan membuat teks jadi tidak terbaca setelah diskalakan 83.3%.
> Semua take direkam di satu ukuran jendela yang sama dari awal sampai akhir.

```
┌─────────────────────────────────────────────────────────────┐
│                    ╭──────────────────────╮                 │  y=32
│                    │ ◆ 02 · Konsol Dinkes │  ← pil bab      │  h=68
│                    ╰──────────────────────╯                 │  y=100
│   ╭───────────────────────────────────────────────────╮     │  y=132
│   │                                                   │     │
│   │        REKAMAN LAYAR (kartu mengambang)           │     │
│   │              1600 × 900 @ radius 28               │     │
│   │                                          ╭────╮   │     │
│   ╰──────────────────────────────────────────┤face├───╯     │  y=1032
│   ╭──────────────────────╮                   ╰────╯         │
│   │ ● Anggota 2 · Console│  ← lower third                   │
│   ╰──────────────────────╯                                  │
└─────────────────────────────────────────────────────────────┘
```

| Elemen | Ukuran | Posisi (kiri-atas) | Posisi CapCut (dari tengah) | Radius |
|---|---|---|---|---|
| **Kartu rekaman layar** | 1600 × 900 | (160, 132) | X `0`, Y `+84` | 28 |
| **Pil bab** (atas-tengah) | auto × 68 | y 32, center x | X `0`, Y `−474` | full |
| **Facecam** (bawah-kanan) | 344 × 344 | center (1580, 852) | X `+620`, Y `+312` | full (lingkaran) |
| **Lower third** (bawah-kiri) | auto × 88 | x 200, center y 962 | Y `+422` | full |
| **Callout chip** | auto × 56 | menyesuaikan | — | 28 |

**Skala rekaman layar: 83.3%** (1600 ÷ 1920).

Facecam 344px = **17.9% lebar layar** — masuk anjuran storyboard (18–20%), ring putih 6px + bayangan `pop`.

### 2.1 Facecam berpindah per scene

Facecam menutupi sudut kanan-bawah kartu. Pindahkan kalau menutupi hal penting:

| Scene | Konten padat | Posisi facecam |
|---|---|---|
| 01 | kartu penuh / landing | layar penuh atau kanan-bawah |
| 02 | peta kiri, panel detail kanan, grafik bawah | **kiri-bawah** (X `−620`) |
| 03 | daftar antrean kiri | **kanan-bawah** |
| 04 | form lapor tengah | **kanan-bawah** |
| 05 | tabel metrik lebar | **kanan-atas** (X `+620`, Y `−280`) |
| 06 | kartu penuh | layar penuh |

**Aturan wajib Rulebook §8.2:** wajah ada dari frame pertama sampai frame terakhir. Lingkaran facecam tetap menyala **di atas semua kartu motion penuh** — jangan pernah dimatikan, bahkan saat title card.

---

## 3. Bahasa gerak

### 3.1 Kurva & durasi

Token produk 140/200/320ms terlalu cepat untuk video. Naikkan satu tingkat:

| Peran | Durasi | Ease |
|---|---:|---|
| Pil / chip masuk | 320ms | `cubic-bezier(.2,.7,.3,1)` |
| Kartu masuk / keluar | 480ms | `cubic-bezier(.2,.7,.3,1)` |
| Potong antar-scene | 400ms | `cubic-bezier(.5,0,.2,1)` |
| Counter angka | 1400ms | `cubic-bezier(.2,.7,.3,1)` |
| Sapuan latar (aurora) | 24s loop | linear |

**Tidak ada overshoot / bounce** pada chrome. Overshoot hanya boleh pada counter angka (maks 1.02×).

### 3.2 Empat transisi resmi

Cuma empat. Sisanya dilarang.

1. **Card Handoff** (antar-scene demo, S02→S03→S04→S05)
   Kartu rekaman turun skala 83.3% → 80% + opacity 100% → 0 (240ms) · rekaman berikutnya masuk 80% → 83.3% + opacity 0 → 100% (240ms, delay 160ms) · pil bab ber-wipe vertikal ganti label. Latar **tidak pernah** ikut bergerak.

2. **Plate Swap** (demo ↔ kartu motion penuh, mis. S01→S02, S05→S06)
   Kartu rekaman keluar seperti di atas · kartu motion penuh masuk dengan opacity 0→100 + skala 1.02→1.00 (480ms). Facecam tetap diam di tempat.

3. **Punch-In** (menyorot detail, mis. Kode Lacak, angka prediksi)
   Skala 83.3% → 118% dengan titik anchor di elemen yang disorot (600ms) · tahan 1.8–2.4s · kembali (600ms). Ditemani satu callout chip.

4. **Hairline Cut** (dalam satu halaman, ganti tab/filter)
   Potong keras. Tanpa transisi. Cukup pil bab yang berkedip ganti label 200ms.

**Dilarang keras:** zoom blur, glitch, RGB split, light leak, whip pan, spin, page curl, semua preset "Trending" CapCut, dan sound effect *whoosh*.

### 3.3 Elemen penunjuk (callout)

Chip putih + garis penunjuk `brand-500` 2px yang menggambar diri (280ms) dari chip ke elemen UI.
Maksimal **2 chip** di layar bersamaan. Umur hidup 3.5–4.5s lalu keluar fade 240ms.
Kursor: pakai OBS highlight kursor lingkaran `#17808F` @ 25%, radius 44px — jangan pakai efek klik "ripple" bawaan yang ramai.

---

## 4. Sheet edit per scene

Legenda kolom **Lapis**: `PLATE` = latar animasi (Aset A1) · `CARD` = rekaman layar · `FULL` = kartu motion penuh · `CAM` = facecam.

### Scene 01 — 00:00 → 01:10 (70 dtk) · Anggota 1

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 00:00–00:09 | PLATE + **A2** + CAM | Title card: wordmark PRAKIRA + subjudul + chip ANFORCOM | Plate Swap masuk. Facecam **sudah menyala di detik 0** |
| 00:09–00:24 | PLATE + CAM besar | Presenter frame besar (lingkaran 720px, tengah-kiri), pil identitas tim di kanan | Lower third masuk 00:10, keluar 00:16 |
| 00:24–00:47 | PLATE + **A3** + CAM | Timeline lag iklim: pemicu minggu 0 → lonjakan kasus minggu 2–4 | Plate Swap. Kurung "2–4 minggu" menggambar diri |
| 00:47–00:59 | PLATE + CARD + CAM | Landing page `/` — scroll pelan ke bagian 3 pilar | Card Handoff masuk. Scroll konstan, **tanpa** percepatan |
| 00:59–01:10 | PLATE + **A4** + CAM | Tiga pilar naik satu per satu (stagger 180ms) | Plate Swap. Pilar ke-3 tahan sampai potong |

Pil bab: `01 · Masalah & Konsep` — chip rute `/`

---

### Scene 02 — 01:10 → 02:00 (50 dtk) · Anggota 2

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 01:10–01:14 | CARD | `/dashboard` muncul, peta 16 kecamatan sudah termuat | Card Handoff. **Jangan** rekam state loading |
| 01:14–01:22 | CARD | Ganti filter penyakit DBD → ISPA → kembali DBD | Hairline Cut, pil bab kedip |
| 01:22–01:34 | CARD | Klik Kecamatan Tembalang, panel detail terbuka | Callout ①: "Estimasi + interval ketidakpastian" |
| 01:34–01:44 | CARD | **Punch-In** ke angka estimasi + label cakupan data | Punch-In 118%, tahan 2.2s |
| 01:44–02:00 | CARD | Scroll ke grafik deret waktu curah hujan vs kasus | Callout ②: "Korelasi curah hujan ekstrem" |

Pil bab: `02 · Konsol Dinkes` — chip rute `/dashboard` · Facecam **kiri-bawah**

---

### Scene 03 — 02:00 → 02:50 (50 dtk) · Anggota 2

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 02:00–02:06 | CARD | `/tindakan` — Early Action Center | Card Handoff |
| 02:06–02:16 | CARD | Filter ke Level 3 (Siaga) | Hairline Cut · badge Siaga `#A8442C` sudah jadi aksen alami |
| 02:16–02:34 | CARD | Sorot dua cabang rekomendasi | Callout ① "Aksi Kesehatan — larvasida" · ② "Aksi Lingkungan Sirkular — drainase & sampah". **Dua chip bersamaan, ini satu-satunya tempat yang boleh** |
| 02:34–02:50 | CARD | Klik **"Tandai semua berjalan"** → dialog konfirmasi → toast "N tindakan ditandai berjalan" | Punch-In ringan 105% ke toast, 1.2s |

Pil bab: `03 · Early Action Center` — chip rute `/tindakan`

> **Scene 03 adalah satu-satunya yang belum direkam.** Pastikan branch
> `feat/explainability-simulator-prioritas` sudah ter-checkout (§0), zoom browser 115%,
> dan antrean berisi ≥ 5 baris — supaya nav dan densitas UI-nya sama persis dengan
> Scene 02, 04, 05 yang sudah jadi.

---

### Scene 04 — 02:50 → 03:40 (50 dtk) · Anggota 3

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 02:50–02:56 | CARD | `/warga` — **buka di jendela penyamaran** untuk membuktikan tanpa login | Card Handoff · Callout ① "Tanpa login" |
| 02:56–03:06 | CARD | Pilih kecamatan, status kewaspadaan + tips mitigasi tampil | Hairline Cut |
| 03:06–03:24 | CARD | `/warga/lapor` — isi form: gejala + pemicu lingkungan (genangan/sampah) | Ketik dengan kecepatan wajar, jangan tempel sekaligus |
| 03:24–03:34 | CARD | Submit → Kode Lacak `PRK-2026-XXXX` muncul | **Punch-In 118%** ke kode, tahan 2.4s |
| 03:34–03:40 | CARD | `/warga/status`, tempel kode, status tampil | Hairline Cut |

Pil bab: `04 · Portal Warga` — chip rute `/warga` → `/warga/lapor` → `/warga/status`

---

### Scene 05 — 03:40 → 04:35 (55 dtk) · Anggota 3

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 03:40–03:48 | PLATE + **A5** + CAM | Diagram loop verifikasi: Warga → Kode Lacak → Petugas → Sinyal → Model | Plate Swap · garis loop menggambar diri |
| 03:48–04:00 | CARD | `/verifikasi` — konsol petugas, klik "Terima / Verifikasi Laporan" | Card Handoff · Callout ① "Laporan valid jadi sinyal lapangan" |
| 04:00–04:20 | CARD | **`/model`** — Transparansi Model: algoritma, periode latih, backtest, MAE/RMSE | Hairline Cut · Punch-In ke baris metrik, 2.0s |
| 04:20–04:31 | CARD | Scroll ke cakupan data per kecamatan + batasan yang berlaku | Callout ② "Dibandingkan baseline, bukan klaim kosong" |
| 04:31–04:35 | CARD | Batasan sistem & disclaimer etika | Hairline Cut · pil bab jadi `05 · Batasan & Etika` |

Pil bab: `05 · Verifikasi & Transparansi` — chip rute `/verifikasi` → `/model`
Facecam **kanan-atas** (tabel metrik lebar)

> **Sudah direkam.** Sesuaikan sheet ini dengan take yang ada, jangan sebaliknya —
> kalau urutan aslinya beda, tulis ulang barisnya, jangan rekam ulang.

---

### Scene 06 — 04:35 → 05:30 (55 dtk) · Seluruh anggota

| Waktu | Lapis | Isi | Gerak |
|---|---|---|---|
| 04:35–05:05 | PLATE + **A6** + CAM | Tiga counter dampak: **14 hari** · **35%** · **16 kecamatan** | Plate Swap · counter naik 1400ms, stagger 400ms |
| 05:05–05:19 | PLATE + CAM penuh | Tiga presenter frame besar (tiga lingkaran sejajar) + kalimat penutup | Lingkaran masuk stagger 200ms |
| 05:19–05:30 | PLATE + **A7** + CAM | Closing card: lockup PRAKIRA + tagline + nama anggota + ANFORCOM 2026 | Plate Swap · tagline fade-in terakhir, tahan 4s penuh |

Pil bab: `06 · Dampak & Penutup` — tanpa chip rute

> **Frame terakhir tahan 3 detik penuh tanpa gerak.** Juri sering *pause* di frame ini.

---

## 5. Aset yang harus di-generate (Claude Design)

Tujuh aset. Semuanya HTML mandiri 1920×1080 yang di-*play* di browser fullscreen lalu direkam OBS, jadi **tidak perlu chroma key sama sekali**.

| Kode | Aset | Durasi | Dipakai di | Prioritas |
|---|---|---:|---|---|
| **A1** | Frame Plate (latar animasi + sumur kartu + cangkang pil) | loop 24s | seluruh video | **P0 — wajib** |
| **A2** | Title card pembuka | 9s | 00:00 | **P0** |
| **A6** | Counter dampak | 30s | 04:35 | **P0** |
| **A7** | Closing card | 12s | 05:19 | **P0** |
| **A3** | Timeline lag iklim 2–4 minggu | 23s | 00:24 | P1 |
| **A4** | Tiga pilar | 12s | 00:59 | P1 |
| **A5** | Diagram loop verifikasi | 9s | 03:40 | P2 — potong kalau waktu mepet |

**Kalau jam 19:20 belum semua jadi:** kerjakan P0 saja. A3/A4/A5 diganti presenter frame besar + teks pil. Video tetap lengkap dan memenuhi rubrik.

### 5.1 Cara pakai aset

1. Buka HTML di Chrome, `F11` fullscreen, zoom 100%.
2. Rekam dengan OBS (Display Capture 1920×1080, 60fps).
3. Animasi autoplay saat halaman dimuat. Tekan `R` untuk ulang kalau take gagal.
4. Potong bagian kosong di awal/akhir di editor.

---

## 6. Prompt Claude Design — tempel apa adanya

> Tiap prompt sudah membawa token warnanya sendiri, jadi bisa ditempel di sesi baru tanpa konteks tambahan.

### Prompt A1 — Frame Plate (P0, kerjakan pertama)

```
Buat satu halaman HTML mandiri 1920x1080 sebagai LATAR ANIMASI untuk video demo produk.
Ini bukan halaman web biasa — ini pelat latar yang akan direkam layar lalu dipakai sebagai
lapisan paling bawah di video editor. Rekaman layar aplikasi akan ditempel DI ATASNYA nanti.

Kanvas: tepat 1920x1080, overflow hidden, tanpa scrollbar, tanpa margin body.

LAPIS 1 — Latar:
- Gradien linear 160deg dari #FFFFFF (atas) ke #EFF5F9 (bawah).
- Dua blob aurora sangat lembut, blur 180px:
  blob A radial #7FB8C0 opacity 0.14, diameter 1100px, mulai di (-200,-150);
  blob B radial #0B4A57 opacity 0.08, diameter 900px, mulai di (1500,800).
  Keduanya melayang pelan (translate maks 140px, scale 1.0-1.12) dalam loop
  24 detik linear yang mulus dan seamless (posisi akhir = posisi awal).
- Overlay butir halus (grain) opacity 0.035 pakai SVG feTurbulence inline, statis.

LAPIS 2 — Sumur kartu (tempat rekaman layar nanti ditempel):
- Persegi panjang 1600x900 di posisi kiri 160px, atas 132px, border-radius 28px.
- Isi #FFFFFF, border 1px rgba(14,34,37,.06).
- Bayangan: 0 2px 4px rgba(14,34,37,.04), 0 40px 80px -24px rgba(14,34,37,.20).
- Di dalamnya, teks kecil di tengah warna #A3B2B3, 28px, tulisan
  "AREA REKAMAN LAYAR" — ini penanda posisi, akan tertutup nanti.

LAPIS 3 — Cangkang pil bab (kosong, hanya wadah putih):
- Pil di tengah horizontal, atas 32px, tinggi 68px, lebar 560px, border-radius 34px.
- Isi #FFFFFF, border 1px rgba(14,34,37,.06),
  bayangan 0 1px 2px rgba(14,34,37,.04), 0 12px 28px -12px rgba(14,34,37,.14).
- Kosong, tanpa teks — teksnya akan ditambah di video editor.

LAPIS 4 — Lockup merek kecil:
- Kiri-atas (48, 48): titik bulat 14px warna #0B4A57 + teks "PRAKIRA" Inter 26px bobot 700
  warna #0E2225 tracking +0.08em, dan di bawahnya "Sistem Peringatan Dini Risiko Penyakit
  Berbasis Iklim — Kota Semarang" Inter 18px bobot 500 warna #5A6C6E.

Font: Inter dari Google Fonts, font-feature-settings: "cv05" 1,"cv08" 1,"ss03" 1,"calt" 1.
Aturan: tanpa aset eksternal selain Google Fonts. Tanpa interaksi. Tanpa hue di luar hex
yang disebut di atas. Animasi hanya aurora — semua elemen lain diam total.
```

---

### Prompt A2 — Title card pembuka (P0)

```
Buat satu halaman HTML mandiri 1920x1080, kartu pembuka video yang beranimasi otomatis
saat dimuat. Total durasi animasi 9 detik lalu diam.

Latar: gradien linear 160deg #FFFFFF ke #EFF5F9, plus dua blob aurora blur 180px
(#7FB8C0 opacity 0.14 dan #0B4A57 opacity 0.08) yang melayang pelan loop 24s,
plus grain SVG opacity 0.035. Ini harus identik dengan pelat latar video.

Konten, disusun rata tengah vertikal-horizontal:
1. Chip eyebrow: pil #D6E9EC, teks "DSDC ANFORCOM 2026 · UNIVERSITAS DIPONEGORO"
   Inter 20px bobot 600 warna #0B4A57 uppercase tracking +0.12em, padding 12px 28px.
2. Judul "PRAKIRA" Inter 168px bobot 700 warna #0E2225 tracking -0.03em.
3. Sub-judul "Sistem Peringatan Dini Risiko Penyakit Berbasis Iklim"
   Inter 40px bobot 500 warna #5A6C6E.
4. Garis rambut horizontal lebar 200px warna rgba(14,34,37,.12).
5. Baris tiga pil putih kecil sejajar (tinggi 56px, radius 28, border 1px
   rgba(14,34,37,.06), bayangan 0 12px 28px -12px rgba(14,34,37,.14)), masing-masing
   dengan titik 10px berwarna dan teks Inter 24px bobot 600 warna #0E2225:
   - titik #1F5132 — "Prediksi"
   - titik #D4933A — "Aksi"
   - titik #A8442C — "Umpan Balik Warga"

Timeline animasi (ease cubic-bezier(.2,.7,.3,1), semua opacity 0->1 + translateY 24px->0):
0.2s chip - 0.6s judul (durasi 700ms, tambah scale 1.03->1.00) - 1.3s sub-judul -
1.8s garis (lebar 0->200px) - 2.2s / 2.4s / 2.6s tiga pil berurutan.
Setelah 3.6s semua diam sampai 9s. Tanpa fade-out.

Tekan tombol R untuk mengulang seluruh animasi dari awal.
Font Inter dari Google Fonts. Tanpa aset eksternal lain. Tanpa hue di luar hex di atas.
```

---

### Prompt A3 — Timeline lag iklim (P1)

```
Buat satu halaman HTML mandiri 1920x1080 berisi satu diagram timeline yang menganimasikan
dirinya sendiri saat dimuat. Total 23 detik. Ini menjelaskan bahwa pemicu iklim
mendahului lonjakan kasus penyakit 2-4 minggu.

Latar: sama persis dengan pelat video — gradien 160deg #FFFFFF ke #EFF5F9, dua blob
aurora blur 180px (#7FB8C0 @0.14, #0B4A57 @0.08) loop 24s, grain SVG opacity 0.035.

Judul kiri-atas (x 160, y 120):
eyebrow "MENGAPA REAKTIF SELALU TERLAMBAT" Inter 20px 600 #0B4A57 uppercase tracking +0.12em;
di bawahnya "Pemicu iklim terukur 2-4 minggu sebelum kurva kasus"
Inter 56px 700 #0E2225 tracking -0.02em.

Diagram, area x 160-1760, y 300-860:
- Sumbu waktu horizontal, garis 2px #DFE6E6, dengan 7 penanda minggu:
  "Minggu 0","1","2","3","4","5","6" Inter 24px 500 #5A6C6E.
- KURVA ATAS (pemicu iklim): garis 4px warna #2E6F8E, puncak di Minggu 0,
  lalu turun. Label pil putih "Curah hujan ekstrem - Suhu - Kelembaban" dengan
  titik #2E6F8E, dipasang di puncak.
- KURVA BAWAH (kasus): garis 4px warna #A8442C, datar sampai Minggu 2 lalu naik tajam
  puncak di Minggu 3-4. Label pil putih "Lonjakan kasus DBD / ISPA" dengan titik #A8442C.
- Area di bawah kurva kasus diisi gradien #A8442C dari opacity 0.14 ke 0.
- KURUNG PENGUKUR antara puncak biru dan awal naiknya kurva merah: garis vertikal putus-putus
  #A3B2B3 di kedua ujung + garis horizontal 3px #0B4A57 dengan mata panah dua arah, dan
  label pil putih di tengahnya: "JENDELA AKSI: 2-4 MINGGU" Inter 28px 700 #0B4A57.
- Di kanan-bawah, dua pil putih bertumpuk:
  "Sistem lama: bertindak di sini" (titik #A8442C, menunjuk puncak merah)
  "PRAKIRA: bertindak di sini" (titik #0B4A57, menunjuk puncak biru).

Timeline animasi (ease cubic-bezier(.2,.7,.3,1)):
0.2s judul fade+naik - 0.9s sumbu menggambar dari kiri ke kanan 800ms -
1.8s kurva biru menggambar diri via stroke-dashoffset 1400ms - 2.4s label biru masuk -
4.0s kurva merah menggambar diri 1600ms - 4.8s area isi merah fade-in - 5.0s label merah masuk -
6.4s kurung pengukur menggambar diri (garis putus-putus dulu, lalu panah melebar 700ms) -
7.4s label "JENDELA AKSI" muncul dengan scale 1.06->1.00 -
8.4s dan 8.9s dua pil kanan-bawah berurutan.
Setelah 9.6s semua diam sampai 23s.

Tekan R untuk mengulang. Font Inter dari Google Fonts. Tanpa aset eksternal lain.
Tanpa hue di luar hex yang disebut.
```

---

### Prompt A4 — Tiga pilar (P1)

```
Buat satu halaman HTML mandiri 1920x1080, animasi otomatis 12 detik, menampilkan tiga
kartu pilar solusi yang naik berurutan.

Latar: sama dengan pelat video — gradien 160deg #FFFFFF ke #EFF5F9, dua blob aurora
blur 180px (#7FB8C0 @0.14, #0B4A57 @0.08) loop 24s, grain SVG opacity 0.035.

Judul rata tengah, y 150:
eyebrow "TIGA LAPIS SOLUSI PRAKIRA" Inter 20px 600 #0B4A57 uppercase tracking +0.12em;
di bawahnya "Dari sinyal iklim ke tindakan di lapangan" Inter 52px 700 #0E2225 tracking -0.02em.

Tiga kartu putih sejajar, masing-masing 480x420, jarak antar 40px, rata tengah, y 400:
radius 28, isi #FFFFFF, border 1px rgba(14,34,37,.06),
bayangan 0 2px 4px rgba(14,34,37,.04), 0 40px 80px -24px rgba(14,34,37,.20).
Isi tiap kartu (padding 48px):
- Lingkaran nomor 64px, isi #D6E9EC, angka "1"/"2"/"3" Inter 30px 700 #0B4A57.
- Judul Inter 34px 700 #0E2225.
- Deskripsi Inter 24px 500 #5A6C6E, line-height 1.5.
- Di dasar kartu: pil kecil putih ber-border dengan titik berwarna dan label Inter 20px 600.

Kartu 1 — "Prediksi Machine Learning" / "Model XGBoost dengan variabel iklim ber-lag
2-4 minggu, dilengkapi interval ketidakpastian." / pil: titik #2E6F8E, label "Lag Iklim"
Kartu 2 — "Mesin Rekomendasi Aksi" / "Aturan deterministik menerjemahkan kelas risiko
menjadi antrean tindakan berprioritas." / pil: titik #D4933A, label "Aksi Preventif"
Kartu 3 — "Loop Verifikasi Warga" / "Laporan warga diverifikasi petugas dan kembali
menjadi sinyal lapangan bagi sistem." / pil: titik #1F5132, label "Umpan Balik"

Di bawah tiga kartu, satu garis alur horizontal 3px #7FB8C0 yang menggambar diri dari
kartu 1 ke kartu 3 dengan mata panah, dan di tengahnya pil putih
"Prediksi > Aksi > Bukti Lapangan" Inter 26px 600 #0B4A57.

Timeline (ease cubic-bezier(.2,.7,.3,1), kartu masuk opacity 0->1 + translateY 40px->0, 600ms):
0.2s judul - 0.9s kartu 1 - 1.08s kartu 2 - 1.26s kartu 3 (stagger 180ms) -
2.2s garis alur menggambar 900ms - 2.9s pil alur muncul.
Setelah 3.6s diam sampai 12s.

Tekan R untuk mengulang. Font Inter dari Google Fonts. Tanpa aset eksternal lain.
Tanpa hue di luar hex yang disebut.
```

---

### Prompt A5 — Diagram loop verifikasi (P2)

```
Buat satu halaman HTML mandiri 1920x1080, animasi otomatis 9 detik: diagram alur melingkar
yang menunjukkan laporan warga menjadi sinyal untuk model.

Latar: sama dengan pelat video — gradien 160deg #FFFFFF ke #EFF5F9, dua blob aurora
blur 180px (#7FB8C0 @0.14, #0B4A57 @0.08) loop 24s, grain SVG opacity 0.035.

Judul kiri-atas (x 160, y 120):
eyebrow "LOOP VERIFIKASI" Inter 20px 600 #0B4A57 uppercase tracking +0.12em;
"Laporan warga menjadi bukti lapangan" Inter 56px 700 #0E2225 tracking -0.02em.

Diagram melingkar di tengah (pusat 960,640, radius 300). Lima simpul, tiap simpul adalah
pil putih (tinggi 84, radius 42, border 1px rgba(14,34,37,.06),
bayangan 0 12px 28px -12px rgba(14,34,37,.14)) berisi lingkaran ikon 48px + teks
Inter 28px 600 #0E2225. Urutan searah jarum jam mulai dari atas:
1. atas — "Warga melapor" (lingkaran #D6E9EC)
2. kanan-atas — "Kode Lacak Unik" (lingkaran #D6E9EC, baris kedua teks kecil
   "PRK-2026-0148" Inter 20px 500 #5A6C6E)
3. kanan-bawah — "Petugas memverifikasi" (lingkaran #D6E9EC)
4. kiri-bawah — "Sinyal lapangan tervalidasi" (lingkaran isi #EDF4EC, titik #1F5132)
5. kiri-atas — "Model & Antrean Aksi" (lingkaran #D6E9EC)

Busur penghubung antar simpul: garis 3px #7FB8C0 dengan mata panah kecil di ujung,
mengikuti lingkaran.

Di pusat lingkaran: teks "TRANSPARAN & DAPAT DIAUDIT" Inter 26px 700 #0B4A57
tracking +0.06em, rata tengah dua baris.

Timeline (ease cubic-bezier(.2,.7,.3,1)):
0.2s judul - 0.8s simpul 1 masuk (opacity 0->1, scale 0.94->1, 450ms) -
lalu busur 1->2 menggambar 400ms, lalu simpul 2, dan seterusnya berantai
sampai busur 5->1 tertutup pada 5.4s - 5.8s teks pusat muncul dengan scale 1.05->1.00.
Setelah 6.4s diam sampai 9s.

Tekan R untuk mengulang. Font Inter dari Google Fonts. Tanpa aset eksternal lain.
Tanpa hue di luar hex yang disebut.
```

---

### Prompt A6 — Counter dampak (P0)

```
Buat satu halaman HTML mandiri 1920x1080, animasi otomatis 30 detik: tiga kartu dampak
dengan angka yang menghitung naik.

Latar: sama dengan pelat video — gradien 160deg #FFFFFF ke #EFF5F9, dua blob aurora
blur 180px (#7FB8C0 @0.14, #0B4A57 @0.08) loop 24s, grain SVG opacity 0.035.

Judul rata tengah, y 140:
eyebrow "PROYEKSI DAMPAK DI KOTA SEMARANG" Inter 20px 600 #0B4A57 uppercase tracking +0.12em;
"Apa yang berubah kalau kota bertindak lebih awal" Inter 54px 700 #0E2225 tracking -0.02em.

Tiga kartu putih sejajar 500x460, jarak 44px, rata tengah, y 380:
radius 28, isi #FFFFFF, border 1px rgba(14,34,37,.06),
bayangan 0 2px 4px rgba(14,34,37,.04), 0 40px 80px -24px rgba(14,34,37,.20).
Isi (padding 48, rata kiri):
- Pil label kecil di atas: teks Inter 20px 600 uppercase tracking +0.1em.
- Angka besar Inter 128px 700 tracking -0.03em, font-variant-numeric: tabular-nums slashed-zero.
- Satuan Inter 40px 600 #5A6C6E sejajar dasar angka.
- Keterangan Inter 24px 500 #5A6C6E line-height 1.5.

Kartu 1: pil "WAKTU RESPON" latar #D6E9EC teks #0B4A57 - angka "14" warna #0B4A57 -
  satuan "hari" - keterangan "Lebih cepat sebelum kurva kasus mencapai puncaknya."
Kartu 2: pil "EFISIENSI LOGISTIK" latar #FDF6E9 teks #D4933A - angka "35" warna #D4933A -
  satuan "%" - keterangan "Alokasi abate dan fogging tepat sasaran di kecamatan paling berisiko."
Kartu 3: pil "CAKUPAN KOTA" latar #EDF4EC teks #1F5132 - angka "16" warna #1F5132 -
  satuan "kecamatan" - keterangan "Sinergi lintas dinas kesehatan dan kebersihan lingkungan."

Di bawah tiga kartu, satu pil putih lebar rata tengah, tinggi 88, radius 44:
"PRAKIRA — Membaca Iklim, Menggerakkan Aksi, Melindungi Semarang"
Inter 34px 700 #0E2225, dengan titik 12px #0B4A57 di depannya.

Timeline (ease cubic-bezier(.2,.7,.3,1)):
0.2s judul - 0.9s / 1.3s / 1.7s tiga kartu masuk berurutan (opacity 0->1, translateY 40->0, 600ms).
Setiap angka menghitung dari 0 ke nilai akhir selama 1400ms, mulai 300ms setelah kartunya masuk,
dengan easing sama dan overshoot maksimal 1.02 pada scale kartu.
3.6s pil tagline masuk. Setelah 4.4s semua diam sampai 30s.

Tekan R untuk mengulang. Font Inter dari Google Fonts. Tanpa aset eksternal lain.
Tanpa hue di luar hex yang disebut.
```

---

### Prompt A7 — Closing card (P0)

```
Buat satu halaman HTML mandiri 1920x1080, animasi otomatis 12 detik: kartu penutup video.
Frame terakhir harus rapi karena juri sering menjeda di sini.

Latar: sama dengan pelat video — gradien 160deg #FFFFFF ke #EFF5F9, dua blob aurora
blur 180px (#7FB8C0 @0.14, #0B4A57 @0.08) loop 24s, grain SVG opacity 0.035.

Susunan rata tengah vertikal:
1. Titik bulat 20px #0B4A57 di atas wordmark.
2. "PRAKIRA" Inter 148px 700 #0E2225 tracking -0.03em.
3. "Membaca Iklim - Menggerakkan Aksi - Melindungi Semarang" Inter 38px 600 #0B4A57.
4. Garis rambut 1px lebar 520px rgba(14,34,37,.12).
5. Blok tim: eyebrow "TIM [NAMA TIM]" Inter 20px 600 #5A6C6E uppercase tracking +0.12em,
   lalu tiga pil putih sejajar (tinggi 64, radius 32, border 1px rgba(14,34,37,.06),
   bayangan 0 12px 28px -12px rgba(14,34,37,.14)), masing-masing berisi lingkaran inisial
   48px isi #D6E9EC teks #0B4A57 Inter 22px 700, plus nama Inter 26px 600 #0E2225 dan
   peran Inter 19px 500 #5A6C6E di baris kedua:
   "[Anggota 1] — Problem & Concept", "[Anggota 2] — Console & Action Engine",
   "[Anggota 3] — Citizen & ML Transparency".
6. Di paling bawah, baris pil kecil: "DSDC ANFORCOM 2026", "UNIVERSITAS DIPONEGORO",
   "SUBTEMA 2 — ECO-HEALTH PLATFORMS", Inter 20px 600 #5A6C6E tracking +0.08em.

Timeline (ease cubic-bezier(.2,.7,.3,1)):
0.3s titik + wordmark (scale 1.04->1.00, opacity 0->1, 700ms) - 1.1s tagline -
1.6s garis melebar 0->520px - 2.1s eyebrow tim - 2.4s/2.6s/2.8s tiga pil anggota berurutan -
3.4s baris pil bawah.
Setelah 4.2s benar-benar diam sampai 12s. Tanpa fade-out, tanpa gerak sisa.

Tekan R untuk mengulang. Font Inter dari Google Fonts. Tanpa aset eksternal lain.
Tanpa hue di luar hex yang disebut.
```

---

## 7. Setup rekaman

### 7.1 OBS

| Pengaturan | Nilai |
|---|---|
| Base & Output resolution | 1920 × 1080 |
| FPS | 60 |
| Downscale filter | Lanczos |
| Output mode | Advanced → Recording |
| Encoder | **NVENC H.264** (LOQ punya GPU NVIDIA) |
| Rate control | CQP, CQ **18** |
| Preset | Quality · Profile high · Keyframe 2s |
| Format rekaman | **mkv** (aman kalau crash), remux ke mp4 setelahnya |
| Audio | 48 kHz, track terpisah untuk mic |

### 7.2 Browser (untuk take rekaman layar)

- Chrome, **jendela penyamaran** (bersih dari ekstensi & bookmark).
- **Zoom 115%.** Penting: kartu diskalakan ke 83.3% di editor, jadi 115% × 83.3% ≈ 96% — teks tetap terbaca. Jangan 125%: lebar CSS jatuh ke 1536px, tepat di batas breakpoint `2xl` Tailwind, bisa reflow begitu scrollbar muncul.
- `F11` fullscreen — tidak ada tab bar, tidak ada address bar. Rute ditampilkan lewat chip di pil bab, bukan lewat address bar.
- Matikan notifikasi Windows: **Focus Assist → Alarms only**.
- Kursor: aktifkan highlight lingkaran `#17808F` @ 25%, radius 44px. Jangan pakai efek klik ripple.

### 7.3 Urutan rekaman — VO dulu, layar belakangan

Ini menghemat 1–2 jam. Jangan dibalik.

1. **Rekam VO + facecam dulu**, per scene, sesuai naskah. Ini yang mengunci tempo.
2. Susun VO di timeline, cek total durasinya masuk 5:30.
3. **Baru rekam layar** sambil mendengarkan playback VO lewat headphone, supaya klik dan scroll jatuh tepat waktu.

Kalau dibalik (layar dulu), VO harus dipaksa mengikuti timing layar dan akan terdengar terburu-buru.

**Facecam:** rekam dengan profil OBS terpisah (scene isi kamera fullscreen 1920×1080) atau aplikasi Camera Windows. Kasih **tepuk tangan sekali** di awal tiap take untuk titik sinkron.

### 7.4 Data sebelum rekaman

Pastikan sebelum take:
- Ada minimal 1 kecamatan berstatus **Siaga** dan 1 **Waspada**. Kalau semua Rendah, layar jadi hijau semua dan cerita risikonya hilang.
- Antrean `/tindakan` berisi ≥ 5 baris.
- `/verifikasi` punya ≥ 3 laporan menunggu.
- `/analitik` sudah punya hasil backtest, bukan status kosong.
- **Jangan pernah merekam state loading atau skeleton.** Muat halaman, tunggu selesai, baru mulai rekam.

---

## 8. Setup editor

### 8.1 Susunan track (dari bawah ke atas)

```
V1  A1 Frame Plate (loop 24s, disambung menutup 5:30)
V2  Rekaman layar / kartu motion penuh (A2-A7)
V3  Facecam (mask lingkaran 344px + ring putih)
V4  Pil bab + chip rute
V5  Lower third
V6  Callout chip + garis penunjuk
A1  VO
A2  Musik latar (-22 dB, ducking -6 dB saat VO)
```

### 8.2 Cara membulatkan sudut rekaman layar

**CapCut Desktop (disarankan, paling cepat):**
Pilih klip rekaman layar → tab **Mask** → **Rectangle** → set Width/Height agar pas 1600×900 → geser slider **Corner radius** sampai ≈ 28px → Feather 0. Lalu set Scale 83.3%, Position X `0`, Y `+84`.

**Premiere Pro:**
Buat shape rounded-rectangle 1600×900 radius 28 di Essential Graphics pada layer di atas → pada klip rekaman layar terapkan **Track Matte Key** → Matte = layer shape → Composite Using = Matte Alpha.

**DaVinci Resolve:**
Node → Window → Rectangle → Soft 0, atur Border Radius.

### 8.3 Facecam lingkaran

Mask **Circle**, diameter 344px, Feather 0. Ring putih 6px = satu lingkaran putih 356px di track bawahnya. Bayangan `pop` = duplikat lingkaran hitam opacity 22%, blur 40, offset Y +20, di track paling bawah dari grup facecam.

### 8.4 Audio

- VO: High-pass 80 Hz → Compressor rasio 3:1 threshold −18 dB → Normalize ke **−14 LUFS** (standar YouTube) → Limiter −1 dBTP.
- Musik: instrumental tenang, bebas royalti, **−22 dB**, ducking −6 dB saat VO aktif. Storyboard menyebut BGM 10–15% — patuhi.
- Fade-in musik 1.5s di awal, fade-out 2s di akhir.
- Ruang senyap 0.4s sebelum kata pertama dan setelah kata terakhir.

### 8.5 Ekspor

| Pengaturan | Nilai |
|---|---|
| Resolusi | 1920 × 1080 |
| FPS | 60 (samakan dengan timeline) |
| Codec | H.264, encoder hardware **NVENC** |
| Bitrate | VBR 2-pass, target 16 Mbps, maks 24 Mbps |
| Audio | AAC 48 kHz, 320 kbps, stereo |
| Nama file | `Anforcom2026_DSDC_[Tim]_[Karya].mp4` |

---

## 9. Jadwal kerja 15:00 → 24:00

Sembilan jam. Blok bertanda **⛔** adalah titik keputusan — kalau lewat waktunya, potong lingkup.

**Posisi awal jam 15:00:** Scene 01, 02, 04, 05, 06 sudah punya VO + facecam + rekaman layar.
**Yang belum ada: Scene 03, dan seluruh aset A1–A7.** Jadwal di bawah sudah menyesuaikan itu.

| Jam | Blok | Isi | Keluaran |
|---|---|---|---|
| 15:00–15:15 | Persiapan | `git checkout feat/explainability-simulator-prioritas`. Nyalakan backend + frontend. Data seed: ≥1 Siaga, ≥1 Waspada, antrean `/tindakan` ≥5 baris. Focus Assist on. | Aplikasi siap direkam |
| 15:15–15:45 | Generate | Tempel **Prompt A1, A2, A6, A7** (P0) ke Claude Design | 4 aset HTML |
| 15:45–16:05 | Generate | Tempel **Prompt A3, A4, A5** (P1/P2) | 3 aset HTML |
| 16:05–16:25 | Rekam aset | Buka tiap HTML, F11, rekam OBS. 1 take + 1 cadangan per aset | 7 klip mp4 |
| 16:25–17:10 | **Scene 03** | VO + facecam dulu, baru rekam layar `/tindakan` sambil dengar playback VO. Zoom 115%, branch yang sama. | Klip Scene 03 |
| 17:10–17:35 | Inventaris | Kumpulkan semua take lama + baru di satu folder. Susun VO 6 scene di timeline, ukur total. **⛔ Harus ≤ 5:45** — kalau lebih, pangkas kalimat sekarang | Timeline audio terkunci |
| 17:35–17:55 | Istirahat | Makan. Sisa 6 jam butuh kepala jernih | — |
| 17:55–18:10 | **⛔ Titik potong** | Kalau A3/A4/A5 belum jadi atau jelek — **buang sekarang**, ganti presenter frame besar. Jangan menyimpan keputusan ini untuk nanti | Daftar aset final |
| 18:10–19:45 | Rakit kasar | Pasang V1 plate, V2 layar/aset, V3 facecam. Sinkronkan ke VO. Belum ada teks | Rough cut utuh 5:30 |
| 19:45–21:15 | Chrome & gerak | Pil bab tiap scene, lower third, callout, Punch-In, Card Handoff | Fine cut |
| 21:15–21:50 | Audio & warna | Normalize −14 LUFS, musik + ducking, cek kontras teks | Siap ekspor |
| 21:50–22:20 | Ekspor | NVENC 1080p60. **Tonton penuh sekali** sambil isi checklist §10 | mp4 final |
| 22:20–22:55 | Upload | YouTube, judul `Anforcom2026_DSDC_[Tim]_[Karya]`, **visibilitas Publik**. Tunggu proses sampai 1080p tersedia | Link publik |
| 22:55–23:15 | Submit | Tempel link ke formulir. Cek link dari HP / mode penyamaran | Terkirim |
| 23:15–24:00 | Cadangan | Buffer 45 menit. Jangan diisi pekerjaan baru | — |

> **Aturan "VO dulu" sekarang hanya berlaku untuk Scene 03.** Lima scene lain sudah terkunci —
> sheet edit di §4 menyesuaikan take yang ada, bukan sebaliknya. Kalau urutan aksi di take lama
> berbeda dari §4, **tulis ulang §4**. Rekam ulang adalah pilihan terakhir.

### Aturan pemangkasan kalau tertinggal

Potong dari atas daftar ini, satu per satu:

1. A5 diagram loop (Scene 05) → ganti potong langsung ke `/verifikasi`
2. Callout chip → sisakan hanya di Scene 02 dan 03
3. A4 tiga pilar → ganti presenter frame besar + tiga pil teks
4. A3 timeline lag → ganti presenter frame besar
5. Musik latar → hilangkan (VO bersih tetap lolos rubrik "audio jernih")

**Jangan pernah dipotong:** facecam terus-menerus (aturan wajib), A1 plate, A2 title, A6 impact, A7 closing, dan live demo Scene 02–05 (bobot rubrik terbesar: Progres Implementasi 20% + Impact Projection 20%).

---

## 10. Checklist sebelum upload

**Kepatuhan aturan**
- [ ] Durasi antara 3:00 dan 7:00 — target 5:30
- [ ] Resolusi 1920×1080
- [ ] **Wajah presenter terlihat dari frame 0:00 sampai frame terakhir, tanpa putus**
- [ ] Judul file & judul YouTube: `Anforcom2026_DSDC_[Tim]_[Karya]`
- [ ] Visibilitas YouTube: **Publik** (bukan Unlisted)
- [ ] Link diuji di mode penyamaran / HP orang lain

**Isi**
- [ ] Semua take direkam dari branch yang sama (`feat/explainability-simulator-prioritas`) — nav konsol identik di semua scene
- [ ] Tidak ada frame berisi skeleton / spinner / state kosong
- [ ] Interval ketidakpastian dan label cakupan data terlihat jelas minimal sekali
- [ ] Kalimat "alat pendukung keputusan, bukan pengganti diagnosa medis" terdengar **dan** terlihat di layar
- [ ] Kode Lacak terbaca jelas saat Punch-In
- [ ] Hubungan genangan/sampah ↔ DBD/ISPA disebut eksplisit (rubrik Kesesuaian Tema 15%)

**Visual**
- [ ] Tidak ada hue di luar palet §1.2
- [ ] Facecam tidak menutupi angka, tombol, atau legenda peta di scene mana pun
- [ ] Semua teks di layar terbaca saat video diputar di jendela kecil
- [ ] Tidak ada transisi dari daftar terlarang §3.2
- [ ] Frame terakhir diam 3 detik penuh

**Audio**
- [ ] Loudness −14 LUFS, peak ≤ −1 dBTP
- [ ] Musik ≤ 15% dari level VO
- [ ] Tidak ada klik / pop / napas keras di sambungan potongan
