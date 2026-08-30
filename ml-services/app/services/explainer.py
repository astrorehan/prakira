"""
explainer.py
Kontribusi fitur lokal — jawaban untuk "kenapa angkanya segini?".

**Ini bukan SHAP dan tidak boleh disebut SHAP.** Yang dihitung adalah
substitusi median: setiap kelompok fitur diganti nilai lazimnya di kecamatan
yang sama, fitur turunannya dihitung ulang, lalu model diminta memprediksi
ulang. Selisih terhadap prakiraan asli adalah seberapa jauh keadaan bulan ini
menggeser angka dari "bulan biasa di kecamatan itu".

Kenapa bukan `feature_importances_` saja? Karena importance gain bersifat
**global**: ia menjawab "fitur apa yang paling sering dipakai model di seluruh
kota selama pelatihan", bukan "kenapa Genuk bulan ini 7 dan bukan 2". Dua
pertanyaan berbeda, dan menampilkan yang pertama sebagai jawaban yang kedua
adalah kekeliruan yang tampak meyakinkan. Keduanya dikirim di sini, dengan
label masing-masing.

Tiga batas yang wajib ikut tampil di UI:

1. Kontribusi dihitung satu kelompok pada satu waktu, jadi jumlahnya **tidak**
   sama dengan prakiraan. Interaksi antar-kelompok tidak terbagi habis.
2. Pembandingnya adalah median historis kecamatan itu sendiri, bukan nol.
   "Kontribusi hujan +2,1 kasus" berarti relatif terhadap bulan lazim di sana.
3. Ini menjelaskan **model**, bukan biologi penularan. Model dilatih pada
   korelasi; kontribusi besar bukan bukti sebab-akibat.
"""
import logging
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.stats import percentileofscore

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import FEATURE_COLUMNS

from app.services.feature_frame import recompute_derived

logger = logging.getLogger(__name__)

# Minimal bulan historis sebelum median kecamatan dianggap layak jadi pembanding.
MIN_REFERENCE_MONTHS = 6


class Family:
    """Satu kelompok fitur yang diablasikan bersama.

    `base` hanya memuat fitur dasar. Turunannya (kumulatif, interaksi, rata-rata
    bergerak) ikut bergerak sendiri lewat `recompute_derived`, sehingga baris
    hasil substitusi tetap konsisten secara internal.
    """

    def __init__(
        self,
        key: str,
        label: str,
        base: List[str],
        unit: str,
        note: str,
        scope: str = "kecamatan",
    ):
        self.key = key
        self.label = label
        self.base = base
        self.unit = unit
        self.note = note
        # Pembanding mana yang dipakai. Untuk hampir semua kelompok, median
        # kecamatan itu sendiri. Untuk `wilayah` harus median se-kota:
        # populasi dan kode kecamatan konstan sepanjang riwayat satu kecamatan,
        # jadi median kecamatan sama persis dengan nilainya sendiri dan
        # ablasinya selalu menghasilkan nol — angka yang tampak seperti
        # "identitas wilayah tidak berpengaruh" padahal tidak ada yang diuji.
        self.scope = scope


