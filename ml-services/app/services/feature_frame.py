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
from config import DATASET_CLEAN_DIR, FEATURE_COLUMNS

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


_weather_cache: pd.DataFrame | None = None


def monthly_weather() -> pd.DataFrame:
    """Cuaca bulanan per kecamatan, termasuk bulan-bulan sesudah kasus terakhir.

    Berkas fitur berhenti di bulan observasi kasus terakhir karena ia irisan
    kasus x cuaca. Prakiraan beberapa bulan ke depan tetap butuh iklim bulan
    antara, dan iklim itu benar-benar ada — BMKG menerbitkannya jauh lebih
    cepat daripada rekapitulasi kasus Dinkes. `etl/merge_dataset.py`
    menyimpannya utuh di `dataset_clean/cuaca_monthly.csv`.
    """
    global _weather_cache
    if _weather_cache is None:
        path = DATASET_CLEAN_DIR / "cuaca_monthly.csv"
        if not path.exists():
            _weather_cache = pd.DataFrame(
                columns=["kecamatan_id", "month_start", "rainfall_mm", "temp_mean_c", "humidity_pct"]
            )
        else:
            _weather_cache = pd.read_csv(path)
    return _weather_cache


# Riwayat yang sudah disambung, per (model, kecamatan, bulan terakhir).
#
# Rantai Januari->Oktober disusuri ulang setiap kali salah satu bulannya
# diminta, dan semua permintaan itu menempuh jalur yang sama: riwayat
# kecamatannya tetap, cuacanya tetap, modelnya tetap. Menyimpan potongan
# rantainya membuat bulan ke-n cukup menambah satu langkah dari bulan ke-(n-1),
# bukan mengulang n langkah dari awal.
_chain_cache: dict = {}

# Cuaca bulanan sebagai peta (kecamatan, bulan) -> nilai. Pencarian bertopeng
# boolean di DataFrame dipanggil ribuan kali saat rantai disusun, dan di sanalah
# waktunya habis — bukan di modelnya.
_weather_index: dict | None = None


def reload_weather() -> None:
    """Melupakan cuaca dan rantai yang ter-cache; dipanggil setelah ingest ulang."""
    global _weather_cache, _weather_index
    _weather_cache = None
    _weather_index = None
    _chain_cache.clear()


def _months_between(start: pd.Timestamp, end: pd.Timestamp) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


def _weather_for(kecamatan_id: str, month: pd.Timestamp) -> dict:
    """Satu baris cuaca bulanan, atau kesalahan yang menyebut bulannya."""
    global _weather_index
    if _weather_index is None:
        df = monthly_weather()
        _weather_index = {
            (str(row.kecamatan_id), str(row.month_start)): {
                "rainfall_mm": float(row.rainfall_mm),
                "temp_mean_c": float(row.temp_mean_c),
                "humidity_pct": float(row.humidity_pct),
            }
            for row in df.itertuples(index=False)
        }

    found = _weather_index.get((kecamatan_id, month.strftime("%Y-%m-%d")))
    if found is None:
        raise ValueError(
            f"Cuaca bulanan {month:%Y-%m} belum tersedia, jadi prakiraan sampai "
            f"bulan itu tidak bisa disusun."
        )
    return found


def _append_month(
    history: pd.DataFrame, step: pd.Timestamp, kecamatan_id: str, cases: float
) -> pd.DataFrame:
    """Riwayat + satu bulan: iklimnya nyata, kasusnya hasil prakiraan."""
    weather = _weather_for(kecamatan_id, step)
    appended = history.iloc[-1].copy()
    appended["month_start"] = step.strftime("%Y-%m-%d")
    appended["cases"] = float(cases)
    for col, value in weather.items():
        appended[col] = value
    return pd.concat([history, appended.to_frame().T], ignore_index=True)


def _extend_history(history: pd.DataFrame, target: pd.Timestamp, model) -> pd.DataFrame:
    """Riwayat yang disambung sampai sebulan sebelum `target`.

    Model dilatih satu langkah ke depan, jadi memprakirakan Oktober dari
    observasi Desember hanya sah bila bulan-bulan di antaranya ikut diisi.
    Bulan antara diisi sebagaimana adanya: iklimnya nyata (dari BMKG), jumlah
    kasusnya prakiraan model itu sendiri, lalu dipakai sebagai lag bagi bulan
    berikutnya. Ketidakpastiannya menumpuk — itu sifat prakiraan rekursif, dan
    rentang konformal di `predictor.py` yang menanggungnya.
    """
    kecamatan_id = str(history["kecamatan_id"].iloc[-1])
    cursor = pd.Timestamp(history["month_start"].iloc[-1])
    frame = history

    while _months_between(cursor, target) > 1:
        step = cursor + pd.DateOffset(months=1)
        key = (id(model), kecamatan_id, step.strftime("%Y-%m"))

        cached = _chain_cache.get(key)
        if cached is None:
            predicted = max(0.0, float(model.predict(_assemble(frame, step))[0]))
            cached = _append_month(frame, step, kecamatan_id, predicted)
            _chain_cache[key] = cached

        frame = cached
        cursor = step

    return frame


