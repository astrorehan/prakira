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

# Pemetaan Puskesmas/Kelurahan (lowercase) ke Kode & Nama Kecamatan (16 Kecamatan)
PUSKESMAS_TO_KECAMATAN_CLEAN = {
    "miroto": {"id": "33.74.01", "nama": "Semarang Tengah"},
    "poncol": {"id": "33.74.01", "nama": "Semarang Tengah"},
    "bululor": {"id": "33.74.02", "nama": "Semarang Utara"},
    "bulu lor": {"id": "33.74.02", "nama": "Semarang Utara"},
    "bandarharjo": {"id": "33.74.02", "nama": "Semarang Utara"},
    "karangdoro": {"id": "33.74.03", "nama": "Semarang Timur"},
    "bugangan": {"id": "33.74.03", "nama": "Semarang Timur"},
    "halmahera": {"id": "33.74.03", "nama": "Semarang Timur"},
    "pandanaran": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "lampertengah": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "lamper tengah": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "ngemplaksimongan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "ngemplak simongan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "krobokan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "manyaran": {"id": "33.74.05", "nama": "Semarang Barat"},
    "lebdosari": {"id": "33.74.05", "nama": "Semarang Barat"},
    "karangayu": {"id": "33.74.05", "nama": "Semarang Barat"},
    "gayamsari": {"id": "33.74.06", "nama": "Gayamsari"},
    "candilama": {"id": "33.74.07", "nama": "Candisari"},
    "kagok": {"id": "33.74.07", "nama": "Candisari"},
    "pegandan": {"id": "33.74.08", "nama": "Gajahmungkur"},
    "genuk": {"id": "33.74.09", "nama": "Genuk"},
    "bangetayu": {"id": "33.74.09", "nama": "Genuk"},
    "plamongansari": {"id": "33.74.10", "nama": "Pedurungan"},
    "plamongan sari": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosariwetan": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosari wetan": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosarikulon": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosari kulon": {"id": "33.74.10", "nama": "Pedurungan"},
    "bulusan": {"id": "33.74.11", "nama": "Tembalang"},
    "rowosari": {"id": "33.74.11", "nama": "Tembalang"},
    "kedungmundu": {"id": "33.74.11", "nama": "Tembalang"},
    "pudakpayung": {"id": "33.74.12", "nama": "Banyumanik"},
    "srondol": {"id": "33.74.12", "nama": "Banyumanik"},
    "padangsari": {"id": "33.74.12", "nama": "Banyumanik"},
    "ngesrep": {"id": "33.74.12", "nama": "Banyumanik"},
    "sekaran": {"id": "33.74.13", "nama": "Gunungpati"},
    "gunungpati": {"id": "33.74.13", "nama": "Gunungpati"},
    "mijen": {"id": "33.74.14", "nama": "Mijen"},
    "karangmalang": {"id": "33.74.14", "nama": "Mijen"},
    "ngaliyan": {"id": "33.74.15", "nama": "Ngaliyan"},
    "purwoyoso": {"id": "33.74.15", "nama": "Ngaliyan"},
    "tambakaji": {"id": "33.74.15", "nama": "Ngaliyan"},
    "mangkang": {"id": "33.74.16", "nama": "Tugu"},
    "karanganyar": {"id": "33.74.16", "nama": "Tugu"},
}

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _distribute_cases_largest_remainder(yearly_cases: int, weights: dict) -> dict:
    """Distribute yearly integer cases across 12 months without losing any cases via Largest Remainder Method."""
    if yearly_cases <= 0:
        return {m: 0 for m in range(1, 13)}

    raw_alloc = {m: yearly_cases * weights.get(m, 1 / 12.0) for m in range(1, 13)}
    floor_alloc = {m: int(np.floor(raw_alloc[m])) for m in range(1, 13)}
    remainder = {m: raw_alloc[m] - floor_alloc[m] for m in range(1, 13)}

    deficit = yearly_cases - sum(floor_alloc.values())
    sorted_months = sorted(remainder.keys(), key=lambda m: remainder[m], reverse=True)

    for i in range(deficit):
        m_add = sorted_months[i]
        floor_alloc[m_add] += 1

    return floor_alloc


