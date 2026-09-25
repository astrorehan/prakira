/**
 * Satu pintu untuk membuang cache baca gateway setelah data berubah.
 *
 * Cache dashboard, periode, dan metadata penyakit ditahan beberapa menit
 * karena datanya bulanan. Itu hanya benar bila setiap penulisan ke
 * `observasi` atau `prediksi` memanggil fungsi ini: TTL yang panjang tidak
 * lagi menutupi jalur penulisan yang lupa menginvalidasi.
 */
import { invalidateDiseaseMetaCache } from "../routes/meta.js";
import { invalidateDistrictViewCache } from "./districts.js";
import { invalidatePeriodCache } from "./period.js";

export function invalidateReadCaches(disease?: string): void {
  invalidateDistrictViewCache(disease);
  invalidatePeriodCache();
  invalidateDiseaseMetaCache();
}
