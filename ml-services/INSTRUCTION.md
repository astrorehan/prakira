# INSTRUKSI ML SERVICES — PRAKIRA

**Layanan Prediksi Risiko Penyakit Berbasis Iklim (DBD, ISPA, Leptospirosis)**
Dokumen ini adalah panduan teknis komponen ML Services PRAKIRA (DSDC ANFORCOM 2026).

---

## 0. Konteks & Peran ML Service

ML Service adalah layanan **terpisah** dari backend gateway (Express.js). Ditulis dalam **Python 3.12 + FastAPI**, bertugas:

1. Melatih model ensemble prediksi jumlah kasus penyakit per kecamatan secara **bulanan** (`month_start`).
2. Menyajikan endpoint `/predict` untuk menghasilkan estimasi kasus, rentang ketidakpastian (`lower_bound`–`upper_bound`), skor risiko (0–100), kelas risiko (`rendah`, `sedang`, `tinggi`), dan fitur pemicu iklim dominan (`drivers`).
3. Menyajikan endpoint `/backtest` untuk evaluasi transparansi model (MAE, RMSE, $R^2$, akurasi kelas, rincian per kecamatan).
4. Menyajikan endpoint `/retrain` untuk melatih ulang model (dengan opsi integrasi sinyal warga terverifikasi).
5. Menyajikan endpoint `/explain` (atribusi kontribusi fitur lokal via metode substitusi median).
6. Menyajikan endpoint `/simulate` (simulator skenario what-if perubahan iklim interaktif).

**Prinsip utama:** ML Service berjalan modular. Jika layanan ML mati atau tidak terjangkau, backend gateway menyajikan prediksi terakhir dari database dengan penanda `stale`.

---

## 1. Arsitektur & Struktur Direktori

```
ml-services/
├── INSTRUCTION.md              ← Panduan teknis arsitektur & model
├── requirements.txt            ← Dependensi Python (FastAPI, scikit-learn, XGBoost, pandas, dll.)
├── config.py                   ← Konfigurasi path, daftar penyakit (DBD, ISPA, Leptospirosis), threshold
│
├── dataset_raw/                ← Data mentah
│   ├── kasus/                  ← Data kasus per kecamatan dari Dinkes
│   ├── cuaca/                  ← Data iklim dari BMKG (hujan, suhu, kelembaban)
│   └── wilayah/                ← Data kecamatan & populasi dari BPS
│
├── dataset_clean/              ← Data bersih bulanan siap latih
│   ├── merged_monthly_dbd.csv
│   ├── merged_monthly_ispa.csv
│   ├── merged_monthly_leptospirosis.csv
│   ├── features_dbd_monthly.csv
│   ├── features_ispa_monthly.csv
│   └── features_leptospirosis_monthly.csv
│
├── training/                   ← Skrip pelatihan & ensemble
│   ├── train.py                ← Runner pelatihan seluruh model (--disease all)
│   ├── train_dbd.py            ← Pelatihan model ensemble DBD
│   ├── train_ispa.py           ← Pelatihan model ensemble ISPA
│   ├── train_leptospirosis.py  ← Pelatihan model ensemble Leptospirosis
│   └── ensemble.py             ← Pipeline ensemble blending & evaluasi
│
├── models/                     ← Model terlatih & artefak
│   ├── model_dbd.pkl           ← Artefak ensemble DBD
│   ├── model_ispa.pkl          ← Artefak ensemble ISPA
│   ├── model_leptospirosis.pkl ← Artefak ensemble Leptospirosis
│   └── metadata.json           ← Metadata versi, tanggal latih, metrik MAE/RMSE/R², top features
│
└── app/                        ← Aplikasi FastAPI
    ├── main.py                 ← Entry point FastAPI & routing
    ├── security.py             ← Verifikasi header autentikasi token (x-ml-token)
    ├── routes/
    │   ├── predict.py          ← Endpoint /predict
    │   ├── backtest.py         ← Endpoint /backtest
    │   ├── retrain.py          ← Endpoint /retrain
    │   ├── explain.py          ← Endpoint /explain (atribusi fitur lokal)
    │   └── simulate.py         ← Endpoint /simulate (what-if weather simulator)
    ├── schemas/
    │   ├── request.py          ← Schema Pydantic request
    │   └── response.py         ← Schema Pydantic response
    └── services/
        ├── predictor.py        ← Pipeline prediksi ensemble & kalkulasi interval
        ├── risk_classifier.py  ← Normalisasi persentil skor & kelas risiko
        ├── driver_extractor.py ← Ekstraksi fitur iklim pemicu dominan
        ├── explainer.py        ← Kontribusi fitur lokal via median substitution
        └── scenario_service.py ← Kalkulasi skenario perubahan iklim
```

