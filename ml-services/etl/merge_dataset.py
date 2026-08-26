import argparse
import logging
import sys
from pathlib import Path
import pandas as pd

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import (
    DATASET_CLEAN_DIR,
    DATASET_RAW_CUACA,
    DATASET_RAW_KASUS,
    DATASET_RAW_WILAYAH,
    DISEASE_CONFIG,
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def _load_monthly_weather() -> pd.DataFrame:
    """Load daily weather CSV dan aggregate ke level bulanan per kecamatan."""
    daily_csv = DATASET_RAW_CUACA / "cuaca_semarang_daily.csv"
    if not daily_csv.exists():
        # Fallback ke weekly jika daily tidak ada
        weekly_csv = DATASET_RAW_CUACA / "cuaca_semarang_weekly.csv"
        if not weekly_csv.exists():
            raise FileNotFoundError("Tidak ada file cuaca (daily maupun weekly).")
        logger.warning("cuaca_semarang_daily.csv tidak ditemukan, fallback ke weekly lalu aggregate ke monthly.")
        df = pd.read_csv(weekly_csv)
        df["week_start"] = pd.to_datetime(df["week_start"])
        df["month_start"] = df["week_start"].dt.to_period("M").dt.to_timestamp()
        df_monthly = (
            df.groupby(["kecamatan_id", "kecamatan_nama", "month_start"])
            .agg(
                rainfall_mm=("rainfall_mm", "sum"),
                temp_mean_c=("temp_mean_c", "mean"),
                humidity_pct=("humidity_pct", "mean"),
            )
            .reset_index()
        )
    else:
        df = pd.read_csv(daily_csv)
        df["date"] = pd.to_datetime(df["date"])
        df["month_start"] = df["date"].dt.to_period("M").dt.to_timestamp()
        df_monthly = (
            df.groupby(["kecamatan_id", "kecamatan_nama", "month_start"])
            .agg(
                rainfall_mm=("rainfall_mm", "sum"),    # curah hujan kumulatif per bulan
                temp_mean_c=("temp_mean_c", "mean"),   # suhu rata-rata bulanan
                humidity_pct=("humidity_pct", "mean"), # kelembaban rata-rata bulanan
            )
            .reset_index()
        )

    df_monthly["month_start"] = df_monthly["month_start"].dt.strftime("%Y-%m-%d")
    df_monthly["rainfall_mm"] = df_monthly["rainfall_mm"].round(1)
    df_monthly["temp_mean_c"] = df_monthly["temp_mean_c"].round(1)
    df_monthly["humidity_pct"] = df_monthly["humidity_pct"].round(1)

    logger.info(f"Monthly weather loaded: {len(df_monthly)} rows.")
    return df_monthly


def merge_datasets(disease: str = "dbd"):
    """Merge kasus bulanan + cuaca bulanan + populasi untuk penyakit yang ditentukan.

    Input:
        kasus: dataset_raw/kasus/kasus_{disease}_clean.csv  (kolom month_start)
        cuaca: dataset_raw/cuaca/cuaca_semarang_daily.csv   (agregasi ke monthly)
        wilayah: dataset_raw/wilayah/kecamatan_semarang.csv

    Output:
        dataset_clean/merged_monthly_{disease}.csv
    """
    disease_lower = disease.lower()
    if disease_lower not in DISEASE_CONFIG:
        logger.error(f"Disease '{disease_lower}' tidak ada di DISEASE_CONFIG. Pilih: {list(DISEASE_CONFIG.keys())}")
        return

    cfg = DISEASE_CONFIG[disease_lower]
    logger.info(f"Merging monthly datasets for {disease_lower.upper()}...")

    # 1. Load populasi kecamatan
    wilayah_csv = DATASET_RAW_WILAYAH / "kecamatan_semarang.csv"
    if not wilayah_csv.exists():
        logger.error(f"Wilayah file missing: {wilayah_csv}")
        return
    df_wilayah = pd.read_csv(wilayah_csv)

    # 2. Load cuaca bulanan
    try:
        df_cuaca = _load_monthly_weather()
    except FileNotFoundError as e:
        logger.error(str(e))
        return

    # 3. Load kasus bulanan
    kasus_csv = DATASET_RAW_KASUS / f"kasus_{disease_lower}_clean.csv"
    if not kasus_csv.exists():
        logger.error(f"Clean cases file missing: {kasus_csv}. Jalankan ETL kasus dahulu.")
        return

    df_kasus = pd.read_csv(kasus_csv)

    # DBD clean masih punya kolom week_start (output etl_kasus_dbd.py lama).
    # Konversi ke monthly jika perlu.
    if "week_start" in df_kasus.columns and "month_start" not in df_kasus.columns:
        logger.info(f"Kolom 'week_start' ditemukan di kasus_{disease_lower}_clean.csv — aggregate ke monthly.")
        df_kasus["week_start"] = pd.to_datetime(df_kasus["week_start"])
        df_kasus["month_start"] = df_kasus["week_start"].dt.to_period("M").dt.to_timestamp()
        df_kasus = (
            df_kasus.groupby(["kecamatan_id", "kecamatan_nama", "month_start"])
            .agg(disease=("disease", "first"), cases=("cases", "sum"))
            .reset_index()
        )
        df_kasus["month_start"] = df_kasus["month_start"].dt.strftime("%Y-%m-%d")
    else:
        df_kasus["month_start"] = pd.to_datetime(df_kasus["month_start"]).dt.strftime("%Y-%m-%d")

    # 4. Merge kasus + cuaca (inner join: hanya periode yang ada datanya)
    df_merged = pd.merge(
        df_kasus,
        df_cuaca[["kecamatan_id", "month_start", "rainfall_mm", "temp_mean_c", "humidity_pct"]],
        on=["kecamatan_id", "month_start"],
        how="inner",
    )

    # 5. Merge wilayah (populasi)
    df_merged = pd.merge(
        df_merged,
        df_wilayah[["kecamatan_id", "population"]],
        on="kecamatan_id",
        how="left",
    )

    # 6. Reorder & sort
    cols = [
        "kecamatan_id",
        "kecamatan_nama",
        "month_start",
        "disease",
        "cases",
        "population",
        "rainfall_mm",
        "temp_mean_c",
        "humidity_pct",
    ]
    df_merged = df_merged[cols].sort_values(["kecamatan_id", "month_start"]).reset_index(drop=True)

    # 7. Simpan
    output_path = DATASET_CLEAN_DIR / cfg["merged_file"]
    df_merged.to_csv(output_path, index=False)
    logger.info(
        f"Merged monthly dataset for {disease_lower.upper()} saved: {output_path} ({len(df_merged)} rows)"
    )

    return df_merged


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge dataset Kasus + Cuaca + Wilayah (monthly)")
    parser.add_argument(
        "--disease",
        type=str,
        default="dbd",
        help="Nama penyakit: dbd, ispa",
    )
    args = parser.parse_args()
    merge_datasets(disease=args.disease)
