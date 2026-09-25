"""Rentang satu langkah tidak boleh dipakai untuk rantai rekursif."""
import numpy as np
import pandas as pd

from app.services import predictor


class FixedModel:
    def predict(self, X):
        return np.full(len(X), 2.0)


def test_single_step_keeps_interval_but_recursive_step_does_not(monkeypatch):
    history = pd.DataFrame([{
        "kecamatan_id": "33.74.01",
        "month_start": "2025-12-01",
        "cases": 2,
    }])
    monkeypatch.setattr(predictor, "_load_model", lambda disease: (FixedModel(), history))
    monkeypatch.setattr(predictor, "_load_metadata", lambda: {
        "dbd": {"version": "test", "conformal": {
            "method": "one_step", "target_coverage": 0.8,
            "empirical_coverage": 0.9,
        }}
    })
    monkeypatch.setattr(predictor, "assess_data_coverage", lambda *args: "high")
    monkeypatch.setattr(
        predictor, "build_feature_row", lambda *args, **kwargs: pd.DataFrame([{"x": 1}])
    )
    calls = []
    def estimate(*args):
        calls.append(1)
        return (1, 3)
    monkeypatch.setattr(predictor, "_estimate_confidence", estimate)

    one = predictor.predict_single("33.74.01", "DBD", "2026-01-01")
    two = predictor.predict_single("33.74.01", "DBD", "2026-02-01")

    assert (one["lower_bound"], one["upper_bound"]) == (1, 3)
    assert one["interval_target_coverage"] == 0.8
    assert (two["lower_bound"], two["upper_bound"]) == (None, None)
    assert two["interval_method"] == "unavailable_multistep"
    assert "interval_target_coverage" not in two
    assert two["model_version"] == "test"
    assert calls == [1]