---

## 2. Sumber Data & ETL

### 2.1 Data Kasus Penyakit (Dinkes Kota Semarang)

**Sumber:** Profil Kesehatan Kota Semarang (PDF/tabel), portal data terbuka daerah.

**Format target CSV (`dataset_raw/kasus/kasus_dbd.csv`):**

| Kolom | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `kecamatan_id` | string | `33.74.01` | Kode BPS kecamatan |
| `kecamatan_nama` | string | `Semarang Barat` | Nama kecamatan |
| `week_start` | date | `2024-01-01` | Tanggal awal minggu (Senin) |
| `cases` | integer | `12` | Jumlah kasus pada minggu tersebut |

**Catatan penting:**
- Data Profil Kesehatan umumnya tersedia per **bulan** atau per **tahun**, bukan per minggu. Jika hanya tersedia per bulan, bagi rata ke 4 minggu (dokumentasikan asumsi ini).
- Jika hanya tersedia per tahun per kecamatan, bagi berdasarkan pola musiman DBD nasional (puncak Jan–Mar). Dokumentasikan asumsi ini di halaman `/model`.
- Konsistensi format antar tahun tidak dijamin — siapkan script ETL yang fleksibel.

**Script: `etl/etl_kasus.py`**
- Input: file CSV/Excel mentah dari Dinkes (format bervariasi per tahun).
- Proses: standardisasi nama kecamatan, konversi periode ke `week_start`, validasi tipe data.
- Output: `dataset_raw/kasus/kasus_{penyakit}.csv` dengan format di atas.

---

### 2.2 Data Cuaca (BMKG)

