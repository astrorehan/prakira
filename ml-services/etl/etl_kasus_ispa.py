import logging
import sys
from pathlib import Path
import pandas as pd

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DATASET_RAW_KASUS

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Pemetaan Puskesmas (lowercase) ke Kode & Nama Kecamatan (16 Kecamatan)
PUSKESMAS_TO_KECAMATAN_CLEAN = {
    # Semarang Tengah (33.74.01)
    "miroto": {"id": "33.74.01", "nama": "Semarang Tengah"},
    "poncol": {"id": "33.74.01", "nama": "Semarang Tengah"},
    # Semarang Utara (33.74.02)
    "bululor": {"id": "33.74.02", "nama": "Semarang Utara"},
    "bulu lor": {"id": "33.74.02", "nama": "Semarang Utara"},
    "bandarharjo": {"id": "33.74.02", "nama": "Semarang Utara"},
    # Semarang Timur (33.74.03)
    "karangdoro": {"id": "33.74.03", "nama": "Semarang Timur"},
    "bugangan": {"id": "33.74.03", "nama": "Semarang Timur"},
    "halmahera": {"id": "33.74.03", "nama": "Semarang Timur"},
    # Semarang Selatan (33.74.04)
    "pandanaran": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "lampertengah": {"id": "33.74.04", "nama": "Semarang Selatan"},
    "lamper tengah": {"id": "33.74.04", "nama": "Semarang Selatan"},
    # Semarang Barat (33.74.05)
    "ngemplaksimongan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "ngemplak simongan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "krobokan": {"id": "33.74.05", "nama": "Semarang Barat"},
    "manyaran": {"id": "33.74.05", "nama": "Semarang Barat"},
    "lebdosari": {"id": "33.74.05", "nama": "Semarang Barat"},
    "karangayu": {"id": "33.74.05", "nama": "Semarang Barat"},
    # Gayamsari (33.74.06)
    "gayamsari": {"id": "33.74.06", "nama": "Gayamsari"},
    # Candisari (33.74.07)
    "candilama": {"id": "33.74.07", "nama": "Candisari"},
    "kagok": {"id": "33.74.07", "nama": "Candisari"},
    # Gajahmungkur (33.74.08)
    "pegandan": {"id": "33.74.08", "nama": "Gajahmungkur"},
    # Genuk (33.74.09)
    "genuk": {"id": "33.74.09", "nama": "Genuk"},
    "bangetayu": {"id": "33.74.09", "nama": "Genuk"},
    # Pedurungan (33.74.10)
    "plamongansari": {"id": "33.74.10", "nama": "Pedurungan"},
    "plamongan sari": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosariwetan": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosari wetan": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosarikulon": {"id": "33.74.10", "nama": "Pedurungan"},
    "tlogosari kulon": {"id": "33.74.10", "nama": "Pedurungan"},
    # Tembalang (33.74.11)
    "bulusan": {"id": "33.74.11", "nama": "Tembalang"},
    "rowosari": {"id": "33.74.11", "nama": "Tembalang"},
    "kedungmundu": {"id": "33.74.11", "nama": "Tembalang"},
    # Banyumanik (33.74.12)
    "pudakpayung": {"id": "33.74.12", "nama": "Banyumanik"},
    "srondol": {"id": "33.74.12", "nama": "Banyumanik"},
    "padangsari": {"id": "33.74.12", "nama": "Banyumanik"},
    "ngesrep": {"id": "33.74.12", "nama": "Banyumanik"},
    # Gunungpati (33.74.13)
    "sekaran": {"id": "33.74.13", "nama": "Gunungpati"},
    "gunungpati": {"id": "33.74.13", "nama": "Gunungpati"},
    # Mijen (33.74.14)
    "mijen": {"id": "33.74.14", "nama": "Mijen"},
    "karangmalang": {"id": "33.74.14", "nama": "Mijen"},
    # Ngaliyan (33.74.15)
    "ngaliyan": {"id": "33.74.15", "nama": "Ngaliyan"},
    "purwoyoso": {"id": "33.74.15", "nama": "Ngaliyan"},
    "tambakaji": {"id": "33.74.15", "nama": "Ngaliyan"},
    # Tugu (33.74.16)
    "mangkang": {"id": "33.74.16", "nama": "Tugu"},
    "karanganyar": {"id": "33.74.16", "nama": "Tugu"},
}

MONTH_MAP = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}


def process_ispa_file():
    """Process ispa_2025.csv and generate MONTHLY ISPA dataset per kecamatan.

    Data mentah ISPA sudah per bulan per puskesmas, jadi ETL ini hanya:
    1. Map puskesmas -> kecamatan
    2. Agregasi jumlah kasus per kecamatan per bulan
    3. Output: kasus_ispa_clean.csv dengan kolom month_start
    """
    logger.info("Starting processing ISPA 2025 monthly data...")

    file_path = DATASET_RAW_KASUS / "ispa_2025.csv"
    if not file_path.exists():
        logger.error(f"ISPA raw file not found: {file_path}")
        return

    df_raw = pd.read_csv(file_path)
    df_raw.columns = [col.strip() for col in df_raw.columns]

    df_raw["month_name"] = df_raw["Bulan"].astype(str).str.lower().str.strip()
    df_raw["month_num"] = df_raw["month_name"].map(MONTH_MAP)
    df_raw["puskesmas_clean"] = df_raw["Puskesmas"].astype(str).str.lower().str.strip()
    df_raw["cases"] = pd.to_numeric(df_raw["Total Kasus ISPA"], errors="coerce").fillna(0).astype(int)

    # Map Puskesmas to Kecamatan
    mapped_rows = []
    unmapped = set()
    for _, row in df_raw.iterrows():
        p_name = row["puskesmas_clean"]
        mapping = PUSKESMAS_TO_KECAMATAN_CLEAN.get(p_name)

        if mapping:
            mapped_rows.append(
                {
                    "year": 2025,
                    "month": row["month_num"],
                    "kecamatan_id": mapping["id"],
                    "kecamatan_nama": mapping["nama"],
                    "cases": row["cases"],
                }
            )
        else:
            unmapped.add(p_name)

    if unmapped:
        logger.warning(f"Unmapped puskesmas: {unmapped}")

    df_mapped = pd.DataFrame(mapped_rows)

    # Aggregate per kecamatan per month
    monthly_kecamatan = (
        df_mapped.groupby(["year", "month", "kecamatan_id", "kecamatan_nama"])["cases"]
        .sum()
        .reset_index()
    )

    # Create month_start column (first day of month)
    monthly_kecamatan["month_start"] = pd.to_datetime(
        monthly_kecamatan["year"].astype(str) + "-"
        + monthly_kecamatan["month"].astype(str).str.zfill(2) + "-01"
    ).dt.strftime("%Y-%m-%d")

    # Build output dataframe
    df_output = monthly_kecamatan[["kecamatan_id", "kecamatan_nama", "month_start", "cases"]].copy()
    df_output["disease"] = "ISPA"
    df_output = df_output[["kecamatan_id", "kecamatan_nama", "month_start", "disease", "cases"]]
    df_output = df_output.sort_values(["kecamatan_id", "month_start"]).reset_index(drop=True)

    output_path = DATASET_RAW_KASUS / "kasus_ispa_clean.csv"
    df_output.to_csv(output_path, index=False)
    logger.info(
        f"Monthly ISPA cases dataset saved to: {output_path} ({len(df_output)} rows)"
    )

    return df_output


if __name__ == "__main__":
    process_ispa_file()
