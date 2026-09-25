"""Pilih bobot ensemble hanya dari periode latih sebelum holdout akhir."""
from math import ceil

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from config import FEATURE_COLUMNS, TARGET_COLUMN


def fit_with_train_only_weights(model_class, train_df: pd.DataFrame,
                                log_transform: bool):
    """Validasi pada ekor waktu train, lalu fit ulang pada seluruh train."""
    months = np.sort(pd.to_datetime(train_df["month_start"]).unique())
    if len(months) < 3:
        raise ValueError("Minimal tiga bulan latih diperlukan untuk memilih bobot.")
    validation_months = min(max(1, ceil(len(months) * 0.2)), len(months) - 2)
    split = months[-validation_months]
    early = train_df[train_df["month_start"] < split]
    validation = train_df[train_df["month_start"] >= split]

    target = early[TARGET_COLUMN]
    if log_transform:
        target = np.log1p(target)
    candidate = model_class().fit(early[FEATURE_COLUMNS], target)
    components = candidate.predict_components(validation[FEATURE_COLUMNS])
    truth = validation[TARGET_COLUMN].to_numpy(dtype=float)
    count = components.shape[1]
    initial = np.full(count, 1.0 / count)

    def loss(weights):
        predicted = np.clip(components @ weights, 0, None)
        return float(np.mean((truth - predicted) ** 2))

    result = minimize(
        loss, initial, method="SLSQP",
        bounds=[(0.05, 1.0)] * count,
        constraints=[{"type": "eq", "fun": lambda weights: weights.sum() - 1.0}],
    )
    # Pada blok awal ISPA yang sangat pendek, SLSQP kadang tak menemukan arah
    # perbaikan numerik. Bobot sama besar adalah pilihan tetap yang tidak
    # melihat holdout akhir dan menjaga kalibrasi tetap dapat dihitung.
    weights = np.asarray(result.x if result.success else initial, dtype=float)
    weights = weights / weights.sum()
    full_target = train_df[TARGET_COLUMN]
    if log_transform:
        full_target = np.log1p(full_target)
    model = model_class(weights=weights).fit(train_df[FEATURE_COLUMNS], full_target)
    model.weight_validation_period = (
        f"{pd.Timestamp(split):%Y-%m-%d} to {pd.Timestamp(months[-1]):%Y-%m-%d}"
    )
    return model
