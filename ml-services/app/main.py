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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.backtest import router as backtest_router
from app.routes.retrain import router as retrain_router
from app.schemas.response import HealthResponse
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

# CORS — mengizinkan frontend (Next.js) dan backend gateway (Express) mengakses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Untuk development; batasi di production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(predict_router, prefix="/predict", tags=["Predict"])
app.include_router(backtest_router, prefix="/backtest", tags=["Backtest"])
app.include_router(retrain_router, prefix="/retrain", tags=["Retrain"])


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check — menampilkan status service dan model yang tersedia."""
    models_info = get_loaded_models_info()
    return HealthResponse(
        status="ok",
        diseases_available=[d.upper() for d in DISEASES],
        models_loaded=models_info,
    )
