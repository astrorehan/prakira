"""Pembanding naif untuk setiap model.

Sebuah model yang R²-nya positif belum tentu berguna. Pertanyaan yang benar
bukan "seberapa dekat prakiraannya dengan kenyataan", melainkan "apakah ia
lebih dekat daripada tebakan yang tidak butuh model sama sekali". Tanpa
pembanding, angka MAE 0,36 kasus/bulan terdengar mengesankan padahal menebak
rata-rata kecamatan pun sudah mencapainya.

Tiga pembanding di bawah ini sengaja dipilih yang paling sering diajukan
sebagai keberatan:

    kasus bulan lalu   — "kenapa tidak pakai angka bulan kemarin saja?"
    rata-rata musiman  — "bukankah ini cuma pola musim yang sudah diketahui?"
    rata-rata kecamatan— "apa bedanya dengan rata-rata historis kecamatan itu?"

Ketiganya dihitung pada periode uji yang sama persis dengan model, memakai
statistik yang hanya berasal dari periode latih — kalau tidak, pembandingnya
sendiri yang bocor dan perbandingannya batal.
"""
from typing import Dict

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import TARGET_COLUMN


def _score(y_true: pd.Series, y_pred: np.ndarray) -> Dict[str, float]:
    y_pred = np.clip(np.asarray(y_pred, dtype="float64"), 0, None)
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
    }


def _persistence(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    """Prakiraan bulan T = kasus bulan T-1.

    `cases_lag1` sudah berisi tepat itu, dibentuk `build_features.py` dengan
    `groupby(kecamatan).shift(1)`, jadi tidak ada yang perlu dihitung ulang —
    dan tidak ada celah untuk salah menyelaraskan bulannya.
    """
    return test_df["cases_lag1"].to_numpy(dtype="float64")


def _seasonal_mean(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    """Rata-rata kecamatan pada bulan kalender yang sama, dari periode latih.

    Bila sebuah pasangan (kecamatan, bulan) tidak pernah muncul di periode
    latih — sering terjadi pada ISPA yang datanya hanya satu tahun — pembanding
    turun bertingkat ke rata-rata kecamatan, lalu ke rata-rata kota. Bertingkat,
    bukan NaN: pembanding yang menyerah pada sebagian baris tidak bisa
    dibandingkan dengan model yang menjawab seluruhnya.
    """
    seasonal = train_df.groupby(["kecamatan_id", "month"])[TARGET_COLUMN].mean()
    per_kec = train_df.groupby("kecamatan_id")[TARGET_COLUMN].mean()
    overall = float(train_df[TARGET_COLUMN].mean())

    keys = list(zip(test_df["kecamatan_id"], test_df["month"]))
    values = [
        seasonal.get(key, per_kec.get(key[0], overall))
        for key in keys
    ]
    return np.asarray(values, dtype="float64")


def _district_mean(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    """Rata-rata historis kecamatan itu sendiri, tanpa memandang musim."""
    per_kec = train_df.groupby("kecamatan_id")[TARGET_COLUMN].mean()
    overall = float(train_df[TARGET_COLUMN].mean())
    return test_df["kecamatan_id"].map(per_kec).fillna(overall).to_numpy(dtype="float64")


BASELINES = (
    ("persistence", "Kasus bulan lalu", _persistence),
    ("seasonal_mean", "Rata-rata musiman", _seasonal_mean),
    ("district_mean", "Rata-rata kecamatan", _district_mean),
)


def compute_baselines(train_df: pd.DataFrame, test_df: pd.DataFrame) -> Dict[str, dict]:
    """Metrik ketiga pembanding pada periode uji, siap ditulis ke metadata."""
    out: Dict[str, dict] = {}
    for key, label, fn in BASELINES:
        out[key] = {"label": label, **_score(test_df[TARGET_COLUMN], fn(train_df, test_df))}
    return out


def summarise(model_metrics: Dict[str, float], baselines: Dict[str, dict]) -> dict:
    """Putusan singkat: apakah model mengungguli seluruh pembanding naif?

    Dipajang di halaman transparansi apa adanya. Model yang kalah tetap
    ditampilkan bersama pembandingnya — menyembunyikannya jauh lebih berisiko
    daripada menyatakannya, karena satu pertanyaan tentang baseline akan
    membukanya (PRD §7).
    """
    best_key = min(baselines, key=lambda k: baselines[k]["mae"])
    best = baselines[best_key]
    return {
        "best_baseline": best_key,
        "best_baseline_label": best["label"],
        "best_baseline_mae": best["mae"],
        "model_mae": round(float(model_metrics["mae"]), 4),
        "model_beats_all_baselines": bool(model_metrics["mae"] < best["mae"]),
        "mae_improvement_pct": round(
            (best["mae"] - float(model_metrics["mae"])) / best["mae"] * 100, 2
        )
        if best["mae"] > 0
        else 0.0,
    }