def warm_forecast_chain(df_hist: pd.DataFrame, target_month, model) -> None:
    """Melalui rantai bulan antara sekali saja, serentak untuk semua kecamatan.

    `_extend_history` bekerja per kecamatan. Dipakai apa adanya untuk menyusun
    sepuluh bulan prakiraan di 16 kecamatan, ia memanggil model ratusan kali
    untuk baris-baris yang bentuknya sama. Di sini langkahnya dibalik: satu
    langkah bulan untuk seluruh kota sekaligus, satu panggilan model per
    langkah, hasilnya mengisi memo yang sama yang dibaca `_extend_history`.

    Berhenti diam-diam bila ada yang kurang — cuaca bulan antara, misalnya:
    jalur per kecamatan akan menemui hal yang sama dan melaporkannya dengan
    bulan yang tepat.
    """
    if df_hist is None or df_hist.empty or model is None:
        return

    target = pd.Timestamp(target_month)
    frames = {
        str(kec_id): group.sort_values("month_start").reset_index(drop=True)
        for kec_id, group in df_hist.groupby("kecamatan_id")
    }
    frames = {k: g for k, g in frames.items() if len(g) >= 3}
    if not frames:
        return

    cursor = max(pd.Timestamp(g["month_start"].iloc[-1]) for g in frames.values())

    while _months_between(cursor, target) > 1:
        step = cursor + pd.DateOffset(months=1)
        label = step.strftime("%Y-%m")

        stale = [
            kec_id
            for kec_id, frame in frames.items()
            if (id(model), kec_id, label) not in _chain_cache
            and _months_between(pd.Timestamp(frame["month_start"].iloc[-1]), step) == 1
        ]

        if stale:
            rows = [_assemble(frames[kec_id], step) for kec_id in stale]
            try:
                predicted = model.predict(pd.concat(rows, ignore_index=True))
            except Exception:  # noqa: BLE001 — jalur per kecamatan yang melaporkannya
                return
            for kec_id, value in zip(stale, predicted):
                try:
                    _chain_cache[(id(model), kec_id, label)] = _append_month(
                        frames[kec_id], step, kec_id, max(0.0, float(value))
                    )
                except ValueError:
                    return

        for kec_id in list(frames):
            extended = _chain_cache.get((id(model), kec_id, label))
            if extended is not None:
                frames[kec_id] = extended

        cursor = step


def roll_forward(df_kec: pd.DataFrame, target_month, model=None) -> pd.DataFrame:
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
    history = df_kec.sort_values("month_start").reset_index(drop=True)
    if len(history) < 3:
        raise ValueError(
            "Butuh minimal 3 bulan riwayat berturut-turut untuk menyusun fitur lag."
        )

    last_month = pd.Timestamp(history["month_start"].iloc[-1])
    target = pd.Timestamp(target_month)

    # Model ini dilatih satu langkah ke depan: `cases_lag1` selalu berarti
    # "bulan tepat sebelum bulan yang diprakirakan". Bulan yang lebih jauh
    # dijangkau dengan menyambung riwayatnya lebih dulu (`_extend_history`),
    # bukan dengan menyodorkan jendela lag yang jaraknya salah.
    gap = _months_between(last_month, target)
    if gap < 1:
        raise ValueError(
            f"Prakiraan hanya untuk bulan sesudah observasi terakhir "
            f"({last_month:%Y-%m}), sedangkan yang diminta {target:%Y-%m}."
        )
    if gap > 1:
        if model is None:
            raise ValueError(
                f"Prakiraan {target:%Y-%m} berjarak {gap} bulan dari observasi "
                f"terakhir ({last_month:%Y-%m}) dan butuh penyambungan bertahap; "
                f"model wajib disertakan."
            )
        history = _extend_history(history, target, model)

    return _assemble(history, target)


def _assemble(history: pd.DataFrame, target: pd.Timestamp) -> pd.DataFrame:
    """Baris fitur bulan `target` dari riwayat yang lag-nya sudah tepat."""
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
    df_hist: pd.DataFrame, df_kec: pd.DataFrame, target_month, model=None
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

    return roll_forward(df_kec, target_month, model=model)


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
