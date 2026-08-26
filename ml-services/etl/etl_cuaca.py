import argparse
import logging
import sys
import time
from pathlib import Path
import pandas as pd
import requests

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import DATASET_RAW_CUACA, KECAMATAN_SEMARANG

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def fetch_open_meteo_weather(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch daily weather data from Open-Meteo Historical API for a specific coordinate."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": [
            "rain_sum",
            "temperature_2m_mean",
            "relative_humidity_2m_mean",
        ],
        "timezone": "Asia/Jakarta",
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        if "daily" not in data:
            logger.error(f"Response error for ({lat}, {lon}): {data}")
            return pd.DataFrame()

        df_daily = pd.DataFrame(data["daily"])
        df_daily.rename(
            columns={
                "time": "date",
                "rain_sum": "rainfall_mm",
                "temperature_2m_mean": "temp_mean_c",
                "relative_humidity_2m_mean": "humidity_pct",
            },
            inplace=True,
        )
        return df_daily

    except Exception as e:
        logger.error(f"Error fetching data for coordinates ({lat}, {lon}): {e}")
        return pd.DataFrame()


def aggregate_daily_to_weekly(df_daily_all: pd.DataFrame) -> pd.DataFrame:
    """Aggregate daily weather data to weekly data starting on Monday."""
    df = df_daily_all.copy()
    df["date"] = pd.to_datetime(df["date"])

    # Map date to week start (Monday)
    df["week_start"] = df["date"].dt.to_period("W-SUN").dt.start_time

    # Group by kecamatan and week_start
    weekly_agg = (
        df.groupby(["kecamatan_id", "kecamatan_nama", "week_start"])
        .agg(
            {
                "rainfall_mm": "sum",
                "temp_mean_c": "mean",
                "humidity_pct": "mean",
            }
        )
        .reset_index()
    )

    # Round numeric values for clean output
    weekly_agg["rainfall_mm"] = weekly_agg["rainfall_mm"].round(1)
    weekly_agg["temp_mean_c"] = weekly_agg["temp_mean_c"].round(1)
    weekly_agg["humidity_pct"] = weekly_agg["humidity_pct"].round(1)

    return weekly_agg


def run_cuaca_etl(start_date: str, end_date: str):
    """Main runner for fetching weather data for all 16 kecamatan in Semarang."""
    logger.info(
        f"Starting weather data retrieval for 16 Kecamatan (Period: {start_date} to {end_date})..."
    )

    all_daily_records = []

    for idx, kec in enumerate(KECAMATAN_SEMARANG, 1):
        logger.info(
            f"[{idx}/16] Fetching data for {kec['name']} (ID: {kec['id']}, Lat: {kec['lat']}, Lon: {kec['lon']})..."
        )

        df_kec_daily = fetch_open_meteo_weather(
            lat=kec["lat"], lon=kec["lon"], start_date=start_date, end_date=end_date
        )

        if not df_kec_daily.empty:
            df_kec_daily["kecamatan_id"] = kec["id"]
            df_kec_daily["kecamatan_nama"] = kec["name"]
            all_daily_records.append(df_kec_daily)

        # Politeness delay to avoid rate limiting
        time.sleep(0.3)

    if not all_daily_records:
        logger.error("No weather data was retrieved!")
        return

    # Combine all daily records
    df_daily_all = pd.concat(all_daily_records, ignore_index=True)

    # Reorder columns
    daily_cols = [
        "kecamatan_id",
        "kecamatan_nama",
        "date",
        "rainfall_mm",
        "temp_mean_c",
        "humidity_pct",
    ]
    df_daily_all = df_daily_all[daily_cols]

    # Save daily weather CSV
    daily_csv_path = DATASET_RAW_CUACA / "cuaca_semarang_daily.csv"
    df_daily_all.to_csv(daily_csv_path, index=False)
    logger.info(f"Daily weather data saved to: {daily_csv_path} ({len(df_daily_all)} rows)")

    # Aggregate to weekly
    df_weekly = aggregate_daily_to_weekly(df_daily_all)

    # Save weekly weather CSV
    weekly_csv_path = DATASET_RAW_CUACA / "cuaca_semarang_weekly.csv"
    df_weekly.to_csv(weekly_csv_path, index=False)
    logger.info(f"Weekly weather data saved to: {weekly_csv_path} ({len(df_weekly)} rows)")

    logger.info("Weather ETL process completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Script Pengambil & Pengolah Data Cuaca BMKG / Open-Meteo untuk PRAKIRA"
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default="2021-01-01",
        help="Tanggal mulai (YYYY-MM-DD), contoh: 2021-01-01",
    )
    parser.add_argument(
        "--end-date",
        type=str,
        default="2025-12-31",
        help="Tanggal selesai (YYYY-MM-DD), contoh: 2025-12-31",
    )

    args = parser.parse_argument_values() if hasattr(parser, 'parse_argument_values') else parser.parse_args()
    run_cuaca_etl(start_date=args.start_date, end_date=args.end_date)
