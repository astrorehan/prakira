# PRAKIRA Design System — "Buletin"

**Sistem visual untuk platform peringatan dini kesehatan-iklim.**
Pendamping [`PRD.md`](./PRD.md) · Versi 1.0 · 24 Agustus 2026

---

## 0. Kenapa versi sebelumnya terasa "AI slop"

Ini bukan soal selera. Ada sepuluh sebab teknis yang bisa ditunjuk, dan semuanya berasal dari satu kesalahan pola: **strukturnya rapi, tapi bahan bakunya diambil dari nilai bawaan Tailwind.** Kesan mahal justru ditentukan bahan baku, bukan struktur.

| # | Gejala | Sebab teknis |
|---|---|---|
| 1 | Terasa seperti template dashboard generik | Palet netralnya adalah ramp `slate` bawaan Tailwind (`#F8FAFC`, `#E2E8F0`, `#F1F5F9`). Netral hangat kustom akan terbaca seperti kertas; ramp bawaan terbaca seperti Bootstrap |
| 2 | Warna berisik, tidak ada hierarki | ±25 warna terpakai: 7 varian `primary`, 6 warna risiko, 3 warna penyakit, plus `emerald-700` `rose-700` `sky-500` `amber-700` `blue-700` `indigo-600` `teal-600` yang dipanggil langsung di komponen. Anggaran yang sehat: 1 warna merek + 2 aksen + 4 status |
| 3 | Warna risiko terasa murah | `#059669 / #D97706 / #E11D48` persis `emerald-600 / amber-600 / rose-600` bawaan Tailwind. Warna default framework selalu terbaca sebagai default |
| 4 | *Liquid glass* | `backdrop-filter: blur()` pada latar terang adalah penanda paling kuat UI hasil generate |
| 5 | Font terasa seperti "startup 2022" | Ditambahkan `Outfit` sebagai `--font-display`. Dua *typeface* geometris tanpa alasan. Selain itu `font-feature-settings` diubah ke `cv02,cv03,cv04,cv11` yang mengaktifkan varian *single-storey* — membuat Inter menyerupai Product Sans |
| 6 | Semua berteriak, tidak ada penekanan | Hampir seluruh elemen `font-semibold` — *eyebrow*, chip, pill, tombol, badge. Bobot seragam meniadakan hierarki |
| 7 | Terasa seperti aplikasi konsumen, bukan sistem publik | Tombol `rounded-full` setinggi `h-12`/`h-14` + `active:scale-[0.98]` |
| 8 | Latar terasa kotor, bukan atmosferik | Mesh gradient dilemahkan (alpha 0.12/0.08/0.06 dari 0.18/0.12/0.10) sementara *dot grid* dikuatkan (0.08–0.09 @ `opacity-60` dari 0.06 @ `opacity-50`). Hasilnya kisi yang ramai alih-alih sapuan lembut |
| 9 | Perkelahian spesifisitas CSS | `.eyebrow`, `.chip`, `.bg-mesh` didefinisikan di akar `globals.css`, di luar `@layer`. Seharusnya di `@layer components` / `@layer utilities` |
| 10 | Kode mati & bug diam | `liquid-glass-frost`, `liquid-glass-risk-*`, `shadow-glass-sm/md/lg` dipakai komponen tapi tidak pernah didefinisikan. `extend.colors.amber = "#C97B1A"` menimpa seluruh skala amber Tailwind, sehingga `bg-amber-50` pada `Badge variant="risk-medium"` **tidak menghasilkan warna apa pun** |

**Kesimpulan yang perlu dipegang:** kesan mewah tidak datang dari efek (glass, glow, gradien). Kesan mewah datang dari **netral yang dipilih sendiri, jumlah warna yang sedikit, bobot huruf yang menahan diri, dan ruang kosong yang berani.** Tiga hal pertama gratis; yang keempat butuh disiplin.

---

## 1. Posisi & Prinsip

PRAKIRA bukan aplikasi konsumen dan bukan situs SaaS. Ini **instrumen kerja lembaga publik** yang juga punya wajah untuk warga. Referensinya buletin meteorologi dan jurnalisme data, bukan halaman *landing* startup.

Nama sistem: **Buletin**.

### Enam prinsip

