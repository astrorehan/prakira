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

import joblib
import numpy as np
import pandas as pd
import pytest

from config import (
    DATASET_CLEAN_DIR,
    DISEASE_CONFIG,
    FEATURE_COLUMNS,
    MODELS_DIR,
    TARGET_COLUMN,
)
from training.baselines import compute_baselines
from training.conformal import difficulty, evaluate

DISEASES = sorted(DISEASE_CONFIG)


def _split(disease: str):
    """Periode latih dan uji, dipisah persis seperti saat pelatihan."""
    path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not path.exists():
        pytest.skip(f"Berkas fitur {path.name} tidak ada.")
    df = pd.read_csv(path)
    df["month_start"] = pd.to_datetime(df["month_start"])
    cut = DISEASE_CONFIG[disease]["split_date"]
    return df[df["month_start"] < cut].copy(), df[df["month_start"] >= cut].copy()


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


# ── Pembanding naif ─────────────────────────────────────────────────────────


@pytest.mark.parametrize("disease", DISEASES)
def test_metadata_records_baselines_recomputable_from_the_data(disease, metadata):
    """Angka pembanding di halaman transparansi harus bisa dihitung ulang.

    Metrik yang hanya ada di metadata dan tidak bisa direproduksi dari berkas
    fitur adalah klaim, bukan bukti. Tes ini menghitung ulang ketiganya dari
    nol dan menuntut kecocokan.
    """
    entry = metadata.get(disease)
    if entry is None:
        pytest.skip(f"Model {disease} belum dilatih.")

    assert "baselines" in entry and "baseline_summary" in entry, (
        f"[{disease}] metadata tidak memuat pembanding naif. Tanpa itu tidak ada "
        "cara menjawab 'kenapa tidak pakai rata-rata saja'."
    )

    train_df, test_df = _split(disease)
    recomputed = compute_baselines(train_df, test_df)

    for key, expected in recomputed.items():
        stored = entry["baselines"].get(key)
        assert stored is not None, f"[{disease}] pembanding '{key}' hilang."
        assert stored["mae"] == pytest.approx(expected["mae"], abs=1e-4), (
            f"[{disease}] MAE pembanding '{key}' tersimpan {stored['mae']} "
            f"tetapi dihitung ulang {expected['mae']}."
        )

    summary = entry["baseline_summary"]
    best = min(entry["baselines"], key=lambda k: entry["baselines"][k]["mae"])
    assert summary["best_baseline"] == best
    assert summary["model_beats_all_baselines"] == (
        entry["metrics"]["mae"] < entry["baselines"][best]["mae"]
    )


# ── Kalibrasi rentang ───────────────────────────────────────────────────────


@pytest.mark.parametrize("disease", DISEASES)
def test_conformal_calibration_never_touched_the_test_period(disease, metadata):
    """Kalibrasi rentang harus selesai sebelum periode uji dimulai.

    Kalau kalibrasi ikut melihat periode uji, cakupan yang dilaporkan mengukur
    dirinya sendiri — jenis kesalahan yang sama dengan C3, hanya berpindah dari
    metrik ke rentang.
    """
    entry = metadata.get(disease)
    if entry is None:
        pytest.skip(f"Model {disease} belum dilatih.")

    conformal = entry.get("conformal")
    assert conformal is not None, (
        f"[{disease}] metadata tanpa blok konformal — rentangnya kembali ke "
        "sebaran sub-model, yang tidak membawa jaminan cakupan apa pun."
    )
    for field in ("q_hat", "alpha", "n_calibration", "empirical_coverage", "target_coverage"):
        assert field in conformal, f"[{disease}] blok konformal tanpa '{field}'."

    assert conformal["n_calibration"] > 0
    assert 0.0 <= conformal["empirical_coverage"] <= 1.0
    assert conformal["q_hat"] > 0

    calib_end = pd.Timestamp(conformal["calibration_period"].split(" to ")[1])
    test_start = pd.Timestamp(entry["test_period"].split(" to ")[0])
    assert calib_end < test_start, (
        f"[{disease}] kalibrasi berakhir {calib_end:%Y-%m} sedangkan periode uji "
        f"mulai {test_start:%Y-%m} — cakupan yang dilaporkan menilai dirinya sendiri."
    )


@pytest.mark.parametrize("disease", DISEASES)
def test_reported_coverage_is_reproducible_from_the_shipped_model(disease, metadata):
    """Cakupan yang dipajang harus lahir dari berkas .pkl yang benar-benar dikirim.

    Ini pengikat terakhirnya. Metadata bisa saja tertinggal satu pelatihan di
    belakang modelnya — persis keadaan yang membuat angka Leptospirosis lama
    bertahan lama tanpa ketahuan. Di sini model dimuat dari disk, dijalankan
    pada periode uji, dan cakupannya dihitung ulang dengan `q_hat` tersimpan.
    """
    entry = metadata.get(disease)
    if entry is None or "conformal" not in entry:
        pytest.skip(f"Model {disease} belum dilatih ulang dengan kalibrasi.")

    model_path = MODELS_DIR / DISEASE_CONFIG[disease]["model_file"]
    if not model_path.exists():
        pytest.skip(f"Berkas model {model_path.name} tidak ada.")

    model = joblib.load(model_path)
    _train_df, test_df = _split(disease)

    y_pred = np.clip(model.predict(test_df[FEATURE_COLUMNS]), 0, None)
    recomputed = evaluate(
        test_df[TARGET_COLUMN].to_numpy(dtype="float64"),
        y_pred,
        difficulty(test_df[FEATURE_COLUMNS]),
        float(entry["conformal"]["q_hat"]),
        float(entry["conformal"]["alpha"]),
    )

    assert recomputed["empirical_coverage"] == pytest.approx(
        entry["conformal"]["empirical_coverage"], abs=0.02
    ), (
        f"[{disease}] metadata melaporkan cakupan "
        f"{entry['conformal']['empirical_coverage']:.1%} tetapi model yang tersimpan "
        f"menghasilkan {recomputed['empirical_coverage']:.1%} — metadata dan .pkl "
        "berasal dari pelatihan yang berbeda."
    )
    assert entry["metrics"]["mae"] == pytest.approx(
        float(np.abs(test_df[TARGET_COLUMN].to_numpy() - y_pred).mean()), abs=0.05
    )
