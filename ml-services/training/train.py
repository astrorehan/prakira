import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

# Add parent directory to sys.path to import config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import (
    DATASET_CLEAN_DIR,
    FEATURE_COLUMNS,
    FEATURE_COLUMNS_MONTHLY_DBD,
    MODELS_DIR,
    TARGET_COLUMN,
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DBDEnsembleModel:
    """Ensemble Blending Model combining Ridge + ExtraTrees + GradientBoosting + XGBoost for DBD."""

    def __init__(self):
        self.m_ridge = Ridge(alpha=15.0, random_state=42)
        self.m_et = ExtraTreesRegressor(n_estimators=200, max_depth=6, min_samples_leaf=3, random_state=42)
        self.m_gb = GradientBoostingRegressor(n_estimators=150, learning_rate=0.03, max_depth=3, random_state=42)
        self.m_xgb = XGBRegressor(learning_rate=0.03, n_estimators=200, max_depth=3, min_child_weight=3, random_state=42)
        self.feature_importances_ = None

    def fit(self, X, y_log):
        self.m_ridge.fit(X, y_log)
        self.m_et.fit(X, y_log)
        self.m_gb.fit(X, y_log)
        self.m_xgb.fit(X, y_log)
        self.feature_importances_ = (self.m_et.feature_importances_ + self.m_gb.feature_importances_ + self.m_xgb.feature_importances_) / 3.0
        return self

    def predict(self, X):
        p_ridge = np.expm1(self.m_ridge.predict(X))
        p_et = np.expm1(self.m_et.predict(X))
        p_gb = np.expm1(self.m_gb.predict(X))
        p_xgb = np.expm1(self.m_xgb.predict(X))

        p_blend = 0.45 * p_ridge + 0.25 * p_et + 0.15 * p_gb + 0.15 * p_xgb
        return np.clip(p_blend, 0, None)


class ISPAEnsembleModel:
    """Ensemble Blending Model combining RandomForest + XGBoost + ElasticNet for ISPA."""

    def __init__(self):
        self.m_rf = RandomForestRegressor(n_estimators=300, max_depth=10, min_samples_leaf=1, random_state=42, n_jobs=-1)
        self.m_xgb = XGBRegressor(learning_rate=0.05, n_estimators=200, max_depth=4, min_child_weight=7, subsample=0.8, colsample_bytree=0.9, reg_alpha=10, reg_lambda=5, random_state=42)
        self.m_enet = ElasticNet(alpha=0.2, l1_ratio=0.5, random_state=42)
        self.feature_importances_ = None

    def fit(self, X, y):
        self.m_rf.fit(X, y)
        self.m_xgb.fit(X, y)
        self.m_enet.fit(X, y)
        self.feature_importances_ = 0.60 * self.m_rf.feature_importances_ + 0.40 * self.m_xgb.feature_importances_
        return self

    def predict(self, X):
        p_rf = np.clip(self.m_rf.predict(X), 0, None)
        p_xgb = np.clip(self.m_xgb.predict(X), 0, None)
        p_enet = np.clip(self.m_enet.predict(X), 0, None)

        p_blend = 0.50 * p_rf + 0.35 * p_xgb + 0.15 * p_enet
        return np.clip(p_blend, 0, None)


def train_dbd_model(split_date: str = "2025-01-01"):
    """Train DBD Monthly Model using Ensemble Blending."""
    logger.info("Starting DBD Model Training (Ensemble Blending)...")

    feature_file = DATASET_CLEAN_DIR / "features_dbd_monthly.csv"
    if not feature_file.exists():
        logger.error(f"Feature dataset not found: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df["month_start"] = pd.to_datetime(df["month_start"])

    train_mask = df["month_start"] < split_date
    test_mask = df["month_start"] >= split_date

    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()

    X_train, y_train = train_df[FEATURE_COLUMNS_MONTHLY_DBD], train_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS_MONTHLY_DBD], test_df[TARGET_COLUMN]

    y_train_log = np.log1p(y_train)

    model = DBDEnsembleModel()
    model.fit(X_train, y_train_log)

    y_pred = model.predict(X_test)
    y_pred_clipped = np.clip(y_pred, 0, None)

    mae = mean_absolute_error(y_test, y_pred_clipped)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred_clipped))
    r2 = r2_score(y_test, y_pred_clipped)

    logger.info("Evaluation Results for DBD Ensemble Model:")
    logger.info(f"  - MAE : {mae:.4f} cases/month")
    logger.info(f"  - RMSE: {rmse:.4f}")
    logger.info(f"  - R²  : {r2:.4f}")

    version_str = f"ensemble-monthly-dbd-{datetime.now().strftime('%Y.%m.%d')}"
    model_path = MODELS_DIR / "model_dbd.pkl"
    joblib.dump(model, model_path)
    logger.info(f"Model saved to: {model_path}")

    # Update metadata
    importances = model.feature_importances_
    feat_importance_df = (
        pd.DataFrame({"feature": FEATURE_COLUMNS_MONTHLY_DBD, "importance": importances})
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

    metadata["dbd"] = {
        "algorithm": "ensemble_ridge_trees_xgboost",
        "version": version_str,
        "granularity": "monthly",
        "is_log_transformed": True,
        "trained_at": datetime.now().isoformat(),
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

    return model, metadata["dbd"]


def train_ispa_model(split_date: str = "2025-10-01"):
    """Train ISPA Weekly Model using Ensemble Blending."""
    logger.info("Starting ISPA Model Training (Ensemble Blending)...")

    feature_file = DATASET_CLEAN_DIR / "features_ispa.csv"
    if not feature_file.exists():
        logger.error(f"Feature dataset not found: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df["week_start"] = pd.to_datetime(df["week_start"])

    train_mask = df["week_start"] < split_date
    test_mask = df["week_start"] >= split_date

    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

    model = ISPAEnsembleModel()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred_clipped = np.clip(y_pred, 0, None)

    mae = mean_absolute_error(y_test, y_pred_clipped)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred_clipped))
    r2 = r2_score(y_test, y_pred_clipped)

    logger.info("Evaluation Results for ISPA Ensemble Model:")
    logger.info(f"  - MAE : {mae:.4f} cases/week")
    logger.info(f"  - RMSE: {rmse:.4f}")
    logger.info(f"  - R²  : {r2:.4f}")

    version_str = f"ensemble-weekly-ispa-{datetime.now().strftime('%Y.%m.%d')}"
    model_path = MODELS_DIR / "model_ispa.pkl"
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

    metadata["ispa"] = {
        "algorithm": "ensemble_rf_xgboost_elasticnet",
        "version": version_str,
        "granularity": "weekly",
        "trained_at": datetime.now().isoformat(),
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

    return model, metadata["ispa"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ML Models for PRAKIRA")
    parser.add_argument("--disease", type=str, default="all", help="dbd, ispa, or all")
    args = parser.parse_args()

    if args.disease in ["dbd", "all"]:
        train_dbd_model()
    if args.disease in ["ispa", "all"]:
        train_ispa_model()
