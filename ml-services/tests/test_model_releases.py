"""A retrain must publish only a complete, validated release."""
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import joblib
import numpy as np
import pandas as pd
import pytest

from app.routes import retrain as retrain_module
from app.services import model_releases, predictor
from config import FEATURE_COLUMNS


class FixedModel:
    def predict(self, rows):
        return np.full(len(rows), 2.0)


def test_retrain_keeps_old_release_until_validated(tmp_path, monkeypatch):
    monkeypatch.setattr(model_releases, "MODELS_DIR", tmp_path / "models")
    monkeypatch.setattr(model_releases, "DATASET_CLEAN_DIR", tmp_path / "features")
    model_releases.MODELS_DIR.mkdir()
    model_releases.DATASET_CLEAN_DIR.mkdir()
    cfg = model_releases.DISEASE_CONFIG["dbd"]
    joblib.dump(FixedModel(), model_releases.MODELS_DIR / cfg["model_file"])
    (model_releases.MODELS_DIR / "metadata.json").write_text(
        json.dumps({"dbd": {"version": "old"}}), encoding="utf-8"
    )
    pd.DataFrame([{**{column: 1 for column in FEATURE_COLUMNS},
                   "kecamatan_id": "33.74.01", "month_start": "2025-01-01"}]).to_csv(
        model_releases.DATASET_CLEAN_DIR / cfg["feature_file"], index=False
    )
    monkeypatch.setattr(retrain_module, "activate_release", predictor.activate_release)
    import features.build_features as feature_module
    import training.train_dbd as training_module

    training_started = Event()
    allow_completion = Event()

    def fake_features(*, disease, output_path):
        pd.read_csv(model_releases.DATASET_CLEAN_DIR / cfg["feature_file"]).to_csv(output_path, index=False)
        return True

    def fake_train(**kwargs):
        training_started.set()
        assert allow_completion.wait(5)
        joblib.dump(FixedModel(), kwargs["model_output_path"])
        return FixedModel(), {"version": "new", "metrics": {"mae": 1}}

    monkeypatch.setattr(feature_module, "build_features", fake_features)
    monkeypatch.setattr(training_module, "train_dbd_model", fake_train)
    predictor.reload_models()

    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(retrain_module._train_and_publish, "dbd", None, None)
        assert training_started.wait(5)
        assert predictor._load_bundle("dbd")[2]["version"] == "old"
        allow_completion.set()
        assert future.result(timeout=5)["version"] == "new"

    assert predictor._load_bundle("dbd")[2]["version"] == "new"


def test_invalid_release_never_replaces_pointer(tmp_path, monkeypatch):
    monkeypatch.setattr(model_releases, "MODELS_DIR", tmp_path)
    import features.build_features as feature_module
    import training.train_dbd as training_module

    monkeypatch.setattr(feature_module, "build_features", lambda **kwargs: True)
    monkeypatch.setattr(training_module, "train_dbd_model", lambda **kwargs: None)

    with pytest.raises(RuntimeError, match="Pelatihan model gagal"):
        retrain_module._train_and_publish("dbd", None, None)

    assert not model_releases.pointer_path("dbd").exists()
