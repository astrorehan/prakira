import os
from pathlib import Path

# Base Directory
BASE_DIR = Path(__file__).resolve().parent

# Data Directories
DATASET_RAW_DIR = BASE_DIR / "dataset_raw"
DATASET_RAW_KASUS = DATASET_RAW_DIR / "kasus"
DATASET_RAW_CUACA = DATASET_RAW_DIR / "cuaca"
DATASET_RAW_WILAYAH = DATASET_RAW_DIR / "wilayah"

DATASET_CLEAN_DIR = BASE_DIR / "dataset_clean"
MODELS_DIR = BASE_DIR / "models"
BACKTEST_DIR = BASE_DIR / "backtest"

# Ensure all directories exist
for directory in [
    DATASET_RAW_KASUS,
    DATASET_RAW_CUACA,
    DATASET_RAW_WILAYAH,
    DATASET_CLEAN_DIR,
    MODELS_DIR,
    BACKTEST_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Disease configurations — daftar penyakit yang modelnya benar-benar terlatih
# dan berkas .pkl-nya ada di models/. Daftar ini yang dijawab /health sebagai
# `diseases_available`, jadi menambah nama di sini tanpa modelnya membuat
# gateway menjanjikan prediksi yang tidak pernah datang.
# ---------------------------------------------------------------------------
DISEASES = ["dbd", "ispa", "leptospirosis"]

# ---------------------------------------------------------------------------
# FEATURE COLUMNS — Monthly (berlaku untuk SEMUA penyakit)
# Semua model menggunakan granularitas BULANAN.
# ---------------------------------------------------------------------------
FEATURE_COLUMNS = [
    # Climate lag features (bulan)
    "rainfall_lag1",
    "rainfall_lag2",
    "rainfall_lag3",
    "rainfall_cumul_2m",
    "temp_lag1",
    "temp_lag2",
    "temp_lag3",
    "humidity_lag1",
    "humidity_lag2",
    "humidity_lag3",
    # Autoregressive case features
    "cases_lag1",
    "cases_lag2",
    "cases_lag3",
    "cases_ma_3m",
    "cases_trend",
    # Biological interaction features
    "temp_x_humidity",
    "rain_x_humidity",
    # Seasonal / calendar features
    "month",
    "month_sin",
    "month_cos",
    "is_pancaroba",
    # Incidence rate per population
    "cases_per_10k_lag1",
    # Demographic & geographic features
    "population",
    "kecamatan_encoded",
]

TARGET_COLUMN = "cases"

# ---------------------------------------------------------------------------
# Per-disease training configuration
# ---------------------------------------------------------------------------
DISEASE_CONFIG = {
    "dbd": {
        "feature_file": "features_dbd_monthly.csv",
        "merged_file": "merged_monthly_dbd.csv",
        "model_file": "model_dbd.pkl",
        "split_date": "2025-01-01",
        "log_transform": True,
        "data_years": list(range(2021, 2026)),
        "label": "DBD",
    },
    "ispa": {
        "feature_file": "features_ispa_monthly.csv",
        "merged_file": "merged_monthly_ispa.csv",
        "model_file": "model_ispa.pkl",
        "split_date": "2025-10-01",
        "log_transform": False,
        "data_years": [2025],
        "label": "ISPA",
    },
    "leptospirosis": {
        "feature_file": "features_leptospirosis_monthly.csv",
        "merged_file": "merged_monthly_leptospirosis.csv",
        "model_file": "model_leptospirosis.pkl",
        "split_date": "2025-01-01",
        "log_transform": True,
        "data_years": list(range(2021, 2026)),
        "label": "Leptospirosis",
    },
}

# Risk Score Thresholds (Percentile-based)
RISK_THRESHOLDS = {
    "low": 0,
    "medium": 34,
    "high": 67,
}

# Semarang 16 Kecamatan Data with Coordinates (Lat, Lon)
KECAMATAN_SEMARANG = [
    {"id": "33.74.01", "name": "Semarang Tengah", "lat": -6.9811, "lon": 110.4208},
    {"id": "33.74.02", "name": "Semarang Utara", "lat": -6.9583, "lon": 110.4194},
    {"id": "33.74.03", "name": "Semarang Timur", "lat": -6.9788, "lon": 110.4431},
    {"id": "33.74.04", "name": "Semarang Selatan", "lat": -6.9972, "lon": 110.4244},
    {"id": "33.74.05", "name": "Semarang Barat", "lat": -6.9806, "lon": 110.3889},
    {"id": "33.74.06", "name": "Gayamsari", "lat": -6.9778, "lon": 110.4556},
    {"id": "33.74.07", "name": "Candisari", "lat": -7.0083, "lon": 110.4333},
    {"id": "33.74.08", "name": "Gajahmungkur", "lat": -7.0083, "lon": 110.4139},
    {"id": "33.74.09", "name": "Genuk", "lat": -6.9583, "lon": 110.4722},
    {"id": "33.74.10", "name": "Pedurungan", "lat": -7.0028, "lon": 110.4694},
    {"id": "33.74.11", "name": "Tembalang", "lat": -7.0500, "lon": 110.4472},
    {"id": "33.74.12", "name": "Banyumanik", "lat": -7.0694, "lon": 110.4139},
    {"id": "33.74.13", "name": "Gunungpati", "lat": -7.0861, "lon": 110.3694},
    {"id": "33.74.14", "name": "Mijen", "lat": -7.0611, "lon": 110.3056},
    {"id": "33.74.15", "name": "Ngaliyan", "lat": -6.9944, "lon": 110.3472},
    {"id": "33.74.16", "name": "Tugu", "lat": -6.9694, "lon": 110.3167},
]
