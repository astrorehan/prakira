-- Skema inti PRAKIRA (PRD §6: wilayah, kasus_penyakit, data_cuaca, prediksi,
-- laporan_warga, audit_log). Kasus dan cuaca digabung dalam satu tabel
-- `observasi` karena dataset sumbernya memang satu baris per kecamatan-bulan:
-- memecahnya jadi dua tabel hanya menambah join tanpa menambah informasi.
--
-- Dialek: PostgreSQL (Supabase). Tanggal sengaja tetap `TEXT` berformat
-- `YYYY-MM-01`, bukan `DATE`: seluruh gateway membandingkan dan mengurutkan
-- bulan sebagai string, dan pada format itu urutan leksikografis sama dengan
-- urutan kronologis. Mengubahnya ke `DATE` akan membuat `pg` mengembalikan
-- objek `Date` ber-zona waktu, dan `2025-12-01` bisa terbaca November di
-- zona negatif.

CREATE TABLE IF NOT EXISTS kecamatan (
  id           TEXT PRIMARY KEY,        -- KEC_SMG_01, kunci yang dipakai peta
  ml_id        TEXT NOT NULL,           -- 33.74.05, kunci layanan ML
  nama         TEXT NOT NULL UNIQUE,
  kode_bps     TEXT NOT NULL,
  populasi     INTEGER NOT NULL,
  luas_km2     DOUBLE PRECISION NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,           -- sentroid dihitung dari poligon GeoJSON
  lon          DOUBLE PRECISION NOT NULL
);

-- Observasi bulanan: kasus resmi + iklim pada kecamatan yang sama.
CREATE TABLE IF NOT EXISTS observasi (
  kecamatan_id TEXT NOT NULL REFERENCES kecamatan(id),
  disease      TEXT NOT NULL,
  month_start  TEXT NOT NULL,           -- YYYY-MM-01
  cases        INTEGER NOT NULL,
  rainfall_mm  DOUBLE PRECISION,
  temp_mean_c  DOUBLE PRECISION,
  humidity_pct DOUBLE PRECISION,
  source       TEXT NOT NULL,           -- 'dataset' | 'import'
  recorded_at  TEXT NOT NULL,
  PRIMARY KEY (kecamatan_id, disease, month_start)
);

CREATE INDEX IF NOT EXISTS idx_observasi_disease_month
  ON observasi (disease, month_start);

-- Hasil /predict layanan ML, disimpan supaya dashboard tetap tersaji saat
-- layanan ML mati (PRD §6: "prediksi terakhir tetap tersaji dari database").
CREATE TABLE IF NOT EXISTS prediksi (
  kecamatan_id    TEXT NOT NULL REFERENCES kecamatan(id),
  disease         TEXT NOT NULL,
  month_start     TEXT NOT NULL,
  predicted_cases INTEGER NOT NULL,
  lower_bound     INTEGER NOT NULL,
  upper_bound     INTEGER NOT NULL,
  risk_score      INTEGER NOT NULL,
  risk_class      TEXT,                 -- NULL saat cakupan data 'insufficient'
  data_coverage   TEXT NOT NULL,
  drivers         TEXT NOT NULL,        -- JSON: [{feature,value,percentile}]
  model_version   TEXT NOT NULL,
  generated_at    TEXT NOT NULL,
  PRIMARY KEY (kecamatan_id, disease, month_start)
);

-- Ringkasan backtest per penyakit, disalin apa adanya dari layanan ML.
CREATE TABLE IF NOT EXISTS model_backtest (
  disease                TEXT PRIMARY KEY,
  model_version          TEXT NOT NULL,
  algorithm              TEXT,
  trained_at             TEXT,
  train_period           TEXT,
  test_period            TEXT,
  mae                    DOUBLE PRECISION NOT NULL,
  rmse                   DOUBLE PRECISION NOT NULL,
  r2                     DOUBLE PRECISION NOT NULL,
  class_accuracy_pct     DOUBLE PRECISION,
  sample_size            INTEGER,
  monthly_results        TEXT NOT NULL,  -- JSON
  coverage_per_kecamatan TEXT NOT NULL,  -- JSON
  top_features           TEXT,           -- JSON
  fetched_at             TEXT NOT NULL
);

