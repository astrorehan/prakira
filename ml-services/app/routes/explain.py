"""
Endpoint /explain — kontribusi fitur untuk satu prakiraan.

Jawaban atas pertanyaan yang paling sering datang setelah angka muncul di
layar: "kenapa segini?". Bukan importance global model (itu ada di
`/backtest` sebagai `top_features`), melainkan kontribusi lokal pada satu
kecamatan pada satu bulan. Keduanya dikirim berdampingan justru supaya
bedanya terlihat.
"""
from fastapi import APIRouter, HTTPException

from app.schemas.request import ExplainRequest
from app.schemas.response import ExplainResponse
from app.services.explainer import explain_prediction
from app.services.feature_frame import build_feature_row
from app.services.predictor import district_history, load_for_disease
from app.services.risk_classifier import assess_data_coverage

router = APIRouter()


@router.post("", response_model=ExplainResponse)
@router.post("/", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    try:
        model, df_hist = load_for_disease(req.disease)
        df_kec = district_history(df_hist, req.kecamatan_id)

        total_months = df_hist["month_start"].nunique() if not df_hist.empty else 0
        coverage = assess_data_coverage(
            req.kecamatan_id, req.disease.upper(), df_hist, total_months
        )
        if coverage == "insufficient":
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cakupan data kecamatan {req.kecamatan_id} tidak memadai untuk "
                    "penyakit ini, jadi tidak ada prakiraan yang bisa diterangkan."
                ),
            )

        feature_row = build_feature_row(df_hist, df_kec)
        result = explain_prediction(model, df_hist, df_kec, feature_row)

        return ExplainResponse(
            kecamatan_id=req.kecamatan_id,
            disease=req.disease.upper(),
            month=req.month,
            data_coverage=coverage,
            **result,
        )
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
