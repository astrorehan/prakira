"""
Penjaga akses layanan ML.

Layanan ini dipanggil server-ke-server oleh gateway, tidak pernah langsung oleh
peramban. Di localhost itu tidak jadi masalah. Di Render, URL-nya publik dan
`/retrain` bisa menimpa berkas model — jadi setiap rute selain `/health` butuh
token bersama.

Token dibaca dari `ML_API_TOKEN`. Bila kosong dan `ENVIRONMENT` bukan
`production`, penjaga ini mengizinkan semua permintaan supaya `uvicorn` lokal
tetap bisa dijalankan tanpa berkas `.env`. Bila `ENVIRONMENT=production`
token wajib ada: layanan menolak start dengan diam-diam terbuka.
"""
import hmac
import os

from fastapi import Header, HTTPException

_TOKEN = os.getenv("ML_API_TOKEN", "").strip()
_IS_PRODUCTION = os.getenv("ENVIRONMENT", "").lower() == "production"

if _IS_PRODUCTION and not _TOKEN:
    raise RuntimeError(
        "ML_API_TOKEN wajib diisi saat ENVIRONMENT=production. "
        "Tanpa itu /retrain terbuka untuk siapa pun yang tahu URL-nya."
    )


async def require_service_token(x_ml_token: str = Header(default="")) -> None:
    """Membandingkan token dengan `compare_digest` agar tidak bocor lewat waktu."""
    if not _TOKEN:
        return
    if not hmac.compare_digest(x_ml_token, _TOKEN):
        raise HTTPException(status_code=401, detail="Token layanan ML tidak valid.")