-- Rekomendasi tindakan hasil mesin aturan deterministik (PRD §5.2).
CREATE TABLE IF NOT EXISTS tindakan (
  id                TEXT PRIMARY KEY,
  disease           TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  priority          TEXT NOT NULL,
  status            TEXT NOT NULL,       -- pending | in_progress | completed
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  basis             TEXT NOT NULL,       -- kalimat "Dasar:" — wajib ada
  target_kecamatan  TEXT NOT NULL,       -- JSON array nama kecamatan
  target_population INTEGER NOT NULL,
  due_date          TEXT NOT NULL,       -- YYYY-MM-DD
  lead_time_days    INTEGER NOT NULL,
  estimated_impact  TEXT NOT NULL,
  climate_trigger   TEXT,
  sop_checklist     TEXT NOT NULL,       -- JSON array
  pic_unit          TEXT NOT NULL,
  broadcast_draft   TEXT NOT NULL,
  prediction_month  TEXT NOT NULL,
  predicted_lower   INTEGER NOT NULL,
  predicted_upper   INTEGER NOT NULL,
  data_coverage     TEXT NOT NULL,
  generated_at      TEXT NOT NULL,
  dispatched_at     TEXT,
  dispatched_by     TEXT,
  completed_at      TEXT
);

CREATE TABLE IF NOT EXISTS laporan_warga (
  id           TEXT PRIMARY KEY,         -- kode lacak PKR-XXXXXX
  kind         TEXT NOT NULL,
  kecamatan    TEXT NOT NULL,
  kelurahan    TEXT,
  occurred_at  TEXT NOT NULL,            -- YYYY-MM-DD
  description  TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  photo        TEXT,                     -- data URL, EXIF sudah dilucuti klien
  status       TEXT NOT NULL,            -- menunggu | terverifikasi | ditolak
  reviewed_at  TEXT,
  reviewer     TEXT,
  review_note  TEXT,
  device_hash  TEXT NOT NULL             -- untuk rate limit; bukan identitas
);

CREATE INDEX IF NOT EXISTS idx_laporan_status ON laporan_warga (status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_laporan_device ON laporan_warga (device_hash, submitted_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts      TEXT NOT NULL,
  actor   TEXT NOT NULL,
  role    TEXT NOT NULL,
  action  TEXT NOT NULL,
  details TEXT NOT NULL,
  status  TEXT NOT NULL                  -- success | warning | info
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL,           -- dinas | analis | admin | puskesmas
  label         TEXT NOT NULL,
  home          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Riwayat pekerjaan ingest data iklim/kasus. Inilah yang dilaporkan sebagai
-- "status sinkronisasi" di halaman admin — status pekerjaan yang benar-benar
-- terjadi, bukan angka latensi karangan.
CREATE TABLE IF NOT EXISTS ingest_job (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL,             -- success | running | failed
  rows        INTEGER NOT NULL DEFAULT 0,
  latency_ms  INTEGER,
  detail      TEXT NOT NULL DEFAULT ''
);

-- Kolom yang ditambahkan setelah basis data pertama kali dibuat. `CREATE TABLE
-- IF NOT EXISTS` di atas tidak menyentuh tabel yang sudah ada, jadi tanpa blok
-- ini basis data lama tetap kehilangan kolomnya dan setiap INSERT backtest
-- gagal dengan "column does not exist".
ALTER TABLE model_backtest ADD COLUMN IF NOT EXISTS top_features TEXT;
ALTER TABLE model_backtest ADD COLUMN IF NOT EXISTS district_results TEXT;
