# PRAKIRA Design System — "Buletin"

**Sistem visual untuk platform peringatan dini kesehatan-iklim.**
Pendamping [`PRD.md`](./PRD.md) · Versi 2.3 · 26 Agustus 2026

> **Status dokumen.** Versi 1.0 ditulis sebagai rencana, lalu kode bergerak lebih jauh
> dari rencananya. Versi 2.0 membalik arahnya: **yang tertulis di sini adalah yang
> benar-benar dikirim**, dibaca langsung dari `frontend/tailwind.config.ts`,
> `frontend/src/app/globals.css`, dan komponen di `frontend/src/components/`.
> Bagian yang masih menyimpang dari aturan dicatat apa adanya di [§12](#12-utang-desain-drift-ledger),
> bukan disembunyikan.
>
> Sumber kebenaran, berurutan: `tailwind.config.ts` → `globals.css` → dokumen ini.
> Kalau ketiganya berbeda, kodenya yang menang dan dokumen ini yang salah — perbaiki di sini.

---

## 0. Yang berubah dari v1.0

| # | v1.0 (rencana) | v2.0 (terkirim) | Kenapa |
|---|---|---|---|
| 1 | Dua *typeface*: Inter + IBM Plex Mono | **Satu**: Inter. `font-mono` dan `font-display` di-alias ke Inter | Angka bertabulasi Inter sudah menutup peran mono. Satu font = satu unduhan, LCP portal warga lebih aman |
| 2 | Ramp risiko klinis (`#1B6B4F / #A8690C / #A32B1F`) | Ramp **tanah**: `#1F5132 / #D4933A / #A8442C / #8A2E1A` | Nada tanah menyatu dengan kanvas hangat portal warga tanpa kehilangan urutan terang |
| 3 | Label risiko: Rendah / Sedang / Tinggi | **Rendah / Waspada / Siaga** (+ `critical` untuk KLB) | Istilah operasional dinas, bukan istilah statistik |
| 4 | "Tanpa gradien" | Keluarga `bg-grad-*` resmi, dibangun dari token yang sudah ada | Gradien tidak dilarang; **hue baru** yang dilarang. Semua perhentian gradien memakai hex yang sudah ada di palet |
| 5 | Satu animasi tak terbatas | Lapisan gerak *landing*: aurora, marquee, beacon, sheen, rise-fall, grow-x, reveal | Halaman depan adalah permukaan pemasaran, bukan konsol. Konsol tetap tenang |
| 6 | Kanvas konsol `paper-50`, publik `sand-50`, dasar 15/17px | `data-surface` di `<html>`; dasar 17px (konsol) / 18px (publik), root 112.5% | Diuji di proyektor: 15px terlalu kecil dari jarak 3 meter |
| 7 | Tombol radius 10px, tinggi 32/38/44, bobot 500 | Pil penuh, tinggi 40/48/56/64, bobot 600 | Keputusan sadar setelah uji tampil. Dicatat sebagai **penyimpangan yang diterima**, bukan kelalaian — §7.1 |
| 8 | `liquid-glass*` dimigrasi lalu dihapus | Masih hidup: 23 pemakaian di 5 berkas (dari 60 di 12), didefinisikan ulang sebagai permukaan datar | Kelasnya sendiri sudah datar, jadi utangnya kosmetik: nama kelas, bukan efek. **Tapi `backdrop-filter` belum benar-benar hilang** — 14 pemakaian bertahan di luar keluarga ini, §12 no. 7 |
| 9 | `<Metric>` wajib untuk semua KPI | `KpiCard` yang dipakai konsol, dengan kontrak `range` + `coverage` yang sama | Kejujuran datanya sudah tampil; yang tersisa duplikasi primitif. Lihat §7.3 dan §12 |

---

## 1. Posisi & Prinsip

PRAKIRA bukan aplikasi konsumen dan bukan situs SaaS. Ini **instrumen kerja lembaga publik**
yang juga punya wajah untuk warga. Referensinya buletin meteorologi dan jurnalisme data.

Nama sistem: **Buletin**.

### Enam prinsip

1. **Warna adalah data.** Satu-satunya kejenuhan tinggi di layar adalah tingkat risiko. Merek, permukaan, dan navigasi berbicara dengan netral.
2. **Angka adalah pahlawannya.** Angka bertabulasi, nol bergaris, satuan yang tidak ikut membesar.
3. **Menahan diri = mahal.** Bayangan tidak melebihi tiga lapis. Tidak ada `backdrop-filter`. Tidak ada hue di luar palet.
4. **Ketidakpastian ikut ditampilkan.** Setiap angka prediksi membawa rentang dan cakupan data.
5. **Dua permukaan, satu sistem.** Konsol dan Publik memakai token yang sama dengan kedalaman dan densitas berbeda. Sampai v2.2 pembedanya suhu; itu dicabut — §3.
6. **Bisa dibaca dalam abu-abu.** Kelas risiko dibedakan oleh terang-gelap yang menurun monoton, bukan hanya hue.

Prinsip yang **dilepas** dari v1.0: "tidak ada gradien" dan "bobot berhenti di 600".
Keduanya tidak dipatuhi kode dan tidak dipertahankan saat uji tampil.
Aturan yang tidak dipatuhi lebih berbahaya daripada aturan yang dicabut — lihat §4.3.

---

## 2. Token Warna

Semua token hidup di `frontend/tailwind.config.ts`. Jangan pernah menulis hex langsung di komponen.

### 2.1 Netral — ramp "Kertas"

Ramp kustom pada hue ±192°, kroma sangat rendah. Bukan `slate`.

| Token | Hex | Pakai untuk |
|---|---|---|
| `paper-0` | `#FFFFFF` | Permukaan kartu, panel, modal |
| `paper-50` | `#F5F7F7` | Kanvas aplikasi (konsol) |
| `paper-100` | `#ECF0F0` | Permukaan cekung, header tabel, *well* |
| `paper-200` | `#DFE6E6` | Garis rambut / border baku |
| `paper-300` | `#C9D4D4` | Border tegas, pemisah |
| `paper-400` | `#A3B2B3` | Teks nonaktif, sumbu grafik |
| `paper-500` | `#7C8D8F` | Teks tersier |
| `paper-600` | `#5A6C6E` | Teks sekunder (`muted-foreground`) |
| `paper-700` | `#3D4E50` | Teks kuat sekunder |
| `paper-800` | `#24373A` | Judul pada latar terang |
| `paper-900` | `#0E2225` | Teks utama (tinta) |

### 2.2 Merek — "Petrol"

| Token | Hex | Pakai untuk |
|---|---|---|
| `brand-900` | `#06282F` | Latar gelap, footer, sidebar |
| `brand-800` | `#093843` | Keadaan *active* tombol primer |
| `brand-700` | `#0B4A57` | **Primary** — tombol utama, ikon aktif. Juga `brand` DEFAULT |
| `brand-600` | `#0F5F6E` | Hover tombol primer |
| `brand-500` | `#17808F` | Tautan, deret grafik ke-1 |
| `brand-300` | `#7FB8C0` | Border aksen, keadaan nonaktif |
| `brand-100` | `#D6E9EC` | Isian chip & *eyebrow* |
| `brand-50` | `#EAF4F5` | Latar blok tersorot |

`brand.foreground` = `#FFFFFF`. Kontras `brand-700` di atas putih ≈ 9.4:1.

### 2.3 Ramp Risiko — "Sinyal Tanah"

Satu-satunya warna jenuh di produk. Empat sub-token per kelas: isi/teks, latar lembut (`-bg`),
border (`-br`), isian peta (`-fill`).

| Kelas | Label UI | Teks (`risk-*`) | `-bg` | `-br` | `-fill` (peta) |
|---|---|---|---|---|---|
| `low` | Rendah | `#1F5132` | `#EDF4EC` | `#C5DEC2` | `#7AA876` |
| `medium` | **Waspada** | `#D4933A` | `#FDF6E9` | `#F6DBA9` | `#E5AA52` |
| `high` | **Siaga** | `#A8442C` | `#FBECE8` | `#F3C2B4` | `#C95E42` |
| `critical` | KLB | `#8A2E1A` | `#F9DFD8` | `#E8A28E` | `#A8442C` |
| `none` | Data tidak memadai | `#5A6C6E` | `#ECF0F0` | `#DFE6E6` | `#E3E8E8` |

Label dan salinan teksnya tinggal di `src/lib/utils.ts` (`RISK_CONFIG`) — **satu sumber**,
bukan diketik ulang di komponen.

**Aturan yang mengikat:**
- Terang isian peta menurun monoton dari `low` ke `critical`. Urutan risiko tetap terbaca dalam abu-abu dan hasil cetak.
- Kelas risiko **tidak boleh** disampaikan lewat warna saja. Wajib label teks + ikon (WCAG 1.4.1). Ikon ditetapkan di `RISK_CONFIG.iconName`: `ShieldCheck` / `AlertTriangle` / `Siren`.
- `Data tidak memadai` (`none`) adalah kelas tersendiri dan **tidak pernah** ditampilkan sebagai "Rendah".
- Kelas `high` memakai *hatch* diagonal 45° di atas isian peta (`RISK_CONFIG.tinggi.hatch === true`, utilitas `.risk-hatch`), agar tetap terpisah dari `medium` bagi penderita protanopia.
- `critical` sudah dipakai nyata (tombol `danger`, badge KLB), bukan lagi cadangan.

### 2.4 Kategorikal (grafik saja)

| Token | Hex |
|---|---|
| `cat-1` | `#0B4A57` |
| `cat-2` | `#7A5C2E` |
| `cat-3` | `#47617F` |
| `cat-4` | `#5B4A70` |
| `cat-5` | `#2C6650` |

**Aturan silang:** warna risiko tidak pernah muncul di grafik kategorikal; warna kategorikal
tidak pernah mengkodekan risiko. Penyakit dibedakan lewat ikon + label + *selector*, tidak lewat warna peta.

### 2.5 Variabel iklim (pengkodean tetap)

Token Tailwind `climate-*`, dengan kembaran nilai JS di `CLIMATE_COLORS` (`src/lib/utils.ts`) untuk Recharts.

| Variabel | Token | Hex |
|---|---|---|
| Curah hujan | `climate-rain` | `#2E6F8E` |
| Suhu | `climate-temp` | `#B4552A` |
| Kelembaban | `climate-humid` | `#4E8C7E` |

### 2.6 Permukaan publik — "Kabut" (portal warga)

Sampai v2.2 ramp ini hangat ("Tanah", hue ~40°) dan itulah yang benar-benar mengecat
halaman depan — bukan `brand-*`, yang cuma muncul di *eyebrow*, chip, dan tombol.
Hasilnya portal warga terbaca krem-emas, bukan biru kesehatan. v2.3 memindahkan ramp
ke hue merek (~205°) dengan kroma sangat rendah, terang dipertahankan setara.

Nama token tetap `sand-*`: 180 pemakaian di komponen mengecat ulang tanpa disentuh.
Namanya sekarang keliru — ganti nama ke `mist-*` sudah tercatat sebagai utang, §12.

| Token | Hex | Sebelumnya (v2.2) |
|---|---|---|
| `sand-50` | `#EFF5F9` | `#FAF7F1` |
| `sand-100` | `#E3EDF4` (juga `sand` DEFAULT) | `#F2EDE3` |
| `sand-200` | `#CFDFE9` | `#E5DDCC` |
| `sand-300` | `#AFC6D5` | `#D2C6AE` |

Kontras `paper-600` (`#5A6C6E`, teks sekunder) di atas `sand-50` turun tipis
5.09:1 → **4.95:1**. Masih lolos WCAG AA teks normal.

### 2.6b Identitas — mark & lockup

Spesifikasi lengkap ada di [`frontend/public/brand/README.md`](../frontend/public/brand/README.md)
§Lockup, satu sumber. Yang mengikat di sini cuma satu hal, karena ia turunan langsung
dari prinsip 1 (§1): **kotak petrol di belakang mark bukan bagian dari identitas.**
Kotak itu elemen paling jenuh di layar, dan kejenuhan disediakan untuk risiko. Kotak
hanya hidup di ikon platform yang memaksa bidang persegi — favicon, `apple-icon`, PWA,
*maskable*. Di dalam aplikasi mark berdiri telanjang, `brand-700` di latar terang.

Enam permukaan dulu masing-masing menggulung lockup sendiri; sekarang semuanya lewat
`components/brand-lockup.tsx`.

### 2.7 Slot semantik (kompatibel shadcn)

`background` `#F5F7F7` · `surface` `#FFFFFF` · `foreground` `#0E2225` ·
`muted` `#ECF0F0` / `muted-foreground` `#5A6C6E` · `border` & `input` `#DFE6E6` ·
`ring` `#0B4A57` · `card` / `popover` putih · `accent` `#D6E9EC` ·
`secondary` `#ECF0F0` · `destructive` `#DC2626`.

> `destructive` masih memakai merah bawaan Tailwind (`red-600`). Ini satu-satunya hex
> di luar palet yang tersisa di konfigurasi. Komponen produk memakai `risk-high` untuk
> aksi merusak, jadi slot ini praktis tidak terpakai — hapus atau arahkan ke `#A8442C`.

### 2.8 Alias warisan

`primary.*` (DEFAULT/deep/dark/soft/light/accent/royal) dan `clay` diarahkan ke nilai
`brand-*` / `cat-2`, supaya kelas lama ikut berubah warna tanpa disentuh.
**Jangan dipakai di kode baru.**

### 2.9 Gradien

Diperkenalkan di v2.0 dan sah, dengan satu syarat: **setiap perhentian gradien adalah hex
yang sudah ada di palet.** Gradien tidak boleh memasukkan hue baru.

> **Syarat itu dilanggar sampai v2.2.** Empat perhentian bukan token: `#E8C99B` (emas,
> di `grad-page`), `#FDFBF7`, `#F4EEE2`, dan `#FBF9F5`. Yang emas justru paling kuat
> terlihat — itu sumber kesan "kuning" di halaman depan. v2.3 melunasinya: `grad-page`
> memakai `brand-300`/`brand-700` beralfa di atas `paper-0` → `sand-50`, `grad-sand`
> memakai `sand-50` → `sand-100`, `grad-paper` memakai `paper-0` → `paper-50`.
> Sekarang tiap perhentian benar-benar token.

| Token | Pakai untuk | Pemakaian |
|---|---|---:|
| `bg-grad-page` | Kanvas halaman publik (kabut merek dua lapis) | 3 |
| `bg-grad-sand` | Blok bagian pada permukaan hangat | 5 |
| `bg-grad-paper` | Kartu terang, sedikit lebih hidup dari putih rata | 9 |
| `bg-grad-brand` | Panel gelap, CTA, *masthead* | 0 |
| `bg-grad-brand-soft` | Blok tersorot terang | 4 |
| `bg-grad-risk-{low,medium,high}` | Latar kartu risiko | 1 tiap kelas |
| `bg-grad-bar-{low,medium,high}` | Isian bar distribusi | 3 tiap kelas |
| `bg-wash`, `bg-wash-warm` | Sapuan atmosferik satu lapis | 0 |
| `bg-hatch` | Overlay *hatch* peta | 0 |

Gradien risiko mempertahankan urutan terang yang sama dengan ramp datar, jadi §2.3 tetap berlaku di atasnya.

---

## 3. Dua Permukaan (Dual Surface)

**Kedalaman permukaan mengkodekan audiens.** Sampai v2.2 yang mengkodekan adalah *suhu*
(konsol dingin, publik hangat). Prinsip itu **dicabut di v2.3**: dua permukaan sekarang
sama-sama dingin, publik duduk satu langkah lebih biru dan lebih gelap dari konsol.
Pembedanya tinggal kedalaman kanvas plus densitas (`--row-h`, `--card-pad`, `--base-size`).
Alasannya jujur: portal warga harus terbaca sebagai instrumen kesehatan, dan suhu hangat
melawan itu lebih kuat daripada manfaat pengkodean audiensnya. Prinsip 5 di §1 dibaca ulang
sebagai "dua permukaan, satu sistem" — tanpa klaim suhu. Implementasi: atribut `data-surface` pada
`<html>`, bukan pada pembungkus rute — supaya `body` dan seluruh token melihatnya.

| | Konsol — `console` | Publik — `public` |
|---|---|---|
| Rute | `/dashboard`, `/tindakan`, `/analitik`, `/admin`, `/verifikasi` | selain itu |
| `--canvas` | `#F5F7F7` | `#EFF5F9` |
| `--surface-sunken` | `#ECF0F0` | `#E3EDF4` |
| `--border` / `--border-strong` | `#DFE6E6` / `#C9D4D4` | `#CFDFE9` / `#AFC6D5` |
| `--row-h` | 44px | 56px |
| `--card-pad` | 22px | 28px |
| `--base-size` | 1.0625rem | 1.125rem |

Root `html` memakai `font-size: 112.5%`, jadi 1rem = 18px. `--base-size` ditulis dalam `rem`
supaya kelas ukuran teks aksesibilitas (§8) tetap bekerja, dan hanya dipasang di `body` —
memasangnya di `html` juga akan berlipat.

Alur penerapan, tiga bagian yang harus tetap sinkron:

0. `src/lib/routes.ts` — **satu** daftar rute (`CONSOLE_ROUTES`, `SISTEM_ROUTES`, `BARE_ROUTES`).
1. `src/app/layout.tsx` — skrip inline sebelum *paint* pertama menetapkan `data-surface` + preferensi a11y, supaya warna kanvas dan ukuran teks tidak berkedip.
2. `src/components/layout-wrapper.tsx` — menjaga atribut tetap benar saat navigasi sisi klien, dan memilih *chrome*.
3. `globals.css` — `:root[data-surface="public"]` mendefinisikan ulang token.

Komponen tidak pernah bercabang berdasarkan permukaan. Kalau sebuah komponen butuh tahu
sedang di mana, yang kurang adalah tokennya.

> **Kenapa daftar rutenya tinggal di `src/lib/routes.ts`, bukan di `layout-wrapper.tsx`.**
> Dua kali sistem ini kehilangan permukaan pada `/tindakan`: pertama karena skrip
> *pre-paint* menyalin daftarnya sendiri dan lupa menambah rute baru, kedua karena
> `layout.tsx` (komponen server) mengimpor konstanta dari berkas `"use client"` —
> yang sampai di server sebagai *client reference*, bukan data, sehingga
> `JSON.stringify` menghasilkan `{}` dan **semua** rute konsol berkedip hangat dulu.
> Konstanta rute wajib hidup di modul biasa yang dibaca kedua sisi.

Chrome per permukaan:

| Rute | Chrome |
|---|---|
| `CONSOLE_ROUTES` | `Sidebar` + main bergulir |
| `/sistem` (`SISTEM_ROUTES`) | `SistemMasthead` + `SistemFooter` — identitas resmi, navigasi layanan, status operasional |
| `/masuk` (`BARE_ROUTES`) | Tanpa navbar & footer; halamannya adalah komposisi utuh |
| sisanya | `Navbar` + `Footer` |

---

## 4. Tipografi

### 4.1 Typeface

**Satu typeface: Inter** (variabel, via `next/font`, `--font-sans`).

`font-mono` dan `font-display` tetap ada sebagai token, tetapi keduanya mengarah ke Inter.
Nama kelasnya dipertahankan sebagai **peran**, bukan sebagai janji font berbeda:
`font-mono` menandai "ini label / kode / cap waktu" dan berpasangan dengan `tabular`.
Ada 135 pemakaian `font-mono` di `src/` — semuanya kini murni penanda peran.

Fitur OpenType (di `globals.css`):

```css
font-feature-settings: "cv05" 1, "cv08" 1, "ss03" 1, "calt" 1;
```

`cv11` sengaja **mati** — itu membuat `a` menjadi *single-storey* dan Inter kehilangan karakternya.

Angka metrik: `font-variant-numeric: tabular-nums slashed-zero`, diterapkan otomatis pada
`table td`, `table th`, `[data-numeric]`, dan kelas `.tabular`.

### 4.2 Skala

| Token | Ukuran | Tinggi baris | *Tracking* | Bobot | Pakai untuk |
|---|---|---|---|---:|---|
| `display` | `clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)` | 1.04 | −0.022em | 600 | H1 hero |
| `h1` | 2rem | 1.15 | −0.02em | 600 | Judul halaman |
| `h2` | 1.5rem | 1.2 | −0.018em | 600 | Judul bagian |
| `h3` | 1.125rem | 1.35 | −0.012em | 600 | Judul kartu |
| `body-lg` | 1.0625rem | 1.65 | 0 | 400 | Paragraf permukaan publik |
| `body` | 0.9375rem | 1.6 | 0 | 400 | Teks baku konsol |
| `body-sm` | 0.875rem | 1.55 | 0 | 400 | Teks pendukung |
| `caption` | 0.8125rem | 1.45 | 0 | 400 | Keterangan, catatan kaki |
| `overline` | 0.6875rem | 1.4 | +0.08em | 500 | Label huruf besar |
| `metric-xl` | 2.5rem | 1.0 | −0.02em | 600 | KPI utama |
| `metric` | 2rem | 1.05 | −0.02em | 600 | Nilai kartu metrik |
| `metric-sm` | 1.375rem | 1.1 | −0.01em | 600 | Angka dalam tabel padat |

Kelas bantu di `@layer components`: `.overline`, `.eyebrow`, `.chip`, `.h-section`, `.h-display`.

**Kenyataan pemakaian:** 308 pemakaian skala sistem berbanding 229 kelas ukuran bawaan
Tailwind (`text-sm`, `text-2xl`, …) dan 165 ukuran *arbitrary* `text-[…]`.
Skala sistem **sudah unggul** sejak sapuan halaman nakes: seluruh `/tindakan`,
`/analitik`, `/admin`, dan `Sidebar` kini nol kelas bawaan dan nol `text-[…]`.
Yang tersisa terkonsentrasi di `/dashboard`, `/warga`, `/dev`, dan komponen
*landing*. Lihat §12.

### 4.3 Aturan bobot

| Bobot | Boleh dipakai untuk |
|---|---|
| 400 | Seluruh teks berjalan. Keadaan baku |
| 500 | Label UI, kepala tabel, item nav aktif, badge |
| 600 | Judul, nilai metrik, teks tombol. Ini **titik berhenti** |
| 700+ | Tidak dipakai di mana pun. Nol `font-bold` / `font-extrabold` di `src/` per 26 Agustus 2026 |

Perubahan jujur dari v1.0: teks tombol memakai 600, bukan 500. `<strong>` / `<b>` dipaksa
600 di `@layer base`; `th` dipaksa 500 karena kepala tabel adalah label, bukan judul;
kontrol zoom Leaflet dipaksa 400.

---

## 5. Ruang, Radius, Bayangan

### 5.1 Ruang

Basis 4px. Padding kartu memakai `var(--card-pad)` dan tinggi baris tabel `var(--row-h)` (§3),
jadi komponen yang sama menjadi padat di konsol dan lapang di publik tanpa prop.

### 5.2 Radius

| Token | Nilai | Pakai untuk |
|---|---:|---|
| `xs` | 4px | Kotak centang, indikator kecil |
| `sm` | 6px | Tag, chip mungil |
| `md` / DEFAULT | 8px | Input dalam, tombol ikon kecil |
| `lg` | 10px | Input, select |
| `xl` | 14px | **Kartu** (`<Card>`, `.card-surface`) |
| `2xl` | 18px | Panel besar, wadah peta, modal, `LiquidGlassCard` |
| `3xl` | 24px | Panel *hero* halaman depan |
| `full` | 9999px | Badge, pill, **dan tombol** (§7.1) |

`globals.css` masih menyimpan `--radius: 16px` dan `--radius-control: 14px` yang tidak
dirujuk siapa pun. Hapus, atau jadikan sumber untuk skala di atas — jangan biarkan dua
skala radius hidup berdampingan.

### 5.3 Bayangan

Semua bayangan berwarna tinta merek (`#0E2225`), bukan hitam murni.

| Token | Nilai |
|---|---|
| `hairline` | `0 0 0 1px rgba(14,34,37,.06)` |
| `xs` | `0 1px 1px rgba(14,34,37,.04)` |
| `sm` | `0 1px 2px rgba(14,34,37,.05), 0 1px 1px rgba(14,34,37,.03)` |
| `card` | `0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)` |
| `lift` | `0 2px 4px rgba(14,34,37,.04), 0 18px 36px -14px rgba(14,34,37,.16)` |
| `pop` | `0 4px 8px rgba(14,34,37,.06), 0 28px 56px -20px rgba(14,34,37,.22)` |
| `focus` | `0 0 0 2px #FFFFFF, 0 0 0 4px rgba(11,74,87,.55)` |

Alias warisan `elevated`, `glow`, `glass`, `glass-sm/md/lg` dipetakan ke nilai di atas —
**tidak ada yang bercahaya lagi**, tapi namanya masih beredar (5 pemakaian `shadow-glass*`).

**Aturan:** area padat (tabel, daftar, panel bersebelahan) dipisahkan **garis rambut**,
bukan bayangan. Bayangan hanya untuk yang benar-benar mengambang: *popover*, *dropdown*, modal.

---

## 6. Gerak

### 6.1 Token

| Token | Nilai |
|---|---|
| `--ease-out` / `ease-out` | `cubic-bezier(.2,.7,.3,1)` |
| `--ease-inout` / `ease-inout` | `cubic-bezier(.5,0,.2,1)` |
| `--dur-fast` / `duration-fast` | 140ms |
| `--dur-base` / `duration-base` | 200ms |
| `--dur-slow` / `duration-slow` | 320ms |

### 6.2 Dua anggaran gerak

Penyesuaian terbesar dari v1.0. Konsol dan halaman pemasaran tidak punya anggaran yang sama.

**Konsol** (`data-surface="console"`): hanya `fade-in`, `fade-in-up`, dan `pulse-dot`.
Tidak ada gerak tak terbatas selain titik status *live*. Pembaruan data memakai *crossfade*,
tanpa geseran posisi — angka yang melompat saat diperbarui membuat pembaca tidak percaya.

**Halaman depan & portal publik**: lapisan gerak di `globals.css` boleh dipakai —

| Utilitas | Keyframe | Untuk |
|---|---|---|
| `animate-aurora`, `animate-aurora-alt` | `aurora-drift` | Sapuan latar lambat 22–28s |
| `animate-marquee` | `marquee` | Strip status bergulir (pasangkan `.mask-edges`, `.pause-on-hover`) |
| `animate-beacon` | `beacon` | Cincin melebar di balik indikator *live*. Lebih lambat & lemah dari `ping` |
| `animate-rise-fall` | `rise-fall` | Apung halus pada ilustrasi |
| `animate-sheen` | `sheen` | Kilau sekali-lewat pada kartu sorot |
| `animate-grow-x` | `grow-x` | Bar distribusi menggambar diri saat pertama muncul |
| `draw-line` | `draw-line` | Garis grafik menggambar diri (`stroke-dashoffset`) |
| `[data-reveal]` | — | Sistem *reveal* saat gulir, dikendalikan `<Reveal>` (82 pemakaian) |

`<Reveal>` hanya membalik `data-visible`; transisinya hidup di CSS. Artinya pembaca dengan
`prefers-reduced-motion` mendapat keadaan akhir tanpa satu pun *frame* animasi.

Utilitas tekstur pendamping: `.bg-grain` (butir kertas, mencegah *banding* pada bidang datar
besar di proyektor), `.mask-edges`, `.pause-on-hover`, `.stagger-1`…`.stagger-6`.

### 6.3 Aturan

1. `active:scale-*` dilarang pada tombol. Ganti dengan pergeseran warna latar.
2. Seluruh animasi mati pada `prefers-reduced-motion: reduce` — blok di `@layer base` sudah menetralkan semuanya secara global.
3. Bar dan garis yang menganimasikan dirinya harus berdegradasi ke "sudah tergambar", bukan ke "tak terlihat", kalau animasinya dilewati.
4. Jangan memakai `animate-ping` / `animate-bounce` bawaan Tailwind: keduanya terbaca seperti alarm dan bersaing dengan status *live* yang asli. `animate-beacon` dan `animate-pulse-dot` adalah penggantinya. Nol pemakaian tersisa; `animate-pulse` hanya boleh untuk *skeleton* saat memuat.

---

## 7. Komponen

Inventaris yang benar-benar ada di `src/components/`, plus kondisi pemakaiannya.

### 7.1 Tombol — `ui/button.tsx`

| Varian | Tampilan |
|---|---|
| `primary` (baku) | Isi `brand-700`, teks putih, hover `brand-600`, aktif `brand-800` |
| `secondary` | Isi `paper-100`, teks `paper-800`, `shadow-hairline` |
| `outline` | Border `paper-300`, hover ke `brand-50` |
| `ghost` | Transparan, hover `paper-100` |
| `danger` | Isi `risk-high`, hover `risk-critical` |
| `link` | Teks `brand-500`, garis bawah saat hover |
| `risk-low`, `risk-medium` | Isi warna kelas — hanya untuk aksi yang terikat kelas risiko |
| `default`, `blue`, `glass`, `glass-blue`, `destructive` | Alias warisan. Jangan dipakai di kode baru |

Ukuran: `sm` 40px · `default`/`md` 48px · `lg` 56px · `xl` 64px · `icon` 48px · `icon-sm` 40px.
Radius `full`. Teks bobot 600. Prop `loading` mengunci tombol dan menyetel `aria-busy`.

> **Penyimpangan yang diterima.** v1.0 menetapkan radius 10px, tinggi maksimum 44px, bobot 500.
> Yang terkirim adalah pil penuh yang lebih tinggi dan lebih tebal — keputusan sadar demi
> target sentuh dan keterbacaan proyektor. **Komentar di kepala `button.tsx` masih menyalin
> aturan v1.0 dan harus diperbaiki.**
> Yang tetap berlaku: satu tombol primer per layar, tanpa `active:scale-*`.

### 7.2 Kartu — `ui/card.tsx`

Permukaan `surface`, radius `xl`, border `border`, bayangan `card`, padding `var(--card-pad)`.
Prop `nested` membuang bayangan dan memakai `paper-100` — kartu bersarang tidak menumpuk bayangan.
Prop `interactive` hanya menggeser warna, tidak pernah mengangkat atau menskalakan.
`CardTitle` = `text-h3`; `CardDescription` = `text-caption text-paper-600`.

### 7.3 Metrik — `ui/metric.tsx`

Blok angka baku. `range` dan `coverage` adalah properti **wajib**: sistem desain yang
menjadikan kejujuran opsional akan membuatnya terlupa saat *deadline* mendekat.
`range={null}` hanya untuk besaran yang memang tanpa ketidakpastian (hitungan yang sudah teramati).
Keadaan `coverage === "insufficient"` mengganti angka dengan kalimat, bukan menampilkan nol.
Berisi `<Sparkline>` polos 20px — tekstur, bukan grafik.

> **Belum dipakai.** Tidak ada satu pun halaman yang me-*render* `<Metric>` — konsol
> memakai `KpiCard`. Sejak 26 Agustus 2026 keduanya menuntut `range` + `coverage`, jadi
> klaim PRD §7-H1/H2 sudah tampak di layar; yang tersisa adalah duplikasi primitif,
> bukan lubang kejujuran. Lihat §12.

### 7.4 Badge — `ui/badge.tsx`

Pil, teks `caption`, bobot 500 (600 untuk `default` / `secondary`).
Varian risiko: `risk-low`, `risk-medium`, `risk-high`, `risk-critical`, `risk-none`.
`risk-none` adalah kelas kelas satu, bukan mundur ke "low".
Varian provenans: `official` (data Dinkes) vs `citizen` (border putus-putus, sinyal warga
terverifikasi) — diwajibkan PRD §7-H4.
Prop `pulse` memberi satu titik berdenyut lambat; simpan untuk status yang benar-benar *live*.
Badge risiko **selalu** membawa ikon + label.

### 7.5 KpiCard — `components/kpi-card.tsx`

Primitif KPI yang sebenarnya dipakai konsol. Dibangun di atas `LiquidGlassCard`, memakai
`animate-fade-in-up` + kelas `stagger-*`. Menerima `delta`, `status`, `sparkline`.

`range` dan `coverage` **wajib**, aturan yang sama dengan `<Metric>` (§7.3): rentang
tercetak tepat di bawah angkanya, cakupan data pada baris sendiri di kaki kartu, dan
`coverage: "insufficient"` mengganti angka dengan kalimat — bukan menampilkan nol.
Angka gabungan sekota mewarisi cakupan kecamatan terlemah lewat `aggregateCoverage()`
(`src/lib/utils.ts`): total hanya sekuat masukan tertipisnya.

Dua primitif KPI kini hidup berdampingan dengan kontrak kejujuran yang sama.
Konsolidasinya (satu primitif, `<Metric>` sebagai isi `<Card>`) masih terbuka — §12.

### 7.6 LiquidGlassCard — `ui/liquid-glass-card.tsx` *(warisan)*

Namanya bohong, dan itu disengaja untuk sementara: tidak ada `backdrop-filter` di mana pun
di produk. Kelas `.liquid-glass*` di `globals.css` sudah didefinisikan ulang sebagai
permukaan datar buram, sehingga 27 pemakaian di 12 berkas ikut *repaint* tanpa disentuh.
Varian `risk-*` memetakan langsung ke ramp §2.3. Prop `sheen` inert; `glowBorder` menunjuk
alias bayangan yang sudah diratakan.
Arah: migrasikan ke `<Card>`, lalu hapus blok kelas dan berkas komponennya.

### 7.7 Tabel

Tinggi baris `var(--row-h)`. Kepala tabel: huruf besar 11px, latar `paper-100`, menempel
saat digulir, bobot 500. Pemisah baris garis rambut, tanpa zebra. Kolom angka rata kanan
dengan `tabular-nums` (otomatis lewat `@layer base`). Baris dapat diklik seluruhnya,
bukan hanya tautan di dalamnya.

### 7.8 Peta — `components/choropleth-map.tsx`

Wadah radius `2xl`, latar `--surface-sunken` (dipaksa lewat `.leaflet-container`).
Isian mengikuti `RISK_CONFIG.fill`; batas kecamatan putih 1px supaya isian gelap terbaca
sebagai wilayah, bukan noda. Legenda **wajib** menampilkan ambang numerik tiap kelas,
bukan hanya namanya. *Tooltip* memuat nama kecamatan, kelas, skor, prediksi + rentang,
dan cakupan data.

### 7.9 Grafik

Sumbu `paper-400`, kisi horizontal saja, tanpa kisi vertikal.
Deret aktual: garis padat `cat-1`. Deret prediksi: garis putus-putus `cat-1`.
Pita ketidakpastian: `cat-1` alpha 0.12. Pemisah train/test: garis vertikal putus-putus berlabel.
Variabel iklim memakai `CLIMATE_COLORS`, tidak pernah warna risiko.

### 7.10 Status kosong / memuat / gagal / tidak memadai

Empat keadaan ini wajib ada di setiap tampilan data, dan tampilannya berbeda satu sama lain.
`Data tidak memadai` bukan error dan bukan kosong — ia menyampaikan bahwa sistem tahu
batas pengetahuannya. Salinan teksnya ada di `COVERAGE_CONFIG` (`src/lib/utils.ts`).

### 7.11 Chrome konsol — `components/console/`

Tiga bagian bersama seluruh rute nakes, dipisahkan supaya tidak disalin ulang tiap halaman.

| Berkas | Isi | Kenapa dipisah |
|---|---|---|
| `console/page-header.tsx` | `ConsolePageHeader` + `PeriodChip` | Judul halaman **wajib** sama persis dengan label `Sidebar`. Tiga halaman sebelumnya memakai judul berupa kalimat ("Manajemen Dataset, BMKG Sync & Audit Trail") yang tidak cocok dengan navigasinya |
| `console/toast.tsx` | `ConsoleToast` + `useConsoleToast` | Tiga salinan blok `fixed bottom-6 right-6`, satu di antaranya masih `alert()`. Semua salinan lupa `aria-live` |
| `lib/period.ts` | `REPORTING_PERIOD`, `describeDeadline()` | Empat berkas menulis sendiri `"Minggu 34"` / `"Agustus 2026"` |

`PeriodChip` menggantikan `AppleGlassDate` di ketiga halaman ini. `AppleGlassDate`
masih dipakai `/dashboard` dan `/dev`, dan masih membawa `backdrop-blur-xl
backdrop-saturate-[180%]` — satu-satunya alasan §11 tidak bisa mencentang
"tidak ada `backdrop-filter`". Lihat §12.

### 7.12 Antrean aksi — `components/action-queue.tsx`

Daftar triase vertikal untuk `/tindakan`. Menggantikan `early-action-deck.tsx`
(akordeon horizontal, dihapus): akordeon itu memberi satu kartu penuh dan empat
keping selebar 90px, padahal pekerjaan halaman ini justru **membandingkan**
prioritas. Tinggi baris tumbuh mengikuti isi, bukan dipatok `h-[370px]`.

Urutan antrean hidup di `lib/action-queue.ts`, bukan di komponennya:
status belum-selesai dulu → tenggat terdekat → prioritas. Tenggat sengaja
mendahului prioritas — tindakan "prioritas sedang" yang sudah terlambat lebih
mendesak daripada "prioritas tinggi" yang tenggatnya dua minggu lagi.

**Aturan yang mengikat di sini:** bidang opsional (`ai_confidence`,
`lead_time_days`, `target_population`, `target_puskesmas`) hanya dirender bila
datanya ada. Nilai cadangan yang dikarang (`|| 94.2`, `|| "120k"`, daftar
puskesmas Pedurungan untuk tindakan Semarang Barat) melanggar §10.9 dan sudah
dihapus. Kotak kosong lebih jujur daripada angka yang tidak pernah dihitung.

### 7.13 Statistik yang ditampilkan — `lib/stats.ts`

Setiap nilai statistik di layar dihitung dari deret yang sedang tergambar.
`/analitik` dulu mencetak `r = +0.84` dan `P-value < 0.001` sebagai teks mati,
sehingga memilih ISPA menampilkan grafik ISPA di bawah klaim korelasi DBD.

Signifikansi dilaporkan sebagai **ambang yang terlewati** (`signifikan (p<0,01)`),
bukan p-value desimal: dengan `n = 12`, p-value hasil aproksimasi hanya akan
terlihat lebih pasti daripada yang sebenarnya. Tabel nilai kritis memakai df
tertabel terbesar yang ≤ df sebenarnya, jadi kesimpulannya konservatif.

### 7.14 Portal warga — `components/warga/`, `lib/reports.ts`

Permukaan publik, tanpa akun, satu pekerjaan: menerima laporan dan
memperlihatkan apa yang terjadi padanya. Cek risiko **tidak** hidup di sini —
halaman depan sudah melakukannya lebih baik, dan dua pengecek risiko dalam satu
produk berarti salah satunya akan ketinggalan zaman lebih dulu.

**`WargaShell`** membawa banner "bukan diagnosis" (PRD §5.3, diuji §11-H3 di
tiga rute). Bannernya diletakkan di kerangka, bukan di masing-masing halaman,
supaya rute baru tidak bisa lupa membawanya — dan di **bawah** isi, bukan di
atas: pembaca yang membuka `/warga` datang untuk melapor, dan menyambutnya
dengan penyangkalan sebelum ia melihat apa pun mengubah peringatan jadi
penghalang.

**`lib/reports.ts`** adalah satu-satunya sumber untuk kedua sisi loop. Kode yang
terbit di `/warga/lapor` adalah kode yang muncul di antrean `/verifikasi` dan
yang dilacak di `/warga/status`. Kalau dua sisi loop punya sumber berbeda,
loop-nya palsu — dan kode lacak adalah undangan untuk diperiksa.

Tiga aturan yang berlaku di sini dan tidak berlaku di konsol:

1. **Kode lacak memakai alfabet tanpa karakter ambigu** (tanpa `0`/`O`,
   `1`/`I`/`L`). Kode ini diketik ulang oleh orang dari layar ponsel, dan satu
   karakter ambigu mengubah "laporan saya hilang" jadi keluhan.
2. **Kendali formulir 16px di ponsel** (`text-base sm:text-sm`). Safari iOS
   memperbesar viewport pada bidang di bawah 16px; di konsol itu tertahankan, di
   formulir publik itu gangguan tiap bidang. Utang no. 12.
3. **Foto digambar ulang ke `<canvas>` sebelum disimpan** (`lib/photo.ts`).
   Kanvas hanya memegang piksel, jadi EXIF — termasuk titik GPS rumah pelapor —
   tidak punya jalan untuk ikut. Ini bukan penyaringan tag per tag yang bisa
   kelewatan satu, melainkan penyalinan yang secara bentuk tidak bisa membawa
   metadata.

**Terima satu klik, tolak butuh alasan.** Asimetri di `/verifikasi` disengaja:
§5.4 mewajibkan penolakan disertai alasan yang terlihat pelapor, dan menyetujui
laporan yang benar harus lebih murah daripada menolaknya — kalau tidak, antrean
akan diselesaikan dengan tombol yang paling sedikit gesekannya.

---

## 8. Aksesibilitas

| Aturan | Ambang / implementasi |
|---|---|
| Kontras teks normal | ≥ 4.5:1 |
| Kontras teks besar & ikon | ≥ 3:1 |
| Target sentuh | ≥ 44×44px — dipenuhi tombol setinggi 48px pada permukaan publik |
| Fokus keyboard | `:focus-visible` global memakai bayangan `focus`. Jangan pernah `outline: none` tanpa pengganti |
| Ukuran teks | `html.a11y-small-text` 100% · baku 112.5% · `html.a11y-large-text` 125%. Disimpan di `localStorage` (`prakira.a11y.font`), diterapkan sebelum *paint* |
| Kontras tinggi | `html.a11y-contrast` mendefinisikan ulang **token**, bukan menimpa kelas utilitas satu per satu (`prakira.a11y.contrast`) |
| Informasi warna | Selalu didampingi teks atau ikon |
| Gerak | `prefers-reduced-motion` mematikan seluruh animasi & transisi secara global |

Kontrolnya ada di `components/accessibility-menu.tsx`.

---

## 9. Pemetaan ke Figma

| Koleksi Figma | Isi | Mode |
|---|---|---|
| `color/primitive` | `paper-*`, `brand-*`, `risk-*` (4 sub-token per kelas), `cat-*`, `sand-*`, `climate-*` | — |
| `color/semantic` | `canvas`, `surface`, `surface-sunken`, `border`, `border-strong`, `text`, `text-2`, `text-3`, `brand`, `brand-soft` | `console`, `public` |
| `radius` | `xs`…`3xl` | — |
| `space` | Basis 4 + `row-h`, `card-pad` | `console`, `public` |
| `type` | Text styles per §4.2 | — |

Koleksi semantik memakai dua mode sejak awal, sehingga papan Konsol dan Publik dibangun
dari komponen yang sama.

---

## 10. Aturan Implementasi

1. **Tidak ada hex di komponen.** Semua warna lewat token. Kalau warnanya belum ada tokennya, tambahkan tokennya. Pengecualian sah: nilai JS untuk Recharts/Leaflet, yang wajib diambil dari `RISK_CONFIG` / `CLIMATE_COLORS`.
2. **Tidak memanggil skala warna bawaan Tailwind** (`emerald-*`, `rose-*`, `slate-*`). Palet produk sudah lengkap.
3. **Gradien hanya lewat token `bg-grad-*`.** Jangan menulis `bg-gradient-to-*` dengan `from-` / `to-` warna baru.
4. **Ukuran teks memakai skala sistem** (`text-body`, `text-h3`, `text-metric`, …), bukan `text-sm` atau `text-[13px]`.
5. **Kelas kustom hidup di `@layer`.** `@layer components` untuk `.chip`, `.eyebrow`, `.overline`, `.hairline`, `.card-surface`; `@layer utilities` untuk latar dekoratif dan utilitas gerak.
6. **`liquid-glass*` usang.** Definisinya bertahan agar pemakaian lama ikut *repaint*; jangan tambah pemakaian baru.
7. **Angka memakai `tabular-nums`.** Tanpa kecuali.
8. **Satu tombol primer per layar.**
9. **Setiap angka prediksi membawa rentang dan cakupan.** Kalau primitifnya belum punya slot itu, perbaiki primitifnya — jangan hilangkan angkanya.

---

## 11. Daftar Periksa Sebelum Submit

- [ ] Tidak ada `backdrop-filter` yang tersisa di kode — **klaim v2.0 ini salah.** 14 pemakaian di 5 berkas: `ui/apple-glass-date.tsx`, `district-detail-panel.tsx`, `landing/mac-risk-browser.tsx`, `navbar.tsx`, `sistem/masthead.tsx`. Nol di halaman nakes
- [x] `prefers-reduced-motion` mematikan animasi
- [x] Fokus keyboard terlihat di seluruh kontrol
- [x] Setiap kelas risiko membawa ikon + label; `none` tidak jatuh ke "Rendah"
- [x] Tidak ada nama warna bawaan Tailwind di `src/`
- [x] Tidak ada `font-bold` / `font-extrabold` di mana pun
- [x] Tidak ada `active:scale-*`, `animate-ping`, atau `animate-bounce`
- [x] Setiap KPI membawa rentang prediksi dan cakupan data
- [x] Permukaan konsol tidak berkedip saat dimuat, termasuk `/tindakan`
- [x] Judul halaman konsol sama dengan label `Sidebar`-nya
- [x] Setiap angka statistik di layar dihitung dari data yang sedang ditampilkan
- [x] Tidak ada nilai cadangan yang dikarang untuk mengisi slot kosong
- [x] Setiap modal memakai `<Dialog>` (jebakan fokus + Esc), bukan `div.fixed` buatan tangan
- [x] Setiap permukaan publik membawa banner "bukan diagnosis" (PRD §11-H3)
- [x] Tidak ada tautan yang menjanjikan fitur yang belum dibangun
- [x] Kendali formulir publik ≥ 16px di ponsel — tidak memicu zoom Safari iOS
- [x] Setiap kode lacak yang diterbitkan punya tempat untuk memeriksanya
- [x] Batas versi demo dicetak di layar, bukan disembunyikan (penyimpanan peramban, saringan wilayah bukan kontrol akses)
- [ ] Satu primitif KPI, bukan dua (`<Metric>` vs `KpiCard`)
- [~] Skala tipografi sistem dipakai di seluruh halaman — halaman nakes dan portal warga bersih; `/dashboard`, `/dev`, dan *landing* belum
- [~] `liquid-glass*` dihapus dari kode — 5 berkas tersisa, nol di halaman nakes dan nol di `/warga`
- [ ] Peta diuji dalam `filter: grayscale(1)`
- [ ] Portal warga lolos LCP < 2,5 detik pada simulasi 3G cepat
- [ ] Figma Variables selaras dengan `tailwind.config.ts`
- [ ] Ramp `sand-*` diganti nama jadi `mist-*` — nilainya sudah dingin sejak v2.3, namanya belum ikut

---

## 12. Utang Desain (drift ledger)

Diukur dari `frontend/src/`. Kolom terakhir menandai apa yang sudah ditutup 26 Agustus 2026.

### Sudah ditutup

| Utang | Ukuran semula | Yang dikerjakan |
|---|---:|---|
| Perhentian gradien di luar palet (langgar §2.9) | 4 hex, 3 token | `#E8C99B` `#FDFBF7` `#F4EEE2` `#FBF9F5` dibuang. `grad-page`, `grad-sand`, `grad-paper` kini murni token. Si emas inilah sumber kesan "kuning" di *landing* |
| Hex permukaan hangat ditulis langsung di komponen | 2 pemakaian | `navbar.tsx` `bg-[#FAF7F1]/90` → `bg-sand-50/90`; `how-it-works.tsx` `stroke="#D2C6AE"` → nilai `sand-300` baru |
| KPI tanpa rentang & cakupan | 7 kartu | `range` + `coverage` jadi properti **wajib** `KpiCard`, sejajar `<Metric>`. Dashboard mengalirkan batas prediksi asli dan `aggregateCoverage()` sekota |
| `/tindakan` berkedip hangat → dingin | 1 rute | Daftar rute pindah ke `src/lib/routes.ts` dan dibaca kedua sisi. Penyebab sebenarnya lebih dalam dari rute yang lupa ditulis: `layout.tsx` mengimpor konstanta dari modul `"use client"`, jadi skripnya menyerialkan `{}` dan **semua** rute konsol berkedip |
| `font-bold` / `font-extrabold` | 49 pemakaian, 9 berkas | Semua turun ke `font-semibold` |
| Warna bawaan Tailwind | 11 pemakaian `emerald-*` + 1 `amber-500` | Dipetakan ke `risk-low` / `risk-medium` |
| `animate-ping` / `animate-bounce` | 5 pemakaian | Diganti `animate-beacon`; panah *nagging* kehilangan animasinya |
| `active:scale-*` | 3 pemakaian | Diganti pergeseran warna latar (§6.3) |
| Komentar `ui/button.tsx` menyalin aturan v1.0 | 1 blok | Diselaraskan dengan §7.1 |

### Ditutup di sapuan halaman nakes (`/tindakan`, `/analitik`, `/admin`)

| Utang | Ukuran semula | Yang dikerjakan |
|---|---:|---|
| Nilai cadangan yang dikarang saat data kosong | 8 tempat | `\|\| 94.2`, `\|\| 14`, `\|\| "120k"`, `\|\| "~45 Kasus"`, dan daftar puskesmas Pedurungan yang muncul untuk tindakan Semarang Barat — semuanya dihapus. Bidang opsional kini tampil hanya bila datanya ada (§7.12) |
| Nilai statistik hardcode | 3 klaim | `r = +0.84`, `P-value < 0.001`, `156 Minggu Evaluasi` diganti perhitungan dari deret aktif (`lib/stats.ts`) dan `REPORTING_PERIOD`. Pemilih penyakit kini juga mengendalikan lencana signifikansi dan grid backtesting, bukan grafik saja |
| Lencana status audit selalu hijau | 1 tabel | Digerakkan `log.status`; entri `info`/`warning` tidak lagi tampil sebagai keberhasilan, dan labelnya berbahasa Indonesia, bukan kata mentah `success` |
| Panel BMKG mengabaikan datanya sendiri | 3 bidang | `status`, `next_sync_in`, `synced_features` dibaca dari `BMKG_SYNC_STATUS`; "API Connected" yang ditulis tetap dan `animate-pulse` (§6.3 melarangnya di luar *skeleton*) diganti `<Badge pulse>` |
| Checklist SOP mencentang dirinya sendiri | 2 butir | Pra-centang "supaya terasa realistis" dihapus. Konsol pengiriman instruksi tidak boleh melaporkan verifikasi yang tidak pernah terjadi |
| Modal buatan tangan | 3 modal | Batch dispatch dan dua modal ekspor pindah ke `<Dialog>`: jebakan fokus, Esc, dan peran dialog yang sebelumnya tidak ada |
| Kontrol yang tidak bisa dijangkau keyboard | 2 pola | `div onClick` pada kartu aksi dan butir checklist diganti `<button>` / `<label><input type="checkbox">`; tab modal mendapat `role="tab"` + `aria-controls` |
| `alert()` bawaan peramban | 1 | Diganti `ConsoleToast` dengan `aria-live` |
| Akordeon horizontal `/tindakan` | 1 komponen, 337 baris | Dihapus, diganti antrean triase terurut (§7.12). `/tindakan` turun dari 9,1 kB ke 3,6 kB *first load* |
| Judul halaman ≠ label sidebar | 2 halaman | "Analisis Korelasi Iklim & Evaluasi Backtesting Model" → "Analitik & Riwayat"; "Manajemen Dataset, BMKG Sync & Audit Trail" → "Manajemen Data BMKG" |
| Hex di luar palet pada grafik | 4 nilai | `#17808F`, `#EA580C`, `#DFE6E6`, `#5A6C6E` di `climate-correlation-chart.tsx` diganti `CLIMATE_COLORS` + token. `#EA580C` bahkan bukan warna palet; §2.5 menetapkan suhu `#B4552A` |
| Kelembaban tidak pernah tergambar | 1 deret | Tiga variabel iklim dulu berbagi satu sumbu kanan, sehingga suhu jadi garis datar dan kelembaban hanya hidup di tooltip. Sekarang satu variabel per sumbu, dipilih lewat kendali yang sekaligus menampilkan `r` masing-masing |
| Tabel rekap tanpa fungsi | 1 tabel | Menjadi *drill-down*: kolom dapat diurutkan, kolom penyakit aktif ditandai (`climate-recap-table.tsx`) |
| Tombol keluar berwarna risiko | 1 kontrol | "Kembali ke Beranda" bergaya `risk-high` + ikon `LogOut` — merah di produk ini berarti tingkat risiko (§1.1), bukan "tombol berbahaya". Kini netral, dan memisahkan "keluar sesi" dari "beranda" |
| Portal warga di dalam nav konsol | 1 tautan | Dipisah ke grup "Permukaan publik" bertanda panah keluar; sebelumnya satu-satunya jalan pulang adalah tombol yang menghapus sesi |
| `readSession()` tidak pernah dipanggil | 1 fungsi | `Sidebar` menampilkan sesi yang benar-benar tersimpan, bukan label statis |

### Ditutup di sapuan portal warga (`/warga`, `/warga/lapor`, `/warga/status`, `/verifikasi`)

Keputusan pembukanya dicatat di [`.council/fungsi-dan-nasib-rute-warga.md`](../.council/fungsi-dan-nasib-rute-warga.md).

| Utang | Ukuran semula | Yang dikerjakan |
|---|---:|---|
| Enam tautan menjanjikan pelaporan yang tidak ada | 6 tautan, 4 berbohong | `risk-result-section.tsx:464` "Laporkan gejala", `cta-banner.tsx:90` "Laporkan sekarang", `services.tsx` SL-02, dan `sistem-footer.tsx` semuanya mendarat di pengecek risiko. Sekarang mengarah ke `/warga/lapor`, dan formulirnya ada |
| `/warga` adalah salinan halaman depan yang lebih miskin | 1 rute, 266 baris | `<select>` 16 kecamatan, tiga kartu penyakit, dan tiga blok edukasi statis dihapus bersama `public-risk-checker.tsx`. Halaman depan sudah melakukan ketiganya dengan pencarian berpapan ketik, deteksi lokasi, selang prakiraan, dan panduan bertab |
| Edukasi yang tidak berubah mengikuti risiko | 3 kartu | PRD §5.3 menuntut "tindakan pencegahan yang **berubah mengikuti level risiko**"; teks lama identik untuk 16 kecamatan dan tiga tingkat. Dihapus — `EducationSection` di halaman depan sudah bertab per penyakit dengan empat langkah dan satu baris "kapan ke puskesmas" |
| Banner "bukan diagnosis" tidak ada di mana pun | 3 rute | PRD §11-H3 mengujinya di `/warga`, `/warga/lapor`, `/warga/status`. Dipasang di `WargaShell`, bukan di tiap halaman, supaya rute baru tidak bisa lupa membawanya |
| Formulir langganan WhatsApp di permukaan warga | 1 blok | PRD §4 menaruh "notifikasi broadcast" di daftar WON'T. Ikut terhapus bersama `PublicRiskChecker`; kembarannya di *landing* tersisa sebagai utang no. 10 |
| `/verifikasi` rute mati | 1 rute | Terdaftar di `CONSOLE_ROUTES` sejak chrome konsol dibuat, tanpa berkas halaman. Kini M7: antrean Terima/Tolak, saringan status + wilayah, dan lencana tiket lingkungan (§5.6b) |
| Kecamatan ditanya dua kali | 1 alur | Hero, papan kecamatan, dan deteksi lokasi sudah menanyakan tempat tinggal pembaca; formulir menanyakannya lagi. `lib/kecamatan-selection.ts` membawa jawabannya lewat `?kecamatan=` dan `localStorage` |
| `liquid-glass*` di `/warga` | 6 pemakaian | Nol. Sisa 23 pemakaian di 5 berkas, semuanya di luar konsol dan portal warga |
| `bg-mesh-blue` di permukaan hangat | 1 rute | PRD §5.3 menetapkan `/warga` memakai *surface* hangat, bukan tampilan konsol. Diganti `bg-grad-paper` |
| "Lapor" tak terjangkau dari halaman mana pun selain depan | 1 nav | Ditambahkan ke `MARKETING_ITEMS` di `navbar.tsx`. Sebelumnya pembaca di `/tentang` tidak punya jalan ke sana sama sekali |

### Masih terbuka

| # | Utang | Ukuran | Dampak | Perbaikan |
|---|---|---:|---|---|
| 1 | Dua primitif KPI dengan kontrak sama: `<Metric>` (0 pemakaian) dan `KpiCard` (7) | 2 komponen | Kontributor berikutnya harus menebak yang mana | Jadikan `KpiCard` pembungkus tipis `<Card>` + `<Metric>`, lalu hapus duplikasi angkanya |
| 2 | Skala tipografi sistem belum menyeluruh | 389 sistem vs 216 bawaan + 164 `text-[…]` | Hierarki tidak konsisten antar halaman | Sapuan halaman nakes dan portal warga selesai. Sisanya terkonsentrasi di `/dashboard`, `/dev`, dan *landing* |
| 3 | `liquid-glass*` masih hidup | 23 pemakaian, 5 berkas (dari 60 di 12) | Kosmetik — efeknya sudah datar, tinggal namanya | Migrasi ke `<Card>`, lalu hapus blok `globals.css` + `ui/liquid-glass-card.tsx` |
| 4 | `--radius` / `--radius-control` tak dirujuk siapa pun | 2 variabel | Dua skala radius hidup berdampingan | Hapus, atau jadikan sumber tunggal skala Tailwind |
| 5 | `destructive: #DC2626` (red-600 bawaan) | 1 token | Satu-satunya hex luar palet di konfigurasi | Arahkan ke `#A8442C` atau hapus slotnya |
| 6 | `shadow-glass*` dan alias bayangan warisan | 5 pemakaian | Nama menyesatkan; nilainya sudah rata | Ganti ke `shadow-card` / `shadow-lift`, lalu hapus aliasnya |
| 7 | `backdrop-filter` masih ada, dan §11 mengaku sebaliknya | 14 pemakaian, 6 berkas | Melanggar prinsip §1.3, dan daftar periksa yang berbohong lebih berbahaya daripada utang yang tercatat | Terberat di `ui/apple-glass-date.tsx` dan `district-detail-panel.tsx`; sisanya `globals.css`, `navbar.tsx`, `landing/mac-risk-browser.tsx`, `sistem/masthead.tsx`. `PeriodChip` (§7.11) sudah menjadi penggantinya — tinggal memakainya di `/dashboard`. *Hitungan berkas dikoreksi dari 5 ke 6: v2.1 lupa menghitung `globals.css`* |
| 8 | `formatPercent()` memakai `toFixed(1)` → titik desimal | 1 fungsi | `91.4%` terbaca sebagai ribuan dalam kaidah Indonesia | Arahkan ke `formatNumber()` yang sudah memakai `id-ID` |
| 9 | `<Metric>` tetap 0 pemakaian setelah `KpiCard` menutup kontraknya | 1 komponen | Sama dengan no. 1 | Digabung bersama no. 1 |
| 10 | `CtaBanner` masih memuat formulir langganan WhatsApp | 1 blok | PRD §4 menaruh "notifikasi broadcast" di daftar **WON'T** untuk babak ini, jadi ini janji layanan yang tidak akan ada | Formulir kembarannya di `/warga` sudah ikut terhapus bersama `PublicRiskChecker`. Yang di *landing* tinggal satu — ganti jadi tautan ke `/hubungi-kami`, atau beri label "belum aktif" |
| 11 | `lib/reports.ts` menyimpan di `localStorage` saja | 1 modul | Loop warga→verifikasi hanya bergerak dalam satu peramban. Demo lintas perangkat (warga di ponsel, petugas di laptop) tidak akan jalan | Batasnya sudah tercetak di `/verifikasi` dan `/warga/status`, bukan disembunyikan. Tukar `loadReports`/`saveReports` dengan panggilan gateway saat backend-nya ada — tidak ada tempat lain yang perlu berubah |
| 12 | `ui/input.tsx` memakai `text-sm` (14px) | 1 primitif | Safari iOS memperbesar viewport pada bidang di bawah 16px, dan halaman melompat tiap kali bidang difokuskan | Formulir warga menyiasatinya per-instans dengan `text-base sm:text-sm`. Perbaikan sebenarnya ada di primitifnya, tapi itu menyentuh seluruh konsol |

Urutan kerja bila waktunya terbatas: **7 → 3 → 10**.
Nomor 2 sudah lewat titik baliknya — skala sistem kini unggul 389 lawan 216, dan sisanya
mekanis. Nomor 7 bertahan di puncak karena satu-satunya utang yang **salah dicatat**:
daftar periksa mengaku bersih padahal tidak, dan hitungan berkasnya sendiri juga meleset.
3 menghapus satu lapis komponen sekaligus. 10 naik menggantikan 1 karena murah dan
menyangkut janji ke publik, bukan kerapian internal.