1. **Warna adalah data.** Satu-satunya kejenuhan tinggi di layar adalah tingkat risiko. Merek, permukaan, dan navigasi berbicara dengan netral. Kalau segalanya berwarna, tidak ada yang berarti.
2. **Angka adalah pahlawannya.** Tipografi dirancang untuk metrik: angka bertabulasi, nol bergaris, label mono, satuan yang tidak ikut membesar.
3. **Menahan diri = mahal.** Bobot huruf berhenti di 600. Radius tidak melebihi 18px kecuali panel besar. Bayangan tidak melebihi tiga lapis.
4. **Ketidakpastian ikut ditampilkan.** Setiap komponen angka punya slot bawaan untuk rentang dan cakupan data. Sistem desain yang tidak menyediakan tempat untuk kejujuran akan membuat kejujuran dilupakan.
5. **Dua permukaan, satu sistem.** Konsol (dinas/puskesmas) dan Publik (warga) memakai token yang sama dengan suhu berbeda — dingin & padat vs hangat & lapang.
6. **Bisa dibaca dalam abu-abu.** Kelas risiko dibedakan oleh terang-gelap yang monoton menurun, bukan hanya hue. Aman untuk buta warna, fotokopi, dan proyektor ruang pameran.

---

## 2. Token Warna

Semua token hidup di `frontend/tailwind.config.ts` dan `frontend/src/app/globals.css`. Jangan pernah menulis hex langsung di komponen.

### 2.1 Netral — ramp "Kertas"

Bukan `slate`. Ramp kustom pada hue ±192° dengan kroma sangat rendah, sehingga netralnya condong ke merek dan seluruh layar terasa satu keluarga.

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

Teal-biru dalam. Bukan hijau agrikultur, bukan biru SaaS bawaan. Mengkodekan iklim + klinis tanpa bersaing dengan ramp risiko.

| Token | Hex | Pakai untuk |
|---|---|---|
| `brand-900` | `#06282F` | Latar gelap, footer, sidebar |
| `brand-800` | `#093843` | Hover pada permukaan gelap |
| `brand-700` | `#0B4A57` | **Primary** — tombol utama, ikon aktif |
| `brand-600` | `#0F5F6E` | Hover tombol primer |
| `brand-500` | `#17808F` | Tautan, deret grafik ke-1 |
| `brand-300` | `#7FB8C0` | Border aksen, keadaan nonaktif |
| `brand-100` | `#D6E9EC` | Isian chip & *eyebrow* |
| `brand-50` | `#EAF4F5` | Latar blok tersorot |

Kontras `brand-700` di atas putih ≈ 9.4:1 — aman untuk teks kecil dan ikon.

### 2.3 Ramp Risiko — "Sinyal"

Satu-satunya warna jenuh di produk. Nilai kustom, lebih gelap dan lebih rendah kroma daripada default Tailwind, sehingga bertahan saat dicetak dan diproyeksikan.

| Kelas | Isi/teks | Latar lembut | Border | Isian peta | Terang (L*) |
|---|---|---|---|---|---:|
| Rendah | `#1B6B4F` | `#E3F0EA` | `#BEDBCE` | `#BCD9C9` | 84 |
| Sedang | `#A8690C` | `#FAF0DC` | `#EAD3A3` | `#E0AF63` | 74 |
| Tinggi | `#A32B1F` | `#F9E6E2` | `#EBC0B7` | `#B34434` | 45 |
| KLB *(cadangan)* | `#6B140E` | `#F1D9D4` | `#E0B3AB` | `#7C2318` | 32 |
| Data tidak memadai | `#5A6C6E` | `#ECF0F0` | `#DFE6E6` | `#E3E8E8` | — |

**Aturan yang mengikat:**
- Terang isian peta **menurun monoton** (84 → 74 → 45 → 32). Artinya urutan risiko tetap terbaca dalam abu-abu, buta warna, dan hasil cetak.
- Kelas risiko **tidak boleh** disampaikan lewat warna saja. Wajib disertai label teks dan ikon (WCAG 1.4.1).
- `Data tidak memadai` adalah kelas tersendiri dan **tidak pernah** ditampilkan sebagai "Rendah". Ini kesalahan kepercayaan yang paling mudah ditemukan juri.
- Isian risiko `Tinggi` pada peta memakai *hatch* diagonal 45° tipis di atas isian, agar tetap terpisah dari `Sedang` bagi penderita protanopia.

### 2.4 Kategorikal (grafik saja)

Untuk membedakan penyakit atau deret pada grafik multi-seri. **Tidak pernah** mengkodekan risiko.

