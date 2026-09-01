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
from config import (
    DATASET_CLEAN_DIR,
    DISEASE_CONFIG,
    FEATURE_COLUMNS,
    MODELS_DIR,
    TARGET_COLUMN,
)
from training.ensemble import DBDEnsembleModel
from training.baselines import compute_baselines, summarise
from training.conformal import calibrate as calibrate_conformal

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def train_dbd_model(split_date: str = "2025-01-01"):
    """Train DBD Monthly Model using Ensemble Blending."""
    logger.info("Starting DBD Model Training (Ensemble Blending)...")

    cfg = DISEASE_CONFIG["dbd"]
    feature_file = DATASET_CLEAN_DIR / cfg["feature_file"]
    if not feature_file.exists():
        logger.error(f"Feature dataset not found: {feature_file}")
        return

    df = pd.read_csv(feature_file)
    df["month_start"] = pd.to_datetime(df["month_start"])

    train_mask = df["month_start"] < split_date
    test_mask = df["month_start"] >= split_date

    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

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

    # Dua pemeriksaan yang tidak bisa dijawab oleh MAE sendirian, keduanya di
    # periode uji yang sama persis.
    #
    # `baselines` menjawab "apakah model ini lebih baik daripada tidak
    # memodelkan sama sekali" — pertanyaan yang paling mungkin diajukan dan
    # paling merugikan bila tidak disiapkan jawabannya.
    #
    # `conformal` menjawab "seberapa sering kenyataan benar-benar jatuh di
    # dalam rentang yang kami tampilkan" — angka yang sebelumnya tidak pernah
    # ada, karena rentangnya dihitung dari ketidaksepakatan antar sub-model,
    # bukan dari galat yang teramati.
    baselines = compute_baselines(train_df, test_df)
    baseline_summary = summarise({"mae": float(mae)}, baselines)
    logger.info(
        "Pembanding terbaik: %s (MAE %.4f) — model %s",
        baseline_summary["best_baseline_label"],
        baseline_summary["best_baseline_mae"],
        "unggul" if baseline_summary["model_beats_all_baselines"] else "KALAH",
    )

    def _fit_predict(subset, X_eval):
        """Melatih ulang jenis model yang sama pada bagian awal periode latih."""
        calib_model = DBDEnsembleModel()
        calib_model.fit(subset[FEATURE_COLUMNS], np.log1p(subset[TARGET_COLUMN]))
        return calib_model.predict(X_eval)

    conformal = calibrate_conformal(_fit_predict, train_df, test_df, y_pred_clipped)
    logger.info(
        "Interval konformal: target %.0f%%, tercapai %.1f%% pada periode uji "
        "(lebar median %.2f kasus, n kalibrasi %d)",
        conformal["target_coverage"] * 100,
        conformal["empirical_coverage"] * 100,
        conformal["median_width"],
        conformal["n_calibration"],
    )

    version_str = f"ensemble-monthly-dbd-{datetime.now().strftime('%Y.%m.%d')}"
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

    # Periode latih/uji dicatat dari data yang benar-benar dipakai, bukan dari
    # konstanta: halaman transparansi model menampilkannya apa adanya, dan
    # "unknown" di sana adalah lubang yang hanya bisa ditutup di sini.
    metadata["dbd"] = {
        "algorithm": "ensemble_ridge_trees_xgboost",
        "version": version_str,
        "granularity": "monthly",
        "is_log_transformed": True,
        "trained_at": datetime.now().isoformat(),
        "train_period": (
            f"{train_df['month_start'].min():%Y-%m-%d} to {train_df['month_start'].max():%Y-%m-%d}"
        ),
        "test_period": (
            f"{test_df['month_start'].min():%Y-%m-%d} to {test_df['month_start'].max():%Y-%m-%d}"
        ),
        "n_train_samples": int(len(train_df)),
        "n_test_samples": int(len(test_df)),
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
            "r2": round(float(r2), 4),
        },
        "baselines": baselines,
        "baseline_summary": baseline_summary,
        "conformal": conformal,
        "top_features": feat_importance_df.head(5).to_dict(orient="records"),
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata updated: {metadata_path}")

    return model, metadata["dbd"]


if __name__ == "__main__":
    train_dbd_model()
