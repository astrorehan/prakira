import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

# Kompatibilitas unpickle scikit-learn: model yang dilatih pada scikit-learn 1.7.x
# menyimpan objek loss Cython (CyHalfSquaredError) dengan modul internal '_loss'.
# Mendaftarkan '_loss' ke sys.modules memastikan joblib.load tidak gagal dengan
# ModuleNotFoundError: No module named '_loss'.
try:
    import sklearn._loss._loss as _sklearn_loss_loss
    sys.modules.setdefault("_loss", _sklearn_loss_loss)
except (ImportError, AttributeError):
    pass


def _tree_importances(*components):
    """Rata-rata importance komponen pohon, dinormalisasi ke bobot pohon saja.

    Model linear tidak punya `feature_importances_` yang sebanding dengan
    importance pohon; hasil ini tidak mewakili seluruh ensemble.
    """
    weights = np.asarray([weight for weight, _ in components], dtype=float)
    values = [model.feature_importances_ for _, model in components]
    return np.average(values, axis=0, weights=weights)


class DBDEnsembleModel:
    """Ensemble Blending Model combining Ridge + ExtraTrees + GradientBoosting + XGBoost for DBD."""

    def __init__(self, weights=None):
        self.blend_weights = tuple(weights) if weights is not None else (0.25, 0.25, 0.25, 0.25)
        self.m_ridge = Ridge(
            alpha=20.0,
            random_state=42
        )
        self.m_et = ExtraTreesRegressor(
            n_estimators=200,
            max_depth=10,
            min_samples_leaf=3,
            random_state=42
        )
        self.m_gb = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42
        )
        self.m_xgb = XGBRegressor(
            n_estimators=250,
            max_depth=4,
            learning_rate=0.1,
            min_child_weight=1,
            subsample=0.8,
            colsample_bytree=0.7,
            reg_alpha=5,
            reg_lambda=5,
            random_state=42
        )

    def fit(self, X, y_log):
        self.m_ridge.fit(X, y_log)
        self.m_et.fit(X, y_log)
        self.m_gb.fit(X, y_log)
        self.m_xgb.fit(X, y_log)
        return self

    @property
    def feature_importances_(self):
        weights = getattr(self, "blend_weights", (0.43, 0.37, 0.10, 0.10))
        return _tree_importances(
            (weights[1], self.m_et), (weights[2], self.m_gb), (weights[3], self.m_xgb)
        )

    def predict_components(self, X):
        p_ridge = np.expm1(self.m_ridge.predict(X))
        p_et = np.expm1(self.m_et.predict(X))
        p_gb = np.expm1(self.m_gb.predict(X))
        p_xgb = np.expm1(self.m_xgb.predict(X))
        return np.column_stack((p_ridge, p_et, p_gb, p_xgb))

    def predict(self, X):
        weights = getattr(self, "blend_weights", (0.43, 0.37, 0.10, 0.10))
        p_blend = self.predict_components(X) @ np.asarray(weights)
        return np.clip(p_blend, 0, None)


class ISPAEnsembleModel:
    """Ensemble Blending Model combining RandomForest + XGBoost + ElasticNet for ISPA."""

    def __init__(self, weights=None):
        self.blend_weights = tuple(weights) if weights is not None else (1 / 3, 1 / 3, 1 / 3)
        self.m_rf = RandomForestRegressor(
            n_estimators=300,
            max_depth=6,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        )
        self.m_xgb = XGBRegressor(
            n_estimators=150,
            max_depth=3,
            learning_rate=0.05,
            min_child_weight=5,
            random_state=42
        )
        self.m_enet = make_pipeline(
            StandardScaler(),
            ElasticNet(
                alpha=0.5,
                l1_ratio=0.7,
                max_iter=10000,
                random_state=42,
            ),
        )

    def fit(self, X, y):
        self.m_rf.fit(X, y)
        self.m_xgb.fit(X, y)
        self.m_enet.fit(X, y)
        return self

    @property
    def feature_importances_(self):
        weights = getattr(self, "blend_weights", (0.53, 0.34, 0.13))
        return _tree_importances((weights[0], self.m_rf), (weights[1], self.m_xgb))

    def predict_components(self, X):
        p_rf = np.clip(self.m_rf.predict(X), 0, None)
        p_xgb = np.clip(self.m_xgb.predict(X), 0, None)
        p_enet = np.clip(self.m_enet.predict(X), 0, None)
        return np.column_stack((p_rf, p_xgb, p_enet))

    def predict(self, X):
        weights = getattr(self, "blend_weights", (0.53, 0.34, 0.13))
        p_blend = self.predict_components(X) @ np.asarray(weights)
        return np.clip(p_blend, 0, None)


class LeptospirosisEnsembleModel:
    """Ensemble Blending Model combining RandomForest + ExtraTrees + XGBoost + Ridge for Leptospirosis."""

    def __init__(self):
        self.m_rf = RandomForestRegressor(n_estimators=200, max_depth=4, min_samples_leaf=3, random_state=42, n_jobs=-1)
        self.m_et = ExtraTreesRegressor(n_estimators=200, max_depth=4, min_samples_leaf=3, random_state=42)
        self.m_xgb = XGBRegressor(n_estimators=100, max_depth=2, learning_rate=0.03, random_state=42)
        self.m_ridge = Ridge(alpha=5.0, random_state=42)

    def fit(self, X, y_log):
        self.m_rf.fit(X, y_log)
        self.m_et.fit(X, y_log)
        self.m_xgb.fit(X, y_log)
        self.m_ridge.fit(X, y_log)
        return self

    @property
    def feature_importances_(self):
        return _tree_importances(
            (0.40, self.m_rf), (0.35, self.m_et), (0.15, self.m_xgb)
        )

    def predict(self, X):
        p_rf = np.expm1(self.m_rf.predict(X))
        p_et = np.expm1(self.m_et.predict(X))
        p_xgb = np.expm1(self.m_xgb.predict(X))
        p_ridge = np.expm1(self.m_ridge.predict(X))

        # Blending Weights: 40% RandomForest, 35% ExtraTrees, 15% XGBoost, 10% Ridge
        p_blend = 0.40 * p_rf + 0.35 * p_et + 0.15 * p_xgb + 0.10 * p_ridge
        return np.clip(p_blend, 0, None)
