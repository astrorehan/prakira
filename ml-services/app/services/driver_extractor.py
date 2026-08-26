"""
driver_extractor.py
Ekstraksi fitur pemicu dominan (drivers) untuk setiap prediksi.
Drivers mengisi kalimat "Dasar:" di rekomendasi tindakan dashboard (PRD section 5.2).
"""
from typing import List
import numpy as np
from scipy.stats import percentileofscore


# Fitur yang bisa dijadikan driver (hanya iklim, bukan kalender/demografis)
CLIMATE_FEATURES = {
    "rainfall_lag1", "rainfall_lag2", "rainfall_lag3", "rainfall_cumul_2m",
    "temp_lag1", "temp_lag2", "temp_lag3",
    "humidity_lag1", "humidity_lag2", "humidity_lag3",
}

# Human-readable labels untuk fitur
FEATURE_LABELS = {
    "rainfall_lag1": "Curah hujan 1 bulan lalu",
    "rainfall_lag2": "Curah hujan 2 bulan lalu",
    "rainfall_lag3": "Curah hujan 3 bulan lalu",
    "rainfall_cumul_2m": "Curah hujan kumulatif 2 bulan",
    "temp_lag1": "Suhu rata-rata 1 bulan lalu",
    "temp_lag2": "Suhu rata-rata 2 bulan lalu",
    "temp_lag3": "Suhu rata-rata 3 bulan lalu",
    "humidity_lag1": "Kelembaban 1 bulan lalu",
    "humidity_lag2": "Kelembaban 2 bulan lalu",
    "humidity_lag3": "Kelembaban 3 bulan lalu",
}


def extract_drivers(
    feature_importances: np.ndarray,
    feature_names: list,
    feature_values: np.ndarray,
    historical_df,
    top_n: int = 3,
) -> List[dict]:
    """Ambil top-N fitur iklim berdasarkan feature importance.

    Args:
        feature_importances: Array feature_importances_ dari model.
        feature_names: Daftar nama fitur (sesuai FEATURE_COLUMNS).
        feature_values: Nilai fitur aktual untuk sampel yang diprediksi (1D array).
        historical_df: DataFrame historis (untuk menghitung persentil tiap fitur).
        top_n: Jumlah driver yang dikembalikan.

    Returns:
        List of {"feature": str, "value": float, "percentile": int}
    """
    # Buat pasangan (nama, importance, nilai)
    tuples = list(zip(feature_names, feature_importances, feature_values))

    # Filter hanya fitur iklim, urutkan berdasarkan importance
    climate_tuples = [
        (name, imp, val) for name, imp, val in tuples if name in CLIMATE_FEATURES
    ]
    climate_tuples.sort(key=lambda x: x[1], reverse=True)

    drivers = []
    for feat_name, _imp, feat_value in climate_tuples[:top_n]:
        # Hitung persentil nilai ini terhadap historis
        if feat_name in historical_df.columns:
            hist_values = historical_df[feat_name].dropna().values
            if len(hist_values) > 0:
                pctl = percentileofscore(hist_values, feat_value, kind="rank")
            else:
                pctl = 50
        else:
            pctl = 50

        drivers.append({
            "feature": feat_name,
            "value": round(float(feat_value), 1),
            "percentile": int(round(pctl)),
        })

    return drivers
