"""
PRAKIRA ML Service — FastAPI Entry Point

Layanan prediksi risiko penyakit berbasis iklim untuk Kota Semarang.
Endpoint: /predict, /predict/batch, /backtest, /retrain, /health
Port default: 8001
"""
import sys
from pathlib import Path

# Pastikan root ml-services ada di sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.backtest import router as backtest_router
from app.routes.retrain import router as retrain_router
from app.schemas.response import HealthResponse
from app.security import require_service_token
from app.services.predictor import get_loaded_models_info
from config import DISEASES

app = FastAPI(
    title="PRAKIRA ML Service",
    description=(
        "Layanan prediksi risiko penyakit berbasis iklim — Kota Semarang. "
        "Menyediakan endpoint untuk prediksi per kecamatan, backtesting model, "
        "dan retraining. Granularitas: bulanan."
    ),
    version="1.0.0",
)

# CORS.
#
# Layanan ini dipanggil server-ke-server oleh gateway Express, bukan oleh
# peramban, jadi daftar asal default-nya kosong — tidak ada yang perlu
# diizinkan. `allow_origins=["*"]` bersama `allow_credentials=True` juga
# ditolak spesifikasi CORS, jadi kombinasi lama itu tidak pernah benar-benar
# bekerja. Isi `ML_CORS_ORIGINS` hanya bila memang ada halaman yang memanggil
# layanan ini langsung.
_cors_origins = [o.strip() for o in os.getenv("ML_CORS_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type", "x-ml-token"],
    )

# Register routes.
#
# `/health` sengaja dibiarkan terbuka: Render memakainya sebagai health check
# dan isinya hanya versi model. Sisanya butuh token bersama — terutama
# `/retrain`, yang menimpa berkas model di disk.
_guard = [Depends(require_service_token)]
app.include_router(predict_router, prefix="/predict", tags=["Predict"], dependencies=_guard)
app.include_router(backtest_router, prefix="/backtest", tags=["Backtest"], dependencies=_guard)
app.include_router(retrain_router, prefix="/retrain", tags=["Retrain"], dependencies=_guard)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check — menampilkan status service dan model yang tersedia."""
    models_info = get_loaded_models_info()
    return HealthResponse(
        status="ok",
        diseases_available=[d.upper() for d in DISEASES],
        models_loaded=models_info,
    )
