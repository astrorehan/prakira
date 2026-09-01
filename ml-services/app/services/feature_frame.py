"""
feature_frame.py
Perakitan baris fitur dan penghitungan ulang fitur turunan.

Dipakai bersama oleh tiga permukaan: prediksi biasa (`predictor.py`),
penjelasan kontribusi fitur (`explainer.py`), dan simulator cuaca
(`scenario.py`). Dikumpulkan di satu berkas karena satu hal yang sama harus
berlaku di ketiganya: **fitur turunan tidak boleh dibiarkan basi.**

`FEATURE_COLUMNS` memuat empat fitur yang bukan masukan bebas melainkan hasil
hitungan dari fitur lain:

    rainfall_cumul_2m  = rainfall_lag1 + rainfall_lag2
    cases_ma_3m        = rata-rata cases_lag1..3
    cases_trend        = cases_lag1 - cases_lag2
    temp_x_humidity    = temp_lag1 * humidity_lag1
    rain_x_humidity    = rainfall_lag1 * humidity_lag1
    cases_per_10k_lag1 = cases_lag1 / population * 10000
    month_sin/cos      = fungsi month
    is_pancaroba       = month dalam {3,4,10,11}

Menggeser `rainfall_lag1` sebesar +30% tanpa memperbarui `rainfall_cumul_2m`
dan `rain_x_humidity` berarti menyodorkan ke model sebuah baris yang tidak
mungkin ada di dunia nyata — hujan naik tapi hujan kumulatifnya tidak. Model
tetap menjawab, dan jawabannya tidak berarti apa-apa. Karena itu setiap
perubahan pada fitur dasar wajib lewat `recompute_derived`.
"""
from typing import List

import numpy as np
import pandas as pd

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import FEATURE_COLUMNS

# Fitur yang boleh diubah langsung. Sisanya di FEATURE_COLUMNS adalah turunan.
BASE_FEATURES: List[str] = [
    "rainfall_lag1",
    "rainfall_lag2",
    "rainfall_lag3",
    "temp_lag1",
    "temp_lag2",
    "temp_lag3",
    "humidity_lag1",
    "humidity_lag2",
    "humidity_lag3",
    "cases_lag1",
    "cases_lag2",
    "cases_lag3",
    "month",
    "population",
    "kecamatan_encoded",
]

DERIVED_FEATURES: List[str] = [
    "rainfall_cumul_2m",
    "cases_ma_3m",
    "cases_trend",
    "temp_x_humidity",
    "rain_x_humidity",
    "cases_per_10k_lag1",
    "month_sin",
    "month_cos",
    "is_pancaroba",
]


# Kolom sumber di berkas fitur yang menjadi asal tiap keluarga lag.
# `build_features.py` membentuk `x_lag{k}` dengan `groupby(kecamatan).shift(k)`,
# jadi arah baliknya: `x_lag{k}` baris bulan T = kolom sumber pada bulan T-k.
LAG_SOURCES = {
    "cases": "cases",
    "rainfall": "rainfall_mm",
    "temp": "temp_mean_c",
    "humidity": "humidity_pct",
}

# Fitur yang tetap sepanjang riwayat satu kecamatan, jadi disalin apa adanya
# dari baris terakhir alih-alih digulirkan.
STATIC_FEATURES = ("population", "kecamatan_encoded")


def _month_number(target_month) -> int:
    """Nomor bulan 1–12 dari `YYYY-MM-DD`, `Timestamp`, atau angka biasa."""
    if isinstance(target_month, (int, np.integer)):
        return int(target_month)
    return int(pd.Timestamp(target_month).month)


def roll_forward(df_kec: pd.DataFrame, target_month) -> pd.DataFrame:
    """Baris fitur untuk memprakirakan `target_month`, digulirkan dari riwayat.

    Ini inti perbedaan antara *menjelaskan bulan terakhir* dan *memprakirakan
    bulan berikutnya*. Baris terakhir di berkas fitur adalah baris **milik**
    bulan terakhir: `month`-nya bulan itu, dan `cases_lag1`-nya kasus sebulan
    sebelumnya. Menyerahkannya apa adanya ke model berarti meminta model
    menghitung ulang bulan yang jumlah kasusnya sudah kita ketahui.

    Untuk memprakirakan bulan T, seluruh jendela lag harus maju satu langkah —
    `cases_lag1` menjadi kasus bulan T-1, yaitu observasi terakhir yang kita
    punya — dan `month` menjadi T supaya penanda musim (`month_sin`,
    `month_cos`, `is_pancaroba`) menunjuk bulan yang benar. Untuk penyakit
    yang puncaknya musiman, dua hal itu bergerak ke arah yang sama; salah
    keduanya sekaligus berarti meremehkan lonjakan justru pada bulan
    lonjakannya.

    Susunan hasilnya sengaja dibuat identik dengan baris latih bentukan
    `features/build_features.py` untuk bulan yang sama. Kesamaan itu diuji
    di `tests/test_feature_frame.py`: kalau ia lepas, metrik di `/model`
    berhenti menggambarkan apa yang dihitung `/predict`.
    """
    history = df_kec.sort_values("month_start")
    if len(history) < 3:
        raise ValueError(
            "Butuh minimal 3 bulan riwayat berturut-turut untuk menyusun fitur lag."
        )

    last_month = pd.Timestamp(history["month_start"].iloc[-1])
    target = pd.Timestamp(target_month)

    # Model ini dilatih satu langkah ke depan: `cases_lag1` selalu berarti
    # "bulan tepat sebelum bulan yang diprakirakan". Bila jaraknya bukan satu
    # bulan, jendela lag tidak lagi bermakna — dan menjawab tetap dengan angka
    # lebih buruk daripada menolak menjawab (PRD §7).
    gap = (target.year - last_month.year) * 12 + (target.month - last_month.month)
    if gap != 1:
        raise ValueError(
            f"Prakiraan hanya sah untuk satu bulan setelah observasi terakhir "
            f"({last_month:%Y-%m}), sedangkan yang diminta {target:%Y-%m}."
        )

    # Seluruh kolom dipaksa float64 sejak awal.
    #
    # `month`, `population`, `is_pancaroba`, dan `kecamatan_encoded` terbaca
    # sebagai int64 dari CSV. Begitu simulator menaikkan hujan 30% atau
    # penjelas mengganti sebuah kolom dengan median 7,5, pandas menolak menulis
    # pecahan ke kolom bertipe bulat: "Invalid value '7.5' for dtype 'int64'".
    # Model sendiri memperlakukan semuanya sebagai float, jadi tidak ada yang
    # hilang — yang hilang justru kelas kesalahan ini.
    row = pd.DataFrame(index=[0], columns=FEATURE_COLUMNS, dtype="float64")

    for prefix, source in LAG_SOURCES.items():
        for k in (1, 2, 3):
            row.loc[0, f"{prefix}_lag{k}"] = float(history[source].iloc[-k])

    for col in STATIC_FEATURES:
        row.loc[0, col] = float(history[col].iloc[-1])

    row.loc[0, "month"] = float(target.month)

    return recompute_derived(row)


