"""Guards against turning an incomplete reporting year into future zeroes."""

from pathlib import Path

import etl.etl_kasus_dbd as etl_dbd


def test_reported_week_limit_uses_last_week_present_in_source(tmp_path: Path, monkeypatch):
    cases_dir = tmp_path / "kasus"
    cases_dir.mkdir()
    (cases_dir / "jumlah-pasien-dbd-minguan_2026.csv").write_text(
        "Category,Penderita Laki-laki,Penderita Perempuan\n"
        "10,1,0\n"
        "16,1,0\n"
        "35,1,0\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(etl_dbd, "DATASET_RAW_KASUS", cases_dir)

    assert etl_dbd.reported_week_limit(2026) == 35


def test_reported_week_limit_falls_back_to_full_year_without_source(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(etl_dbd, "DATASET_RAW_KASUS", tmp_path)

    assert etl_dbd.reported_week_limit(2026) == 52


def test_partial_year_weeks_stop_at_report_month(monkeypatch):
    monkeypatch.setattr(etl_dbd, "CASE_REPORT_THROUGH", "2026-08-01")

    weeks = etl_dbd.partial_year_weeks(2026)

    assert len(weeks) == 35
    assert str(weeks[-1].date()) == "2026-08-31"
