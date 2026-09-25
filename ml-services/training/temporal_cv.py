"""Lipatan validasi maju yang memisahkan seluruh kecamatan per bulan."""
import numpy as np
import pandas as pd


def expanding_month_splits(df: pd.DataFrame, n_splits: int = 5,
                           min_train_months: int = 6) -> list[tuple[np.ndarray, np.ndarray]]:
    months = np.sort(pd.to_datetime(df["month_start"]).unique())
    if len(months) <= min_train_months:
        raise ValueError("Jumlah bulan tidak cukup untuk validasi temporal.")
    n_splits = min(n_splits, len(months) - min_train_months)
    if n_splits < 1:
        raise ValueError("Minimal satu lipatan validasi diperlukan.")

    dates = pd.to_datetime(df["month_start"]).to_numpy()
    splits = []
    for block in np.array_split(months[min_train_months:], n_splits):
        train_idx = np.flatnonzero(dates < block[0])
        valid_idx = np.flatnonzero(np.isin(dates, block))
        splits.append((train_idx, valid_idx))
    return splits
