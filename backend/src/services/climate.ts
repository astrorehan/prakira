/**
 * Penerjemahan angka iklim jadi label yang bisa dibaca petugas.
 *
 * Ambangnya bukan selera: dipakai klasifikasi curah hujan bulanan BMKG
 * (rendah / menengah / tinggi / sangat tinggi), sehingga label di dashboard
 * bisa dicocokkan dengan siaran BMKG yang dibaca petugas di tempat lain.
 * Bulan pancaroba mengikuti definisi yang sama persis dengan fitur
 * `is_pancaroba` di `ml-services/features/build_features.py` — kalau kedua
 * sisi memakai definisi berbeda, penjelasan di UI tidak lagi menjelaskan
 * model yang sedang berjalan.
 */

/** Bulan transisi musim, sama dengan fitur `is_pancaroba` pada model. */
const PANCAROBA_MONTHS = new Set([3, 4, 10, 11]);

export function isPancaroba(monthStart: string): boolean {
  const month = Number(monthStart.split("-")[1]);
  return PANCAROBA_MONTHS.has(month);
}

/** Klasifikasi curah hujan bulanan BMKG. `null` bila datanya tidak ada. */
export function rainfallCategory(rainfallMm: number | null): string | null {
  if (rainfallMm === null || !Number.isFinite(rainfallMm)) return null;
  if (rainfallMm <= 100) return "Curah hujan rendah";
  if (rainfallMm <= 300) return "Curah hujan menengah";
  if (rainfallMm <= 500) return "Curah hujan tinggi";
  return "Curah hujan sangat tinggi";
}

/** Kalimat pemicu iklim untuk rekomendasi — hanya menyebut yang ada datanya. */
export function climateTriggerSentence(input: {
  monthStart: string;
  rainfallMm: number | null;
  tempC: number | null;
  humidityPct: number | null;
}): string | null {
  const parts: string[] = [];
  if (input.rainfallMm !== null) {
    parts.push(`curah hujan ${formatNumber(input.rainfallMm)} mm`);
  }
  if (input.tempC !== null)
    parts.push(`suhu rata-rata ${formatNumber(input.tempC)} °C`);
  if (input.humidityPct !== null) {
    parts.push(`kelembaban ${formatNumber(input.humidityPct)}%`);
  }
  if (parts.length === 0) return null;

  const season = isPancaroba(input.monthStart) ? ", bulan pancaroba" : "";
  return `${parts.join(", ")}${season}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}
