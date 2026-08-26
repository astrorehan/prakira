/**
 * Statistik korelasi untuk halaman Analitik.
 *
 * Halaman ini dulu mencetak "Korelasi Pearson: r = +0.84" dan lencana
 * "P-value < 0.001 (Signifikan)" sebagai teks mati. Angkanya tidak berubah saat
 * penyakit diganti, jadi memilih ISPA menampilkan grafik ISPA di bawah klaim
 * korelasi DBD. Nilai statistik yang tidak dihitung dari datanya bukan
 * transparansi model — ia hiasan yang menyamar sebagai bukti.
 */

/** Koefisien korelasi Pearson. `null` kalau salah satu deret tanpa variasi. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;

  const meanX = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let sxx = 0;
  let syy = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  const den = Math.sqrt(sxx * syy);
  return den === 0 ? null : num / den;
}

/**
 * Nilai kritis |r| dua-arah, indeks berdasarkan derajat bebas (n − 2).
 *
 * Tabel, bukan fungsi distribusi-t penuh: dengan dataset selebar ini, ambang
 * yang dilewati adalah informasi yang berguna, sedangkan p-value desimal
 * hasil aproksimasi hanya akan terlihat lebih pasti daripada yang sebenarnya.
 * Pencarian memakai df tertabel terbesar yang ≤ df sebenarnya, jadi
 * kesimpulannya konservatif.
 */
const CRITICAL_R: { df: number; p05: number; p01: number }[] = [
  { df: 3, p05: 0.878, p01: 0.959 },
  { df: 5, p05: 0.754, p01: 0.874 },
  { df: 8, p05: 0.632, p01: 0.765 },
  { df: 10, p05: 0.576, p01: 0.708 },
  { df: 12, p05: 0.532, p01: 0.661 },
  { df: 15, p05: 0.482, p01: 0.606 },
  { df: 20, p05: 0.423, p01: 0.537 },
  { df: 30, p05: 0.349, p01: 0.449 },
  { df: 50, p05: 0.273, p01: 0.354 },
  { df: 100, p05: 0.195, p01: 0.254 },
];

export type Significance =
  | "signifikan (p<0,01)"
  | "signifikan (p<0,05)"
  | "tidak signifikan"
  | "data belum cukup";

export function significanceOf(r: number | null, n: number): Significance {
  if (r === null || n < 5) return "data belum cukup";

  const df = n - 2;
  const row = [...CRITICAL_R].reverse().find((c) => c.df <= df) ?? CRITICAL_R[0];
  const abs = Math.abs(r);

  if (abs >= row.p01) return "signifikan (p<0,01)";
  if (abs >= row.p05) return "signifikan (p<0,05)";
  return "tidak signifikan";
}

/** Benar kalau ambang statistiknya terlewati — untuk memilih gaya lencana. */
export function isSignificant(s: Significance): boolean {
  return s.startsWith("signifikan");
}

/** Kekuatan hubungan dalam kata, supaya angkanya tidak berdiri sendiri. */
export function strengthOf(r: number | null): string {
  if (r === null) return "tak terdefinisi";
  const abs = Math.abs(r);
  if (abs >= 0.8) return "sangat kuat";
  if (abs >= 0.6) return "kuat";
  if (abs >= 0.4) return "sedang";
  if (abs >= 0.2) return "lemah";
  return "sangat lemah";
}

export type Correlation = {
  /** Kunci variabel iklim, untuk mencocokkan warna deret. */
  key: "rain" | "temp" | "humid";
  label: string;
  r: number | null;
  n: number;
  significance: Significance;
  strength: string;
  /** "+0,84" / "−0,31" — koma desimal Indonesia, tanda selalu ikut. */
  display: string;
};

export function formatR(r: number | null): string {
  if (r === null) return "—";
  const sign = r < 0 ? "−" : "+";
  return `${sign}${Math.abs(r).toFixed(2).replace(".", ",")}`;
}

function describe(
  key: Correlation["key"],
  label: string,
  xs: number[],
  ys: number[],
): Correlation {
  const n = Math.min(xs.length, ys.length);
  const r = pearson(xs, ys);
  return {
    key,
    label,
    r,
    n,
    significance: significanceOf(r, n),
    strength: strengthOf(r),
    display: formatR(r),
  };
}

/**
 * Korelasi kasus terhadap tiga variabel iklim sekaligus.
 *
 * Menampilkan ketiganya, bukan satu angka pilihan, karena pendorong tiap
 * penyakit berbeda: DBD mengikuti curah hujan, ISPA justru berlawanan arah
 * dengan kelembaban. Satu `r` tunggal menyembunyikan perbedaan itu.
 */
export function climateCorrelations(
  rows: { curah_hujan_mm: number; suhu_c: number; kelembaban_pct: number }[],
  cases: number[],
): Correlation[] {
  return [
    describe("rain", "Curah hujan", rows.map((d) => d.curah_hujan_mm), cases),
    describe("temp", "Suhu", rows.map((d) => d.suhu_c), cases),
    describe("humid", "Kelembaban", rows.map((d) => d.kelembaban_pct), cases),
  ];
}

/** Korelasi dengan |r| terbesar — variabel yang paling menjelaskan deret ini. */
export function strongestCorrelation(list: Correlation[]): Correlation | null {
  const scored = list.filter((c) => c.r !== null);
  if (scored.length === 0) return null;
  return scored.reduce((best, c) =>
    Math.abs(c.r as number) > Math.abs(best.r as number) ? c : best,
  );
}
