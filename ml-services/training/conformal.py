"""Interval prakiraan yang lebarnya berasal dari galat teramati (conformal).

Sebelumnya batas bawah/atas diambil dari sebaran prediksi antar sub-model
ensemble: Ridge menjawab 3, ExtraTrees menjawab 5, maka rentangnya 3–5. Yang
diukur cara itu adalah **seberapa tidak sepakat anggota ensemble**, bukan
seberapa sering kenyataan jatuh di dalam rentangnya. Keduanya tidak
berhubungan: empat model yang sama-sama salah dengan cara yang sama akan
sepakat erat dan melahirkan rentang sempit yang percaya diri dan keliru.

Prediksi konformal membalik urutannya. Model diuji pada bagian periode latih
yang belum pernah dilihatnya, galat mutlak di sana dikumpulkan, lalu kuantilnya
dipakai sebagai lebar rentang. Lebarnya jadi berasal dari seberapa sering model
ini meleset, bukan dari seberapa sering anggotanya berselisih — tanpa
mengandaikan galatnya berdistribusi normal, dan tanpa mengandaikan modelnya
benar.

Pengumpulan galatnya digulirkan maju sepanjang periode latih alih-alih diambil
dari ekornya saja; alasannya ada di `rolling_origin_scores`, dan berakar pada
kegagalan yang terukur, bukan pada preferensi.

Kuantilnya dinormalkan terhadap tingkat kasus terkini kecamatan
(`cases_ma_3m`). Tanpa itu satu lebar berlaku sama untuk Tembalang yang
ratusan kasus dan Tugu yang nol — terlalu sempit di satu ujung, tidak berarti
di ujung lain.

Batasnya jujur disebut. `n_calibration` dan cakupan empiris pada periode uji
sama-sama ditulis ke metadata dan sama-sama dipajang. Rentang yang mengaku 80%
tetapi hanya menampung 46% kenyataan lebih berbahaya daripada tidak ada
rentang sama sekali, jadi angka pembuktinya harus ikut terbaca — termasuk saat
ia mengecewakan.
"""
from typing import Callable, Tuple

import numpy as np
import pandas as pd

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import FEATURE_COLUMNS, TARGET_COLUMN

# 80% interval, bukan 95%. Pada 24–180 baris kalibrasi, kuantil 95% ditentukan
# oleh satu-dua pengamatan ekstrem dan lebarnya menjadi tidak informatif —
# rentang "0 sampai 40 kasus" secara teknis benar dan tidak berguna bagi
# petugas surveilans yang harus memutuskan sesuatu.
DEFAULT_ALPHA = 0.2

# Kalibrasi dimulai setelah separuh periode latih terlewati, lalu maju per
# blok tiga bulan. Tiga bulan cukup lebar untuk menghindari satu bulan aneh
# mendominasi sebuah lipatan, dan cukup sempit untuk menghasilkan beberapa
# lipatan bahkan pada ISPA yang periode latihnya hanya sembilan bulan.
DEFAULT_MIN_TRAIN_FRACTION = 0.5
DEFAULT_BLOCK_MONTHS = 3


def difficulty(X: pd.DataFrame) -> np.ndarray:
    """Penaksir kesulitan per baris — dasar penskalaan lebar rentang.

    Dipakai rata-rata kasus tiga bulan terakhir kecamatan itu, ditambah satu
    supaya kecamatan bernilai nol tidak menghasilkan pembagian dengan nol.
    Fitur ini sudah ada di `FEATURE_COLUMNS`, jadi tersedia sama persis saat
    melatih maupun saat melayani.
    """
    base = np.clip(np.asarray(X["cases_ma_3m"], dtype="float64"), 0, None)
    return 1.0 + base