| Token | Hex |
|---|---|
| `cat-1` | `#0B4A57` |
| `cat-2` | `#7A5C2E` |
| `cat-3` | `#47617F` |
| `cat-4` | `#5B4A70` |
| `cat-5` | `#2C6650` |

**Aturan silang:** warna risiko tidak pernah muncul di grafik kategorikal; warna kategorikal tidak pernah mengkodekan risiko. Pelanggaran aturan ini adalah penyebab utama kekacauan visual pada versi sebelumnya.

Penyakit **tidak** dibedakan warna di peta risiko — di sana warna sudah dipakai untuk risiko. Penyakit dibedakan lewat ikon + label + pemilih (*selector*).

### 2.5 Variabel iklim (pengkodean tetap)

Selalu sama di seluruh produk, agar pembaca tidak perlu membaca ulang legenda.

| Variabel | Hex |
|---|---|
| Curah hujan | `#2E6F8E` |
| Suhu | `#B4552A` |
| Kelembaban | `#4E8C7E` |

### 2.6 Permukaan hangat — "Tanah" (portal warga)

| Token | Hex |
|---|---|
| `sand-50` | `#FAF7F1` |
| `sand-100` | `#F2EDE3` |
| `sand-200` | `#E5DDCC` |

---

## 3. Dua Permukaan (Dual Surface)

Ide struktural yang membedakan PRAKIRA dari sistem desain dashboard mana pun yang disalin: **suhu permukaan mengkodekan audiens.**

| | Konsol — `/dashboard`, `/analitik`, `/admin` | Publik — `/warga`, `/`, `/model` |
|---|---|---|
| Kanvas | `paper-50` (dingin) | `sand-50` (hangat) |
| Kepadatan | Padat — tinggi baris 40px, padding kartu 20px | Lapang — tinggi baris 52px, padding kartu 28px |
| Ukuran teks dasar | 15px | 17px |
| Peran mono | Berat — label, kode, satuan, cap waktu | Ringan — hanya *eyebrow* |
| Nada | Instrumen. Angka dulu, kalimat belakangan | Kalimat dulu, angka sebagai penopang |

Implementasi: atribut `data-surface="console" \| "public"` pada `<body>` atau pembungkus rute. Token yang bergantung permukaan didefinisikan ulang di dalam pemilih atribut tersebut. Komponen tidak perlu tahu sedang berada di permukaan mana.

Kenapa ini bagus untuk penilaian: bukan dekorasi, melainkan jawaban desain atas kebutuhan produk (dua audiens dengan literasi data yang jauh berbeda), dan dapat dijelaskan dalam satu kalimat saat tanya jawab.

---

## 4. Tipografi

### 4.1 Typeface

| Peran | Font | Alasan |
|---|---|---|
| UI & teks | **Inter** (variabel) | Netral, x-height tinggi, angka bertabulasi tersedia |
| Data & label | **IBM Plex Mono** | Nol bergaris bawaan, nada kelembagaan, bukan "hacker". Memberi rasa terukur pada label, kode BPS, cap waktu, satuan |

**Hanya dua.** `Outfit` dibuang. Menambahkan *typeface* display geometris adalah persis langkah yang membuat versi sebelumnya terbaca sebagai template.

Fitur OpenType untuk Inter:

```css
font-feature-settings: "cv05" 1, "cv08" 1, "ss03" 1, "calt" 1;
```

`cv05` memberi ekor pada huruf `l` (membedakannya dari `1` dan `I`), `cv08` memberi serif pada `I` kapital, `ss03` merapikan tanda kutip dan koma. Ketiganya menaikkan keterbacaan data. Jangan aktifkan `cv11` — itu membuat `a` menjadi *single-storey* dan Inter kehilangan karakternya.

Untuk seluruh angka metrik: `font-variant-numeric: tabular-nums slashed-zero;`. Angka yang tidak bertabulasi membuat kolom tabel bergoyang saat data berubah — detail kecil yang langsung membedakan produk data yang serius dari yang tidak.

> **Varian opsional.** Bila tim ingin nada editorial yang lebih berwibawa, ganti `--font-display` menjadi **Source Serif 4** dan pakai hanya pada `display` dan `h1`. Satu baris di `layout.tsx`. Rekomendasi: baru lakukan ini setelah 29 Agustus, bukan sekarang.

### 4.2 Skala

Basis 16px. Ukuran ditulis dalam `rem`.

