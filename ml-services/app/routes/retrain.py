import asyncio
import shutil
from threading import Lock

import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from app.schemas.request import RetrainRequest
from app.schemas.response import RetrainResponse, BacktestMetrics
from app.services.predictor import activate_release, single_thread
from app.services.model_releases import active_artifacts, new_release_dir, publish_release

import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config import DATASET_CLEAN_DIR, DISEASE_CONFIG, FEATURE_COLUMNS

import pandas as pd

from features.citizen_signal import assess, normalise

router = APIRouter()
_retrain_lock = Lock()


@router.post("", response_model=RetrainResponse)
@router.post("/", response_model=RetrainResponse)
async def retrain(req: RetrainRequest):
    """Memicu retraining model untuk penyakit tertentu.

    Endpoint ini memanggil training script yang sudah ada.
    include_citizen=True akan melatih varian pembanding dengan sinyal warga.
    Model aktif tetap diperbarui dari pelatihan dasar; varian bersinyal hanya
    dilaporkan berdampingan sampai ada keputusan promosi yang diaudit.
    """
    disease_lower = req.disease.lower()
    if disease_lower not in DISEASE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Disease '{req.disease}' not supported.")

    # Kelayakan sinyal warga diputuskan sebelum pelatihan dimulai, dan
    # penolakannya membawa angka alasannya.
    #
    # Sebelumnya `include_citizen` diterima, tidak dipakai sama sekali, lalu
    # dikembalikan di badan jawaban sebagai `true`. Petugas yang menekannya
    # menerima konfirmasi bahwa sinyal warga sudah disertakan, padahal model
    # yang dilatih persis sama dengan tanpa tombol itu — sekeluarga dengan C1:
    # permukaan yang melaporkan skema selain yang dijalankan.
    citizen_signal = None
    if req.include_citizen:
        citizen_signal = _eligible_signal(disease_lower, req)

    # Baca versi sebelumnya sebelum retrain
    _, _, _, old_meta = active_artifacts(disease_lower)
    previous_version = old_meta.get("version")

    try:
        # Training runs in a worker thread, leaving the event loop free to serve
        # predictions from the old immutable release until publication.
        new_meta = await asyncio.to_thread(
            _train_and_publish, disease_lower, citizen_signal, req.citizen_family
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrain error: {str(e)}")

    # Tentukan apakah ada improvement
    improved = False
    if previous_version:
        old_mae = old_meta.get("metrics", {}).get("mae", float("inf"))
        new_mae = new_meta.get("metrics", {}).get("mae", float("inf"))
        improved = new_mae < old_mae

    return RetrainResponse(
        status="success",
        disease=req.disease.upper(),
        new_version=new_meta.get("version", "unknown"),
        include_citizen=req.include_citizen,
        citizen_family=req.citizen_family if req.include_citizen else None,
        citizen_signal_comparison=new_meta.get("citizen_signal_comparison"),
        metrics=BacktestMetrics(
            mae=new_meta["metrics"]["mae"],
            rmse=new_meta["metrics"]["rmse"],
            r2=new_meta["metrics"]["r2"],
        ),
        previous_version=previous_version,
        improved=improved,
    )


def _train_and_publish(disease: str, citizen_signal, citizen_family: str | None) -> dict:
    if not _retrain_lock.acquire(blocking=False):
        raise RuntimeError("Pelatihan model lain sedang berlangsung.")
    root = None
    published = False
    try:
        release_id, root = new_release_dir(disease)
        from features.build_features import build_features
        feature_path = root / "features.csv"
        if build_features(disease=disease, output_path=feature_path) is None:
            raise RuntimeError("Pembuatan fitur gagal.")

        if disease == "dbd":
            from training.train_dbd import train_dbd_model as train
        elif disease == "ispa":
            from training.train_ispa import train_ispa_model as train
        else:
            from training.train_leptospirosis import train_leptospirosis_model as train

        result = train(
            citizen_signal=citizen_signal,
            citizen_family=citizen_family,
            feature_path=feature_path,
            model_output_path=root / "model.pkl",
            persist_metadata=False,
        )
        if result is None:
            raise RuntimeError("Pelatihan model gagal.")
        _, meta = result
        (root / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

        # Verify the serialized artifact that future workers will actually load.
        model = single_thread(joblib.load(root / "model.pkl"))
        features = pd.read_csv(feature_path)
        if features.empty:
            raise RuntimeError("Fitur model baru kosong.")
        prediction = np.asarray(model.predict(features[FEATURE_COLUMNS].head(1)), dtype=float)
        if prediction.size != 1 or not np.isfinite(prediction).all():
            raise RuntimeError("Model baru menghasilkan prediksi tidak valid.")

        publish_release(disease, release_id)
        published = True
        activate_release(disease, release_id, model, features, meta)
        return meta
    finally:
        if root is not None and not published:
            shutil.rmtree(root, ignore_errors=True)
        _retrain_lock.release()


def _eligible_signal(disease: str, req: RetrainRequest):
    """Sinyal warga yang layak dipakai, atau 409 beserta alasan angkanya.

    Menolak dengan alasan yang jelas lebih berguna daripada menerima diam-diam.
    Melatih pada kolom yang kosong di sebagian besar baris latih tidak
    memberi model apa pun untuk dipelajari, tetapi membuat halaman transparansi
    menyatakan sinyal warga sudah ikut menentukan prakiraan.
    """
    feature_path = DATASET_CLEAN_DIR / DISEASE_CONFIG[disease]["feature_file"]
    if not feature_path.exists():
        raise HTTPException(status_code=503, detail=f"Berkas fitur {feature_path.name} tidak ada.")

    df = pd.read_csv(feature_path, usecols=["month_start"])
    train_months = pd.to_datetime(df["month_start"])
    train_months = train_months[train_months < DISEASE_CONFIG[disease]["split_date"]]

    signal = normalise([row.model_dump() for row in (req.citizen_signal or [])])
    verdict = assess(train_months, signal)
    if not verdict.eligible:
        raise HTTPException(
            status_code=409,
            detail={
                "message": verdict.reason,
                "months_covered": verdict.months_covered,
                "months_required": verdict.months_required,
                "train_months": verdict.train_months,
                "total_verified": verdict.total_verified,
            },
        )
    return signal
