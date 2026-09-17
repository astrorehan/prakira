"""Kunci untuk perakitan baris fitur.

Berkas ini menjaga satu invarian yang pernah lepas dan mahal akibatnya:
**baris fitur yang dipakai `/predict` harus dibangun dengan aturan yang persis
sama dengan baris latih bentukan `features/build_features.py`.**

Ketika invarian itu lepas, `/predict` diam-diam menyerahkan baris milik bulan
terakhir ke model, lalu melabelinya sebagai prakiraan bulan berikutnya. Tidak
ada yang gagal, tidak ada galat — angkanya hanya salah, dan metrik di `/model`
berhenti menggambarkan apa yang benar-benar dihitung karena `/backtest`
mengevaluasi baris yang penyelarasannya benar. Persis jenis kesalahan yang
hanya bisa ditangkap tes.
"""
import numpy as np
import pandas as pd
import pytest

from app.services.feature_frame import (
    BASE_FEATURES,
    DERIVED_FEATURES,
    build_feature_row,
    recompute_derived,
    roll_forward,
)
from config import DATASET_CLEAN_DIR, DISEASE_CONFIG, FEATURE_COLUMNS

DISEASES = sorted(DISEASE_CONFIG)


def load_features(disease: str) -> pd.DataFrame:
    path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not path.exists():
        pytest.skip(f"Berkas fitur {path.name} belum dibangun.")
    return pd.read_csv(path)


def district_frame(disease: str) -> pd.DataFrame:
    """Riwayat satu kecamatan yang datanya paling panjang, urut waktu."""
    df = load_features(disease)
    kec_id = df["kecamatan_id"].value_counts().idxmax()
    return df[df["kecamatan_id"] == kec_id].sort_values("month_start").reset_index(drop=True)


def next_month(month_start: str) -> str:
    return (pd.Timestamp(month_start) + pd.DateOffset(months=1)).strftime("%Y-%m-%d")


# ── Invarian inti ───────────────────────────────────────────────────────────