def process_leptospirosis_files():
    """Process raw Leptospirosis datasets (2021-2025) and generate monthly cases per kecamatan.

    Combine yearly totals per puskesmas/kecamatan with monthly distribution fractions.
    Output: dataset_raw/kasus/kasus_leptospirosis_clean.csv
    """
    logger.info("Starting processing Leptospirosis raw data (2021-2025)...")

    # 1. Read monthly distribution weights per year
    monthly_weights = {}
    for year in range(2021, 2026):
        m_file = DATASET_RAW_KASUS / f"jumlah-pasien-leptospirosis-bulanan_{year}.csv"
        if m_file.exists():
            df_m = pd.read_csv(m_file, sep=";")
            df_m.columns = [c.replace('"', "").strip() for c in df_m.columns]
            df_m["Category"] = (
                df_m["Category"]
                .astype(str)
                .str.replace('"', "")
                .str.strip()
                .str.lower()
            )
            df_m["month_num"] = df_m["Category"].map(MONTH_MAP)
            df_m["cases"] = pd.to_numeric(
                df_m["Penderita Laki-laki"], errors="coerce"
            ).fillna(0) + pd.to_numeric(
                df_m["Penderita Perempuan"], errors="coerce"
            ).fillna(0)

            tot = df_m["cases"].sum()
            weights = {}
            for m in range(1, 13):
                row_m = df_m[df_m["month_num"] == m]
                if not row_m.empty and tot > 0:
                    weights[m] = float(row_m["cases"].values[0]) / tot
                else:
                    weights[m] = 1.0 / 12.0
            monthly_weights[year] = weights

    # 2. Read yearly totals per kecamatan
    yearly_kecamatan_rows = []
    for year in range(2021, 2026):
        y_file = DATASET_RAW_KASUS / f"leptospirosis_{year}.csv"
        if y_file.exists():
            df_y = pd.read_csv(y_file, sep=";")
            df_y.columns = [c.replace('"', "").strip() for c in df_y.columns]
            df_y["puskesmas"] = (
                df_y["Category"]
                .astype(str)
                .str.replace('"', "")
                .str.strip()
                .str.lower()
            )
            df_y["cases"] = pd.to_numeric(
                df_y["Penderita Laki-laki"], errors="coerce"
            ).fillna(0) + pd.to_numeric(
                df_y["Penderita Perempuan"], errors="coerce"
            ).fillna(0)

            for _, row in df_y.iterrows():
                pk = row["puskesmas"]
                mapping = PUSKESMAS_TO_KECAMATAN_CLEAN.get(pk)
                if mapping:
                    yearly_kecamatan_rows.append(
                        {
                            "year": year,
                            "kecamatan_id": mapping["id"],
                            "kecamatan_nama": mapping["nama"],
                            "yearly_cases": row["cases"],
                        }
                    )

    df_yearly = (
        pd.DataFrame(yearly_kecamatan_rows)
        .groupby(["year", "kecamatan_id", "kecamatan_nama"])["yearly_cases"]
        .sum()
        .reset_index()
    )

    # 3. Create full grid for 16 Kecamatan x 5 Years x 12 Months using Largest Remainder Method
    grid_rows = []

    for year in range(2021, 2026):
        weights = monthly_weights.get(year, {m: 1 / 12.0 for m in range(1, 13)})

        for k_item in KECAMATAN_SEMARANG:
            k_id = k_item["id"]
            k_nama = k_item["name"]

            match = df_yearly[
                (df_yearly["year"] == year) & (df_yearly["kecamatan_id"] == k_id)
            ]
            yearly_cases = (
                int(match["yearly_cases"].values[0]) if not match.empty else 0
            )

            # Distribute exact integer cases across 12 months
            month_cases_map = _distribute_cases_largest_remainder(yearly_cases, weights)

            for month in range(1, 13):
                month_start = f"{year}-{str(month).zfill(2)}-01"
                m_cases = month_cases_map[month]

                grid_rows.append(
                    {
                        "kecamatan_id": k_id,
                        "kecamatan_nama": k_nama,
                        "month_start": month_start,
                        "disease": "LEPTOSPIROSIS",
                        "cases": int(m_cases),
                    }
                )

    df_output = pd.DataFrame(grid_rows)
    df_output = df_output.sort_values(["kecamatan_id", "month_start"]).reset_index(
        drop=True
    )

    output_path = DATASET_RAW_KASUS / "kasus_leptospirosis_clean.csv"
    df_output.to_csv(output_path, index=False)
    logger.info(
        f"Monthly Leptospirosis cases dataset saved to: {output_path} ({len(df_output)} rows)"
    )

    return df_output


if __name__ == "__main__":
    process_leptospirosis_files()
