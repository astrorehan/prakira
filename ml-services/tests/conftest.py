"""Akar `ml-services` dimasukkan ke sys.path agar `config` dan `app` terimpor.

Layanan ini memakai impor absolut dari akarnya sendiri (`from config import ...`),
sama seperti saat dijalankan uvicorn dari direktori `ml-services`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Kompatibilitas unpickle scikit-learn: model yang dilatih pada scikit-learn 1.7.x
# menyimpan objek loss Cython (CyHalfSquaredError) dengan modul internal '_loss'.
# Mendaftarkan '_loss' ke sys.modules memastikan joblib.load tidak gagal dengan
# ModuleNotFoundError: No module named '_loss'.
try:
    import sklearn._loss._loss as _sklearn_loss_loss
    sys.modules.setdefault("_loss", _sklearn_loss_loss)
except (ImportError, AttributeError):
    pass
