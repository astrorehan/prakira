"""
scenario.py
Simulator cuaca — "kalau hujan naik 30%, peta berubah jadi apa?".

Yang dijawab endpoint ini adalah **apa kata model**, bukan apa yang akan
terjadi. Bedanya penting dan harus terbaca di layar: model dilatih pada
korelasi historis antara iklim dan kasus, jadi menggeser curah hujan
menghasilkan jawaban "bulan-bulan dengan hujan sebesar itu di masa lalu
biasanya diikuti sekian kasus" — bukan ramalan kausal atas intervensi apa pun.

Dua pengaman yang ikut dikirim ke pemanggil:

1. **Fitur turunan dihitung ulang.** Menaikkan `rainfall_lag1` tanpa
   memperbarui `rainfall_cumul_2m` dan `rain_x_humidity` menyodorkan baris
   yang mustahil ke model. Lihat `feature_frame.recompute_derived`.
2. **Peringatan ekstrapolasi.** Bila nilai hasil geseran keluar dari rentang
   yang pernah dilihat model saat pelatihan, barisnya ditandai. Model pohon
   tidak mengekstrapolasi — ia membekukan jawabannya di daun terluar — dan
   pengguna berhak tahu kapan ia sedang membaca tebakan di luar pengalaman.
"""
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import FEATURE_COLUMNS, KECAMATAN_SEMARANG

from app.services.feature_frame import (
    build_feature_row,
    clamp_physical,
    recompute_derived,
)
from app.services.risk_classifier import (
    assess_data_coverage,
    calculate_risk_score,
    classify_risk,
)

logger = logging.getLogger(__name__)

RAINFALL_FEATURES = ("rainfall_lag1", "rainfall_lag2", "rainfall_lag3")
TEMP_FEATURES = ("temp_lag1", "temp_lag2", "temp_lag3")
HUMIDITY_FEATURES = ("humidity_lag1", "humidity_lag2", "humidity_lag3")

# Batas geseran. Bukan selera: di luar rentang ini seluruh 16 kecamatan pasti
# keluar dari data latih sekaligus, dan keluarannya berhenti bermakna.
LIMITS = {
    "rainfall_pct": (-100.0, 200.0),
    "temp_delta_c": (-5.0, 5.0),
    "humidity_delta_pct": (-30.0, 30.0),
}

SCENARIO_NOTES = [
    "Simulator menjawab \"apa kata model\", bukan \"apa yang akan terjadi\". Model belajar dari korelasi iklim–kasus historis, bukan dari eksperimen.",
    "Menggeser curah hujan menaikkan pula hujan kumulatif 2 bulan dan interaksi hujan×kelembaban, karena ketiganya memang terhitung dari angka yang sama.",
    "Baris yang nilainya keluar dari rentang data latih ditandai. Model berbasis pohon tidak mengekstrapolasi — jawabannya membeku di batas terluar yang pernah dilihat.",
    "Skor risiko tetap dihitung sebagai persentil terhadap sejarah kecamatan itu sendiri, sama seperti pada prakiraan biasa.",
]


def clamp_input(name: str, value: float) -> float:
    low, high = LIMITS[name]
    return float(min(max(value, low), high))


def _training_range(df_hist: pd.DataFrame, columns: Tuple[str, ...]) -> Dict[str, Tuple[float, float]]:
    out: Dict[str, Tuple[float, float]] = {}
    for col in columns:
        if col in df_hist.columns:
            series = df_hist[col].dropna()
            if len(series) > 0:
                out[col] = (float(series.min()), float(series.max()))
    return out


def _apply_adjustment(
    row: pd.DataFrame,
    rainfall_pct: float,
    temp_delta_c: float,
    humidity_delta_pct: float,
) -> pd.DataFrame:
    adjusted = row.copy()
    factor = 1.0 + rainfall_pct / 100.0

    for col in RAINFALL_FEATURES:
        adjusted.loc[:, col] = adjusted[col] * factor
    for col in TEMP_FEATURES:
        adjusted.loc[:, col] = adjusted[col] + temp_delta_c
    for col in HUMIDITY_FEATURES:
        adjusted.loc[:, col] = adjusted[col] + humidity_delta_pct

    return recompute_derived(clamp_physical(adjusted))


def _beyond_training(
    row: pd.DataFrame, ranges: Dict[str, Tuple[float, float]]
) -> List[str]:
    flagged = []
    for col, (low, high) in ranges.items():
        value = float(row.iloc[0][col])
        if value < low or value > high:
            flagged.append(col)
    return flagged


