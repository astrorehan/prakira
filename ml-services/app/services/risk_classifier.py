"""
risk_classifier.py
Mengkonversi prediksi angka kasus -> skor risiko (0-100) -> kelas risiko.
"""
from typing import Literal, Optional
import numpy as np
from scipy.stats import percentileofscore


def calculate_risk_score(predicted_cases: float, historical_cases: list) -> int:
    """Hitung skor risiko 0-100 berdasarkan persentil distribusi historis kecamatan.

    Args:
        predicted_cases: Angka prediksi dari model.
        historical_cases: Array kasus historis kecamatan yang sama (periode training).

    Returns:
        Skor risiko antara 0 dan 100.
    """
    if not historical_cases or len(historical_cases) == 0:
        return 0
    score = percentileofscore(historical_cases, predicted_cases, kind="rank")
    return int(round(min(max(score, 0), 100)))


def classify_risk(risk_score: int) -> Optional[Literal["rendah", "sedang", "tinggi"]]:
    """Diskretisasi skor risiko menjadi 3 kelas.

    Threshold (persentil):
        >= 67 -> tinggi
        >= 34 -> sedang
        <  34 -> rendah

    Returns None jika data_coverage == 'insufficient' (ditangani di predictor.py).
    """
    if risk_score >= 67:
        return "tinggi"
    elif risk_score >= 34:
        return "sedang"
    else:
        return "rendah"


def assess_data_coverage(
    kecamatan_id: str,
    disease: str,
    df_historical,
    total_expected_months: int,
) -> Literal["high", "medium", "low", "insufficient"]:
    """Nilai kelengkapan data historis kecamatan untuk penyakit tertentu.

    Args:
        kecamatan_id: Kode BPS kecamatan.
        disease: Nama penyakit (uppercase, e.g. 'DBD').
        df_historical: DataFrame historical features.
        total_expected_months: Total bulan yang seharusnya ada.

    Returns:
        'high' | 'medium' | 'low' | 'insufficient'
    """
    mask = (df_historical["kecamatan_id"] == kecamatan_id)
    if "disease" in df_historical.columns:
        mask = mask & (df_historical["disease"] == disease)

    available_months = int(mask.sum())

    if total_expected_months <= 0:
        return "insufficient"

    ratio = available_months / total_expected_months

    if ratio >= 0.75:
        return "high"
    elif ratio >= 0.50:
        return "medium"
    elif ratio >= 0.25:
        return "low"
    else:
        return "insufficient"
