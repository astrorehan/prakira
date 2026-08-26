# PRAKIRA — berkas merek

Sumber: `Desain tanpa judul.svg` (ekspor Canva, raster ter-mask). Digambar ulang
sebagai vektor sejati; geometri diukur dari mask asli, IoU 0.961.

## Geometri

Kanvas `512 × 512` (1:1). Semua angka dalam unit viewBox.

| Besaran | Nilai |
|---|---|
| Pusat lingkaran | `(256, 281.75)` |
| Jari-jari luar | `128` |
| Tebal stroke | `25.5` (seragam di semua ruas) |
| Puncak tetesan | `y = 100.731` = `cy − r√2`, hasil *miter join* |
| Sumbu batang | `x = 234.5`, `294.25` |
| Tinggi step | `y = 319.875`, `279.875`, `234.5` |

Tetesan = satu lingkaran + dua garis singgung 45°. Tangga = lima ruas garis lurus
dipotong `clipPath` siluet tetesan.

## Warna

| Peran | Token | Hex |
|---|---|---|
| Mark di latar terang | `brand-700` | `#0B4A57` |
| Mark di latar gelap | `brand-50` | `#EAF4F5` |
| Latar terang | `paper-50` | `#F5F7F7` |
| Latar gelap | `brand-900` | `#06282F` |

## Berkas

**Vektor**

| Berkas | Latar | Mark |
|---|---|---|
| `prakira-mark.svg` | transparan | `currentColor` |
| `prakira-logo-light.svg` | `#F5F7F7` | `#0B4A57` |
| `prakira-logo-white.svg` | `#FFFFFF` | `#0B4A57` |
| `prakira-logo-dark.svg` | `#06282F` | `#EAF4F5` |
| `prakira-icon-rounded.svg` | petrol, `rx=115` | terang |
| `prakira-icon-rounded-light.svg` | paper, `rx=115` | petrol |
| `prakira-icon-square.svg` | petrol, kotak | terang |
| `favicon.svg` | petrol, `rx=115` | terang |

**Raster** — `prakira-mark-512/1024`, `prakira-logo-{light,dark}-512/1024`,
`prakira-logo-white-1024`, `icon-192`, `icon-512`, `icon-512-maskable`,
`apple-touch-icon` (180, opaque — syarat iOS), `favicon.ico` (16/32/48).

## Lockup

Mark + wordmark. Satu komponen, `src/components/brand-lockup.tsx`, dipakai enam
permukaan: `navbar`, `sidebar`, `footer`, `sistem/masthead`, `sistem/sistem-footer`,
`auth/sign-in-screen`.

**Aturan 1 — kotak bukan bagian dari identitas.** Kotak petrol hanya hidup di tempat
sistem operasi atau peramban memaksa bidang persegi: favicon, `apple-icon`, ikon PWA,
*maskable*. Di dalam aplikasi mark berdiri telanjang.

Alasannya bukan selera. Kotak `bg-brand-700` padat adalah elemen paling jenuh di layar
konsol, dan `DESIGN-SYSTEM.md` §1 prinsip 1 menyatakan kejenuhan disediakan untuk
tingkat risiko — merek, permukaan, dan navigasi berbicara netral. Kotak itu melanggar
prinsip pertama sistemnya sendiri.

**Aturan 2 — mark diukur terhadap blok wordmark, bukan terhadap kotak.** Sebelum ini
tiap permukaan membuat kotaknya sendiri: enam ukuran (28/36/40/40/44/48 px), empat
radius, dua token warna untuk kotak yang sama, dan mark hanya mengisi 45–57% dari
kotak itu. Mark terbaca kecil karena memang kecil.

Angka px di bawah adalah hasil terukur pada `html { font-size: 112.5% }` — akar
proyek ini, jadi `1rem = 18px`, bukan 16.

| Ukuran | Mark | `strokeWidth` | Stroke terender | Judul / subline | Dipakai |
|---|---:|---:|---:|---|---|
| `sm` | `h-6` = 27 px | 2.0 | 2.25 px | 18 / 10.1 px | `footer` |
| `md` | `h-7` = 31.5 px | 1.75 | 2.30 px | 18 / 10.1 px | `navbar`, `sidebar`, `sistem-footer`, `sign-in` |
| `lg` | `h-9` = 40.5 px | 1.35 | 2.28 px | 22.5 / 11.3 px | `sistem/masthead` |

Subline dijaga di ~0.56 × judul. `text-overline` (12.4 px pada akar ini) terlalu
besar berdampingan dengan wordmark 18 px — ia bersaing, bukan melabeli.

Terukur di `navbar`: mark 31.5 px terhadap blok wordmark 41.6 px = **0.76**.
Sebelumnya mark 20 px di dalam kotak 40 px terhadap blok yang sama — mark tumbuh 57%
tanpa mengubah tinggi baris sedikit pun.

**Stroke dijaga ~2 px di semua ukuran, bukan diskalakan seragam.** Mark ini berbagi
baris dengan ikon lucide (baku `strokeWidth` 2 pada grid 24), jadi ia berperilaku
sebagai ikon, bukan logo. Karena itu `strokeWidth` turun saat mark membesar.

**Ruang bebas.** Tetesan lebarnya 62% dari kotak pandangnya sendiri, jadi mark sudah
membawa *side bearing* ~0.19 × tinggi mark di kiri dan kanan. Itulah ruang bebas
minimumnya — jangan tambah *padding* lagi, dan jangan potong kotak pandang 24 untuk
merapatkannya. `gap` ke wordmark sudah memperhitungkannya.

**Warna.** Di latar terang mark memakai `brand-700`, di latar gelap `brand-50` —
persis tabel Warna di atas. Sampai versi ini nilai `#0B4A57` tidak pernah benar-benar
dipakai di aplikasi: mark selalu putih di atas kotak.

**Subline.** Nama layanan, bukan slogan. Berbeda tiap permukaan, jadi tidak pernah
ditanam di dalam komponen — selalu dioper lewat properti `subline`.

## Pakai di web

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Catatan

- `prakira-mark.svg` memakai `currentColor` — harus di-*inline* ke JSX/HTML supaya
  mewarisi warna induk. Lewat `<img src>` dia render hitam.
- Tinggi step tidak seragam (40 unit lalu 45.4). Ini proporsi asli, dipertahankan
  dengan sengaja; menyeragamkan ke 42 menurunkan kemiripan ke IoU 0.947.
- Ikon *maskable* memakai mark skala 1.22 dan muat di zona aman 80%.
