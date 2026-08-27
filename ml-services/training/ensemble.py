import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import ElasticNet, Ridge
from xgboost import XGBRegressor


class DBDEnsembleModel:
    """Ensemble Blending Model combining Ridge + ExtraTrees + GradientBoosting + XGBoost for DBD."""

    def __init__(self):
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
        self.feature_importances_ = None

    def fit(self, X, y_log):
        self.m_ridge.fit(X, y_log)
        self.m_et.fit(X, y_log)
        self.m_gb.fit(X, y_log)
        self.m_xgb.fit(X, y_log)
        self.feature_importances_ = (
            0.37 * self.m_et.feature_importances_ +
            0.10 * self.m_gb.feature_importances_ +
            0.10 * self.m_xgb.feature_importances_
        )
        return self

    def predict(self, X):
        p_ridge = np.expm1(self.m_ridge.predict(X))
        p_et = np.expm1(self.m_et.predict(X))
        p_gb = np.expm1(self.m_gb.predict(X))
        p_xgb = np.expm1(self.m_xgb.predict(X))

        # Blending Weights: 43% Ridge, 37% ExtraTrees, 10% GB, 10% XGBoost
        p_blend = 0.43 * p_ridge + 0.37 * p_et + 0.10 * p_gb + 0.10 * p_xgb
        return np.clip(p_blend, 0, None)


class ISPAEnsembleModel:
    """Ensemble Blending Model combining RandomForest + XGBoost + ElasticNet for ISPA."""

    def __init__(self):
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
        self.m_enet = ElasticNet(
            alpha=0.5,
            l1_ratio=0.7,
            random_state=42
        )
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

        # Blending Weights: 53% RandomForest, 34% XGBoost, 13% ElasticNet
        p_blend = 0.53 * p_rf + 0.34 * p_xgb + 0.13 * p_enet
        return np.clip(p_blend, 0, None)


class LeptospirosisEnsembleModel:
    """Ensemble Blending Model combining RandomForest + ExtraTrees + XGBoost + Ridge for Leptospirosis."""

    def __init__(self):
        self.m_rf = RandomForestRegressor(n_estimators=200, max_depth=4, min_samples_leaf=3, random_state=42, n_jobs=-1)
        self.m_et = ExtraTreesRegressor(n_estimators=200, max_depth=4, min_samples_leaf=3, random_state=42)
        self.m_xgb = XGBRegressor(n_estimators=100, max_depth=2, learning_rate=0.03, random_state=42)
        self.m_ridge = Ridge(alpha=5.0, random_state=42)
        self.feature_importances_ = None

    def fit(self, X, y_log):
        self.m_rf.fit(X, y_log)
        self.m_et.fit(X, y_log)
        self.m_xgb.fit(X, y_log)
        self.m_ridge.fit(X, y_log)
        self.feature_importances_ = (
            0.40 * self.m_rf.feature_importances_ +
            0.35 * self.m_et.feature_importances_ +
            0.25 * self.m_xgb.feature_importances_
        )
        return self

    def predict(self, X):
        p_rf = np.expm1(self.m_rf.predict(X))
        p_et = np.expm1(self.m_et.predict(X))
        p_xgb = np.expm1(self.m_xgb.predict(X))
        p_ridge = np.expm1(self.m_ridge.predict(X))

        # Blending Weights: 40% RandomForest, 35% ExtraTrees, 15% XGBoost, 10% Ridge
        p_blend = 0.40 * p_rf + 0.35 * p_et + 0.15 * p_xgb + 0.10 * p_ridge
        return np.clip(p_blend, 0, None)
