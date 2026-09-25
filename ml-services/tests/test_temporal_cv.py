import pandas as pd

from training.temporal_cv import expanding_month_splits


def test_month_folds_never_share_calendar_month_between_train_and_validation():
    df = pd.DataFrame({
        "month_start": list(pd.date_range("2024-01-01", periods=8, freq="MS")) * 2,
        "kecamatan_id": ["a"] * 8 + ["b"] * 8,
    })
    folds = expanding_month_splits(df, n_splits=3, min_train_months=3)
    assert len(folds) == 3
    for train_idx, valid_idx in folds:
        train_months = set(df.iloc[train_idx]["month_start"])
        valid_months = set(df.iloc[valid_idx]["month_start"])
        assert train_months.isdisjoint(valid_months)
        assert max(train_months) < min(valid_months)
        assert set(df.iloc[valid_idx]["kecamatan_id"]) == {"a", "b"}
