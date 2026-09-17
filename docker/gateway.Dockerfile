# Gateway Express.
#
# Konteksnya akar repositori, bukan `backend/`: penyemaian awal membaca
# dataset dari `ml-services/` dan batas wilayah dari `frontend/src/data/`,
# jadi ketiganya harus ada di dalam image agar `docker compose up` bisa
# menyalakan sistem penuh tanpa jaringan.
FROM node:22-alpine AS build

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Hanya berkas yang benar-benar dibaca penyemai — bukan seluruh dataset.
COPY ml-services/dataset_raw/wilayah/kecamatan_semarang.csv ./seed/dataset_raw/wilayah/
COPY ml-services/dataset_clean/merged_monthly_dbd.csv ./seed/dataset_clean/
COPY ml-services/dataset_clean/merged_monthly_ispa.csv ./seed/dataset_clean/
COPY ml-services/dataset_clean/merged_monthly_leptospirosis.csv ./seed/dataset_clean/
COPY frontend/src/data/semarang-kecamatan.json ./seed/geo/

ENV DATASET_ROOT=/app/seed
ENV GEOJSON_FILE=/app/seed/geo/semarang-kecamatan.json

EXPOSE 4200
CMD ["node", "dist/index.js"]
