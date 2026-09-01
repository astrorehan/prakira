"""Kunci untuk metrik yang dipajang `/model`.

PRD §7-H5 mewajibkan halaman transparansi menampilkan metrik apa adanya.
Syarat diam-diam di balik itu: metrik yang ditampilkan harus benar-benar
berasal dari periode uji yang ditahan — bukan dari baris yang ikut dilatih.

`train_leptospirosis.py` pernah menerima argumen `split_date` lalu tidak
memakainya sama sekali: model di-fit pada seluruh dataset, lalu MAE-nya diukur
pada baris yang sama. Angka in-sample itu masuk ke `metadata.json` berdampingan
dengan angka uji DBD dan ISPA seolah sebanding. Tes di berkas ini memastikan
setiap penyakit membawa jejak pemisahan latih/uji yang nyata.
"""
import json

import pandas as pd
import pytest

from config import DATASET_CLEAN_DIR, DISEASE_CONFIG, MODELS_DIR

DISEASES = sorted(DISEASE_CONFIG)


@pytest.fixture(scope="module")
def metadata():
    path = MODELS_DIR / "metadata.json"
    if not path.exists():
        pytest.skip("metadata.json belum ada — latih model terlebih dahulu.")
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize("disease", DISEASES)
def test_metadata_records_a_real_holdout(disease, metadata):
    """Setiap penyakit wajib mencatat periode latih dan periode uji terpisah."""
    entry = metadata.get(disease)
    if entry is None:
        pytest.skip(f"Model {disease} belum dilatih.")

    for field in ("train_period", "test_period", "n_train_samples", "n_test_samples"):
        assert field in entry, (
            f"[{disease}] metadata tidak mencatat '{field}'. Tanpa itu tidak ada "
            "cara membuktikan metriknya berasal dari data yang ditahan."
        )

    assert entry["n_test_samples"] > 0, f"[{disease}] periode uji kosong."
    assert entry["train_period"] != entry["test_period"]

    # Periode uji harus mulai setelah periode latih berakhir.
    train_end = pd.Timestamp(entry["train_period"].split(" to ")[1])
    test_start = pd.Timestamp(entry["test_period"].split(" to ")[0])
    assert test_start > train_end, (
        f"[{disease}] periode uji ({test_start:%Y-%m}) tidak berada setelah "
        f"periode latih berakhir ({train_end:%Y-%m}) — ada kebocoran."
    )


@pytest.mark.parametrize("disease", DISEASES)
def test_training_did_not_consume_the_whole_dataset(disease, metadata):
    """Jumlah baris latih harus lebih kecil dari total baris tersedia.

    Ini penangkap langsung untuk bug yang pernah terjadi: `n_train_samples`
    sama dengan panjang seluruh berkas fitur berarti tidak ada yang ditahan.
    """
    entry = metadata.get(disease)
    if entry is None:
        pytest.skip(f"Model {disease} belum dilatih.")

    feature_path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not feature_path.exists():
        pytest.skip(f"Berkas fitur {feature_path.name} tidak ada.")

    total_rows = len(pd.read_csv(feature_path))
    assert entry["n_train_samples"] < total_rows, (
        f"[{disease}] dilatih pada {entry['n_train_samples']} dari {total_rows} baris — "
        "seluruh dataset terpakai, jadi metriknya in-sample, bukan hasil uji."
    )
    assert entry["n_train_samples"] + entry["n_test_samples"] == total_rows


@pytest.mark.parametrize("disease", DISEASES)
def test_split_matches_the_configured_split_date(disease, metadata):
    """Pemisahan yang tercatat harus sesuai `split_date` di `config.py`."""
    entry = metadata.get(disease)
    if entry is None:
        pytest.skip(f"Model {disease} belum dilatih.")

    feature_path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not feature_path.exists():
        pytest.skip(f"Berkas fitur {feature_path.name} tidak ada.")

    df = pd.read_csv(feature_path)
    df["month_start"] = pd.to_datetime(df["month_start"])
    split = DISEASE_CONFIG[disease]["split_date"]

    assert entry["n_train_samples"] == int((df["month_start"] < split).sum())
    assert entry["n_test_samples"] == int((df["month_start"] >= split).sum())
