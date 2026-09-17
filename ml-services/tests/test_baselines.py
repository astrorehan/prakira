"""Kunci untuk pembanding naif.

Pembanding hanya berguna kalau ia dihitung dengan jujur. Dua cara ia bisa
menipu: memakai statistik yang ikut melihat periode uji (pembandingnya jadi
terlalu kuat, dan model tampak buruk tanpa alasan), atau menyerah pada
sebagian baris lalu dinilai hanya pada sisanya (pembandingnya jadi terlalu
lemah, dan model tampak baik tanpa alasan). Berkas ini menutup keduanya.
"""
import numpy as np
import pandas as pd
import pytest

from config import DATASET_CLEAN_DIR, DISEASE_CONFIG, TARGET_COLUMN
from training.baselines import BASELINES, compute_baselines, summarise

DISEASES = sorted(DISEASE_CONFIG)


def split(disease: str):
    path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not path.exists():
        pytest.skip(f"Berkas fitur {path.name} belum dibangun.")
    df = pd.read_csv(path)
    df["month_start"] = pd.to_datetime(df["month_start"])
    cut = DISEASE_CONFIG[disease]["split_date"]
    return df[df["month_start"] < cut].copy(), df[df["month_start"] >= cut].copy()


@pytest.mark.parametrize("disease", DISEASES)
def test_every_baseline_answers_every_test_row(disease):
    """Tidak ada pembanding yang boleh menyerah pada sebagian baris.

    Pembanding yang mengembalikan NaN untuk kecamatan tanpa riwayat akan
    dinilai hanya pada baris yang mudah, sementara model dinilai pada
    seluruhnya. Perbandingan seperti itu tidak berarti apa-apa.
    """
    train_df, test_df = split(disease)
    for key, _label, fn in BASELINES:
        pred = fn(train_df, test_df)
        assert len(pred) == len(test_df), f"{key} tidak menjawab seluruh baris uji."
        assert np.isfinite(pred).all(), f"{key} menghasilkan NaN atau inf."


@pytest.mark.parametrize("disease", DISEASES)
def test_persistence_is_exactly_last_months_cases(disease):
    """"Kasus bulan lalu" harus benar-benar kasus bulan lalu.

    `cases_lag1` dibentuk `build_features.py` dengan shift(1) per kecamatan.
    Menghitung ulang sendiri di sini hanya membuka peluang salah selaraskan
    bulan — kesalahan yang sama dengan C1.
    """
    train_df, test_df = split(disease)
    pred = dict(((k, f) for k, _l, f in BASELINES))["persistence"](train_df, test_df)
    np.testing.assert_array_equal(pred, test_df["cases_lag1"].to_numpy(dtype="float64"))


@pytest.mark.parametrize("disease", DISEASES)
def test_district_mean_uses_training_rows_only(disease):
    """Statistik pembanding tidak boleh menyentuh periode uji.

    Rata-rata yang ikut menghitung bulan-bulan uji adalah pembanding yang
    sudah tahu jawabannya — dan model yang kalah darinya belum tentu benar
    kalah.
    """
    train_df, test_df = split(disease)
    pred = dict(((k, f) for k, _l, f in BASELINES))["district_mean"](train_df, test_df)

    kec = test_df["kecamatan_id"].iloc[0]
    expected = float(train_df[train_df["kecamatan_id"] == kec][TARGET_COLUMN].mean())
    got = float(pred[test_df["kecamatan_id"].to_numpy() == kec][0])
    assert got == pytest.approx(expected)

    full_mean = float(
        pd.concat([train_df, test_df]).query("kecamatan_id == @kec")[TARGET_COLUMN].mean()
    )
    if abs(full_mean - expected) > 1e-9:
        assert got != pytest.approx(full_mean), "Pembanding ikut melihat periode uji."


def test_summarise_picks_the_strongest_baseline_not_the_most_flattering():
    """Yang dilaporkan adalah pembanding terbaik — yang paling sulit dikalahkan."""
    baselines = {
        "a": {"label": "A", "mae": 5.0, "rmse": 6.0, "r2": 0.1},
        "b": {"label": "B", "mae": 2.0, "rmse": 3.0, "r2": 0.4},
        "c": {"label": "C", "mae": 9.0, "rmse": 9.0, "r2": -0.2},
    }
    out = summarise({"mae": 3.0}, baselines)
    assert out["best_baseline"] == "b"
    assert out["model_beats_all_baselines"] is False

    better = summarise({"mae": 1.0}, baselines)
    assert better["model_beats_all_baselines"] is True
    assert better["mae_improvement_pct"] == pytest.approx(50.0)


@pytest.mark.parametrize("disease", DISEASES)
def test_compute_baselines_returns_all_three_scored(disease):
    train_df, test_df = split(disease)
    out = compute_baselines(train_df, test_df)
    assert set(out) == {key for key, _l, _f in BASELINES}
    for key, entry in out.items():
        assert {"label", "mae", "rmse", "r2"} <= set(entry), key
        assert entry["mae"] >= 0