def rolling_origin_scores(
    fit_predict: Callable[[pd.DataFrame, pd.DataFrame], np.ndarray],
    train_df: pd.DataFrame,
    min_train_fraction: float = DEFAULT_MIN_TRAIN_FRACTION,
    block_months: int = DEFAULT_BLOCK_MONTHS,
) -> Tuple[np.ndarray, dict]:
    """Skor kalibrasi yang dikumpulkan secara maju sepanjang periode latih.

    Cara yang lebih sederhana — sisihkan ekor periode latih sebagai kalibrasi —
    dicoba lebih dulu dan gagal dengan cara yang layak dicatat. Ekor periode
    latih Leptospirosis jatuh di musim kemarau: hampir semua kecamatan nol,
    model menjawab hampir nol, galatnya nyaris nihil, dan `q_hat` yang lahir
    dari situ menghasilkan rentang selebar 0,14 kasus. Rentang itu kemudian
    menampung kenyataan hanya 46% dari waktu di periode uji yang mencakup musim
    hujan — bukan 80% yang dijanjikan. Kalibrasi yang hanya melihat satu musim
    mengukur musim itu, bukan model.

    Karena itu kalibrasi di sini digulirkan: mulai dari separuh periode latih,
    model dilatih ulang pada seluruh data sebelum tiap blok, lalu blok itu
    diprakirakan tanpa pernah ikut dilatih. Galat yang terkumpul berasal dari
    beberapa titik dalam siklus musim, bukan satu.

    Yang ditukar dengan itu perlu disebut jujur: menggabungkan sisa dari
    beberapa lipatan membuat jaminan berhingga split conformal yang eksak
    berubah menjadi hampiran (cross-conformal). Penggantinya adalah pengukuran:
    cakupan empiris dihitung pada periode uji yang tidak pernah disentuh
    kalibrasi maupun pelatihan, dan angka itulah yang dipajang — bukan janji
    teoretisnya.
    """
    months = np.sort(train_df["month_start"].unique())
    start = max(1, int(round(len(months) * min_train_fraction)))
    if start >= len(months):
        raise ValueError(
            f"Periode latih hanya {len(months)} bulan — terlalu pendek untuk "
            "dikalibrasi secara bergulir."
        )

    # Blok dipersempit bila sisa periodenya tidak cukup untuk beberapa lipatan.
    # Tanpa ini ISPA — yang setelah jendela lag hanya menyisakan enam bulan
    # latih — menghasilkan satu lipatan saja, yaitu kembali menjadi kalibrasi
    # ekor yang justru hendak dihindari. Tiga lipatan satu bulan mencakup lebih
    # banyak titik dalam siklus musim daripada satu lipatan tiga bulan.
    remaining = len(months) - start
    block_months = max(1, min(block_months, remaining // 3))

    scores, n_rows, folds = [], 0, 0
    for i in range(start, len(months), block_months):
        block = months[i : i + block_months]
        past = train_df[train_df["month_start"] < block[0]]
        held = train_df[train_df["month_start"].isin(block)]
        if past.empty or held.empty:
            continue
        pred = np.clip(fit_predict(past, held[FEATURE_COLUMNS]), 0, None)
        sigma = difficulty(held[FEATURE_COLUMNS])
        residual = np.abs(held[TARGET_COLUMN].to_numpy(dtype="float64") - pred)
        scores.append(residual / sigma)
        n_rows += len(held)
        folds += 1

    if not scores:
        raise ValueError("Tidak ada blok kalibrasi yang bisa dibentuk.")

    pooled = np.concatenate(scores)
    info = {
        "n_calibration": int(n_rows),
        "n_folds": int(folds),
        "calibration_period": (
            f"{pd.Timestamp(months[start]):%Y-%m-%d} to "
            f"{pd.Timestamp(months[-1]):%Y-%m-%d}"
        ),
    }
    return pooled, info


def pooled_quantile(scores: np.ndarray, alpha: float) -> float:
    """Kuantil konformal dari skor galat ternormalkan.

    Bukan kuantil empiris biasa: indeksnya ceil((n+1)(1-alpha)) dari n skor
    terurut. Koreksi (n+1) itulah yang mengubah taksiran menjadi jaminan
    berhingga; tanpanya cakupan meleset ke bawah justru saat n kecil, yaitu
    persis keadaan kita di sini.
    """
    scores = np.sort(np.asarray(scores, dtype="float64"))
    scores = scores[np.isfinite(scores)]
    n = len(scores)
    if n == 0:
        raise ValueError("Tidak ada skor kalibrasi yang sah.")

    rank = int(np.ceil((n + 1) * (1.0 - alpha)))
    if rank > n:
        # Terlalu sedikit baris kalibrasi untuk menjamin tingkat ini; skor
        # terbesar adalah yang terbaik yang bisa diberikan, dan `n_calibration`
        # di metadata memberi tahu pembaca mengapa.
        return float(scores[-1])
    return float(scores[rank - 1])


def interval(point: np.ndarray, sigma: np.ndarray, q_hat: float) -> Tuple[np.ndarray, np.ndarray]:
    """Rentang bilangan bulat [bawah, atas] di sekitar prakiraan titik.

    Dua penyesuaian, keduanya menyamakan yang diukur dengan yang ditampilkan.

    Batas bawah dipangkas di nol. Pemangkasan itu tidak pernah mengurangi
    cakupan — jumlah kasus tidak bisa negatif, jadi setiap kenyataan yang
    tertampung sebelum pemangkasan tetap tertampung sesudahnya.

    Batasnya lalu dibulatkan ke luar, bawah ke bawah dan atas ke atas, karena
    dashboard menampilkan jumlah kasus sebagai bilangan bulat. Menilai cakupan
    pada batas pecahan berarti menilai rentang yang tidak pernah dilihat siapa
    pun: rentang [0; 0,22] tertulis "0 sampai 1" di layar, dan kenyataan 1
    kasus tertampung di layar meski tidak tertampung di angka pecahannya. Ini
    kesalahan yang sejenis dengan C1 — metrik yang mengukur skema selain yang
    dijalankan — jadi diperlakukan sama: yang dibulatkan adalah yang dinilai.
    """
    point = np.asarray(point, dtype="float64")
    half = q_hat * np.asarray(sigma, dtype="float64")
    lower = np.floor(np.clip(point - half, 0, None))
    upper = np.ceil(point + half)
    return lower, upper


def evaluate(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    sigma: np.ndarray,
    q_hat: float,
    alpha: float = DEFAULT_ALPHA,
) -> dict:
    """Cakupan empiris dan lebar rentang pada periode uji.

    Ini angka yang dipajang halaman transparansi. Periode uji tidak pernah
    dilihat kalibrasi maupun pelatihan, jadi cakupan yang terukur di sini
    adalah pemeriksaan yang sesungguhnya terhadap jaminan teoretisnya — dan
    ketika ia meleset di bawah target, itu pun ditampilkan. Rentang yang
    mengaku 80% tetapi menampung 70% masih berguna asal angka 70 itu terbaca;
    yang berbahaya adalah label tanpa pembuktinya.
    """
    y_true = np.asarray(y_true, dtype="float64")
    lower, upper = interval(y_pred, sigma, q_hat)
    inside = (y_true >= lower) & (y_true <= upper)
    widths = upper - lower
    return {
        "empirical_coverage": round(float(inside.mean()), 4),
        "target_coverage": round(1.0 - alpha, 4),
        "mean_width": round(float(widths.mean()), 4),
        "median_width": round(float(np.median(widths)), 4),
        "n_evaluated": int(len(y_true)),
    }


def calibrate(
    fit_predict: Callable[[pd.DataFrame, pd.DataFrame], np.ndarray],
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    y_test_pred: np.ndarray,
    alpha: float = DEFAULT_ALPHA,
) -> dict:
    """Blok metadata konformal lengkap untuk satu penyakit.

    `fit_predict(train_subset, X_eval)` harus melatih model jenis yang sama
    pada `train_subset` lalu mengembalikan prakiraan dalam **satuan kasus** —
    bukan ruang log — karena rentang yang ditampilkan pengguna bersatuan kasus,
    dan galat yang dikumpulkan harus bersatuan yang sama.

    `q_hat` dikalibrasi dengan model-model yang tiap kalinya dilatih pada
    sebagian periode latih, sementara model yang benar-benar dikirim dilatih
    pada seluruh periode latih. Model kedua melihat data lebih banyak, jadi
    umumnya sedikit lebih baik, dan rentangnya menjadi agak konservatif. Arah
    itu disengaja: rentang yang sedikit terlalu lebar lebih aman daripada yang
    sedikit terlalu sempit.
    """
    pooled, info = rolling_origin_scores(fit_predict, train_df)
    q_hat = pooled_quantile(pooled, alpha)

    sigma_test = difficulty(test_df[FEATURE_COLUMNS])
    result = evaluate(
        test_df[TARGET_COLUMN].to_numpy(dtype="float64"),
        np.clip(y_test_pred, 0, None),
        sigma_test,
        q_hat,
        alpha,
    )
    result.update(
        {
            "method": "rolling_origin_conformal_normalized",
            "difficulty": "1 + cases_ma_3m",
            "alpha": alpha,
            "q_hat": round(float(q_hat), 6),
            **info,
        }
    )
    return result
