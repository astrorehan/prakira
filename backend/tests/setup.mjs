/**
 * Nilai lingkungan minimum agar `env.ts` bisa diimpor saat pengujian.
 *
 * `env.ts` menolak jalan tanpa `DATABASE_URL`, dan itu perilaku yang benar:
 * URL yang salah lebih baik gagal saat start daripada saat koneksi pertama.
 * Pengujian di berkas ini tidak menyentuh basis data sama sekali — kolam
 * koneksi `pg` baru dibuat ketika `db()` dipanggil — jadi yang dibutuhkan
 * hanya sebuah nilai yang ada.
 */
process.env.DATABASE_URL ??=
  "postgres://prakira:prakira@127.0.0.1:5432/prakira_test";
