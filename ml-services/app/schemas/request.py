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
