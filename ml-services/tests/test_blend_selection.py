import numpy as np
import pandas as pd

from config import FEATURE_COLUMNS, TARGET_COLUMN
from training.blend_selection import fit_with_train_only_weights


class DummyEnsemble:
    fits = []

    def __init__(self, weights=None):
        self.blend_weights = weights

    def fit(self, X, y):
        self.fits.append(len(X))
        return self

    def predict_components(self, X):
        return np.column_stack((np.ones(len(X)), np.full(len(X), 2.0)))


def test_blend_weights_use_earlier_training_months_then_refit_full_train():
    DummyEnsemble.fits = []
    df = pd.DataFrame({name: np.ones(10) for name in FEATURE_COLUMNS})
    df["month_start"] = pd.date_range("2024-01-01", periods=10, freq="MS")
    df[TARGET_COLUMN] = np.full(10, 2.0)

    model = fit_with_train_only_weights(DummyEnsemble, df, log_transform=False)

    assert DummyEnsemble.fits == [8, 10]
    assert model.weight_validation_period == "2024-09-01 to 2024-10-01"
    assert np.isclose(sum(model.blend_weights), 1.0)
