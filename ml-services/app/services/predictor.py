"""
predictor.py
Memuat model yang sudah dilatih dan menyediakan prediksi per kecamatan per penyakit.
"""
import json
import logging
from pathlib import Path
from typing import Optional, Tuple

import joblib
import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import (
    DATASET_CLEAN_DIR,
    DISEASE_CONFIG,
    DISEASES,
    FEATURE_COLUMNS,
    KECAMATAN_SEMARANG,
    MODELS_DIR,
)

from app.services.risk_classifier import (
    assess_data_coverage,
    calculate_risk_score,
    classify_risk,
)
from app.services.driver_extractor import extract_drivers
from training.ensemble import DBDEnsembleModel, ISPAEnsembleModel, LeptospirosisEnsembleModel

logger = logging.getLogger(__name__)

# Cache: model + data per penyakit
_model_cache: dict = {}
_data_cache: dict = {}
_metadata_cache: dict = {}


def _load_metadata() -> dict:
    """Load metadata.json."""
    path = MODELS_DIR / "metadata.json"
    if path.exists():
        with open(path, "r") as f:
            return json.load(f)
    return {}


def _load_model(disease: str):
    """Load model pkl dan historical features untuk penyakit tertentu."""
    disease_lower = disease.lower()
    if disease_lower in _model_cache:
        return _model_cache[disease_lower], _data_cache[disease_lower]

    cfg = DISEASE_CONFIG.get(disease_lower)
    if cfg is None:
        raise ValueError(f"Penyakit '{disease}' tidak dikonfigurasi.")

    model_path = MODELS_DIR / cfg["model_file"]
    if not model_path.exists():
        raise FileNotFoundError(f"Model belum dilatih: {model_path}")

    model = joblib.load(model_path)

    feature_path = DATASET_CLEAN_DIR / cfg["feature_file"]
    if feature_path.exists():
        df_hist = pd.read_csv(feature_path)
    else:
        df_hist = pd.DataFrame()

    _model_cache[disease_lower] = model
    _data_cache[disease_lower] = df_hist

    logger.info(f"Model loaded: {model_path.name} ({len(df_hist)} historical rows)")
    return model, df_hist


def get_loaded_models_info() -> dict:
    """Info model yang tersedia untuk health check."""
    metadata = _load_metadata()
    info = {}
    for d in DISEASES:
        cfg = DISEASE_CONFIG.get(d, {})
        model_exists = (MODELS_DIR / cfg.get("model_file", "")).exists() if cfg else False
        meta = metadata.get(d, {})
        info[d] = {
            "model_exists": model_exists,
            "version": meta.get("version", "unknown"),
            "trained_at": meta.get("trained_at", "unknown"),
            "granularity": "monthly",
        }
    return info


def predict_single(
    kecamatan_id: str,
    disease: str,
    month: str,
) -> dict:
    """Prediksi untuk satu kecamatan, satu penyakit, satu bulan.

    Returns dict sesuai PredictionResult schema (PRD section 6 contract).
    """
    disease_lower = disease.lower()
    disease_upper = disease.upper()

    model, df_hist = _load_model(disease_lower)
    metadata = _load_metadata()
    model_meta = metadata.get(disease_lower, {})
    cfg = DISEASE_CONFIG[disease_lower]

    # Cari data kecamatan ini di historical features
    df_kec = df_hist[df_hist["kecamatan_id"] == kecamatan_id].copy()

    # Tentukan data coverage
    total_expected = df_hist["month_start"].nunique() if not df_hist.empty else 0
    coverage = assess_data_coverage(kecamatan_id, disease_upper, df_hist, total_expected)

    # Jika data insufficient, kembalikan null risk_class (PRD H2)
    if coverage == "insufficient":
        return {
            "kecamatan_id": kecamatan_id,
            "disease": disease_upper,
            "month": month,
            "predicted_cases": 0,
            "lower_bound": 0,
            "upper_bound": 0,
            "risk_score": 0,
            "risk_class": None,
            "data_coverage": "insufficient",
            "drivers": [],
            "model_version": model_meta.get("version", "unknown"),
        }

    # Ambil baris terakhir kecamatan ini sebagai basis fitur.
    if df_kec.empty:
        # Fallback: pakai rata-rata dari seluruh kecamatan
        if df_hist.empty:
            raise ValueError(f"Tidak ada data historis untuk prediksi.")
        feature_row = pd.DataFrame([df_hist[FEATURE_COLUMNS].mean()], columns=FEATURE_COLUMNS)
    else:
        feature_row = df_kec[FEATURE_COLUMNS].iloc[[-1]].reset_index(drop=True)

    # Prediksi
    pred_raw = model.predict(feature_row)
    predicted = float(pred_raw[0])
    predicted = max(0, predicted)
    predicted_int = int(round(predicted))

    # Confidence interval — estimasi dari variasi prediksi sub-model (ensemble)
    lower, upper = _estimate_confidence(model, feature_row, cfg)

    # Risk score dari distribusi historis kecamatan.
    #
    # Yang dinilai adalah `predicted_int`, angka yang benar-benar ditampilkan —
    # bukan `predicted` yang belum dibulatkan. Persentil atas nilai mentah
    # membuat skor bertentangan dengan angkanya sendiri pada penyakit yang
    # jarang: Leptospirosis di Semarang Tengah memprediksi 0,11 kasus, dan
    # karena 50 dari 57 bulan historisnya bernilai 0, angka 0,11 mengungguli
    # semuanya dan menghasilkan persentil 88 alias "tinggi" — dashboard
    # memerahkan 14 dari 16 kecamatan untuk prediksi yang tertulis 0 kasus.
    # Dinilai pada angka bulat, persentilnya 45.
    historical_cases = df_kec["cases"].values.tolist() if not df_kec.empty else df_hist["cases"].values.tolist()
    risk_score = calculate_risk_score(predicted_int, historical_cases)
    risk_class = classify_risk(risk_score)

    # Drivers
    drivers = []
    if hasattr(model, "feature_importances_") and not df_hist.empty:
        drivers = extract_drivers(
            feature_importances=model.feature_importances_,
            feature_names=FEATURE_COLUMNS,
            feature_values=feature_row.iloc[0].values,
            historical_df=df_hist,
            top_n=3,
        )

    return {
        "kecamatan_id": kecamatan_id,
        "disease": disease_upper,
        "month": month,
        "predicted_cases": predicted_int,
        "lower_bound": lower,
        "upper_bound": upper,
        "risk_score": risk_score,
        "risk_class": risk_class,
        "data_coverage": coverage,
        "drivers": drivers,
        "model_version": model_meta.get("version", "unknown"),
    }


