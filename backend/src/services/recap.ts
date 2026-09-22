/**
 * Rekap kasus: kepemilikan angka, koreksi, dan kesiapan periode.
 *
 * Audit F13 menemukan bahwa satu baris `observasi` adalah **total kecamatan**
 * untuk satu penyakit pada satu bulan, sedangkan antarmukanya berbunyi
 * "mencatat kasus". Operator yang mengira sedang menambahkan kontribusi
 * faskesnya sebenarnya mengganti total wilayah. Layanan ini tidak mengubah
 * bentuk datanya — itu keputusan bisnis yang belum diambil — melainkan membuat
 * artinya terlihat: nilai lama, nilai baru, alasan koreksi, dan pemiliknya.
 *
 * Audit F18 menuntut satu jawaban setelah data masuk: periode apa yang
 * lengkap, prakiraan apa yang sah dibaca, dan siapa yang mengerjakan
 * kekurangannya. `periodReadiness` menjawab itu tanpa memaksa petugas
 * pencatat memahami mekanisme model.
 */
import { all, one, run, transaction } from "../db/index.js";
import { logAudit } from "./audit.js";

export type RecapState = "tersimpan" | "diperiksa";

export type RecapEntry = {
  kecamatan_id: string;
  kecamatan_nama: string;
  disease: string;
  month_start: string;
  cases: number;
  rainfall_mm: number | null;
  temp_mean_c: number | null;
  humidity_pct: number | null;
  source: string;
  recorded_at: string;
  recorded_by: string | null;
  revision_reason: string | null;
  recap_state: RecapState | null;
};

export type RecapRevision = {
  previous_cases: number | null;
  new_cases: number;
  reason: string;
  actor: string;
  role: string;
  recorded_at: string;
};

export class RecapReasonRequiredError extends Error {
  constructor(readonly previous: number) {
    super(
      `Kecamatan ini sudah memiliki total ${previous} kasus pada periode tersebut. ` +
        "Sebutkan alasan koreksi sebelum menggantinya.",
    );
    this.name = "RecapReasonRequiredError";
  }
}

/** Rekap yang sudah tersimpan untuk satu kecamatan-penyakit-periode. */
export function findRecapEntry(
  kecamatanId: string,
  disease: string,
  month: string,
): Promise<RecapEntry | null> {
  return one<RecapEntry>(
    `SELECT o.kecamatan_id, k.nama AS kecamatan_nama, o.disease, o.month_start,
            o.cases, o.rainfall_mm, o.temp_mean_c, o.humidity_pct, o.source,
            o.recorded_at, o.recorded_by, o.revision_reason, o.recap_state
       FROM observasi o
       JOIN kecamatan k ON o.kecamatan_id = k.id
      WHERE o.kecamatan_id = ? AND o.disease = ? AND o.month_start = ?`,
    kecamatanId,
    disease,
    month,
  );
}

export function listRecapRevisions(
  kecamatanId: string,
  disease: string,
  month: string,
  limit = 10,
): Promise<RecapRevision[]> {
  return all<RecapRevision>(
    `SELECT previous_cases, new_cases, reason, actor, role, recorded_at
       FROM observasi_revisi
      WHERE kecamatan_id = ? AND disease = ? AND month_start = ?
      ORDER BY recorded_at DESC
      LIMIT ?`,
    kecamatanId,
    disease,
    month,
    limit,
  );
}

export type SaveRecapInput = {
  kecamatanId: string;
  kecamatanNama: string;
  disease: string;
  month: string;
  cases: number;
  rainfall: number | null;
  temp: number | null;
  humidity: number | null;
  reason?: string | null;
  source?: string;
};

export type SaveRecapResult = {
  entry: RecapEntry;
  previousCases: number | null;
  replaced: boolean;
};

/**
 * Menyimpan total rekap satu kecamatan. Bukan "menambah kasus": nilai lama
 * diganti, dan penggantian yang mengubah angka menuntut alasan supaya koreksi
 * dapat dipertanggungjawabkan kepada pemilik rekap berikutnya.
 */
