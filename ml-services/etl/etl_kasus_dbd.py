import logging
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DATASET_RAW_KASUS, KECAMATAN_SEMARANG

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Pemetaan Puskesmas Kota Semarang ke Kode & Nama Kecamatan (16 Kecamatan)
PUSKESMAS_TO_KECAMATAN = {
    # Semarang Tengah (33.74.01)
    "Miroto": {"id": "33.74.01", "nama": "Semarang Tengah"},
    "Poncol": {"id": "33.74.01", "nama": "Semarang Tengah"},
    # Semarang Utara (33.74.02)
    "Bulu Lor": {"id": "33.74.02", "nama": "Semarang Utara"},
    "Bandarharjo": {"id": "33.74.02", "nama": "Semarang Utara"},
    # Semarang Timur (33.74.03)
    "Karangdoro": {"id": "33.74.03", "nama": "Semarang Timur"},
    "Bugangan": {"id": "33.74.03", "nama": "Semarang Timur"},
    "Halmahera": {"id": "33.74.03", "nama": "Semarang Timur"},
    # Semarang Selatan (33.74.04)
    "Pandanaran": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "Lamper Tengah": {"id": "33.74.04", "nama": "Semarang Selatan"},
    # Semarang Barat (33.74.05)
    "Ngemplak Simongan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "Krobokan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "Manyaran": {"id": "33.74.05", "nama": "Semarang Barat"},
    "Lebdosari": {"id": "33.74.05", "nama": "Semarang Barat"},
    "Karangayu": {"id": "33.74.05", "nama": "Semarang Barat"},
    # Gayamsari (33.74.06)
    "Gayamsari": {"id": "33.74.06", "nama": "Gayamsari"},
    # Candisari (33.74.07)
    "Candilama": {"id": "33.74.07", "nama": "Candisari"},
    "Kagok": {"id": "33.74.07", "nama": "Candisari"},
    # Gajahmungkur (33.74.08)
    "Pegandan": {"id": "33.74.08", "nama": "Gajahmungkur"},
    # Genuk (33.74.09)
    "Genuk": {"id": "33.74.09", "nama": "Genuk"},
    "Bangetayu": {"id": "33.74.09", "nama": "Genuk"},
    # Pedurungan (33.74.10)
    "Plamongan Sari": {"id": "33.74.10", "nama": "Pedurungan"},
    "Tlogosari Wetan": {"id": "33.74.10", "nama": "Pedurungan"},
    "Tlogosari Kulon": {"id": "33.74.10", "nama": "Pedurungan"},
    # Tembalang (33.74.11)
    "Bulusan": {"id": "33.74.11", "nama": "Tembalang"},
    "Rowosari": {"id": "33.74.11", "nama": "Tembalang"},
    "Kedungmundu": {"id": "33.74.11", "nama": "Tembalang"},
    # Banyumanik (33.74.12)
    "Pudakpayung": {"id": "33.74.12", "nama": "Banyumanik"},
    "Srondol": {"id": "33.74.12", "nama": "Banyumanik"},
    "Padangsari": {"id": "33.74.12", "nama": "Banyumanik"},
    "Ngesrep": {"id": "33.74.12", "nama": "Banyumanik"},
    # Gunungpati (33.74.13)
    "Sekaran": {"id": "33.74.13", "nama": "Gunungpati"},
    "Gunungpati": {"id": "33.74.13", "nama": "Gunungpati"},
    # Mijen (33.74.14)
    "Mijen": {"id": "33.74.14", "nama": "Mijen"},
    "Karangmalang": {"id": "33.74.14", "nama": "Mijen"},
    # Ngaliyan (33.74.15)
    "Ngaliyan": {"id": "33.74.15", "nama": "Ngaliyan"},
    "Purwoyoso": {"id": "33.74.15", "nama": "Ngaliyan"},
    "Tambakaji": {"id": "33.74.15", "nama": "Ngaliyan"},
    # Tugu (33.74.16)
    "Mangkang": {"id": "33.74.16", "nama": "Tugu"},
    "Karanganyar": {"id": "33.74.16", "nama": "Tugu"},
}


