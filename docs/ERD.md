# ERD PRAKIRA

Gambaran umum basis data. Hanya kunci dan kolom utama yang ditampilkan; skema lengkap ada di
`backend/src/db/schema.sql`.

```mermaid
erDiagram
    KECAMATAN ||--o{ OBSERVASI : "punya data bulanan"
    KECAMATAN ||--o{ PREDIKSI : "diprediksi"
    KECAMATAN ||--o{ USERS : "wilayah kerja puskesmas"
    KECAMATAN ||--o{ LAPORAN_WARGA : "lokasi laporan"
    KECAMATAN ||--o{ TINDAKAN_WILAYAH : "dikerjakan di"
    OBSERVASI ||--o{ OBSERVASI_REVISI : "dikoreksi"
    USERS ||--o{ SESSIONS : "masuk"
    LAPORAN_WARGA ||--o| TIKET_LINGKUNGAN : "ditindaklanjuti"
    TINDAKAN ||--o{ TINDAKAN_WILAYAH : "dibagi per kecamatan"
    TINDAKAN ||--o{ TINDAKAN_RIWAYAT : "dicatat"

    KECAMATAN {
        text id PK
        text nama
        int populasi
    }
    OBSERVASI {
        text kecamatan_id PK, FK
        text disease PK
        text month_start PK
        int cases
    }
    OBSERVASI_REVISI {
        bigint id PK
        int new_cases
        text reason
    }
    PREDIKSI {
        text kecamatan_id PK, FK
        text disease PK
        text month_start PK
        int predicted_cases
        text risk_class
    }
    USERS {
        text id PK
        text email
        text role
        text kecamatan_id FK
    }
    SESSIONS {
        text token PK
        text user_id FK
    }
    LAPORAN_WARGA {
        text id PK
        text kind
        text kecamatan
        text status
    }
    TIKET_LINGKUNGAN {
        text id PK
        text laporan_id FK
        text status
    }
    TINDAKAN {
        text id PK
        text disease
        text priority
        text status
    }
    TINDAKAN_WILAYAH {
        text tindakan_id PK, FK
        text kecamatan PK
        text status
    }
    TINDAKAN_RIWAYAT {
        bigint id PK
        text tindakan_id FK
        text event
    }
    MODEL_BACKTEST {
        text disease PK
        text model_version
    }
    AUDIT_LOG {
        bigint id PK
        text actor
        text action
    }
    INGEST_JOB {
        bigint id PK
        text source
        text status
    }
```

Catatan:

- `MODEL_BACKTEST`, `AUDIT_LOG`, dan `INGEST_JOB` berdiri sendiri, tanpa relasi ke tabel lain.
- Relasi `KECAMATAN` ke `LAPORAN_WARGA` dan `TINDAKAN_WILAYAH`, serta `OBSERVASI` ke
  `OBSERVASI_REVISI`, bersifat logis (dicocokkan lewat nama/kunci) dan tidak dijaga foreign key di
  basis data.