FAMILIES: List[Family] = [
    Family(
        "hujan",
        "Curah hujan",
        ["rainfall_lag1", "rainfall_lag2", "rainfall_lag3"],
        " mm",
        "Curah hujan 1–3 bulan sebelumnya diganti median kecamatan; hujan kumulatif 2 bulan dan interaksi hujan×kelembaban ikut dihitung ulang.",
    ),
    Family(
        "suhu",
        "Suhu udara",
        ["temp_lag1", "temp_lag2", "temp_lag3"],
        " °C",
        "Suhu rata-rata 1–3 bulan sebelumnya diganti median kecamatan; interaksi suhu×kelembaban ikut dihitung ulang.",
    ),
    Family(
        "kelembaban",
        "Kelembaban",
        ["humidity_lag1", "humidity_lag2", "humidity_lag3"],
        "%",
        "Kelembaban 1–3 bulan sebelumnya diganti median kecamatan; kedua fitur interaksi ikut dihitung ulang.",
    ),
    Family(
        "riwayat_kasus",
        "Riwayat kasus",
        ["cases_lag1", "cases_lag2", "cases_lag3"],
        " kasus",
        "Kasus 1–3 bulan sebelumnya diganti median kecamatan; rata-rata bergerak, tren, dan insidens per 10.000 ikut dihitung ulang.",
    ),
    Family(
        "musim",
        "Bulan & musim",
        ["month"],
        "",
        "Bukan substitusi median — prakiraan dihitung ulang untuk kedua belas bulan lalu dirata-ratakan. Median dari sebuah variabel siklis tidak punya arti.",
    ),
    Family(
        "wilayah",
        "Populasi & identitas kecamatan",
        ["population", "kecamatan_encoded"],
        "",
        "Populasi dan kode kecamatan diganti nilai tengah se-kota. Ablasi kasar: kode kecamatan adalah label, bukan besaran, jadi angkanya hanya menunjukkan seberapa besar model bersandar pada identitas wilayah.",
        scope="kota",
    ),
]

FEATURE_LABELS: Dict[str, str] = {
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
    "cases_lag1": "Kasus 1 bulan lalu",
    "cases_lag2": "Kasus 2 bulan lalu",
    "cases_lag3": "Kasus 3 bulan lalu",
    "cases_ma_3m": "Rata-rata kasus 3 bulan",
    "cases_trend": "Tren kasus antarbulan",
    "cases_per_10k_lag1": "Insidens per 10.000 bulan lalu",
    "temp_x_humidity": "Interaksi suhu × kelembaban",
    "rain_x_humidity": "Interaksi hujan × kelembaban",
    "month": "Bulan",
    "month_sin": "Bulan (komponen siklis sinus)",
    "month_cos": "Bulan (komponen siklis kosinus)",
    "is_pancaroba": "Musim pancaroba",
    "population": "Populasi kecamatan",
    "kecamatan_encoded": "Kode kecamatan",
}

FEATURE_UNITS: Dict[str, str] = {
    "rainfall_lag1": " mm",
    "rainfall_lag2": " mm",
    "rainfall_lag3": " mm",
    "rainfall_cumul_2m": " mm",
    "temp_lag1": " °C",
    "temp_lag2": " °C",
    "temp_lag3": " °C",
    "humidity_lag1": "%",
    "humidity_lag2": "%",
    "humidity_lag3": "%",
    "cases_lag1": " kasus",
    "cases_lag2": " kasus",
    "cases_lag3": " kasus",
    "cases_ma_3m": " kasus",
    "cases_trend": " kasus",
    "population": " jiwa",
}

METHOD_NOTES = [
    "Metode: substitusi median (ablasi kelompok), bukan SHAP. Tiap kelompok fitur diganti nilai lazimnya di kecamatan ini, lalu model memprediksi ulang.",
    "Pembandingnya median historis kecamatan itu sendiri — bukan nol. Kontribusi +2 kasus berarti dua kasus di atas bulan yang lazim di sana.",
    "Kontribusi dihitung satu kelompok pada satu waktu, jadi jumlahnya tidak persis sama dengan prakiraan: bagian yang muncul dari interaksi antar-kelompok tidak terbagi habis.",
    "Angka ini menjelaskan perilaku model, bukan mekanisme penularan. Model belajar dari korelasi; kontribusi besar bukan bukti sebab-akibat.",
]


def _percentile(series: Optional[pd.Series], value: float) -> Optional[int]:
    if series is None or len(series) == 0:
        return None
    return int(round(percentileofscore(series.values, value, kind="rank")))


def _predict_one(model, row: pd.DataFrame) -> float:
    return float(max(0.0, float(model.predict(row[FEATURE_COLUMNS])[0])))


