import argparse
import logging
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DATASET_CLEAN_DIR, DISEASE_CONFIG

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def build_features(disease: str = "dbd"):
    """Perform MONTHLY feature engineering for the specified disease.

    Input:  dataset_clean/merged_monthly_{disease}.csv
    Output: dataset_clean/features_{disease}_monthly.csv

    Semua penyakit menggunakan set fitur yang sama (FEATURE_COLUMNS di config.py).
    """
    disease_lower = disease.lower()
    if disease_lower not in DISEASE_CONFIG:
        logger.error(f"Disease '{disease_lower}' tidak ada di DISEASE_CONFIG.")
        return

    cfg = DISEASE_CONFIG[disease_lower]
    logger.info(f"Starting MONTHLY feature engineering for {disease_lower.upper()}...")

    merged_csv = DATASET_CLEAN_DIR / cfg["merged_file"]
    if not merged_csv.exists():
        logger.error(f"Merged monthly dataset missing: {merged_csv}. Jalankan merge_dataset.py --disease {disease_lower} dahulu.")
        return

    df = pd.read_csv(merged_csv)
    df["month_start"] = pd.to_datetime(df["month_start"])
    df = df.sort_values(by=["kecamatan_id", "month_start"]).reset_index(drop=True)

    # ----- 1. Weather Monthly Lag Features -----
    logger.info("Generating weather lag features (1-3 months)...")
    for lag in [1, 2, 3]:
        df[f"rainfall_lag{lag}"] = df.groupby("kecamatan_id")["rainfall_mm"].shift(lag)
        df[f"temp_lag{lag}"] = df.groupby("kecamatan_id")["temp_mean_c"].shift(lag)
        df[f"humidity_lag{lag}"] = df.groupby("kecamatan_id")["humidity_pct"].shift(lag)

    # Cumulative rainfall 2 months
    df["rainfall_cumul_2m"] = df["rainfall_lag1"] + df["rainfall_lag2"]

    # ----- 2. Case Monthly Autoregressive Features -----
    logger.info("Generating case autoregressive lag features...")
    for lag in [1, 2, 3]:
        df[f"cases_lag{lag}"] = df.groupby("kecamatan_id")["cases"].shift(lag)

    # Moving average 3 months (shifted 1 to avoid leakage)
    df["cases_ma_3m"] = df.groupby("kecamatan_id")["cases"].transform(
        lambda x: x.shift(1).rolling(window=3, min_periods=1).mean()
    )
    # Trend: selisih bulan lalu vs 2 bulan lalu
    df["cases_trend"] = df["cases_lag1"] - df["cases_lag2"]

    # ----- 3. Biological Interaction Features -----
    logger.info("Generating interaction features...")
    df["temp_x_humidity"] = df["temp_lag1"] * df["humidity_lag1"]
    df["rain_x_humidity"] = df["rainfall_lag1"] * df["humidity_lag1"]

    # ----- 4. Seasonal / Calendar Features -----
    logger.info("Generating seasonal features...")
    df["month"] = df["month_start"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["is_pancaroba"] = df["month"].isin([3, 4, 10, 11]).astype(int)

    # ----- 5. Incidence rate & Encoding -----
    logger.info("Generating incidence rate & encoding features...")
    df["cases_per_10k_lag1"] = (df["cases_lag1"] / df["population"]) * 10000

    le = LabelEncoder()
    df["kecamatan_encoded"] = le.fit_transform(df["kecamatan_id"])

    # ----- 6. Drop NaN rows from lagging -----
    df_clean = df.dropna().copy()

    output_path = DATASET_CLEAN_DIR / cfg["feature_file"]
    df_clean.to_csv(output_path, index=False)
    logger.info(
        f"Monthly feature engineering completed for {disease_lower.upper()}: "
        f"{output_path} ({len(df_clean)} rows)"
    )

    return df_clean


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Feature Engineering ML (Monthly)")
    parser.add_argument(
        "--disease",
        type=str,
        default="dbd",
        help="Nama penyakit: dbd, ispa",
    )
    args = parser.parse_args()
    build_features(disease=args.disease)
