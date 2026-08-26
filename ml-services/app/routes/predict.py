from fastapi import APIRouter, HTTPException
from app.schemas.request import PredictRequest, BatchPredictRequest
from app.schemas.response import PredictionResult, BatchPredictionResponse
from app.services.predictor import predict_single, predict_batch

router = APIRouter()


@router.post("", response_model=PredictionResult)
@router.post("/", response_model=PredictionResult)
async def predict(req: PredictRequest):
    """Prediksi risiko untuk satu kecamatan, satu penyakit, satu bulan."""
    try:
        result = predict_single(
            kecamatan_id=req.kecamatan_id,
            disease=req.disease,
            month=req.month,
        )
        return PredictionResult(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/batch", response_model=BatchPredictionResponse)
async def predict_batch_endpoint(req: BatchPredictRequest):
    """Prediksi risiko untuk semua 16 kecamatan sekaligus."""
    try:
        results = predict_batch(disease=req.disease, month=req.month)
        predictions = [PredictionResult(**r) for r in results]
        return BatchPredictionResponse(
            disease=req.disease,
            month=req.month,
            predictions=predictions,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
