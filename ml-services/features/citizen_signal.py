"""Kelayakan sinyal warga sebagai fitur pelatihan.

PRD §5.6a menjanjikan lingkaran tertutup: warga melapor, petugas memverifikasi,
laporan terverifikasi ikut melatih model berikutnya. Lingkaran itu hanya sah
kalau bagian terakhirnya benar-benar terjadi.

Sebelumnya `/retrain` menerima `include_citizen: true`, tidak melakukan apa pun
dengannya, lalu mengembalikannya di badan jawaban sebagai `include_citizen:
true`. Petugas yang menekan tombolnya menerima konfirmasi bahwa sinyal warga
sudah disertakan, padahal model yang dilatih persis sama dengan tanpa tombol
itu. Kesalahannya sekeluarga dengan C1: sebuah permukaan yang melaporkan skema
selain yang dijalankan.

Berkas ini memindahkan keputusannya ke satu tempat dan membuatnya bisa
diperiksa. Bila cakupannya kurang, permintaannya ditolak beserta angka
alasannya — berapa bulan tertutup dari berapa yang dibutuhkan. Menolak dengan
alasan yang jelas lebih berguna daripada menerima diam-diam, dan jauh lebih
berguna daripada melatih model pada kolom yang isinya hampir seluruhnya nol.
"""
from dataclasses import dataclass
from typing import Iterable, List, Optional

import numpy as np
import pandas as pd

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import (
    CITIZEN_FEATURE,
    KECAMATAN_SEMARANG,
    MIN_CITIZEN_COVERAGE,
    MIN_CITIZEN_MONTHS,
)

# Gateway mengagregasi laporan menurut *nama* kecamatan, sedangkan berkas fitur
# memakai kode BPS. Peta ini yang mempertemukan keduanya; tanpa itu penggabungan
# menghasilkan kolom yang seluruhnya nol tanpa satu pun galat.
_ID_BY_NAME = {k["name"].lower(): k["id"] for k in KECAMATAN_SEMARANG}


@dataclass(frozen=True)
class CitizenSignalAssessment:
    """Putusan kelayakan, beserta angka yang melahirkannya."""

    eligible: bool
    months_covered: int
    months_required: int
    train_months: int
    coverage: float
    coverage_required: float
    total_verified: int
    reason: str


def assess(
    train_months: Iterable, signal: Optional[pd.DataFrame]
) -> CitizenSignalAssessment:
    """Apakah sinyal warga cukup untuk ikut melatih model.

    `signal` berisi kolom `month` dan `verified` — hasil agregasi laporan
    berstatus terverifikasi per kecamatan per bulan. `train_months` adalah
    bulan-bulan yang benar-benar dipakai melatih.

    Dua syarat harus terpenuhi bersamaan. **Porsi** menjaga fitur itu tidak
    kosong di sebagian besar baris latih. **Jumlah bulan** menjaga cakupannya
    merentang sekurang-kurangnya satu siklus musim: dua belas bulan berturut
    dengan laporan lebih berarti daripada dua puluh bulan yang semuanya jatuh
    di musim hujan.
    """
    months = sorted({pd.Timestamp(m).strftime("%Y-%m") for m in train_months})
    n_train = len(months)
    required_by_share = int(round(n_train * MIN_CITIZEN_COVERAGE))
    required = max(MIN_CITIZEN_MONTHS, required_by_share)

    if signal is None or signal.empty:
        return CitizenSignalAssessment(
            eligible=False,
            months_covered=0,
            months_required=required,
            train_months=n_train,
            coverage=0.0,
            coverage_required=MIN_CITIZEN_COVERAGE,
            total_verified=0,
            reason=(
                "Belum ada satu pun laporan warga terverifikasi yang jatuh di "
                f"periode latih ({n_train} bulan). Model dilatih tanpa sinyal warga."
            ),
        )

    # Bulan dibandingkan dalam bentuk "YYYY-MM" di kedua sisi. Membandingkan
    # `Timestamp` dengan string tidak melempar apa pun di pandas — ia hanya
    # tidak pernah cocok, dan hitungannya diam-diam menjadi nol.
    signal_month = signal["month"].map(lambda m: pd.Timestamp(m).strftime("%Y-%m"))
    in_window = signal_month.isin(months)

    covered = set(signal_month[in_window & (signal["verified"] > 0)])
    n_covered = len(covered)
    total = int(signal.loc[in_window, "verified"].sum())
    coverage = n_covered / n_train if n_train else 0.0

    if n_covered >= required:
        return CitizenSignalAssessment(
            eligible=True,
            months_covered=n_covered,
            months_required=required,
            train_months=n_train,
            coverage=coverage,
            coverage_required=MIN_CITIZEN_COVERAGE,
            total_verified=total,
            reason=(
                f"{total} laporan terverifikasi menutupi {n_covered} dari "
                f"{n_train} bulan latih — cukup untuk ikut melatih model."
            ),
        )

    return CitizenSignalAssessment(
        eligible=False,
        months_covered=n_covered,
        months_required=required,
        train_months=n_train,
        coverage=coverage,
        coverage_required=MIN_CITIZEN_COVERAGE,
        total_verified=total,
        reason=(
            f"Laporan warga terverifikasi baru menutupi {n_covered} dari "
            f"{n_train} bulan latih ({coverage:.0%}); dibutuhkan sekurang-kurangnya "
            f"{required} bulan. Melatih dengan kolom yang kosong di sebagian besar "
            "baris tidak menghasilkan apa pun yang bisa dipelajari model, tetapi "
            "membuat halaman transparansi menyatakan sinyal warga sudah ikut "
            "menentukan prakiraan. Model dilatih tanpa sinyal warga."
        ),
    )