def predict_batch(disease: str, month: str) -> list:
    """Prediksi untuk semua 16 kecamatan Semarang."""
    results = []
    for kec in KECAMATAN_SEMARANG:
        result = predict_single(kec["id"], disease, month)
        results.append(result)
    return results


def _estimate_confidence(model, X: pd.DataFrame, cfg: dict) -> Tuple[int, int]:
    """Estimasi lower/upper bound dari ensemble sub-models.

    Untuk ensemble custom, prediksi tiap sub-model lalu ambil P10/P90.

    Interval selalu dilebarkan agar memuat prediksi titik. Sebaran sub-model
    bisa lebih sempit daripada hasil blending-nya, dan interval yang tidak
    memuat angkanya sendiri ("2 kasus, rentang 1-1") membatalkan seluruh guna
    interval itu di UI (PRD section 7-H1).
    """
    predictions = []

    # Pastikan X ber-kolom DataFrame untuk mencegah UserWarning sklearn feature_names
    X_df = X if isinstance(X, pd.DataFrame) else pd.DataFrame(X, columns=FEATURE_COLUMNS)

    # Model DBD dilatih pada log1p(cases): sub-model-nya menjawab dalam ruang
    # log, sedangkan predict() ensemble sudah mengembalikannya ke skala kasus.
    # Tanpa expm1 di sini, batas bawah/atas dibandingkan dengan angka yang
    # satuannya berbeda -- itulah asal interval "2 kasus, rentang 1-1".
    log_transformed = bool(cfg.get("log_transform", False))

    def to_cases(value: float) -> float:
        restored = np.expm1(value) if log_transformed else value
        return float(np.clip(restored, 0, None))

    # Coba ambil prediksi dari masing-masing sub-model
    sub_model_attrs = ["m_ridge", "m_et", "m_gb", "m_xgb", "m_rf", "m_enet"]
    for attr in sub_model_attrs:
        if hasattr(model, attr):
            sub_model = getattr(model, attr)
            p = sub_model.predict(X_df)
            predictions.append(to_cases(float(p[0])))

    base_pred = max(0.0, float(model.predict(X_df)[0]))

    # Jika model RandomForest biasa, gunakan prediksi per pohon
    if hasattr(model, "estimators_") and not predictions:
        tree_preds = np.array([to_cases(float(tree.predict(X_df)[0])) for tree in model.estimators_])
        return _bracket(base_pred, np.percentile(tree_preds, 10), np.percentile(tree_preds, 90))

    if len(predictions) >= 2:
        return _bracket(
            base_pred,
            np.percentile(predictions, 10),
            np.percentile(predictions, 90),
        )

    # Fallback jika model tunggal
    return _bracket(base_pred, base_pred * 0.7, base_pred * 1.3)


def _bracket(point: float, lower: float, upper: float) -> Tuple[int, int]:
    """Membulatkan interval sambil memastikan prediksi titik ada di dalamnya."""
    point_int = int(round(max(0.0, point)))
    lower_int = min(point_int, max(0, int(round(min(lower, upper)))))
    upper_int = max(point_int, int(round(max(lower, upper))))
    return lower_int, upper_int


def reload_models():
    """Clear cache sehingga model di-load ulang saat request berikutnya."""
    _model_cache.clear()
    _data_cache.clear()
    _metadata_cache.clear()
    logger.info("Model cache cleared — will reload on next request.")
