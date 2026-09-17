"""Akar `ml-services` dimasukkan ke sys.path agar `config` dan `app` terimpor.

Layanan ini memakai impor absolut dari akarnya sendiri (`from config import ...`),
sama seperti saat dijalankan uvicorn dari direktori `ml-services`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