def build_feature_row(
    df_hist: pd.DataFrame, df_kec: pd.DataFrame, target_month
) -> pd.DataFrame:
    """Baris fitur untuk memprakirakan `target_month` di satu kecamatan.

    Logika yang sama dipakai `/predict`, `/explain`, dan `/simulate` supaya
    ketiganya berangkat dari titik awal yang identik. Kalau tidak, penjelasan
    bisa menerangkan angka yang berbeda dari yang tampil di dashboard.
    """
    if df_kec is None or df_kec.empty:
        if df_hist.empty:
            raise ValueError("Tidak ada data historis untuk prediksi.")
        # Kecamatan tanpa riwayat sendiri: rata-rata kota sebagai titik awal.
        # Lag-nya tidak bisa digulirkan — tidak ada deret untuk digulirkan —
        # tetapi bulannya tetap wajib benar, karena musim berlaku sekota.
        row = pd.DataFrame([df_hist[FEATURE_COLUMNS].mean()], columns=FEATURE_COLUMNS)
        row = row.astype("float64")
        row.loc[:, "month"] = float(_month_number(target_month))
        return recompute_derived(row)

    return roll_forward(df_kec, target_month)


def recompute_derived(row: pd.DataFrame) -> pd.DataFrame:
    """Menyegarkan seluruh fitur turunan dari fitur dasarnya.

    Rumusnya disalin persis dari `features/build_features.py`. Kalau rumus di
    sana berubah, berkas ini harus ikut berubah — kalau tidak, model menerima
    baris latih dan baris prediksi yang dibangun dengan aturan berbeda.
    """
    out = row.copy()

    out["rainfall_cumul_2m"] = out["rainfall_lag1"] + out["rainfall_lag2"]
    out["cases_ma_3m"] = out[["cases_lag1", "cases_lag2", "cases_lag3"]].mean(axis=1)
    out["cases_trend"] = out["cases_lag1"] - out["cases_lag2"]
    out["temp_x_humidity"] = out["temp_lag1"] * out["humidity_lag1"]
    out["rain_x_humidity"] = out["rainfall_lag1"] * out["humidity_lag1"]

    population = out["population"].replace(0, np.nan)
    out["cases_per_10k_lag1"] = (out["cases_lag1"] / population) * 10000
    out["cases_per_10k_lag1"] = out["cases_per_10k_lag1"].fillna(0.0)

    month = out["month"].clip(1, 12)
    out["month"] = month
    out["month_sin"] = np.sin(2 * np.pi * month / 12)
    out["month_cos"] = np.cos(2 * np.pi * month / 12)
    out["is_pancaroba"] = month.isin([3, 4, 10, 11]).astype(int)

    return out[FEATURE_COLUMNS]


def clamp_physical(row: pd.DataFrame) -> pd.DataFrame:
    """Batas fisik yang tidak boleh dilanggar berapa pun geseran penggunanya.

    Curah hujan negatif dan kelembaban 130% bukan skenario, itu masukan rusak.
    Suhu sengaja tidak dibatasi ketat di sini — rentang yang masuk akal untuk
    Semarang sudah ditegakkan di lapisan permintaan.
    """
    out = row.copy()
    for col in ("rainfall_lag1", "rainfall_lag2", "rainfall_lag3"):
        out[col] = out[col].clip(lower=0.0)
    for col in ("humidity_lag1", "humidity_lag2", "humidity_lag3"):
        out[col] = out[col].clip(lower=0.0, upper=100.0)
    for col in ("cases_lag1", "cases_lag2", "cases_lag3"):
        out[col] = out[col].clip(lower=0.0)
    return out
