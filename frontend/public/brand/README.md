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