export async function saveRecap(
  input: SaveRecapInput,
  actor: string,
  role: string,
): Promise<SaveRecapResult> {
  const existing = await findRecapEntry(
    input.kecamatanId,
    input.disease,
    input.month,
  );
  const previousCases = existing?.cases ?? null;
  const reason = input.reason?.trim() || null;

  if (
    previousCases !== null &&
    previousCases !== input.cases &&
    !reason
  ) {
    throw new RecapReasonRequiredError(previousCases);
  }

  const recordedAt = new Date().toISOString();
  const source = input.source ?? "manual";

  await transaction(async (tx) => {
    await tx.run(
      `INSERT INTO observasi
         (kecamatan_id, disease, month_start, cases, rainfall_mm, temp_mean_c,
          humidity_pct, source, recorded_at, recorded_by, revision_reason, recap_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tersimpan')
       ON CONFLICT (kecamatan_id, disease, month_start) DO UPDATE SET
         cases = excluded.cases,
         rainfall_mm = COALESCE(excluded.rainfall_mm, observasi.rainfall_mm),
         temp_mean_c = COALESCE(excluded.temp_mean_c, observasi.temp_mean_c),
         humidity_pct = COALESCE(excluded.humidity_pct, observasi.humidity_pct),
         source = excluded.source,
         recorded_at = excluded.recorded_at,
         recorded_by = excluded.recorded_by,
         revision_reason = excluded.revision_reason,
         recap_state = 'tersimpan'`,
      input.kecamatanId,
      input.disease,
      input.month,
      input.cases,
      input.rainfall,
      input.temp,
      input.humidity,
      source,
      recordedAt,
      actor,
      reason,
    );

    /* Riwayat hanya ditulis saat angkanya benar-benar berubah. Menyimpan ulang
       nilai yang sama bukan koreksi, dan mencatatnya sebagai koreksi membuat
       riwayat penuh baris yang tidak menjelaskan apa pun. */
    if (previousCases !== input.cases) {
      await tx.run(
        `INSERT INTO observasi_revisi
           (kecamatan_id, disease, month_start, previous_cases, new_cases,
            reason, actor, role, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.kecamatanId,
        input.disease,
        input.month,
        previousCases,
        input.cases,
        reason ?? (previousCases === null ? "Rekap pertama periode ini." : ""),
        actor,
        role,
        recordedAt,
      );
    }
  });

  await logAudit({
    actor,
    role,
    action: `Rekap kasus ${input.disease}`,
    details:
      previousCases === null
        ? `${input.kecamatanNama} (${input.month}): total rekap kecamatan ditetapkan ${input.cases}.`
        : `${input.kecamatanNama} (${input.month}): total rekap kecamatan ${previousCases} → ${input.cases}${reason ? ` — ${reason}` : ""}.`,
    status: "success",
  });

  const entry = await findRecapEntry(
    input.kecamatanId,
    input.disease,
    input.month,
  );

  return {
    entry: entry as RecapEntry,
    previousCases,
    replaced: previousCases !== null,
  };
}

/** Menandai rekap satu kecamatan sudah diperiksa pemilik rekap. */
export async function markRecapChecked(
  kecamatanId: string,
  disease: string,
  month: string,
  actor: string,
  role: string,
): Promise<RecapEntry | null> {
  const existing = await findRecapEntry(kecamatanId, disease, month);
  if (!existing) return null;

  await run(
    `UPDATE observasi SET recap_state = 'diperiksa'
      WHERE kecamatan_id = ? AND disease = ? AND month_start = ?`,
    kecamatanId,
    disease,
    month,
  );

  await logAudit({
    actor,
    role,
    action: `Pemeriksaan rekap ${disease}`,
    details: `${existing.kecamatan_nama} (${month}): rekap dinyatakan diperiksa.`,
    status: "info",
  });

  return findRecapEntry(kecamatanId, disease, month);
}

export type DistrictRecapStatus = {
  kecamatan_id: string;
  kecamatan_nama: string;
  cases: number | null;
  state: RecapState | "belum_dilaporkan";
  recorded_by: string | null;
  recorded_at: string | null;
};

export type PeriodReadiness = {
  disease: string;
  month: string;
  totalDistricts: number;
  saved: number;
  checked: number;
  missing: string[];
  /** Perjalanan yang diminta audit F18, tahap demi tahap. */
  stages: {
    id:
      | "rekap_tersimpan"
      | "diperiksa"
      | "periode_siap"
      | "prakiraan_diperbarui"
      | "ditinjau";
    label: string;
    state: "selesai" | "berjalan" | "menunggu";
    detail: string;
    owner: string;
  }[];
  forecast: {
    month: string | null;
    generatedAt: string | null;
    modelVersion: string | null;
  };
  evaluation: {
    modelVersion: string | null;
    fetchedAt: string | null;
  };
};

const READINESS_OWNER = {
  rekap: "Petugas pencatat puskesmas/dinas",
  pemeriksa: "Pemilik rekap wilayah",
  pengelola: "Pengelola data dinas",
  analis: "Analis/administrator model",
};

/**
 * Kesiapan satu periode. Nilai 0 yang tersimpan berarti "sudah diperiksa dan
 * tidak ada kasus"; kecamatan yang tidak punya baris sama sekali berarti
 * "belum dilaporkan". Keduanya sengaja tidak disamakan.
 */
export async function periodReadiness(
  disease: string,
  month?: string,
): Promise<PeriodReadiness> {
  const upper = disease.toUpperCase();

  const latest =
    month ??
    (
      await one<{ month_start: string }>(
        "SELECT MAX(month_start) AS month_start FROM observasi WHERE disease = ?",
        upper,
      )
    )?.month_start ??
    null;

  const districts = await all<{ id: string; nama: string }>(
    "SELECT id, nama FROM kecamatan ORDER BY nama",
  );

  const rows = latest
    ? await all<{
        kecamatan_id: string;
        cases: number;
        recap_state: RecapState | null;
        recorded_by: string | null;
        recorded_at: string;
      }>(
        `SELECT kecamatan_id, cases, recap_state, recorded_by, recorded_at
           FROM observasi WHERE disease = ? AND month_start = ?`,
        upper,
        latest,
      )
    : [];

  const byDistrict = new Map(rows.map((row) => [row.kecamatan_id, row]));
  const missing = districts
    .filter((d) => !byDistrict.has(d.id))
    .map((d) => d.nama);
  const saved = rows.length;
  const checked = rows.filter((r) => r.recap_state === "diperiksa").length;
  const complete = missing.length === 0 && districts.length > 0;

  const forecast = await one<{
    month_start: string;
    generated_at: string;
    model_version: string;
  }>(
    `SELECT month_start, MAX(generated_at) AS generated_at, MAX(model_version) AS model_version
       FROM prediksi WHERE disease = ?
      GROUP BY month_start ORDER BY month_start DESC LIMIT 1`,
    upper,
  );

  const evaluation = await one<{
    model_version: string;
    fetched_at: string;
  }>(
    "SELECT model_version, fetched_at FROM model_backtest WHERE disease = ?",
    upper,
  );

  /* Prakiraan dianggap mengikuti rekap bila ia dihasilkan setelah entri rekap
     terakhir. Prakiraan yang lebih tua dari datanya belum memuat data itu. */
  const latestRecordedAt = rows.reduce<string | null>(
    (acc, row) => (acc === null || row.recorded_at > acc ? row.recorded_at : acc),
    null,
  );
  const forecastFresh = Boolean(
    forecast?.generated_at &&
      latestRecordedAt &&
      forecast.generated_at >= latestRecordedAt,
  );

  const stages: PeriodReadiness["stages"] = [
    {
      id: "rekap_tersimpan",
      label: "Rekap tersimpan",
      state: saved > 0 ? (complete ? "selesai" : "berjalan") : "menunggu",
      detail: `${saved} dari ${districts.length} kecamatan sudah punya total rekap.`,
      owner: READINESS_OWNER.rekap,
    },
    {
      id: "diperiksa",
      label: "Diperiksa",
      state:
        saved > 0 && checked === saved
          ? "selesai"
          : checked > 0
            ? "berjalan"
            : "menunggu",
      detail: `${checked} dari ${saved} rekap tersimpan sudah dinyatakan diperiksa.`,
      owner: READINESS_OWNER.pemeriksa,
    },
    {
      id: "periode_siap",
      label: "Periode siap",
      state: complete ? "selesai" : saved > 0 ? "berjalan" : "menunggu",
      detail: complete
        ? "Seluruh kecamatan sudah melaporkan periode ini."
        : `Belum dilaporkan: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? `, dan ${missing.length - 5} lainnya` : ""}.`,
      owner: READINESS_OWNER.pengelola,
    },
    {
      id: "prakiraan_diperbarui",
      label: "Prakiraan diperbarui",
      state: forecastFresh ? "selesai" : forecast ? "berjalan" : "menunggu",
      detail: forecast
        ? forecastFresh
          ? `Prakiraan ${forecast.month_start} dihitung setelah rekap terakhir masuk.`
          : `Prakiraan ${forecast.month_start} dihitung sebelum rekap terakhir masuk; hitung ulang bila perlu.`
        : "Belum ada prakiraan tersimpan untuk penyakit ini.",
      owner: READINESS_OWNER.pengelola,
    },
    {
      id: "ditinjau",
      label: "Ditinjau untuk penggunaan",
      /* Sengaja tidak pernah "selesai" otomatis: tidak ada langkah persetujuan
         penggunaan hasil di dalam produk, dan menyatakannya selesai berarti
         mengarang keputusan yang tidak pernah diambil siapa pun. */
      state: evaluation ? "berjalan" : "menunggu",
      detail: evaluation
        ? `Evaluasi model ${evaluation.model_version} tersedia untuk ditinjau. Keputusan penggunaan hasil dicatat di luar aplikasi sesuai SOP dinas.`
        : "Belum ada hasil evaluasi model yang dapat ditinjau.",
      owner: READINESS_OWNER.analis,
    },
  ];

  return {
    disease: upper,
    month: latest ?? "",
    totalDistricts: districts.length,
    saved,
    checked,
    missing,
    stages,
    forecast: {
      month: forecast?.month_start ?? null,
      generatedAt: forecast?.generated_at ?? null,
      modelVersion: forecast?.model_version ?? null,
    },
    evaluation: {
      modelVersion: evaluation?.model_version ?? null,
      fetchedAt: evaluation?.fetched_at ?? null,
    },
  };
}

/** Daftar kecamatan beserta keadaan rekapnya untuk satu periode. */
export async function districtRecapStatus(
  disease: string,
  month: string,
): Promise<DistrictRecapStatus[]> {
  return all<DistrictRecapStatus>(
    `SELECT k.id AS kecamatan_id, k.nama AS kecamatan_nama,
            o.cases, COALESCE(o.recap_state, CASE WHEN o.cases IS NULL THEN 'belum_dilaporkan' ELSE 'tersimpan' END) AS state,
            o.recorded_by, o.recorded_at
       FROM kecamatan k
       LEFT JOIN observasi o
         ON o.kecamatan_id = k.id AND o.disease = ? AND o.month_start = ?
      ORDER BY k.nama`,
    disease.toUpperCase(),
    month,
  );
}
