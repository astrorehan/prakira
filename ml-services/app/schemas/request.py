from pydantic import BaseModel, Field
from typing import Literal


class PredictRequest(BaseModel):
    """Request untuk endpoint /predict (single kecamatan)."""
    kecamatan_id: str = Field(..., example="33.74.01", description="Kode BPS kecamatan")
    disease: Literal["DBD", "ISPA"] = Field(..., example="DBD")
    month: str = Field(
        ...,
        example="2026-09-01",
        description="Bulan prediksi dalam format YYYY-MM-01 (hari diabaikan, selalu dipakai tanggal 1)",
    )


class BatchPredictRequest(BaseModel):
    """Request untuk endpoint /predict/batch (semua 16 kecamatan sekaligus)."""
    disease: Literal["DBD", "ISPA"] = Field(..., example="DBD")
    month: str = Field(
        ...,
        example="2026-09-01",
        description="Bulan prediksi dalam format YYYY-MM-01",
    )


class RetrainRequest(BaseModel):
    """Request untuk endpoint /retrain."""
    disease: Literal["DBD", "ISPA"] = Field(..., example="DBD")
    include_citizen: bool = Field(
        default=False,
        description="Apakah menyertakan sinyal warga terverifikasi sebagai fitur tambahan",
    )