**Sumber:** [data.bmkg.go.id](https://data.bmkg.go.id) — data historis stasiun pengamatan.

**Stasiun relevan untuk Semarang:**
1. Stasiun Klimatologi Semarang
2. Stasiun Maritim Tanjung Emas
3. Stasiun Meteorologi Ahmad Yani

**Format target CSV (`dataset_raw/cuaca/bmkg_semarang.csv`):**

| Kolom | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `station_id` | string | `KLIMAT_SMG` | ID stasiun BMKG |
| `date` | date | `2024-01-15` | Tanggal pengamatan |
| `rainfall_mm` | float | `28.5` | Curah hujan harian (mm) |
| `temp_mean_c` | float | `27.8` | Suhu rata-rata harian (°C) |
| `temp_min_c` | float | `24.2` | Suhu minimum harian (°C) |
| `temp_max_c` | float | `32.1` | Suhu maksimum harian (°C) |
| `humidity_pct` | float | `82.0` | Kelembaban rata-rata harian (%) |

**Script: `etl/etl_cuaca.py`**
- Input: CSV dari BMKG (biasanya per stasiun, harian).
- Proses:
  1. Agregasi harian → **mingguan** (sum untuk curah hujan, mean untuk suhu & kelembaban).
  2. **Interpolasi ke kecamatan:** Untuk setiap kecamatan, hitung rata-rata tertimbang berdasarkan jarak ke setiap stasiun (inverse distance weighting / IDW sederhana). Jika terlalu kompleks untuk timeline, boleh gunakan stasiun terdekat saja — **dokumentasikan sebagai batasan**.
- Output: data cuaca mingguan per kecamatan.

---

### 2.3 Data Wilayah & Populasi (BPS)

**Sumber:** BPS Kota Semarang — Kecamatan Dalam Angka.

**Format target CSV (`dataset_raw/wilayah/kecamatan_semarang.csv`):**

| Kolom | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `kecamatan_id` | string | `33.74.01` | Kode BPS |
| `kecamatan_nama` | string | `Semarang Barat` | Nama kecamatan |
| `population` | integer | `158726` | Jumlah penduduk |
| `area_km2` | float | `21.74` | Luas wilayah (opsional, untuk densitas) |

**16 Kecamatan Kota Semarang:**

| No | Kecamatan |
|---|---|
| 1 | Semarang Tengah |
| 2 | Semarang Utara |
| 3 | Semarang Timur |
| 4 | Semarang Selatan |
| 5 | Semarang Barat |
| 6 | Gayamsari |
| 7 | Candisari |
| 8 | Gajahmungkur |
| 9 | Genuk |
| 10 | Pedurungan |
| 11 | Tembalang |
| 12 | Banyumanik |
| 13 | Gunungpati |
| 14 | Mijen |
| 15 | Ngaliyan |
| 16 | Tugu |

---

### 2.4 Penggabungan Dataset

**Script: `etl/merge_dataset.py`**

Gabungkan ketiga sumber menjadi satu file `dataset_clean/merged_weekly.csv`:

| Kolom | Sumber |
|---|---|
| `kecamatan_id` | Wilayah |
| `kecamatan_nama` | Wilayah |
| `week_start` | Kasus |
| `disease` | Kasus (DBD/ISPA/Diare/Leptospirosis) |
| `cases` | Kasus |
| `population` | Wilayah |
| `rainfall_mm` | Cuaca (sudah per kecamatan) |
| `temp_mean_c` | Cuaca |
| `humidity_pct` | Cuaca |

**Satu baris = satu kecamatan × satu minggu × satu penyakit.**

---

## 3. Feature Engineering

**Script: `features/build_features.py`**

Input: `dataset_clean/merged_weekly.csv`
Output: `dataset_clean/dataset_final.csv` (atau satu file per penyakit)

### 3.1 Daftar Fitur Lengkap

Dataset harus diurutkan berdasarkan `kecamatan_id` + `week_start` terlebih dahulu, kemudian buat fitur-fitur berikut **per kelompok kecamatan** (groupby `kecamatan_id`):

#### Fitur Iklim Lag (dari data cuaca)

| Fitur | Cara Buat |
|---|---|
| `rainfall_lag1_mm` | `rainfall_mm` digeser 1 minggu ke belakang |
| `rainfall_lag2_mm` | `rainfall_mm` digeser 2 minggu |
| `rainfall_lag3_mm` | `rainfall_mm` digeser 3 minggu |
| `rainfall_lag4_mm` | `rainfall_mm` digeser 4 minggu |
| `rainfall_cumul_3w_mm` | Jumlah kumulatif curah hujan 3 minggu terakhir |
| `temp_mean_lag1_c` | `temp_mean_c` digeser 1 minggu |
| `temp_mean_lag2_c` | `temp_mean_c` digeser 2 minggu |
| `humidity_lag1_pct` | `humidity_pct` digeser 1 minggu |
| `humidity_lag2_pct` | `humidity_pct` digeser 2 minggu |

**Implementasi dengan pandas:**
```python
for col in ['rainfall_mm', 'temp_mean_c', 'humidity_pct']:
    for lag in [1, 2, 3, 4]:
        df[f'{col}_lag{lag}'] = df.groupby('kecamatan_id')[col].shift(lag)

# Fitur kumulatif
df['rainfall_cumul_3w_mm'] = (
    df['rainfall_lag1_mm'] + df['rainfall_lag2_mm'] + df['rainfall_lag3_mm']
)
```

#### Fitur Riwayat Kasus Lag (autoregressive)

| Fitur | Cara Buat |
|---|---|
| `cases_lag1` | Jumlah kasus 1 minggu sebelumnya |
| `cases_lag2` | Jumlah kasus 2 minggu sebelumnya |
| `cases_lag4` | Jumlah kasus 4 minggu sebelumnya |

```python
for lag in [1, 2, 4]:
    df[f'cases_lag{lag}'] = df.groupby('kecamatan_id')['cases'].shift(lag)
```

#### Fitur Kalender/Musiman

| Fitur | Cara Buat |
|---|---|
| `month` | Bulan dari `week_start` (1-12) |
| `week_of_year` | Minggu ke berapa dalam setahun (1-52) |
| `is_pancaroba` | 1 jika bulan = 3,4,10,11; selainnya 0 |

```python
df['month'] = df['week_start'].dt.month
df['week_of_year'] = df['week_start'].dt.isocalendar().week.astype(int)
df['is_pancaroba'] = df['month'].isin([3, 4, 10, 11]).astype(int)
```

#### Fitur Demografis

| Fitur | Cara Buat |
|---|---|
| `population` | Langsung dari data BPS (sudah ada di merged) |
| `kecamatan_encoded` | Label encoding dari `kecamatan_id` |

```python
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
df['kecamatan_encoded'] = le.fit_transform(df['kecamatan_id'])
```

#### Fitur Sinyal Warga — HANYA untuk Fase Retraining

| Fitur | Cara Buat |
|---|---|
| `citizen_signal_lag1` | Jumlah laporan warga terverifikasi 1 minggu lalu |

> **PENTING:** Fitur ini **TIDAK ADA** di model baseline (Fase 1). Hanya ditambahkan saat retraining setelah aplikasi berjalan dan ada data laporan warga nyata. Untuk backtest perbandingan di halaman `/model`, kolom ini **disimulasikan** (lihat §7).

### 3.2 Penanganan Baris Kosong (NaN akibat Lag)

Setelah membuat lag features, baris-baris awal akan memiliki nilai NaN (karena belum ada data minggu sebelumnya). **Buang baris-baris tersebut:**

```python
df = df.dropna(subset=[col for col in df.columns if 'lag' in col])
```

### 3.3 Pemisahan Dataset per Penyakit

Setelah feature engineering, pisahkan dataset menjadi 4 file (satu per penyakit):

```python
for disease in ['DBD', 'ISPA', 'Diare', 'Leptospirosis']:
    df_disease = df[df['disease'] == disease].copy()
    df_disease.to_csv(f'dataset_clean/features_{disease.lower()}.csv', index=False)
```

### 3.4 Daftar Kolom Final (untuk Training)

```python
FEATURE_COLUMNS = [
    # Iklim lag
    'rainfall_lag1_mm', 'rainfall_lag2_mm', 'rainfall_lag3_mm', 'rainfall_lag4_mm',
    'rainfall_cumul_3w_mm',
    'temp_mean_lag1_c', 'temp_mean_lag2_c',
    'humidity_lag1_pct', 'humidity_lag2_pct',
    # Riwayat kasus lag
    'cases_lag1', 'cases_lag2', 'cases_lag4',
    # Kalender
    'month', 'week_of_year', 'is_pancaroba',
    # Demografis
    'population', 'kecamatan_encoded',
]

TARGET_COLUMN = 'cases'
```

---

## 4. Training Model

**Script: `training/train_model.py`**

### 4.1 Pendekatan: 1 Model per Penyakit

Latih 4 model terpisah, masing-masing menggunakan dataset penyakit yang bersangkutan:

```python
DISEASES = ['dbd', 'ispa', 'diare', 'leptospirosis']

for disease in DISEASES:
    df = pd.read_csv(f'dataset_clean/features_{disease}.csv')
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    # Split train/test berdasarkan waktu (BUKAN random split)
    # ...
    # Train model
    # ...
    # Simpan model
    joblib.dump(model, f'models/model_{disease}.pkl')
```

### 4.2 Algoritma

**Baseline:** `RandomForestRegressor` dari scikit-learn.
**Alternatif (jika waktu cukup):** `XGBRegressor` dari xgboost.

```python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)
```

### 4.3 Split Data: Temporal Split (BUKAN Random Split)

**KRUSIAL:** Karena ini data deret waktu, **TIDAK BOLEH** menggunakan `train_test_split` secara acak. Harus dipotong berdasarkan waktu:

```python
# Contoh: data 2021-2025
# Train: 2021 - awal 2025
# Test : Sisa 2025

split_date = '2025-01-01'  # Sesuaikan dengan data yang tersedia
train = df[df['week_start'] < split_date]
test  = df[df['week_start'] >= split_date]

X_train, y_train = train[FEATURE_COLUMNS], train[TARGET_COLUMN]
X_test,  y_test  = test[FEATURE_COLUMNS],  test[TARGET_COLUMN]
```

**Alasan:** Jika split random, model "melihat" masa depan saat training — ini data leakage dan metrik evaluasi jadi tidak valid. Temporal split mensimulasikan situasi nyata: model dilatih dari masa lalu, diuji pada masa depan.

### 4.4 Output Training

Setiap model yang dilatih menghasilkan:

1. **File model:** `models/model_{disease}.pkl`
2. **Metadata:** disimpan di `models/metadata.json`

```json
{
  "models": {
    "dbd": {
      "algorithm": "RandomForestRegressor",
      "version": "rf-dbd-2026.08.1",
      "trained_at": "2026-08-25T14:00:00",
      "train_period": "2021-01-01 to 2024-12-31",
      "test_period": "2025-01-01 to 2025-12-31",
      "n_features": 17,
      "features": ["rainfall_lag1_mm", "..."],
      "include_citizen_signal": false,
      "metrics": {
        "mae": 5.2,
        "rmse": 7.1,
        "class_accuracy": 0.82
      }
    },
    "ispa": { "..." },
    "diare": { "..." },
    "leptospirosis": { "..." }
  }
}
```

---

## 5. Evaluasi & Metrik

**Script: `training/evaluate.py`**

### 5.1 Metrik Regresi

| Metrik | Fungsi | Interpretasi |
|---|---|---|
| **MAE** (Mean Absolute Error) | `mean(abs(y_actual - y_pred))` | Rata-rata selisih absolut prediksi. Makin kecil makin baik. |
| **RMSE** (Root Mean Squared Error) | `sqrt(mean((y_actual - y_pred)^2))` | Seperti MAE tapi lebih sensitif terhadap error besar. |

```python
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
```

### 5.2 Metrik Klasifikasi Kelas Risiko

Setelah prediksi angka dikonversi ke kelas risiko (lihat §6), hitung akurasi klasifikasi:

```python
from sklearn.metrics import accuracy_score, classification_report

y_test_class = convert_to_risk_class(y_test, disease)
y_pred_class = convert_to_risk_class(y_pred, disease)

accuracy = accuracy_score(y_test_class, y_pred_class)
report = classification_report(y_test_class, y_pred_class, 
                                target_names=['Rendah', 'Sedang', 'Tinggi'])
```

### 5.3 Interval Ketidakpastian (Confidence Interval)

Untuk RandomForest, manfaatkan prediksi dari setiap pohon individual:

```python
# Prediksi dari semua pohon
all_tree_preds = np.array([tree.predict(X_input) for tree in model.estimators_])

predicted_cases = int(np.mean(all_tree_preds))
lower_bound = int(np.percentile(all_tree_preds, 10))  # Persentil ke-10
upper_bound = int(np.percentile(all_tree_preds, 90))  # Persentil ke-90
```

---

## 6. Konversi Hasil Regresi → Skor Risiko & Kelas Risiko

**Script: `app/services/risk_classifier.py`**

### 6.1 Alur Konversi

```
Angka Kasus (Regresi)
    ↓
Skor Risiko 0-100 (normalisasi berdasarkan distribusi historis kecamatan)
    ↓
Kelas Risiko: Rendah / Sedang / Tinggi (diskretisasi berdasarkan threshold persentil)
```

### 6.2 Menghitung Skor Risiko

Skor risiko = seberapa ekstrem prediksi ini dibandingkan riwayat historis kecamatan yang sama.

```python
from scipy.stats import percentileofscore

def calculate_risk_score(predicted_cases, historical_cases_array):
    """
    predicted_cases: angka prediksi dari model
    historical_cases_array: array kasus historis kecamatan tersebut
    return: skor 0-100
    """
    score = percentileofscore(historical_cases_array, predicted_cases, kind='rank')
    return round(min(max(score, 0), 100))
```

### 6.3 Menentukan Kelas Risiko

```python
def classify_risk(risk_score):
    if risk_score >= 67:
        return 'tinggi'
    elif risk_score >= 34:
        return 'sedang'
    else:
        return 'rendah'
```

> **Threshold 33/67 adalah titik awal.** Sesuaikan berdasarkan distribusi data aktual dan konsultasi dengan referensi epidemiologi jika ada.

### 6.4 Menentukan Data Coverage

```python
def assess_data_coverage(kecamatan_id, disease, df_historical):
    """Hitung kelengkapan data historis kecamatan untuk penyakit ini."""
    total_possible_weeks = ...  # Total minggu dalam periode data
    available_weeks = df_historical[
        (df_historical['kecamatan_id'] == kecamatan_id)
    ].shape[0]
    
    ratio = available_weeks / total_possible_weeks
    
    if ratio >= 0.75:
        return 'high'
    elif ratio >= 0.50:
        return 'medium'
    elif ratio >= 0.25:
        return 'low'
    else:
        return 'insufficient'  # Tampilkan "Data tidak memadai" di UI
```

---

## 7. Simulasi Backtest Sinyal Warga

**Tujuan:** Untuk halaman `/model`, tunjukkan perbandingan model **dengan** vs **tanpa** sinyal warga.

Karena belum ada data laporan warga nyata, **simulasikan** fitur `citizen_signal_lag1` dari data historis:

```python
def simulate_citizen_signal(df, noise_factor=0.3):
    """
    Simulasikan sinyal warga dari data kasus resmi.
    Asumsi: sebagian kecil kasus dilaporkan oleh warga, 
    dengan noise dan delay.
    """
    df['citizen_signal_lag1'] = (
        df['cases_lag1'] * 0.15  # ~15% kasus terdeteksi warga
        + np.random.poisson(1, size=len(df))  # noise
    ).clip(lower=0).astype(int)
    return df
```

**Proses backtest perbandingan:**

```python
# Model A: tanpa sinyal warga (baseline)
model_a = train(X_train[FEATURE_COLUMNS], y_train)
mae_a = evaluate(model_a, X_test[FEATURE_COLUMNS], y_test)

# Model B: dengan sinyal warga (simulasi)
FEATURE_COLUMNS_WITH_CITIZEN = FEATURE_COLUMNS + ['citizen_signal_lag1']
model_b = train(X_train[FEATURE_COLUMNS_WITH_CITIZEN], y_train)
mae_b = evaluate(model_b, X_test[FEATURE_COLUMNS_WITH_CITIZEN], y_test)

# Simpan hasil untuk ditampilkan di halaman /model
backtest_comparison = {
    "without_citizen_signal": {"mae": mae_a, "rmse": rmse_a},
    "with_citizen_signal":    {"mae": mae_b, "rmse": rmse_b},
    "note": "Sinyal warga disimulasikan dari data historis. Hasil bisa berbeda dengan data riil."
}
```

**Tampilkan hasilnya apa adanya — termasuk jika sinyal warga TIDAK membantu.** Kejujuran ini menaikkan skor validasi (PRD §5.6a).

---

## 8. Endpoint FastAPI

**Entry point: `app/main.py`**

```python
from fastapi import FastAPI
from app.routes import predict, retrain, backtest

app = FastAPI(
    title="PRAKIRA ML Service",
    description="Layanan prediksi risiko penyakit berbasis iklim",
    version="1.0.0"
)

app.include_router(predict.router, prefix="/predict", tags=["Predict"])
app.include_router(retrain.router, prefix="/retrain", tags=["Retrain"])
app.include_router(backtest.router, prefix="/backtest", tags=["Backtest"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

---

### 8.1 Endpoint `/predict`

**Dipanggil oleh:** Backend gateway (Express.js), saat dashboard atau portal warga meminta data risiko.

**Request:**
```
POST /predict
```
```json
{
  "kecamatan_id": "33.74.01",
  "disease": "DBD",
  "horizon_weeks": 2
}
```

**Response (sesuai kontrak PRD §6):**
```json
{
  "kecamatan_id": "33.74.01",
  "disease": "DBD",
  "week_start": "2026-09-01",
  "horizon_weeks": 2,
  "predicted_cases": 54,
  "lower_bound": 41,
  "upper_bound": 68,
  "risk_score": 78,
  "risk_class": "tinggi",
  "data_coverage": "high",
  "drivers": [
    { "feature": "rainfall_lag3_mm", "value": 214, "percentile": 88 },
    { "feature": "humidity_lag2_pct", "value": 84, "percentile": 79 }
  ],
  "model_version": "rf-dbd-2026.08.1"
}
```

**Logika internal:**
1. Load `models/model_dbd.pkl`.
2. Ambil data cuaca & kasus terkini dari database untuk kecamatan tersebut.
3. Buat feature vector (lag features dari data terkini).
4. Jalankan `model.predict(X)` → `predicted_cases`.
5. Hitung `lower_bound` & `upper_bound` dari prediksi per pohon.
6. Hitung `risk_score` dengan `percentileofscore` terhadap historis.
7. Tentukan `risk_class` dari `risk_score`.
8. Ekstrak `drivers` (2-3 fitur dengan feature importance tertinggi beserta nilainya).
9. Tentukan `data_coverage` berdasarkan kelengkapan data kecamatan.

---

### 8.2 Endpoint `/predict/batch`

**Untuk dashboard:** Prediksi semua 16 kecamatan sekaligus untuk satu penyakit.

**Request:**
```
POST /predict/batch
```
```json
{
  "disease": "DBD",
  "horizon_weeks": 2
}
```

**Response:** Array berisi 16 objek prediksi (satu per kecamatan), format sama seperti §8.1.

---

### 8.3 Endpoint `/backtest`

**Dipanggil oleh:** Halaman `/model` (transparansi model).

**Request:**
```
GET /backtest?disease=DBD
```

**Response:**
```json
{
  "disease": "DBD",
  "model_version": "rf-dbd-2026.08.1",
  "test_period": "2025-01-01 to 2025-12-31",
  "metrics": {
    "mae": 5.2,
    "rmse": 7.1,
    "class_accuracy": 0.82
  },
  "weekly_results": [
    {
      "week_start": "2025-01-06",
      "actual": 45,
      "predicted": 48,
      "risk_class_actual": "tinggi",
      "risk_class_predicted": "tinggi"
    }
  ],
  "citizen_signal_comparison": {
    "without": { "mae": 5.2, "rmse": 7.1 },
    "with":    { "mae": 4.8, "rmse": 6.5 },
    "note": "Sinyal warga disimulasikan dari data historis."
  },
  "coverage_per_kecamatan": {
    "33.74.01": "high",
    "33.74.02": "high",
    "33.74.16": "low"
  }
}
```

---

### 8.4 Endpoint `/retrain`

**Dipanggil oleh:** Admin melalui backend gateway, setelah ada data baru.

**Request:**
```
POST /retrain
```
```json
{
  "disease": "DBD",
  "include_citizen": false
}
```

**Response:**
```json
{
  "status": "success",
  "disease": "DBD",
  "new_version": "rf-dbd-2026.08.2",
  "include_citizen": false,
  "metrics": {
    "mae": 4.9,
    "rmse": 6.8,
    "class_accuracy": 0.84
  },
  "previous_version": "rf-dbd-2026.08.1",
  "improved": true
}
```

---

## 9. Ekstraksi Drivers (Fitur Pemicu Dominan)

**Script: `app/services/driver_extractor.py`**

Drivers adalah 2-3 fitur cuaca yang paling memengaruhi prediksi minggu ini. Ini yang mengisi kalimat **"Dasar:"** di rekomendasi tindakan dashboard.

```python
def extract_drivers(model, X_input, feature_names, historical_df, top_n=2):
    """
    Ambil top-N fitur berdasarkan feature importance,
    lalu sertakan nilai aktual & persentilnya.
    """
    importances = model.feature_importances_
    feature_importance = sorted(
        zip(feature_names, importances, X_input[0]),
        key=lambda x: x[1],
        reverse=True
    )
    
    drivers = []
    for feat_name, importance, feat_value in feature_importance[:top_n]:
        # Hanya ambil fitur cuaca, bukan kalender/demografis
        if any(keyword in feat_name for keyword in ['rainfall', 'temp', 'humidity']):
            percentile = percentileofscore(
                historical_df[feat_name].dropna(), feat_value, kind='rank'
            )
            drivers.append({
                "feature": feat_name,
                "value": round(float(feat_value), 1),
                "percentile": round(percentile)
            })
    
    return drivers
```

---

## 10. Dependensi Python

**File: `requirements.txt`**

```
fastapi>=0.104.0
uvicorn>=0.24.0
pandas>=2.1.0
numpy>=1.24.0
scikit-learn>=1.3.0
xgboost>=2.0.0
scipy>=1.11.0
joblib>=1.3.0
pydantic>=2.0.0
python-multipart>=0.0.6
```

**Menjalankan ML Service:**

```bash
cd ml-services
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 11. Checklist Pengembangan & Status Implementasi

### Fase 1: Data & Model Ensemble Bulanan (Selesai & Terverifikasi)
- [x] Kumpulkan data kasus dari Profil Kesehatan Semarang (DBD 2021–2025, ISPA 2025, Leptospirosis 2021–2025).
- [x] Kumpulkan data iklim dari BMKG (curah hujan, suhu, kelembaban).
- [x] Kumpulkan data populasi dan batas wilayah 16 kecamatan dari BPS.
- [x] Standardisasi dataset bulanan (`merged_monthly_*.csv`).
- [x] Feature engineering lag iklim, autoregresif kasus, rasio insidens, interaksi bioklimatik (`features_*_monthly.csv`).
- [x] Pelatihan model ensemble (`training/ensemble.py`, `train_dbd.py`, `train_ispa.py`, `train_leptospirosis.py`).
- [x] Evaluasi metrik MAE, RMSE, $R^2$, akurasi kelas, dan serialisasi `metadata.json`.
- [x] Endpoint `/predict` berfungsi penuh dengan interval ketidakpastian (`lower_bound`–`upper_bound`) & drivers.
- [x] Endpoint `/backtest` menyajikan metrik performa & rincian per kecamatan.

### Fase 2: Integrasi Lanjutan, Explainability & Transparansi (Selesai & Terverifikasi)
- [x] Endpoint `/explain` menyajikan atribusi kontribusi fitur lokal via metode substitusi median.
- [x] Endpoint `/simulate` mengkalkulasi skenario what-if pergeseran cuaca.
- [x] Endpoint `/retrain` dengan proteksi token autentikasi (`x-ml-token`) dan dukungan sinyal warga.
- [x] Integrasi penuh dengan Backend Gateway Express (`services/ml.ts`, `services/predictions.ts`, `services/backtest.ts`).
- [x] Transparansi model di rute publik `/model` dan evaluasi lead time di `/mesin-waktu`.

---

## 12. Catatan Penting

1. **Data coverage = kunci kejujuran.** Jika suatu kecamatan punya data historis tidak memadai, sistem mengembalikan `"data_coverage": "insufficient"` dan `"risk_class": null`. Frontend akan menampilkan "Data tidak memadai" — **BUKAN** "Risiko Rendah".

2. **Interval ketidakpastian wajib ada.** Tidak boleh ada `predicted_cases` yang muncul tanpa `lower_bound` dan `upper_bound` di response API.

3. **Temporal split, bukan random split.** Data deret waktu dipotong berdasarkan tanggal temporal, bukan diacak.

4. **Transparansi & Batasan.** Seluruh batasan resmi model ditampilkan terbuka di antarmuka publik dan endpoint `/api/model/limitations`.

