import json
from fastapi import APIRouter, HTTPException, Query
from app.schemas.response import BacktestResponse, BacktestMetrics, BacktestWeeklyResult

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import MODELS_DIR, DATASET_CLEAN_DIR, DISEASE_CONFIG, FEATURE_COLUMNS, TARGET_COLUMN

import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from app.services.risk_classifier import classify_risk, calculate_risk_score, assess_data_coverage

router = APIRouter()


@router.get("", response_model=BacktestResponse)
@router.get("/", response_model=BacktestResponse)
async def backtest(disease: str = Query(..., description="Nama penyakit: DBD atau ISPA")):
    """Endpoint backtesting — evaluasi model pada data test historis.

    Digunakan oleh halaman /model (transparansi model, PRD section 5.7).
    """
    disease_lower = disease.lower()
    if disease_lower not in DISEASE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Disease '{disease}' not supported.")

    cfg = DISEASE_CONFIG[disease_lower]

    # Load metadata
    meta_path = MODELS_DIR / "metadata.json"
    if not meta_path.exists():
        raise HTTPException(status_code=503, detail="metadata.json not found. Train model first.")

    with open(meta_path, "r") as f:
        metadata = json.load(f)

    model_meta = metadata.get(disease_lower)
    if not model_meta:
        raise HTTPException(status_code=503, detail=f"No metadata for disease '{disease}'.")

    # Load model
    model_path = MODELS_DIR / cfg["model_file"]
    if not model_path.exists():
        raise HTTPException(status_code=503, detail=f"Model file not found: {cfg['model_file']}")

    model = joblib.load(model_path)

    # Load features dataset
    feature_path = DATASET_CLEAN_DIR / cfg["feature_file"]
    if not feature_path.exists():
        raise HTTPException(status_code=503, detail=f"Features file not found: {cfg['feature_file']}")

    df = pd.read_csv(feature_path)
    df["month_start"] = pd.to_datetime(df["month_start"])

    split_date = cfg["split_date"]
    test_df = df[df["month_start"] >= split_date].copy()

    if test_df.empty:
        raise HTTPException(status_code=404, detail=f"No test data after {split_date}.")

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN]

    # Predict
    y_pred = model.predict(X_test)
    if cfg.get("log_transform", False):
        # Model sudah menangani expm1 di dalam predict() (ensemble class)
        pass
    y_pred = np.clip(y_pred, 0, None)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = r2_score(y_test, y_pred)

    # Build monthly results (aggregate per month across all kecamatan)
    test_df = test_df.copy()
    test_df["predicted"] = y_pred

    monthly_agg = test_df.groupby("month_start").agg(
        actual=("cases", "sum"),
        predicted=("predicted", "sum"),
    ).reset_index()

    historical_cases = df["cases"].values.tolist()
    monthly_results = []
    for _, row in monthly_agg.iterrows():
        actual_score = calculate_risk_score(row["actual"], historical_cases)
        pred_score = calculate_risk_score(row["predicted"], historical_cases)
        monthly_results.append(
            BacktestWeeklyResult(
                month_start=row["month_start"].strftime("%Y-%m-%d"),
                actual=int(row["actual"]),
                predicted=int(round(row["predicted"])),
                risk_class_actual=classify_risk(actual_score),
                risk_class_predicted=classify_risk(pred_score),
            )
        )

    # Coverage per kecamatan
    total_expected = df["month_start"].nunique()
    coverage_dict = {}
    for kec_id in df["kecamatan_id"].unique():
        coverage_dict[kec_id] = assess_data_coverage(kec_id, disease.upper(), df, total_expected)

    return BacktestResponse(
        disease=disease.upper(),
        model_version=model_meta.get("version", "unknown"),
        algorithm=model_meta.get("algorithm"),
        trained_at=model_meta.get("trained_at"),
        train_period=model_meta.get("train_period", "unknown"),
        test_period=model_meta.get("test_period", "unknown"),
        metrics=BacktestMetrics(mae=round(mae, 4), rmse=round(rmse, 4), r2=round(r2, 4)),
        monthly_results=monthly_results,
        citizen_signal_comparison=None,  # Fase 2
        coverage_per_kecamatan=coverage_dict,
    )