@pytest.mark.parametrize("disease", DISEASES)
def test_roll_forward_reproduces_training_row(disease):
    """Baris hasil `roll_forward` identik dengan baris latih bulan yang sama.

    Ini pengujian yang sesungguhnya. Untuk setiap bulan uji, riwayat dipotong
    tepat sebelum bulan itu, lalu barisnya disusun ulang dari nol dan
    dibandingkan kolom demi kolom dengan baris yang ditulis
    `build_features.py`. Kalau keduanya cocok, maka apa pun yang diukur
    `/backtest` memang itu juga yang dihitung `/predict`.
    """
    history = district_frame(disease)
    if len(history) < 8:
        pytest.skip("Riwayat kecamatan terlalu pendek untuk diuji.")

    # Beberapa titik uji tersebar, termasuk baris terakhir.
    indices = sorted({4, len(history) // 2, len(history) - 1})

    for i in indices:
        target = history.loc[i, "month_start"]
        rebuilt = roll_forward(history.iloc[:i], target)
        stored = history.loc[[i], FEATURE_COLUMNS].astype("float64").reset_index(drop=True)

        for col in FEATURE_COLUMNS:
            np.testing.assert_allclose(
                rebuilt[col].to_numpy(),
                stored[col].to_numpy(),
                rtol=1e-9,
                atol=1e-9,
                err_msg=(
                    f"[{disease}] kolom '{col}' berbeda pada bulan {target}: "
                    f"disusun={rebuilt[col].iloc[0]!r} vs dilatih={stored[col].iloc[0]!r}"
                ),
            )


@pytest.mark.parametrize("disease", DISEASES)
def test_forecast_row_carries_target_month_not_last_observed(disease):
    """Regresi C1: penanda musim menunjuk bulan yang diprakirakan.

    Bug aslinya menyerahkan baris bulan terakhir apa adanya, sehingga `month`
    tertinggal satu bulan bersama `month_sin`, `month_cos`, dan
    `is_pancaroba`. Untuk penyakit bermusim, itu meremehkan lonjakan tepat di
    bulan lonjakannya.
    """
    history = district_frame(disease)
    last_observed = pd.Timestamp(history["month_start"].iloc[-1])
    target = next_month(history["month_start"].iloc[-1])
    expected = pd.Timestamp(target).month

    row = roll_forward(history, target)

    assert row["month"].iloc[0] == float(expected)
    assert row["month"].iloc[0] != float(last_observed.month), (
        "Baris fitur masih membawa bulan observasi terakhir — bug C1 kembali."
    )
    np.testing.assert_allclose(row["month_sin"].iloc[0], np.sin(2 * np.pi * expected / 12))
    np.testing.assert_allclose(row["month_cos"].iloc[0], np.cos(2 * np.pi * expected / 12))
    assert row["is_pancaroba"].iloc[0] == float(expected in (3, 4, 10, 11))


@pytest.mark.parametrize("disease", DISEASES)
def test_lags_step_forward_to_the_last_observation(disease):
    """`cases_lag1` bulan prakiraan = kasus bulan terakhir yang teramati.

    Sisi kedua dari bug yang sama: jendela lag harus ikut maju, bukan hanya
    penanda bulannya.
    """
    history = district_frame(disease)
    target = next_month(history["month_start"].iloc[-1])
    row = roll_forward(history, target)

    for prefix, source in (
        ("cases", "cases"),
        ("rainfall", "rainfall_mm"),
        ("temp", "temp_mean_c"),
        ("humidity", "humidity_pct"),
    ):
        for k in (1, 2, 3):
            assert row[f"{prefix}_lag{k}"].iloc[0] == pytest.approx(
                float(history[source].iloc[-k])
            ), f"[{disease}] {prefix}_lag{k} tidak menunjuk observasi ke-{k} dari belakang."


@pytest.mark.parametrize("disease", DISEASES)
def test_build_feature_row_delegates_with_month(disease):
    """Pintu masuk publik memberi hasil sama dengan `roll_forward` langsung."""
    df = load_features(disease)
    history = district_frame(disease)
    target = next_month(history["month_start"].iloc[-1])

    via_public = build_feature_row(df, history, target)
    direct = roll_forward(history, target)

    pd.testing.assert_frame_equal(via_public, direct)


# ── Penolakan yang disengaja ────────────────────────────────────────────────


@pytest.mark.parametrize("gap_months", [0, 2, 6, -1])
def test_rejects_month_that_is_not_one_step_ahead(gap_months):
    """Model ini satu langkah ke depan; sisanya ditolak, bukan ditebak."""
    history = district_frame(DISEASES[0])
    last = pd.Timestamp(history["month_start"].iloc[-1])
    target = (last + pd.DateOffset(months=gap_months)).strftime("%Y-%m-%d")

    with pytest.raises(ValueError, match="satu bulan setelah observasi terakhir"):
        roll_forward(history, target)


def test_rejects_history_shorter_than_the_lag_window():
    history = district_frame(DISEASES[0]).iloc[:2]
    with pytest.raises(ValueError, match="minimal 3 bulan"):
        roll_forward(history, "2026-01-01")


# ── Fitur turunan ───────────────────────────────────────────────────────────


def test_recompute_derived_matches_build_features_formulas():
    """Rumus turunan di sini harus sama dengan `features/build_features.py`.

    Keduanya sengaja ditulis dua kali — sekali untuk batch pelatihan, sekali
    untuk satu baris saat melayani. Tes ini yang menjaga keduanya tidak
    berpisah diam-diam.
    """
    row = pd.DataFrame(
        [{col: 0.0 for col in FEATURE_COLUMNS}], columns=FEATURE_COLUMNS
    ).astype("float64")
    row.loc[0, "rainfall_lag1"] = 200.0
    row.loc[0, "rainfall_lag2"] = 150.0
    row.loc[0, "rainfall_lag3"] = 100.0
    row.loc[0, "temp_lag1"] = 28.0
    row.loc[0, "humidity_lag1"] = 80.0
    row.loc[0, "cases_lag1"] = 9.0
    row.loc[0, "cases_lag2"] = 6.0
    row.loc[0, "cases_lag3"] = 3.0
    row.loc[0, "population"] = 50_000.0
    row.loc[0, "month"] = 4.0

    out = recompute_derived(row).iloc[0]

    assert out["rainfall_cumul_2m"] == pytest.approx(350.0)
    assert out["cases_ma_3m"] == pytest.approx(6.0)
    assert out["cases_trend"] == pytest.approx(3.0)
    assert out["temp_x_humidity"] == pytest.approx(28.0 * 80.0)
    assert out["rain_x_humidity"] == pytest.approx(200.0 * 80.0)
    assert out["cases_per_10k_lag1"] == pytest.approx(9.0 / 50_000.0 * 10_000)
    assert out["is_pancaroba"] == 1.0


def test_zero_population_does_not_produce_infinity():
    """Kecamatan berpopulasi nol tidak boleh meledak jadi inf/NaN."""
    row = pd.DataFrame(
        [{col: 0.0 for col in FEATURE_COLUMNS}], columns=FEATURE_COLUMNS
    ).astype("float64")
    row.loc[0, "cases_lag1"] = 5.0
    row.loc[0, "month"] = 1.0

    out = recompute_derived(row).iloc[0]
    assert np.isfinite(out["cases_per_10k_lag1"])
    assert out["cases_per_10k_lag1"] == 0.0


def test_base_and_derived_together_cover_every_feature_column():
    """Tidak ada kolom fitur yang tak terklasifikasi sebagai dasar/turunan."""
    assert set(BASE_FEATURES) | set(DERIVED_FEATURES) == set(FEATURE_COLUMNS)
    assert not set(BASE_FEATURES) & set(DERIVED_FEATURES)
