"""Pembagian kasus rekap ke sel kecamatan x periode.

Dinkes menerbitkan dua rekap terpisah: total per puskesmas/kelurahan untuk
satu tahun, dan total sekota per bulan (leptospirosis) atau per minggu (DBD).
Tidak ada rekap yang memuat keduanya sekaligus, jadi angka per kecamatan per
periode harus dibagi dari dua total itu.
"""
from typing import Sequence


def allocate_two_margins(row_totals: Sequence[int], col_totals: Sequence[int]) -> list[list[int]]:
    """Mengisi matriks bilangan bulat yang jumlah baris dan kolomnya tepat.

    Baris = kecamatan (total periode), kolom = bulan/minggu (total sekota).
    Setiap kolom dibagi ke baris sebanding sisa kuota baris itu dengan metode
    sisa terbesar, dan tidak ada baris yang melewati kuotanya. Karena jumlah
    sisa kuota selalu sama dengan jumlah kolom yang belum diisi, kolom terakhir
    selalu pas, sehingga total per kecamatan dan total sekota per periode sama
    persis dengan sumbernya.
    """
    if sum(row_totals) != sum(col_totals):
        raise ValueError(
            f"Total per wilayah ({sum(row_totals)}) tidak sama dengan total per periode "
            f"({sum(col_totals)}); rekap sumber tidak konsisten."
        )

    remaining = [int(total) for total in row_totals]
    matrix = [[0] * len(col_totals) for _ in row_totals]

    for col, col_total in enumerate(col_totals):
        pool = sum(remaining)
        if col_total <= 0 or pool <= 0:
            continue
        raw = [col_total * rem / pool for rem in remaining]
        alloc = [min(int(value), rem) for value, rem in zip(raw, remaining)]
        # Sisa terbesar dulu; indeks baris memutus seri agar hasilnya deterministik.
        order = sorted(range(len(raw)), key=lambda i: (-(raw[i] - int(raw[i])), i))
        deficit = col_total - sum(alloc)
        while deficit > 0:
            for i in order:
                if deficit == 0:
                    break
                if alloc[i] < remaining[i]:
                    alloc[i] += 1
                    deficit -= 1
        for i, value in enumerate(alloc):
            matrix[i][col] = value
            remaining[i] -= value

    return matrix
