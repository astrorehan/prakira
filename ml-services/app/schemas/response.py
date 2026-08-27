from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class DriverInfo(BaseModel):
    """Fitur pemicu dominan pada prediksi."""
    feature: str = Field(..., example="rainfall_lag3")
    value: float = Field(..., example=214.0)
    percentile: int = Field(..., example=88)


class PredictionResult(BaseModel):
    """Response format sesuai kontrak PRD section 6."""
    kecamatan_id: str
    disease: str
    month: str
    predicted_cases: int
    lower_bound: int
    upper_bound: int
    risk_score: int = Field(..., ge=0, le=100)
    risk_class: Optional[Literal["rendah", "sedang", "tinggi"]] = None
    data_coverage: Literal["high", "medium", "low", "insufficient"]
    drivers: List[DriverInfo] = []
    model_version: str


class BatchPredictionResponse(BaseModel):
    """Response untuk /predict/batch."""
    disease: str
    month: str
    predictions: List[PredictionResult]


class BacktestMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float


class BacktestWeeklyResult(BaseModel):
    month_start: str
    actual: int
    predicted: int
    risk_class_actual: Optional[str] = None
    risk_class_predicted: Optional[str] = None


class CitizenSignalComparison(BaseModel):
    without: BacktestMetrics
    with_signal: BacktestMetrics
    note: str


class BacktestResponse(BaseModel):
    """Response untuk /backtest."""
    disease: str
    model_version: str
    # Nama algoritma dan waktu latih sudah ada di metadata.json; tanpa keduanya
    # halaman transparansi model hanya bisa menulis "model tersimpan".
    algorithm: Optional[str] = None
    trained_at: Optional[str] = None
    train_period: str
    test_period: str
    metrics: BacktestMetrics
    monthly_results: List[BacktestWeeklyResult] = []
    citizen_signal_comparison: Optional[CitizenSignalComparison] = None
    coverage_per_kecamatan: dict = {}


class RetrainResponse(BaseModel):
    """Response untuk /retrain."""
    status: str
    disease: str
    new_version: str
    include_citizen: bool
    metrics: BacktestMetrics
    previous_version: Optional[str] = None
    improved: bool


class HealthResponse(BaseModel):
    status: str
    diseases_available: List[str]
    models_loaded: dict
