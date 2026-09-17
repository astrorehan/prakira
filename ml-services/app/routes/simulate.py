"""
Endpoint /simulate — prakiraan ulang di bawah cuaca yang digeser.

Menerima geseran iklim (persen curah hujan, delta suhu, delta kelembaban) lalu
mengembalikan prakiraan dasar dan prakiraan skenario untuk seluruh 16
kecamatan sekaligus, lengkap dengan peringkatnya masing-masing supaya sisi
pemanggil bisa menunjukkan kecamatan mana yang naik dan mana yang turun.

Satu permintaan = 32 prediksi (16 dasar + 16 skenario). Cukup murah untuk
dipanggil ulang tiap kali penggeser dilepas, tapi bukan tiap piksel — sisi
pemanggil wajib menahannya (debounce).
"""
from fastapi import APIRouter, HTTPException

from app.schemas.request import SimulateRequest
from app.schemas.response import SimulateResponse
from app.services.predictor import load_for_disease
from app.services.scenario import simulate_batch

router = APIRouter()


@router.post("", response_model=SimulateResponse)
@router.post("/", response_model=SimulateResponse)
async def simulate(req: SimulateRequest):
    try:
        model, df_hist = load_for_disease(req.disease)
        result = simulate_batch(
            model=model,
            df_hist=df_hist,
            disease=req.disease,
            month=req.month,
            rainfall_pct=req.rainfall_pct,
            temp_delta_c=req.temp_delta_c,
            humidity_delta_pct=req.humidity_delta_pct,
        )
        return SimulateResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