def explain_prediction(
    model,
    df_hist: pd.DataFrame,
    df_kec: pd.DataFrame,
    feature_row: pd.DataFrame,
) -> dict:
    """Kontribusi lokal tiap kelompok fitur terhadap satu prakiraan."""
    baseline = _predict_one(model, feature_row)

    # Pembanding: median kecamatan sendiri bila riwayatnya cukup panjang,
    # kalau tidak median se-kota. Median tiga bulan bukan "bulan lazim".
    district_months = 0 if df_kec is None or df_kec.empty else len(df_kec)
    use_district = district_months >= MIN_REFERENCE_MONTHS
    reference_frame = df_kec if use_district else df_hist
    reference_scope = "kecamatan" if use_district else "kota"

    reference = {
        col: float(reference_frame[col].median())
        for col in FEATURE_COLUMNS
        if col in reference_frame.columns
    }
    city_reference = {
        col: float(df_hist[col].median())
        for col in FEATURE_COLUMNS
        if col in df_hist.columns
    }

    families: List[dict] = []

    for family in FAMILIES:
        family_reference = city_reference if family.scope == "kota" else reference
        family_frame = df_hist if family.scope == "kota" else reference_frame

        if family.key == "musim":
            counterfactual = _seasonal_average(model, feature_row)
        else:
            substituted = feature_row.copy()
            for col in family.base:
                if col in family_reference:
                    substituted.loc[:, col] = family_reference[col]
            substituted = recompute_derived(substituted)
            counterfactual = _predict_one(model, substituted)

        delta = baseline - counterfactual

        features = []
        for col in family.base:
            value = float(feature_row.iloc[0][col])
            ref = family_reference.get(col)
            series = (
                family_frame[col].dropna() if col in family_frame.columns else None
            )
            features.append(
                {
                    "feature": col,
                    "label": FEATURE_LABELS.get(col, col),
                    "unit": FEATURE_UNITS.get(col, ""),
                    "value": round(value, 2),
                    "reference": None if ref is None else round(ref, 2),
                    "percentile": _percentile(series, value),
                }
            )

        families.append(
            {
                "key": family.key,
                "label": family.label,
                "unit": family.unit,
                "note": family.note,
                "reference_scope": "kota" if family.scope == "kota" else reference_scope,
                "delta": round(delta, 3),
                "counterfactual_cases": round(counterfactual, 2),
                "features": features,
            }
        )

    total_movement = sum(abs(f["delta"]) for f in families)
    for entry in families:
        entry["share_pct"] = (
            None
            if total_movement == 0
            else round(abs(entry["delta"]) / total_movement * 100, 1)
        )

    families.sort(key=lambda f: abs(f["delta"]), reverse=True)

    global_importance = _global_importance(model)

    return {
        "baseline_cases": round(baseline, 2),
        "baseline_rounded": int(round(baseline)),
        "reference_scope": reference_scope,
        "reference_months": district_months,
        "total_movement": round(total_movement, 3),
        "families": families,
        "global_importance": global_importance,
        "method": "substitusi-median",
        "notes": METHOD_NOTES,
    }


def _seasonal_average(model, feature_row: pd.DataFrame) -> float:
    """Prakiraan rata-rata bila bulannya diganti seluruh dua belas kemungkinan.

    Median dari variabel siklis tidak punya arti — median antara Desember dan
    Januari bukan "bulan biasa", itu Juli. Yang dipakai sebagai pembanding
    adalah rata-rata ke-12 bulan dengan seluruh fitur lain dikunci.
    """
    predictions = []
    for month in range(1, 13):
        candidate = feature_row.copy()
        candidate.loc[:, "month"] = float(month)
        candidate = recompute_derived(candidate)
        predictions.append(_predict_one(model, candidate))
    return float(np.mean(predictions))


def _global_importance(model) -> List[dict]:
    """Importance gain hasil pelatihan — global, bukan per kecamatan."""
    raw = getattr(model, "feature_importances_", None)
    if raw is None:
        return []

    values = np.asarray(raw, dtype=float)
    total = float(values.sum())
    if total <= 0:
        return []

    pairs = [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "importance": round(float(value) / total, 4),
        }
        for name, value in zip(FEATURE_COLUMNS, values)
    ]
    pairs.sort(key=lambda p: p["importance"], reverse=True)
    return pairs[:8]
