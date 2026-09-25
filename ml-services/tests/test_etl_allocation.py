"""Pembagian rekap tahun berjalan harus menjaga kedua total sumbernya."""

import pytest

from etl.allocation import allocate_two_margins


def test_keeps_row_and_column_totals():
    rows = [11, 11, 7, 7, 5, 5, 4, 4, 4, 3, 2, 1, 1, 1, 1, 0]
    cols = [13, 23, 9, 10, 6, 4, 1, 1]

    matrix = allocate_two_margins(rows, cols)

    assert [sum(row) for row in matrix] == rows
    assert [sum(col) for col in zip(*matrix)] == cols
    assert all(value >= 0 for row in matrix for value in row)


def test_empty_row_and_column_stay_zero():
    matrix = allocate_two_margins([2, 0, 1, 1], [0, 1, 1, 0, 2])

    assert matrix[1] == [0, 0, 0, 0, 0]
    assert [row[0] for row in matrix] == [0, 0, 0, 0]
    assert [sum(col) for col in zip(*matrix)] == [0, 1, 1, 0, 2]


def test_rejects_inconsistent_sources():
    with pytest.raises(ValueError):
        allocate_two_margins([3, 1], [2, 1])
