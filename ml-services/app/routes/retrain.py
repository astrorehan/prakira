from fastapi import APIRouter, HTTPException
from app.schemas.request import RetrainRequest
from app.schemas.response import RetrainResponse, BacktestMetrics
from app.services.predictor import reload_models

import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import MODELS_DIR, DISEASE_CONFIG

router = APIRouter()


@router.post("", response_model=RetrainResponse)
@router.post("/", response_model=RetrainResponse)
async def retrain(req: RetrainRequest):
    """Memicu retraining model untuk penyakit tertentu.

    Endpoint ini memanggil training script yang sudah ada.
    include_citizen=True akan menyertakan sinyal warga (fase 2 — saat ini disimulasikan).
    """
    disease_lower = req.disease.lower()
    if disease_lower not in DISEASE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Disease '{req.disease}' not supported.")

    cfg = DISEASE_CONFIG[disease_lower]
    meta_path = MODELS_DIR / "metadata.json"

    # Baca versi sebelumnya sebelum retrain
    previous_version = None
    if meta_path.exists():
        with open(meta_path, "r") as f:
            old_meta = json.load(f)
        previous_version = old_meta.get(disease_lower, {}).get("version")

    try:
        if disease_lower == "dbd":
            from training.train_dbd import train_dbd_model
            result = train_dbd_model()
        elif disease_lower == "ispa":
            from training.train_ispa import train_ispa_model
            result = train_ispa_model()
        elif disease_lower == "leptospirosis":
            from training.train_leptospirosis import train_leptospirosis_model
            result = train_leptospirosis_model()
        else:
            raise HTTPException(status_code=501, detail=f"Retrain for '{req.disease}' not implemented yet.")

        if result is None:
            raise HTTPException(status_code=500, detail="Training failed — check logs.")

        _model, new_meta = result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrain error: {str(e)}")

    # Clear model cache agar prediksi berikutnya memakai model baru
    reload_models()

    # Tentukan apakah ada improvement
    improved = False
    if previous_version:
        old_mae = old_meta.get(disease_lower, {}).get("metrics", {}).get("mae", float("inf"))
        new_mae = new_meta.get("metrics", {}).get("mae", float("inf"))
        improved = new_mae < old_mae

    return RetrainResponse(
        status="success",
        disease=req.disease.upper(),
        new_version=new_meta.get("version", "unknown"),
        include_citizen=req.include_citizen,
        metrics=BacktestMetrics(
            mae=new_meta["metrics"]["mae"],
            rmse=new_meta["metrics"]["rmse"],
            r2=new_meta["metrics"]["r2"],
        ),
        previous_version=previous_version,
        improved=improved,
    )