def simulate_batch(
    model,
    df_hist: pd.DataFrame,
    disease: str,
    month: str,
    rainfall_pct: float = 0.0,
    temp_delta_c: float = 0.0,
    humidity_delta_pct: float = 0.0,
) -> dict:
    """Prakiraan dasar dan prakiraan tergeser untuk seluruh 16 kecamatan."""
    rainfall_pct = clamp_input("rainfall_pct", rainfall_pct)
    temp_delta_c = clamp_input("temp_delta_c", temp_delta_c)
    humidity_delta_pct = clamp_input("humidity_delta_pct", humidity_delta_pct)

    ranges = _training_range(
        df_hist, RAINFALL_FEATURES + TEMP_FEATURES + HUMIDITY_FEATURES
    )
    total_months = df_hist["month_start"].nunique() if not df_hist.empty else 0
    disease_upper = disease.upper()

    rows: List[dict] = []

    for kec in KECAMATAN_SEMARANG:
        kecamatan_id = kec["id"]
        df_kec = df_hist[df_hist["kecamatan_id"] == kecamatan_id].copy()
        coverage = assess_data_coverage(
            kecamatan_id, disease_upper, df_hist, total_months
        )

        if coverage == "insufficient":
            rows.append(_empty_row(kecamatan_id, kec["name"], coverage))
            continue

        try:
            base_row = build_feature_row(df_hist, df_kec)
        except ValueError:
            rows.append(_empty_row(kecamatan_id, kec["name"], "insufficient"))
            continue

        historical = (
            df_kec["cases"].values.tolist()
            if not df_kec.empty
            else df_hist["cases"].values.tolist()
        )

        baseline_value = float(max(0.0, float(model.predict(base_row)[0])))
        baseline_int = int(round(baseline_value))
        baseline_score = calculate_risk_score(baseline_int, historical)

        adjusted_row = _apply_adjustment(
            base_row, rainfall_pct, temp_delta_c, humidity_delta_pct
        )
        adjusted_value = float(max(0.0, float(model.predict(adjusted_row)[0])))
        adjusted_int = int(round(adjusted_value))
        adjusted_score = calculate_risk_score(adjusted_int, historical)

        rows.append(
            {
                "kecamatan_id": kecamatan_id,
                "kecamatan_nama": kec["name"],
                "data_coverage": coverage,
                "baseline_cases": baseline_int,
                "baseline_risk_score": baseline_score,
                "baseline_risk_class": classify_risk(baseline_score),
                "scenario_cases": adjusted_int,
                "scenario_risk_score": adjusted_score,
                "scenario_risk_class": classify_risk(adjusted_score),
                "rainfall_baseline": round(float(base_row.iloc[0]["rainfall_lag1"]), 1),
                "rainfall_scenario": round(
                    float(adjusted_row.iloc[0]["rainfall_lag1"]), 1
                ),
                "beyond_training": _beyond_training(adjusted_row, ranges),
            }
        )

    _assign_ranks(rows, "baseline_risk_score", "baseline_rank")
    _assign_ranks(rows, "scenario_risk_score", "scenario_rank")

    evaluated = [r for r in rows if r["baseline_cases"] is not None]
    flagged = [r for r in evaluated if r["beyond_training"]]

    return {
        "disease": disease_upper,
        "month": month,
        "adjustment": {
            "rainfall_pct": rainfall_pct,
            "temp_delta_c": temp_delta_c,
            "humidity_delta_pct": humidity_delta_pct,
        },
        "districts": rows,
        "summary": {
            "evaluated": len(evaluated),
            "baseline_total": sum(r["baseline_cases"] for r in evaluated),
            "scenario_total": sum(r["scenario_cases"] for r in evaluated),
            "baseline_high": sum(
                1 for r in evaluated if r["baseline_risk_class"] == "tinggi"
            ),
            "scenario_high": sum(
                1 for r in evaluated if r["scenario_risk_class"] == "tinggi"
            ),
            "rank_changed": sum(
                1 for r in evaluated if r["baseline_rank"] != r["scenario_rank"]
            ),
            "beyond_training": len(flagged),
        },
        "notes": SCENARIO_NOTES,
    }


def _empty_row(kecamatan_id: str, nama: str, coverage: str) -> dict:
    """Kecamatan tanpa data cukup: kosong, bukan nol.

    Nol berarti "model memprakirakan nol kasus"; kosong berarti "tidak ada
    dasar untuk memprakirakan". Menyamakan keduanya adalah bug kepercayaan
    yang sama yang sudah diperbaiki di dashboard (PRD §7-H2).
    """
    return {
        "kecamatan_id": kecamatan_id,
        "kecamatan_nama": nama,
        "data_coverage": coverage,
        "baseline_cases": None,
        "baseline_risk_score": None,
        "baseline_risk_class": None,
        "scenario_cases": None,
        "scenario_risk_score": None,
        "scenario_risk_class": None,
        "rainfall_baseline": None,
        "rainfall_scenario": None,
        "beyond_training": [],
    }


def _assign_ranks(rows: List[dict], score_key: str, rank_key: str) -> None:
    """Peringkat 1 = skor tertinggi. Kecamatan tanpa skor tidak diberi peringkat."""
    ranked = [r for r in rows if r[score_key] is not None]
    ranked.sort(key=lambda r: (-r[score_key], r["kecamatan_nama"]))
    for index, row in enumerate(ranked, start=1):
        row[rank_key] = index
    for row in rows:
        if row[score_key] is None:
            row[rank_key] = None
