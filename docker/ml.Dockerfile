# Layanan ML (FastAPI + model terlatih).
#
# Model `.pkl` ikut dalam repositori, jadi image ini tidak pernah melatih apa
# pun saat dibangun — ia hanya memuat berkas yang sudah ada. Itu disengaja:
# pelatihan XGBoost menuntut memori yang tidak selalu tersedia, dan hasil
# pelatihan ulang yang tidak sengaja berbeda dari yang dievaluasi adalah cara
# paling halus untuk membuat metrik yang dipajang berhenti benar.
FROM python:3.11-slim

WORKDIR /app

COPY ml-services/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-services/ ./

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
