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


class BacktestDistrictResult(BaseModel):
    """Satu pasangan bulan x kecamatan pada periode uji.

    `monthly_results` menjumlahkan seluruh kota, jadi bulan yang totalnya tepat
    bisa menyembunyikan dua kecamatan yang sama-sama meleset ke arah berlawanan.
    Rincian per kecamatan inilah yang dipakai halaman Mesin Waktu untuk
    menampilkan peta prakiraan berdampingan dengan peta kejadian sebenarnya.
    """
    month_start: str
    kecamatan_id: str
    actual: int
    predicted: int
    risk_score_actual: int
    risk_score_predicted: int
    risk_class_actual: Optional[str] = None
    risk_class_predicted: Optional[str] = None


class CitizenSignalComparison(BaseModel):
    without: BacktestMetrics
    with_signal: BacktestMetrics
    note: str


class TopFeature(BaseModel):
    """Satu fitur beserta bobot kepentingannya pada model terlatih."""
    feature: str = Field(..., example="cases_ma_3m")
    importance: float = Field(..., example=0.1465)


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
    # Rincian per kecamatan pada periode uji. Dipakai rute `/api/model/rewind`
    # untuk menghitung berapa lonjakan yang benar-benar tertandai lebih dulu.
    district_results: List[BacktestDistrictResult] = []
    citizen_signal_comparison: Optional[CitizenSignalComparison] = None
    coverage_per_kecamatan: dict = {}
    # Halaman transparansi model wajib menyebut fitur apa yang dipelajari model
    # (PRD §5.7, blok "Ringkasan model"). Nilainya sudah dihitung saat pelatihan
    # dan tersimpan di metadata.json; tanpa diteruskan di sini, halaman itu
    # hanya bisa menyebut nama algoritmanya.
    top_features: List[TopFeature] = []


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


class ExplainFeature(BaseModel):
    """Satu fitur dasar dalam sebuah kelompok, beserta pembandingnya."""
    feature: str
    label: str
    unit: str = ""
    value: float
    # Nilai lazim yang dipakai sebagai pembanding. `None` bila fitur itu tidak
    # ada di data historis yang tersedia.
    reference: Optional[float] = None
    percentile: Optional[int] = None


class ExplainFamily(BaseModel):
    """Kontribusi satu kelompok fitur terhadap prakiraan."""
    key: str
    label: str
    unit: str = ""
    note: str
    # Median mana yang jadi pembanding kelompok ini — kecamatan atau kota.
    reference_scope: Literal["kecamatan", "kota"] = "kecamatan"
    # Selisih prakiraan asli terhadap prakiraan setelah kelompok ini diganti
    # nilai lazimnya. Positif berarti keadaan bulan ini menaikkan angkanya.
    delta: float
    counterfactual_cases: float
    # Porsi terhadap total pergerakan mutlak — bukan porsi terhadap prakiraan,
    # karena kontribusi tiap kelompok tidak terbagi habis.
    share_pct: Optional[float] = None
    features: List[ExplainFeature] = []


class ExplainResponse(BaseModel):
    """Response untuk /explain."""
    kecamatan_id: str
    disease: str
    month: str
    data_coverage: Literal["high", "medium", "low", "insufficient"]
    baseline_cases: float
    baseline_rounded: int
    # Median mana yang dipakai sebagai pembanding: kecamatan itu sendiri, atau
    # seluruh kota bila riwayat kecamatannya terlalu pendek.
    reference_scope: Literal["kecamatan", "kota"]
    reference_months: int
    total_movement: float
    families: List[ExplainFamily] = []
    global_importance: List[TopFeature] = []
    method: str
    notes: List[str] = []


class SimulateDistrict(BaseModel):
    """Satu kecamatan pada skenario cuaca: keadaan dasar dan hasil geseran."""
    kecamatan_id: str
    kecamatan_nama: str
    data_coverage: Literal["high", "medium", "low", "insufficient"]
    baseline_cases: Optional[int] = None
    baseline_risk_score: Optional[int] = None
    baseline_risk_class: Optional[str] = None
    baseline_rank: Optional[int] = None
    scenario_cases: Optional[int] = None
    scenario_risk_score: Optional[int] = None
    scenario_risk_class: Optional[str] = None
    scenario_rank: Optional[int] = None
    rainfall_baseline: Optional[float] = None
    rainfall_scenario: Optional[float] = None
    # Nama fitur yang nilainya keluar dari rentang data latih setelah digeser.
    beyond_training: List[str] = []


class SimulateAdjustment(BaseModel):
    rainfall_pct: float
    temp_delta_c: float
    humidity_delta_pct: float


class SimulateSummary(BaseModel):
    evaluated: int
    baseline_total: int
    scenario_total: int
    baseline_high: int
    scenario_high: int
    rank_changed: int
    beyond_training: int


class SimulateResponse(BaseModel):
    """Response untuk /simulate."""
    disease: str
    month: str
    adjustment: SimulateAdjustment
    districts: List[SimulateDistrict] = []
    summary: SimulateSummary
    notes: List[str] = []
