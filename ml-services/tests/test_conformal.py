"""Kunci untuk rentang prakiraan.

Rentang yang lama dihitung dari sebaran jawaban antar sub-model ensemble.
Angka itu tidak pernah bisa salah dan tidak pernah bisa diperiksa: tidak ada
pernyataan yang ia buat tentang kenyataan, jadi tidak ada yang bisa diuji.
Rentang konformal membuat satu pernyataan yang tegas — "kenyataan jatuh di
dalam sini sekian persen dari waktu" — dan berkas ini yang memeriksanya.
"""
import numpy as np
import pandas as pd
import pytest

from config import FEATURE_COLUMNS, TARGET_COLUMN
from training.conformal import (
    DEFAULT_ALPHA,
    difficulty,
    evaluate,
    interval,
    pooled_quantile,
    rolling_origin_scores,
)


def synthetic_panel(n_months: int = 40, n_kec: int = 8, seed: int = 0) -> pd.DataFrame:
    """Panel bulan x kecamatan seadanya, cukup untuk menguji mekanikanya."""
    rng = np.random.default_rng(seed)
    months = pd.date_range("2020-01-01", periods=n_months, freq="MS")
    rows = []
    for kec in range(n_kec):
        for m in months:
            row = {col: float(rng.normal(10, 2)) for col in FEATURE_COLUMNS}
            row["kecamatan_id"] = f"kec-{kec:02d}"
            row["month_start"] = m
            row["month"] = float(m.month)
            row["cases_ma_3m"] = float(abs(rng.normal(5, 1)))
            row[TARGET_COLUMN] = float(rng.poisson(5))
            rows.append(row)
    return pd.DataFrame(rows)


# ── Kuantil konformal ───────────────────────────────────────────────────────


@pytest.mark.parametrize("n,alpha,expected_rank", [(9, 0.2, 8), (19, 0.05, 19), (99, 0.1, 90)])
def test_quantile_uses_the_plus_one_correction(n, alpha, expected_rank):
    """Indeksnya ceil((n+1)(1-alpha)), bukan kuantil empiris biasa.

    Koreksi (n+1) itulah yang mengubah taksiran menjadi jaminan berhingga.
    Tanpanya cakupan meleset ke bawah justru saat n kecil — keadaan kita.
    """
    scores = np.arange(1.0, n + 1.0)  # skor terurut 1..n
    assert pooled_quantile(scores, alpha) == pytest.approx(float(expected_rank))


def test_quantile_falls_back_to_the_largest_score_when_n_is_too_small():
    """n terlalu kecil untuk menjamin tingkatnya: berikan yang terlebar."""
    scores = np.array([1.0, 2.0, 3.0])  # ceil(4 * 0.95) = 4 > 3
    assert pooled_quantile(scores, 0.05) == 3.0


def test_quantile_rejects_empty_calibration():
    with pytest.raises(ValueError, match="sah"):
        pooled_quantile(np.array([]), DEFAULT_ALPHA)


# ── Bentuk rentang ──────────────────────────────────────────────────────────


def test_interval_never_dips_below_zero():
    """Jumlah kasus tidak bisa negatif, jadi batas bawahnya pun tidak."""
    lower, _ = interval(np.array([0.4]), np.array([1.0]), q_hat=5.0)
    assert lower[0] == 0.0


def test_interval_is_integral_and_rounded_outward():
    """Batasnya bilangan bulat, membesar ke luar — sama seperti yang tampil.

    Membulatkan ke dalam akan menghasilkan rentang yang lebih sempit daripada
    yang dinilai saat kalibrasi, sehingga cakupan yang diukur tidak lagi
    berlaku untuk rentang yang dilihat pengguna.
    """
    lower, upper = interval(np.array([5.0]), np.array([1.0]), q_hat=1.4)
    assert (lower[0], upper[0]) == (3.0, 7.0)  # floor(3.6), ceil(6.4)
    assert float(lower[0]).is_integer() and float(upper[0]).is_integer()


def test_interval_always_contains_its_own_point_prediction():
    """Rentang "2 kasus, rentang 1–1" membatalkan gunanya sendiri (PRD §7-H1)."""
    points = np.array([0.0, 0.3, 2.7, 19.0, 4500.0])
    sigma = difficulty(pd.DataFrame({"cases_ma_3m": [0.0, 0.1, 3.0, 18.0, 4000.0]}))
    lower, upper = interval(points, sigma, q_hat=0.05)
    rounded = np.round(points)
    assert np.all(lower <= rounded) and np.all(rounded <= upper)


def test_wider_q_hat_never_narrows_the_interval():
    sigma = np.array([3.0])
    narrow = interval(np.array([10.0]), sigma, 0.2)
    wide = interval(np.array([10.0]), sigma, 0.9)
    assert wide[0][0] <= narrow[0][0] and wide[1][0] >= narrow[1][0]


