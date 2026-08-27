import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
import config
from config import (
    DATASET_CLEAN_DIR,
    DISEASE_CONFIG,
    FEATURE_COLUMNS,
    MODELS_DIR,
    TARGET_COLUMN,
)
from training.ensemble import LeptospirosisEnsembleModel

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def train_leptospirosis_model(split_date: str = "2025-01-01"):
    """Train Leptospirosis Monthly Model using Ensemble Blending."""
    logger.info("Starting Leptospirosis Model Training (Ensemble Blending)...")

    cfg = DISEASE_CONFIG["leptospirosis"]
    feature_file = DATASET_CLEAN_DIR / cfg["feature_file"]
    if not feature_file.exists():
        logger.error(f"Feature dataset not found: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df["month_start"] = pd.to_datetime(df["month_start"])

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    y_log = np.log1p(y)

    model = LeptospirosisEnsembleModel()
    model.fit(X, y_log)

    y_pred = model.predict(X)
    y_pred_clipped = np.clip(y_pred, 0, None)

    mae = mean_absolute_error(y, y_pred_clipped)
    rmse = np.sqrt(mean_squared_error(y, y_pred_clipped))
    r2 = r2_score(y, y_pred_clipped)

    logger.info("Evaluation Results for Leptospirosis Ensemble Model:")
    logger.info(f"  - MAE : {mae:.4f} cases/month")
    logger.info(f"  - RMSE: {rmse:.4f}")
    logger.info(f"  - R²  : {r2:.4f}")

    version_str = f"ensemble-monthly-leptospirosis-{datetime.now().strftime('%Y.%m.%d')}"
    model_path = MODELS_DIR / cfg["model_file"]
    joblib.dump(model, model_path)
    logger.info(f"Model saved to: {model_path}")

    importances = model.feature_importances_
    feat_importance_df = (
        pd.DataFrame({"feature": FEATURE_COLUMNS, "importance": importances})
        .sort_values(by="importance", ascending=False)
        .reset_index(drop=True)
    )

    metadata_path = MODELS_DIR / "metadata.json"
    metadata = {}
    if metadata_path.exists():
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
        except Exception:
            metadata = {}

    metadata["leptospirosis"] = {
        "algorithm": "ensemble_rf_et_xgb_ridge",
        "version": version_str,
        "granularity": "monthly",
        "is_log_transformed": True,
        "trained_at": datetime.now().isoformat(),
        "n_train_samples": len(df),
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
            "r2": round(float(r2), 4),
        },
        "top_features": feat_importance_df.head(5).to_dict(orient="records"),
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata updated: {metadata_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Leptospirosis Model (Monthly Ensemble)")
    parser.add_argument(
        "--split-date",
        type=str,
        default="2025-01-01",
        help="Date to split train and test set (YYYY-MM-DD)",
    )
    args = parser.parse_args()
    train_leptospirosis_model(split_date=args.split_date)