| Token | Ukuran | Tinggi baris | *Tracking* | Bobot | Pakai untuk |
|---|---|---|---|---:|---|
| `display` | `clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)` | 1.04 | −0.022em | 600 | H1 hero |
| `h1` | 2rem / 32px | 1.15 | −0.02em | 600 | Judul halaman |
| `h2` | 1.5rem / 24px | 1.2 | −0.018em | 600 | Judul bagian |
| `h3` | 1.125rem / 18px | 1.35 | −0.012em | 600 | Judul kartu |
| `body-lg` | 1.0625rem / 17px | 1.65 | 0 | 400 | Paragraf permukaan publik |
| `body` | 0.9375rem / 15px | 1.6 | 0 | 400 | Teks baku konsol |
| `body-sm` | 0.875rem / 14px | 1.55 | 0 | 400 | Teks pendukung |
| `caption` | 0.8125rem / 13px | 1.45 | 0 | 400 | Keterangan, catatan kaki |
| `overline` | 0.6875rem / 11px | 1 | +0.08em | 500 | Label mono huruf besar |
| `metric-xl` | 2.5rem / 40px | 1.0 | −0.02em | 600 | KPI utama |
| `metric` | 2rem / 32px | 1.05 | −0.02em | 600 | Nilai kartu metrik |
| `metric-sm` | 1.375rem / 22px | 1.1 | −0.01em | 600 | Angka dalam tabel padat |

### 4.3 Aturan bobot

| Bobot | Boleh dipakai untuk |
|---|---|
| 400 | Seluruh teks berjalan. Ini keadaan baku |
| 500 | Label UI, kepala tabel, teks tombol, item nav aktif |
| 600 | Judul dan nilai metrik. **Titik berhenti** |
| 700+ | **Dilarang.** Kalau butuh 700 untuk menonjol, masalahnya ada di tata letak, bukan di bobot |

Ini perbaikan tunggal dengan dampak terbesar terhadap kesan "AI slop": versi sebelumnya memakai `font-semibold` pada hampir semua elemen kecil.

---

## 5. Ruang, Radius, Bayangan

### 5.1 Ruang

Basis 4px. Skala: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80 24=96`.

Ritme bagian halaman: `py-16` di mobile, `py-24` di desktop untuk permukaan publik; `py-8`/`py-10` untuk konsol.

Padding kartu: konsol `20px`, publik `28px`. Kartu di dalam kartu: `16px`.

### 5.2 Radius

| Token | Nilai | Pakai untuk |
|---|---:|---|
| `xs` | 4px | Kotak centang, indikator kecil |
| `sm` | 6px | Tag, chip mungil |
| `md` | 8px | Input dalam, tombol ikon kecil |
| `lg` | 10px | **Tombol, input, select** |
| `xl` | 14px | **Kartu** |
| `2xl` | 18px | Panel besar, wadah peta, modal |
| `full` | 9999px | Badge dan pill **saja** |

Angka 10/14/18 memang bukan angka bulat. Itu disengaja — skala radius kustom adalah tanda tangan sistem desain yang dirancang, bukan yang diambil dari bawaan.

Yang berubah dari versi lama: tombol berhenti menjadi pil penuh. Pil penuh pada kontrol setinggi 48px membuat produk terbaca sebagai aplikasi konsumen. Badge tetap pil — itu justru menegaskan bedanya kontrol dan label.

### 5.3 Bayangan

Semua bayangan berwarna tinta merek (`#0E2225`), bukan hitam murni. Bayangan hitam pada latar berwarna selalu terlihat kotor.

| Token | Nilai |
|---|---|
| `hairline` | `0 0 0 1px rgba(14,34,37,.06)` |
| `xs` | `0 1px 1px rgba(14,34,37,.04)` |
| `sm` | `0 1px 2px rgba(14,34,37,.05), 0 1px 1px rgba(14,34,37,.03)` |
| `card` | `0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)` |
| `lift` | `0 2px 4px rgba(14,34,37,.04), 0 18px 36px -14px rgba(14,34,37,.16)` |
| `pop` | `0 4px 8px rgba(14,34,37,.06), 0 28px 56px -20px rgba(14,34,37,.22)` |
| `focus` | `0 0 0 2px #FFFFFF, 0 0 0 4px rgba(11,74,87,.55)` |

**Aturan:** area padat (tabel, daftar, panel bersebelahan) dipisahkan oleh **garis rambut**, bukan bayangan. Bayangan hanya untuk yang benar-benar mengambang: *popover*, *dropdown*, modal, kartu yang bisa diseret. Menumpuk bayangan pada elemen yang tidak mengambang adalah sebab utama tampilan "berbusa".