def test_difficulty_scales_the_interval_with_recent_case_level():
    """Satu lebar untuk Tembalang dan Tugu sekaligus tidak masuk akal."""
    X = pd.DataFrame({"cases_ma_3m": [0.0, 100.0]})
    sigma = difficulty(X)
    assert sigma[0] == 1.0  # tidak nol — pembagian dengan nol dihindari
    assert sigma[1] > sigma[0]

    lower, upper = interval(np.array([1.0, 100.0]), sigma, q_hat=0.5)
    assert (upper[1] - lower[1]) > (upper[0] - lower[0])


# ── Kalibrasi bergulir ──────────────────────────────────────────────────────


def test_rolling_origin_never_trains_on_the_block_it_scores():
    """Penjaga kebocoran: tiap blok kalibrasi harus asing bagi modelnya.

    Kalau sebuah blok ikut dilatih, galat yang terukur di sana lebih kecil
    daripada galat sebenarnya, dan rentang yang lahir dari situ terlalu sempit
    — tepat kegagalan yang tidak akan terlihat dari hasil akhirnya.
    """
    df = synthetic_panel()
    seen = []

    def spy_fit_predict(past, X_eval):
        seen.append(pd.Timestamp(past["month_start"].max()))
        return np.zeros(len(X_eval))

    # Blok yang dinilai diambil ulang dari urutan bulan yang sama.
    scores, info = rolling_origin_scores(spy_fit_predict, df)
    months = np.sort(df["month_start"].unique())
    start = max(1, int(round(len(months) * 0.5)))
    block_starts = [pd.Timestamp(months[i]) for i in range(start, len(months), 3)]

    assert len(seen) == len(block_starts) == info["n_folds"]
    for trained_until, block_start in zip(seen, block_starts):
        assert trained_until < block_start, (
            f"Model dilatih sampai {trained_until:%Y-%m} lalu menilai blok yang "
            f"mulai {block_start:%Y-%m} — blok itu ikut dilatih."
        )


def test_rolling_origin_spans_more_than_one_season():
    """Alasan keberadaan kalibrasi bergulir, dijadikan syarat.

    Kalibrasi yang hanya melihat ekor periode latih mengukur satu musim.
    Untuk Leptospirosis ekor itu jatuh di musim kemarau dan menghasilkan
    rentang selebar 0,14 kasus yang menampung kenyataan hanya 46% dari waktu.
    """
    df = synthetic_panel(n_months=48)
    _, info = rolling_origin_scores(lambda past, X: np.zeros(len(X)), df)
    span = pd.Timestamp(info["calibration_period"].split(" to ")[1]) - pd.Timestamp(
        info["calibration_period"].split(" to ")[0]
    )
    assert span.days >= 365, "Kalibrasi tidak menjangkau satu siklus musim penuh."
    assert info["n_folds"] >= 4


def test_rolling_origin_rejects_a_training_period_of_one_month():
    df = synthetic_panel(n_months=1)
    with pytest.raises(ValueError, match="terlalu pendek"):
        rolling_origin_scores(lambda past, X: np.zeros(len(X)), df)


# ── Cakupan ─────────────────────────────────────────────────────────────────


def test_coverage_reaches_target_on_exchangeable_data():
    """Pada data yang benar-benar dapat dipertukarkan, jaminannya berlaku.

    Ini pemeriksaan terhadap mekanikanya, bukan terhadap model: kalibrasi dan
    penilaian diambil dari distribusi yang sama, sehingga andaian konformal
    terpenuhi menurut konstruksi. Cakupan pada data sungguhan bisa lebih
    rendah, dan justru karena itu ia diukur terpisah lalu dipajang.
    """
    rng = np.random.default_rng(7)
    truth = rng.poisson(20, size=4000).astype(float)
    pred = truth + rng.normal(0, 4, size=4000)
    sigma = np.ones(4000)

    cal, test = slice(0, 2000), slice(2000, 4000)
    q = pooled_quantile(np.abs(truth[cal] - pred[cal]) / sigma[cal], DEFAULT_ALPHA)
    result = evaluate(truth[test], pred[test], sigma[test], q, DEFAULT_ALPHA)

    assert result["empirical_coverage"] >= 0.78
    assert result["target_coverage"] == 0.8


def test_evaluate_reports_the_target_alongside_what_was_achieved():
    """Label tanpa pembuktinya adalah bagian yang berbahaya."""
    result = evaluate(np.array([5.0]), np.array([5.0]), np.array([1.0]), 1.0)
    assert {"empirical_coverage", "target_coverage", "median_width", "n_evaluated"} <= set(result)