def load_real_weekly_weights(year: int) -> np.ndarray:
    """Load real citywide weekly case distribution from `jumlah-pasien-dbd-minguan_{year}.csv`."""
    weekly_file = DATASET_RAW_KASUS / f"jumlah-pasien-dbd-minguan_{year}.csv"
    if not weekly_file.exists():
        logger.warning(f"Real weekly file not found: {weekly_file}. Using uniform distribution.")
        return np.full(52, 1.0 / 52)

    df_w = pd.read_csv(weekly_file)
    df_w.columns = [col.strip().replace('"', '') for col in df_w.columns]

    df_w["week_num"] = pd.to_numeric(df_w["Category"], errors="coerce")
    df_w = df_w.dropna(subset=["week_num"]).copy()
    df_w["week_num"] = df_w["week_num"].astype(int)

    df_w["total_cases"] = (
        df_w["Penderita Laki-laki"].fillna(0) + df_w["Penderita Perempuan"].fillna(0)
    )

    # Reindex to ensure exact 52 weeks (1 to 52)
    weekly_series = pd.Series(0, index=range(1, 53))
    for _, row in df_w.iterrows():
        wn = int(row["week_num"])
        if 1 <= wn <= 52:
            weekly_series[wn] = row["total_cases"]

    total_annual_city = weekly_series.sum()
    if total_annual_city > 0:
        weights = weekly_series.values / total_annual_city
    else:
        weights = np.full(52, 1.0 / 52)

    return weights


def process_raw_dbd_files():
    """Load yearly raw DBD Puskesmas CSV files and combine with real weekly distribution files."""
    logger.info("Starting processing raw DBD case files with REAL weekly distributions (2021 - 2025)...")

    yearly_data = []

    for year in range(2021, 2026):
        file_path = DATASET_RAW_KASUS / f"dbd_{year}.csv"
        if not file_path.exists():
            logger.warning(f"File not found: {file_path}")
            continue

        logger.info(f"Reading Puskesmas annual file: {file_path.name}")
        df_raw = pd.read_csv(file_path)
        df_raw.columns = [col.strip().replace('"', '') for col in df_raw.columns]

        df_raw["total_cases"] = (
            df_raw["Penderita Perempuan"].fillna(0) + df_raw["Penderita Laki-laki"].fillna(0)
        )

        mapped_rows = []
        for _, row in df_raw.iterrows():
            puskesmas_name = str(row["Category"]).strip()
            mapping = PUSKESMAS_TO_KECAMATAN.get(puskesmas_name)

            if mapping:
                mapped_rows.append(
                    {
                        "year": year,
                        "puskesmas": puskesmas_name,
                        "kecamatan_id": mapping["id"],
                        "kecamatan_nama": mapping["nama"],
                        "total_cases": int(row["total_cases"]),
                    }
                )

        df_mapped = pd.DataFrame(mapped_rows)
        yearly_data.append(df_mapped)

    if not yearly_data:
        logger.error("No valid case data found!")
        return

    df_all_yearly = pd.concat(yearly_data, ignore_index=True)

    annual_kecamatan = (
        df_all_yearly.groupby(["year", "kecamatan_id", "kecamatan_nama"])["total_cases"]
        .sum()
        .reset_index()
    )

    logger.info(f"Annual cases per kecamatan compiled ({len(annual_kecamatan)} kecamatan-year records).")

    # Disaggregate annual cases into weekly dataset using REAL weekly weights
    weekly_records = []
    np.random.seed(42)

    for year in range(2021, 2026):
        real_weights = load_real_weekly_weights(year)
        logger.info(f"Loaded REAL weekly weights for Year {year} (Total citywide cases: {real_weights.sum():.2f})")

        start_date = f"{year}-01-01"
        dates = pd.date_range(start=start_date, periods=52, freq="W-MON")

        year_group = annual_kecamatan[annual_kecamatan["year"] == year]

        for _, row in year_group.iterrows():
            kec_id = row["kecamatan_id"]
            kec_nama = row["kecamatan_nama"]
            annual_total = row["total_cases"]

            if annual_total > 0:
                weekly_cases = np.random.multinomial(annual_total, real_weights)
            else:
                weekly_cases = np.zeros(52, dtype=int)

            for week_start, cases in zip(dates, weekly_cases):
                weekly_records.append(
                    {
                        "kecamatan_id": kec_id,
                        "kecamatan_nama": kec_nama,
                        "week_start": week_start.strftime("%Y-%m-%d"),
                        "disease": "DBD",
                        "cases": int(cases),
                    }
                )

    df_weekly_cases = pd.DataFrame(weekly_records)

    output_path = DATASET_RAW_KASUS / "kasus_dbd_clean.csv"
    df_weekly_cases.to_csv(output_path, index=False)
    logger.info(
        f"Weekly DBD cases dataset (from REAL weekly data) saved to: {output_path} ({len(df_weekly_cases)} rows)"
    )

    return df_weekly_cases


if __name__ == "__main__":
    process_raw_dbd_files()