`glow` dan seluruh varian `glass` dihapus dari sistem.

---

## 6. Gerak

| Token | Nilai |
|---|---|
| `--ease-out` | `cubic-bezier(.2,.7,.3,1)` |
| `--ease-inout` | `cubic-bezier(.5,0,.2,1)` |
| `--dur-fast` | 140ms |
| `--dur-base` | 200ms |
| `--dur-slow` | 320ms |

**Aturan:**
1. Animasi masuk hanya untuk konten di atas lipatan (*above the fold*). Bagian bawah halaman tidak dianimasikan saat digulir.
2. Pembaruan data memakai *crossfade* 200ms, tanpa geseran posisi. Angka yang melompat saat diperbarui membuat pembaca tidak percaya.
3. Animasi berulang tak terbatas hanya boleh satu: titik "langsung" (*live*) pada status sinkronisasi BMKG.
4. `active:scale-*` dilarang pada tombol. Ganti dengan pergeseran warna latar.
5. Seluruh animasi mati pada `prefers-reduced-motion: reduce`.

---

## 7. Komponen

### 7.1 Tombol

| Varian | Tampilan | Pakai untuk |
|---|---|---|
| `primary` | Isi `brand-700`, teks putih | Satu per layar. Aksi utama |
| `secondary` | Isi `paper-100`, teks `paper-800`, garis rambut | Aksi pendamping |
| `outline` | Transparan, border `paper-300` | Aksi tersier |
| `ghost` | Transparan, hover `paper-100` | Aksi di dalam toolbar & tabel |
| `danger` | Isi `risk-high` | Hapus, tolak laporan |
| `link` | Teks `brand-500`, garis bawah saat hover | Navigasi sebaris |

Ukuran: `sm` 32px · `md` 38px (baku) · `lg` 44px. Tidak ada `xl`. Radius `lg` (10px). Teks bobot 500, bukan 600.

### 7.2 Kartu

Permukaan `paper-0`, radius `xl`, garis rambut `paper-200`, bayangan `card`. Header memakai `h3` + deskripsi `caption`. Jangan menumpuk bayangan pada kartu yang bersarang — gunakan `paper-100` tanpa bayangan.

### 7.3 Metrik (primitif baru)

Blok angka baku. Wajib dipakai untuk semua KPI agar konsisten dan agar ketidakpastian tidak pernah hilang.

```
┌─────────────────────────────────┐
│ KASUS DIPREDIKSI     [overline] │  11px mono, uppercase, paper-500
│                                 │
│ 54  kasus            [metric]   │  32px tabular, 600 · satuan 14px 400
│ 41 – 68              [caption]  │  13px mono, paper-500  ← rentang WAJIB
│                                 │
│ ▲ 12,4%  vs minggu lalu         │  chip delta + konteks
│ ▇▇▅▃▂▁▂▄  Cakupan: Tinggi       │  sparkline 32px + label cakupan
└─────────────────────────────────┘
```

Aturan: `range` dan `coverage` adalah properti wajib, bukan opsional. Sistem desain yang menjadikan kejujuran opsional akan membuatnya terlupa saat deadline mendekat.

### 7.4 Badge risiko

Pil, `full`, tinggi 22px, teks 12px bobot 500. Isi = latar lembut kelas, teks = warna kelas, border = border kelas. **Selalu** membawa ikon + label. Ikon: Rendah `shield-check`, Sedang `alert-triangle`, Tinggi `siren`, Data tidak memadai `help-circle`.

### 7.5 Tabel

Tinggi baris 40px (konsol) / 52px (publik). Kepala tabel: mono 11px huruf besar, latar `paper-100`, menempel saat digulir. Pemisah baris: garis rambut `paper-200`, tanpa zebra. Kolom angka rata kanan dengan `tabular-nums`. Baris dapat diklik seluruhnya, bukan hanya tautan di dalamnya.

### 7.6 Peta

Wadah radius `2xl`, latar `paper-100`. Isian mengikuti §2.3. Garis batas kecamatan `#FFFFFF` 1px — batas putih membuat isian gelap terbaca sebagai wilayah, bukan sebagai noda. Legenda **wajib** menampilkan ambang numerik tiap kelas, bukan hanya nama kelas. *Tooltip* memuat: nama kecamatan, kelas, skor, prediksi + rentang, cakupan data.

