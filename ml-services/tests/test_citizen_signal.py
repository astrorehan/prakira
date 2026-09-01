"""Kunci untuk lingkaran warga -> verifikasi -> pelatihan ulang (PRD §5.6a).

Dua kegagalan yang dijaga di sini, dan keduanya diam.

Yang pertama: `include_citizen: true` diterima, diabaikan, lalu dikembalikan
sebagai `true`. Petugas menerima konfirmasi bahwa laporan warga sudah ikut
melatih model, padahal modelnya persis sama. Tidak ada galat, tidak ada log —
hanya klaim yang tidak benar, sekeluarga dengan C1.

Yang kedua lebih halus: menggabungkan laporan bulan berjalan alih-alih bulan
sebelumnya. Prakiraan bulan T disusun sebelum bulan T berlangsung, jadi laporan
bulan T belum ada saat itu. Kebocoran seperti itu justru membuat metriknya
terlihat membaik — persis arah yang membuatnya tidak dicurigai.
"""
import numpy as np
import pandas as pd
import pytest

from config import (
    CITIZEN_FEATURE,
    KECAMATAN_SEMARANG,
    MIN_CITIZEN_COVERAGE,
    MIN_CITIZEN_MONTHS,
)
from features.citizen_signal import assess, attach, normalise

KEC = KECAMATAN_SEMARANG[0]


def signal_rows(months, verified=3, name=None):
    return [
        {"kecamatan": name or KEC["name"], "month": m, "verified": verified}
        for m in months
    ]


def month_range(n, start="2024-01-01"):
    return [d.strftime("%Y-%m-%d") for d in pd.date_range(start, periods=n, freq="MS")]


# ── Pembakuan dari gateway ──────────────────────────────────────────────────


def test_normalise_maps_district_names_to_bps_codes():
    """Gateway memakai nama, berkas fitur memakai kode BPS."""
    out = normalise(signal_rows(["2025-01-01"]))
    assert out is not None
    assert out["kecamatan_id"].iloc[0] == KEC["id"]


def test_normalise_drops_districts_it_cannot_resolve():
    """Nama tak dikenal dibuang, bukan dibawa lewat dengan kunci apa adanya.

    Kunci yang tidak pernah cocok menghasilkan kolom nol yang terbaca sebagai
    "belum ada laporan", padahal keadaannya "laporannya ada tapi tidak
    tersambung". Keduanya menuntut tindakan yang berbeda.
    """
    out = normalise(signal_rows(["2025-01-01"], name="Kecamatan Antah Berantah"))
    assert out is None


def test_normalise_sums_duplicate_month_entries():
    rows = signal_rows(["2025-01-01"], verified=2) + signal_rows(["2025-01-01"], verified=5)
    out = normalise(rows)
    assert len(out) == 1 and int(out["verified"].iloc[0]) == 7


def test_normalise_returns_none_for_nothing():
    assert normalise(None) is None
    assert normalise([]) is None


# ── Penggabungan ke berkas fitur ────────────────────────────────────────────


def feature_frame(months):
    return pd.DataFrame(
        {
            "kecamatan_id": [KEC["id"]] * len(months),
            "month_start": months,
            "cases": [1.0] * len(months),
        }
    )


def test_attach_uses_the_previous_month_not_the_current_one():
    """Penjaga kebocoran, dan yang terpenting di berkas ini.

    Laporan Januari harus muncul pada baris Februari. Kalau ia muncul pada
    baris Januari, model menerima keterangan yang belum ada saat prakiraan itu
    dibuat, dan metriknya membaik karena alasan yang salah.
    """
    months = month_range(3, "2025-01-01")
    signal = normalise(signal_rows([months[0]], verified=4))
    out = attach(feature_frame(months), signal)

    assert out.loc[0, CITIZEN_FEATURE] == 0.0, "Laporan Januari bocor ke baris Januari."
    assert out.loc[1, CITIZEN_FEATURE] == 4.0, "Laporan Januari tidak sampai ke baris Februari."
    assert out.loc[2, CITIZEN_FEATURE] == 0.0


def test_attach_fills_months_without_reports_with_zero_not_nan():
    """NaN akan menggagalkan pelatihan; nol berarti "tidak ada laporan"."""
    months = month_range(4, "2025-01-01")
    signal = normalise(signal_rows([months[1]]))
    out = attach(feature_frame(months), signal)
    assert out[CITIZEN_FEATURE].notna().all()
    assert np.isfinite(out[CITIZEN_FEATURE]).all()


def test_attach_keeps_every_original_row():
    months = month_range(6, "2025-01-01")
    frame = feature_frame(months)
    out = attach(frame, normalise(signal_rows(months[:2])))
    assert len(out) == len(frame)


# ── Kelayakan ───────────────────────────────────────────────────────────────


def test_assess_refuses_when_there_are_no_verified_reports():
    """Keadaan hari ini, dan penolakannya harus menyebut alasannya."""
    verdict = assess(pd.to_datetime(month_range(48)), None)
    assert verdict.eligible is False
    assert verdict.months_covered == 0
    assert "tanpa sinyal warga" in verdict.reason


def test_assess_refuses_coverage_that_is_too_thin():
    """Kolom yang kosong di sebagian besar baris latih tidak dipelajari model.

    Yang membuatnya berbahaya bukan ketiadaan manfaatnya, melainkan bahwa
    halaman transparansi tetap akan menyatakan sinyal warga ikut menentukan
    prakiraan.
    """
    months = month_range(48)
    verdict = assess(pd.to_datetime(months), normalise(signal_rows(months[:6])))
    assert verdict.eligible is False
    assert verdict.months_covered == 6
    assert verdict.months_required > 6
    assert str(verdict.months_covered) in verdict.reason


def test_assess_accepts_coverage_that_spans_the_training_window():
    months = month_range(48)
    verdict = assess(pd.to_datetime(months), normalise(signal_rows(months[:40])))
    assert verdict.eligible is True
    assert verdict.coverage >= MIN_CITIZEN_COVERAGE
    assert verdict.total_verified == 40 * 3


def test_assess_demands_a_full_season_even_on_a_short_training_window():
    """Porsi saja tidak cukup.

    Delapan dari sepuluh bulan memenuhi ambang porsi, tetapi delapan bulan
    berturut tidak merentang satu siklus musim — dan penyakit di sini
    seluruhnya bermusim.
    """
    months = month_range(10)
    verdict = assess(pd.to_datetime(months), normalise(signal_rows(months[:8])))
    assert verdict.coverage >= MIN_CITIZEN_COVERAGE
    assert verdict.eligible is False
    assert verdict.months_required == MIN_CITIZEN_MONTHS


def test_assess_counts_only_months_inside_the_training_window():
    """Laporan di periode uji tidak boleh menambah cakupan periode latih."""
    train = month_range(24, "2022-01-01")
    later = month_range(24, "2025-01-01")
    verdict = assess(pd.to_datetime(train), normalise(signal_rows(train[:4] + later)))
    assert verdict.months_covered == 4


def test_assess_ignores_months_reported_with_zero_verified():
    months = month_range(48)
    verdict = assess(pd.to_datetime(months), normalise(signal_rows(months, verified=0)))
    assert verdict.months_covered == 0
    assert verdict.eligible is False
