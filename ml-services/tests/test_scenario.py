"""Peringkat simulator: skor sama berbagi peringkat, bukan diurut menurut nama."""
from app.services.scenario import _assign_ranks


def _row(nama, score):
    return {"kecamatan_nama": nama, "score": score}


def test_skor_sama_berbagi_peringkat():
    rows = [_row("Candisari", 80), _row("Banyumanik", 96), _row("Mijen", 96), _row("Tugu", None)]
    _assign_ranks(rows, "score", "rank")
    ranks = {r["kecamatan_nama"]: r["rank"] for r in rows}
    assert ranks == {"Banyumanik": 1, "Mijen": 1, "Candisari": 3, "Tugu": None}


def test_skor_seri_tidak_bergeser_karena_nama():
    """Kecamatan yang skornya tetap dan seri tidak boleh tampak berpindah."""
    before = [_row("Gayamsari", 96), _row("Mijen", 96), _row("Genuk", 93)]
    after = [_row("Gayamsari", 96), _row("Mijen", 96), _row("Genuk", 93)]
    _assign_ranks(before, "score", "rank")
    _assign_ranks(after, "score", "rank")
    assert [r["rank"] for r in before] == [r["rank"] for r in after] == [1, 1, 3]