### 7.7 Grafik

Sumbu `paper-400`, kisi horizontal saja `paper-200`, tanpa kisi vertikal. Deret aktual: garis padat `cat-1` 2px. Deret prediksi: garis putus-putus `cat-1` 2px. Pita ketidakpastian: `cat-1` pada alpha 0.12. Pemisah train/test: garis vertikal `paper-400` putus-putus dengan label. Tanpa gradien di bawah kurva — itu dekorasi yang menyembunyikan nilai.

### 7.8 Status kosong / gagal / tidak memadai

Tiga state ini wajib ada di setiap tampilan data, dan tampilannya berbeda satu sama lain. `Data tidak memadai` bukan error dan bukan kosong — ia menyampaikan bahwa sistem tahu batas pengetahuannya.

---

## 8. Aksesibilitas

| Aturan | Ambang |
|---|---|
| Kontras teks normal | ≥ 4.5:1 |
| Kontras teks besar (≥18.66px/600) & ikon | ≥ 3:1 |
| Target sentuh | ≥ 44×44px pada permukaan publik |
| Fokus keyboard | Selalu terlihat, memakai bayangan `focus`. Jangan pernah `outline: none` tanpa pengganti |
| Informasi warna | Selalu didampingi teks atau ikon |
| Pengubah ukuran teks | Tetap dipertahankan (90% / 100% / 112.5% pada `html`) karena UI berbasis `rem` |
| Kontras tinggi | Mode `a11y-contrast` mendefinisikan ulang token, bukan menimpa kelas utilitas satu per satu |
| Gerak | `prefers-reduced-motion` mematikan seluruh transisi |

---

## 9. Pemetaan ke Figma (wajib menurut Rulebook §7.9)

Struktur token dirancang agar dipindahkan langsung menjadi Figma Variables:

| Koleksi Figma | Isi | Mode |
|---|---|---|
| `color/primitive` | `paper-*`, `brand-*`, `risk-*`, `cat-*`, `sand-*` | — |
| `color/semantic` | `canvas`, `surface`, `border`, `text-*`, `risk-*` | `console`, `public` |
| `radius` | `xs`…`2xl` | — |
| `space` | 4-based | — |
| `type` | Text styles per §4.2 | — |

Kerjakan koleksi semantik dengan dua mode sejak awal. Itu membuat papan Konsol dan Publik dibangun dari komponen yang sama — dan itu poin yang mudah ditunjukkan saat presentasi.

---

## 10. Aturan Implementasi

1. **Tidak ada hex di komponen.** Semua warna lewat token Tailwind. Kalau warna yang dibutuhkan belum ada tokennya, tambahkan tokennya — jangan tulis hex.
2. **Tidak memanggil skala warna bawaan Tailwind** (`emerald-600`, `rose-500`, `sky-400`, `slate-*`). Palet produk sudah lengkap.
3. **Kelas kustom hidup di `@layer`.** `@layer components` untuk `.chip`, `.eyebrow`, `.hairline`; `@layer utilities` untuk latar dekoratif.
4. **`liquid-glass*` sudah usang.** Nama kelasnya dipertahankan sementara dan didefinisikan ulang sebagai permukaan datar buram, supaya ±60 pemakaian yang tersebar langsung ikut berubah tanpa menyentuh komponennya. Migrasikan ke `<Card>` secara bertahap; hapus definisinya sebelum submit akhir.
5. **Angka memakai `tabular-nums`.** Tanpa kecuali.
6. **Satu tombol primer per layar.**

---

## 11. Daftar Periksa Sebelum Submit

- [ ] Tidak ada `backdrop-filter` yang tersisa di kode
- [ ] Tidak ada nama warna bawaan Tailwind di `src/`
- [ ] Tidak ada `font-bold` / `font-extrabold`
- [ ] Seluruh nilai metrik membawa rentang dan cakupan data
- [ ] Peta terbaca benar dalam mode abu-abu (uji dengan `filter: grayscale(1)`)
- [ ] Setiap tampilan data punya state kosong, memuat, gagal, dan tidak memadai
- [ ] Fokus keyboard terlihat di seluruh kontrol
- [ ] `prefers-reduced-motion` mematikan animasi
- [ ] Portal warga lolos LCP < 2,5 detik pada simulasi 3G cepat
- [ ] Figma Variables selaras dengan `frontend/tailwind.config.ts`
