"""Varian model yang ikut memakai sinyal warga, untuk dibandingkan.

Ini bagian terakhir lingkaran PRD §5.6a: warga melapor, petugas memverifikasi,
lalu laporan terverifikasi ikut melatih. Yang dilatih di sini **bukan** model
yang melayani `/predict`. Ia model kembar yang hanya berbeda satu kolom, dilatih
dan diuji pada pemisahan yang sama persis, semata-mata untuk menjawab satu
pertanyaan: apakah menambahkan sinyal warga memperbaiki prakiraan, dan berapa.

Dipisahkan begitu karena dua alasan. Prakiraan yang dipakai petugas tidak boleh
berubah diam-diam setiap kali seseorang menekan tombol pelatihan ulang. Dan
jawaban "ternyata tidak memperbaiki" sama berharganya dengan "memperbaiki" —
tetapi hanya kalau ia boleh muncul, dan itu menuntut modelnya berdiri terpisah
dari yang dikirim.
"""
import logging
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import CITIZEN_FEATURE, FEATURE_COLUMNS, TARGET_COLUMN
from features.citizen_signal import attach

logger = logging.getLogger(__name__)


def compare(
    model_factory,
    df: pd.DataFrame,
    split_date: str,
    signal: pd.DataFrame,
    without_metrics: dict,
    log_transform: bool,
) -> Optional[dict]:
    """Metrik model dengan sinyal warga, berdampingan dengan yang tanpa.

    `without_metrics` diterima apa adanya dari pelatihan utama, bukan dihitung
    ulang di sini. Menghitungnya dua kali membuka celah keduanya berbeda karena
    alasan selain sinyal warga — dan perbandingan yang selisihnya bisa berasal
    dari mana saja tidak menjawab apa pun.
    """
    enriched = attach(df, signal)
    columns = list(FEATURE_COLUMNS) + [CITIZEN_FEATURE]

    train_df = enriched[enriched["month_start"] < split_date]
    test_df = enriched[enriched["month_start"] >= split_date]
    if train_df.empty or test_df.empty:
        return None

    y_train = train_df[TARGET_COLUMN]
    model = model_factory()
    model.fit(train_df[columns], np.log1p(y_train) if log_transform else y_train)

    y_test = test_df[TARGET_COLUMN]
    y_pred = np.clip(model.predict(test_df[columns]), 0, None)

    with_metrics = {
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        "r2": round(float(r2_score(y_test, y_pred)), 4),
    }

    delta = without_metrics["mae"] - with_metrics["mae"]
    nonzero = int((train_df[CITIZEN_FEATURE] > 0).sum())
    share = nonzero / len(train_df) if len(train_df) else 0.0

    if delta > 0:
        verdict = (
            f"Menyertakan sinyal warga menurunkan MAE sebesar {delta:.4f} kasus/bulan "
            f"({delta / without_metrics['mae'] * 100:.1f}%)."
        )
    elif delta < 0:
        verdict = (
            f"Menyertakan sinyal warga justru menaikkan MAE sebesar {abs(delta):.4f} "
            "kasus/bulan. Model yang melayani prakiraan tetap yang tanpa sinyal warga."
        )
    else:
        verdict = "Menyertakan sinyal warga tidak mengubah MAE."

    note = (
        f"{verdict} Kolom {CITIZEN_FEATURE} terisi pada {nonzero} dari "
        f"{len(train_df)} baris latih ({share:.0%}). Kedua model dilatih dan diuji "
        "pada pemisahan yang sama dan hanya berbeda satu kolom."
    )
    logger.info(note)

    return {"without": without_metrics, "with_signal": with_metrics, "note": note}
