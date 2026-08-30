from pydantic import BaseModel, Field
from typing import Literal

from config import DISEASE_CONFIG

# Daftar penyakit yang sah diturunkan dari DISEASE_CONFIG, bukan ditulis ulang
# di sini. Sebelumnya ketiga model di bawah memakai Literal["DBD", "ISPA"] yang
# dipatok manual, sehingga menambah penyakit di config saja tidak cukup:
# /predict dan /retrain menolaknya dengan 422 sebelum permintaan sempat sampai
# ke predictor — padahal predictor sendiri sudah generik (`disease.lower()`
# dicari di DISEASE_CONFIG). Dengan diturunkan, satu entri baru di config
# langsung berlaku untuk seluruh endpoint sekaligus tetap muncul sebagai enum
# di dokumentasi OpenAPI.
DiseaseName = Literal[tuple(name.upper() for name in DISEASE_CONFIG)]  # type: ignore[valid-type]

_EXAMPLE_DISEASE = next(iter(DISEASE_CONFIG)).upper()


class PredictRequest(BaseModel):
    """Request untuk endpoint /predict (single kecamatan)."""
    kecamatan_id: str = Field(..., example="33.74.01", description="Kode BPS kecamatan")
    disease: DiseaseName = Field(..., example=_EXAMPLE_DISEASE)
    month: str = Field(
        ...,
        example="2026-09-01",
        description="Bulan prediksi dalam format YYYY-MM-01 (hari diabaikan, selalu dipakai tanggal 1)",
    )


class BatchPredictRequest(BaseModel):
    """Request untuk endpoint /predict/batch (semua 16 kecamatan sekaligus)."""
    disease: DiseaseName = Field(..., example=_EXAMPLE_DISEASE)
    month: str = Field(
        ...,
        example="2026-09-01",
        description="Bulan prediksi dalam format YYYY-MM-01",
    )


class RetrainRequest(BaseModel):
    """Request untuk endpoint /retrain."""
    disease: DiseaseName = Field(..., example=_EXAMPLE_DISEASE)
    include_citizen: bool = Field(
        default=False,
        description="Apakah menyertakan sinyal warga terverifikasi sebagai fitur tambahan",
    )


class ExplainRequest(BaseModel):
    """Request untuk endpoint /explain (kontribusi fitur satu kecamatan)."""
    kecamatan_id: str = Field(..., example="33.74.01", description="Kode BPS kecamatan")
    disease: DiseaseName = Field(..., example=_EXAMPLE_DISEASE)
    month: str = Field(
        ...,
        example="2026-09-01",
        description="Bulan prakiraan yang sedang diterangkan, format YYYY-MM-01",
    )


class SimulateRequest(BaseModel):
    """Request untuk endpoint /simulate (skenario cuaca what-if).

    Batas nilainya ditegakkan dua kali dengan sengaja: di sini supaya penolakan
    datang cepat dan terbaca sebagai 422, dan sekali lagi di `scenario.py`
    supaya pemanggil lain — termasuk skrip — tidak bisa melewatinya.
    """
    disease: DiseaseName = Field(..., example=_EXAMPLE_DISEASE)
    month: str = Field(..., example="2026-09-01", description="Bulan prakiraan, format YYYY-MM-01")
    rainfall_pct: float = Field(
        default=0.0,
        ge=-100.0,
        le=200.0,
        description="Geseran curah hujan dalam persen terhadap nilai terakhir kecamatan",
    )
    temp_delta_c: float = Field(
        default=0.0,
        ge=-5.0,
        le=5.0,
        description="Geseran suhu rata-rata dalam derajat Celsius",
    )
    humidity_delta_pct: float = Field(
        default=0.0,
        ge=-30.0,
        le=30.0,
        description="Geseran kelembaban dalam poin persen",
    )