def normalise(rows: Optional[List[dict]]) -> Optional[pd.DataFrame]:
    """Membakukan sinyal dari gateway menjadi (kecamatan_id, month, verified).

    Baris dengan nama kecamatan yang tidak dikenali dibuang — bukan dibiarkan
    lewat dengan kunci apa adanya. Kunci yang tidak pernah cocok akan
    menghasilkan kolom nol yang terlihat seperti "belum ada laporan" padahal
    sebenarnya "laporannya ada tapi tidak tersambung", dan dua keadaan itu
    menuntut tindakan yang berbeda.
    """
    if not rows:
        return None
    df = pd.DataFrame(rows)
    if df.empty or "month" not in df:
        return None

    df["kecamatan_id"] = (
        df["kecamatan"].astype(str).str.strip().str.lower().map(_ID_BY_NAME)
    )
    df = df.dropna(subset=["kecamatan_id"]).copy()
    if df.empty:
        return None

    df["month"] = pd.to_datetime(df["month"]).dt.to_period("M").dt.to_timestamp()
    df["verified"] = pd.to_numeric(df["verified"], errors="coerce").fillna(0).astype(int)
    return (
        df.groupby(["kecamatan_id", "month"], as_index=False)["verified"].sum()
    )


def attach(df: pd.DataFrame, signal: pd.DataFrame) -> pd.DataFrame:
    """Menambahkan `citizen_verified_lag1` ke berkas fitur.

    Lag satu bulan, bukan bulan berjalan. Alasannya sama dengan seluruh fitur
    lain di model ini: prakiraan bulan T disusun sebelum bulan T berlangsung,
    jadi laporan warga bulan T belum ada saat prakiraannya dibuat. Memakai
    bulan berjalan berarti memberi model informasi dari masa depan — bocor,
    dan bocornya tepat ke arah yang membuat metriknya terlihat bagus.
    """
    out = df.copy()
    lagged = signal.copy()
    lagged["month"] = lagged["month"] + pd.DateOffset(months=1)
    lagged = lagged.rename(columns={"month": "month_start", "verified": CITIZEN_FEATURE})

    out["month_start"] = pd.to_datetime(out["month_start"])
    out = out.merge(lagged, on=["kecamatan_id", "month_start"], how="left")
    out[CITIZEN_FEATURE] = out[CITIZEN_FEATURE].fillna(0.0).astype("float64")
    return out
