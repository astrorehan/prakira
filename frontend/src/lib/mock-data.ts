import type {
  KecamatanData,
  DiseaseType,
  TrendPoint,
  ClimateCorrelationPoint,
  BacktestMetric,
  ActionRecommendation,
  AuditLog,
  BmkgSyncStatus,
  GeoDistrictCollection,
} from "@/types";

// 16 Kecamatan Kota Semarang & Baseline Profile
export const SEMARANG_KECAMATAN_RAW = [
  { id: "KEC_SMG_01", nama: "Semarang Barat", kode_bps: "3374010", pop: 154200, luas: 21.74, coords: [-6.985, 110.385] as [number, number] },
  { id: "KEC_SMG_02", nama: "Banyumanik", kode_bps: "3374020", pop: 142800, luas: 25.69, coords: [-7.065, 110.418] as [number, number] },
  { id: "KEC_SMG_03", nama: "Pedurungan", kode_bps: "3374030", pop: 191500, luas: 20.72, coords: [-7.002, 110.468] as [number, number] },
  { id: "KEC_SMG_04", nama: "Candisari", kode_bps: "3374040", pop: 78900, luas: 6.54, coords: [-7.012, 110.428] as [number, number] },
  { id: "KEC_SMG_05", nama: "Tembalang", kode_bps: "3374050", pop: 188400, luas: 44.20, coords: [-7.054, 110.450] as [number, number] },
  { id: "KEC_SMG_06", nama: "Gajahmungkur", kode_bps: "3374060", pop: 57400, luas: 9.07, coords: [-7.018, 110.405] as [number, number] },
  { id: "KEC_SMG_07", nama: "Genuk", kode_bps: "3374070", pop: 114600, luas: 27.39, coords: [-6.962, 110.478] as [number, number] },
  { id: "KEC_SMG_08", nama: "Tugu", kode_bps: "3374080", pop: 33800, luas: 31.78, coords: [-6.974, 110.320] as [number, number] },
  { id: "KEC_SMG_09", nama: "Mijen", kode_bps: "3374090", pop: 72100, luas: 57.55, coords: [-7.060, 110.325] as [number, number] },
  { id: "KEC_SMG_10", nama: "Gayamsari", kode_bps: "3374100", pop: 71200, luas: 6.18, coords: [-6.982, 110.448] as [number, number] },
  { id: "KEC_SMG_11", nama: "Semarang Selatan", kode_bps: "3374110", pop: 73500, luas: 5.93, coords: [-6.998, 110.418] as [number, number] },
  { id: "KEC_SMG_12", nama: "Semarang Tengah", kode_bps: "3374120", pop: 63200, luas: 6.14, coords: [-6.980, 110.420] as [number, number] },
  { id: "KEC_SMG_13", nama: "Semarang Timur", kode_bps: "3374130", pop: 74100, luas: 7.70, coords: [-6.975, 110.440] as [number, number] },
  { id: "KEC_SMG_14", nama: "Semarang Utara", kode_bps: "3374140", pop: 122800, luas: 10.97, coords: [-6.960, 110.415] as [number, number] },
  { id: "KEC_SMG_15", nama: "Gunungpati", kode_bps: "3374150", pop: 96800, luas: 54.11, coords: [-7.085, 110.370] as [number, number] },
  { id: "KEC_SMG_16", nama: "Ngaliyan", kode_bps: "3374160", pop: 141600, luas: 37.99, coords: [-7.010, 110.345] as [number, number] },
];

export function getKecamatanDataList(disease: DiseaseType = "DBD"): KecamatanData[] {
  return SEMARANG_KECAMATAN_RAW.map((kec, idx) => {
    let kasus_aktif = 0;
    let kasus_prediksi = 0;
    let skor_risiko = 0;
    let tingkat_risiko: "rendah" | "sedang" | "tinggi" = "rendah";
    let delta = 0;
    const rekomendasi: string[] = [];

    if (disease === "DBD") {
      // Hotspots: Pedurungan, Banyumanik, Tembalang, Genuk
      if (["Pedurungan", "Banyumanik", "Tembalang"].includes(kec.nama)) {
        kasus_aktif = 38 + (idx * 3) % 15;
        kasus_prediksi = Math.round(kasus_aktif * 1.35);
        skor_risiko = 82 + (idx % 12);
        tingkat_risiko = "tinggi";
        delta = 28.4;
        rekomendasi.push("Prioritaskan Fogging Fokus radius 200m", "Gerakan 1 Rumah 1 Jumantik massal", "Stok Abate di Puskesmas");
      } else if (["Genuk", "Semarang Barat", "Ngaliyan", "Candisari"].includes(kec.nama)) {
        kasus_aktif = 18 + (idx * 2) % 10;
        kasus_prediksi = Math.round(kasus_aktif * 1.15);
        skor_risiko = 58 + (idx % 15);
        tingkat_risiko = "sedang";
        delta = 12.1;
        rekomendasi.push("Penyuluhan PSN 3M Plus di tingkat RT/RW", "Pengecekan TPA berkala");
      } else {
        kasus_aktif = 4 + (idx % 6);
        kasus_prediksi = kasus_aktif + 1;
        skor_risiko = 24 + (idx % 18);
        tingkat_risiko = "rendah";
        delta = -4.5;
        rekomendasi.push("Edukasi preventif rutin", "Pemantauan jentik mingguan");
      }
    } else if (disease === "ISPA") {
      // Hotspots: Genuk, Semarang Utara, Semarang Timur (daerah industri & pesisir berdebu)
      if (["Genuk", "Semarang Utara", "Semarang Timur", "Semarang Barat"].includes(kec.nama)) {
        kasus_aktif = 94 + (idx * 6) % 30;
        kasus_prediksi = Math.round(kasus_aktif * 1.28);
        skor_risiko = 85 + (idx % 10);
        tingkat_risiko = "tinggi";
        delta = 22.8;
        rekomendasi.push("Distribusi masker medis ke kelompok rentan", "Peringatan AQI BMKG di ruang publik", "Buffer stock nebulizer & obat ISPA");
      } else if (["Semarang Tengah", "Gayamsari", "Tugu", "Pedurungan"].includes(kec.nama)) {
        kasus_aktif = 48 + (idx * 3) % 20;
        kasus_prediksi = Math.round(kasus_aktif * 1.12);
        skor_risiko = 56 + (idx % 14);
        tingkat_risiko = "sedang";
        delta = 8.5;
        rekomendasi.push("Edukasi ventilasi dan penggunaan masker", "Pelayanan batuk pilek di puskesmas");
      } else {
        kasus_aktif = 18 + (idx * 2) % 12;
        kasus_prediksi = kasus_aktif;
        skor_risiko = 28 + (idx % 15);
        tingkat_risiko = "rendah";
        delta = -2.1;
        rekomendasi.push("Pemantauan tren mingguan", "Promosi gaya hidup bersih & sehat");
      }
    } else {
      // Diare: Hotspots pesisir / rob (Genuk, Semarang Utara, Gayamsari)
      if (["Genuk", "Semarang Utara", "Gayamsari"].includes(kec.nama)) {
        kasus_aktif = 62 + (idx * 5) % 25;
        kasus_prediksi = Math.round(kasus_aktif * 1.3);
        skor_risiko = 88 + (idx % 8);
        tingkat_risiko = "tinggi";
        delta = 31.0;
        rekomendasi.push("Klorinasi & inspeksi sanitasi sumur/sumber air", "Drop logistik oralit & zinc", "Penyuluhan cuci tangan pakai sabun (CTPS)");
      } else if (["Semarang Timur", "Semarang Barat", "Tugu", "Candisari"].includes(kec.nama)) {
        kasus_aktif = 32 + (idx * 2) % 15;
        kasus_prediksi = Math.round(kasus_aktif * 1.1);
        skor_risiko = 52 + (idx % 12);
        tingkat_risiko = "sedang";
        delta = 6.4;
        rekomendasi.push("Uji berkala mikrobiologi air minum warga", "Sosialisasi sanitasi makanan");
      } else {
        kasus_aktif = 12 + (idx % 8);
        kasus_prediksi = kasus_aktif - 1;
        skor_risiko = 22 + (idx % 14);
        tingkat_risiko = "rendah";
        delta = -5.8;
        rekomendasi.push("Pemantauan higienitas depot air minum", "Sosialisasi PHBS");
      }
    }

    const incidence_rate = Number(((kasus_aktif / kec.pop) * 100000).toFixed(1));

    return {
      id: kec.id,
      nama: kec.nama,
      kode_bps: kec.kode_bps,
      populasi: kec.pop,
      luas_km2: kec.luas,
      disease,
      kasus_aktif,
      kasus_prediksi,
      incidence_rate,
      skor_risiko,
      tingkat_risiko,
      confidence: 0.91 + (idx % 7) * 0.01,
      delta_mingguan: delta,
      cuaca: {
        curah_hujan_mm: 185 + (idx * 14) % 120,
        suhu_c: 29.2 - (idx % 3) * 0.5,
        kelembaban_pct: 78 + (idx % 5) * 2,
        status_cuaca: idx % 3 === 0 ? "Hujan Sedang" : idx % 2 === 0 ? "Berawan Tebal" : "Hujan Lebat",
        indeks_pancaroba: idx % 2 === 0,
      },
      rekomendasi,
      koordinat: kec.coords,
      historical_cases_3w: [
        Math.max(2, Math.round(kasus_aktif * 0.7)),
        Math.max(3, Math.round(kasus_aktif * 0.85)),
        kasus_aktif,
      ],
    };
  });
}

// Generate GeoJSON Polygons for Semarang 16 Kecamatan for Leaflet Map
export function getSemarangGeoJSON(): GeoDistrictCollection {
  return {
    type: "FeatureCollection",
    features: SEMARANG_KECAMATAN_RAW.map((kec) => {
      const [lat, lng] = kec.coords;
      const dLat = 0.022 + ((kec.luas % 10) * 0.001);
      const dLng = 0.025 + ((kec.luas % 15) * 0.001);

      // Create an approximate polygonal district boundary around coordinates
      const polygonCoords: number[][][] = [
        [
          [lng - dLng, lat - dLat],
          [lng + dLng * 0.8, lat - dLat * 0.9],
          [lng + dLng * 1.1, lat + dLat * 0.4],
          [lng + dLng * 0.2, lat + dLat * 1.1],
          [lng - dLng * 0.9, lat + dLat * 0.7],
          [lng - dLng, lat - dLat],
        ],
      ];

      return {
        type: "Feature",
        properties: {
          id: kec.id,
          nama: kec.nama,
          kode_bps: kec.kode_bps,
          level: "kecamatan",
        },
        geometry: {
          type: "Polygon",
          coordinates: polygonCoords,
        },
      };
    }),
  };
}

// Trend Points (Past 8 weeks actual + Next 4 weeks ML Forecast)
export const TREND_DATA: Record<DiseaseType, TrendPoint[]> = {
  DBD: [
    { periode: "W28 (Jul)", tanggal: "07 Jul 2026", kasus_aktual: 68, kasus_prediksi: null, curah_hujan_mm: 45, suhu_c: 30.5, kelembaban_pct: 68 },
    { periode: "W29 (Jul)", tanggal: "14 Jul 2026", kasus_aktual: 74, kasus_prediksi: null, curah_hujan_mm: 62, suhu_c: 30.1, kelembaban_pct: 70 },
    { periode: "W30 (Jul)", tanggal: "21 Jul 2026", kasus_aktual: 89, kasus_prediksi: null, curah_hujan_mm: 110, suhu_c: 29.4, kelembaban_pct: 75 },
    { periode: "W31 (Jul)", tanggal: "28 Jul 2026", kasus_aktual: 104, kasus_prediksi: null, curah_hujan_mm: 145, suhu_c: 29.2, kelembaban_pct: 78 },
    { periode: "W32 (Ags)", tanggal: "04 Ags 2026", kasus_aktual: 128, kasus_prediksi: null, curah_hujan_mm: 180, suhu_c: 28.8, kelembaban_pct: 82 },
    { periode: "W33 (Ags)", tanggal: "11 Ags 2026", kasus_aktual: 152, kasus_prediksi: null, curah_hujan_mm: 210, suhu_c: 28.5, kelembaban_pct: 84 },
    { periode: "W34 (Ags)", tanggal: "18 Ags 2026", kasus_aktual: 178, kasus_prediksi: 178, lower_bound: 170, upper_bound: 186, curah_hujan_mm: 225, suhu_c: 28.4, kelembaban_pct: 85 },
    // Forecast (Next 4 weeks)
    { periode: "W35 (Ags)*", tanggal: "25 Ags 2026", kasus_aktual: null, kasus_prediksi: 215, lower_bound: 195, upper_bound: 235, curah_hujan_mm: 240, suhu_c: 28.2, kelembaban_pct: 86 },
    { periode: "W36 (Sep)*", tanggal: "01 Sep 2026", kasus_aktual: null, kasus_prediksi: 258, lower_bound: 230, upper_bound: 286, curah_hujan_mm: 260, suhu_c: 28.0, kelembaban_pct: 88 },
    { periode: "W37 (Sep)*", tanggal: "08 Sep 2026", kasus_aktual: null, kasus_prediksi: 292, lower_bound: 255, upper_bound: 329, curah_hujan_mm: 275, suhu_c: 27.9, kelembaban_pct: 89 },
    { periode: "W38 (Sep)*", tanggal: "15 Sep 2026", kasus_aktual: null, kasus_prediksi: 310, lower_bound: 268, upper_bound: 352, curah_hujan_mm: 280, suhu_c: 27.8, kelembaban_pct: 90 },
  ],
  ISPA: [
    { periode: "W28 (Jul)", tanggal: "07 Jul 2026", kasus_aktual: 340, kasus_prediksi: null, curah_hujan_mm: 45, suhu_c: 30.5, kelembaban_pct: 68 },
    { periode: "W29 (Jul)", tanggal: "14 Jul 2026", kasus_aktual: 365, kasus_prediksi: null, curah_hujan_mm: 62, suhu_c: 30.1, kelembaban_pct: 70 },
    { periode: "W30 (Jul)", tanggal: "21 Jul 2026", kasus_aktual: 395, kasus_prediksi: null, curah_hujan_mm: 110, suhu_c: 29.4, kelembaban_pct: 75 },
    { periode: "W31 (Jul)", tanggal: "28 Jul 2026", kasus_aktual: 430, kasus_prediksi: null, curah_hujan_mm: 145, suhu_c: 29.2, kelembaban_pct: 78 },
    { periode: "W32 (Ags)", tanggal: "04 Ags 2026", kasus_aktual: 480, kasus_prediksi: null, curah_hujan_mm: 180, suhu_c: 28.8, kelembaban_pct: 82 },
    { periode: "W33 (Ags)", tanggal: "11 Ags 2026", kasus_aktual: 520, kasus_prediksi: null, curah_hujan_mm: 210, suhu_c: 28.5, kelembaban_pct: 84 },
    { periode: "W34 (Ags)", tanggal: "18 Ags 2026", kasus_aktual: 565, kasus_prediksi: 565, lower_bound: 540, upper_bound: 590, curah_hujan_mm: 225, suhu_c: 28.4, kelembaban_pct: 85 },
    { periode: "W35 (Ags)*", tanggal: "25 Ags 2026", kasus_aktual: null, kasus_prediksi: 610, lower_bound: 575, upper_bound: 645, curah_hujan_mm: 240, suhu_c: 28.2, kelembaban_pct: 86 },
    { periode: "W36 (Sep)*", tanggal: "01 Sep 2026", kasus_aktual: null, kasus_prediksi: 655, lower_bound: 610, upper_bound: 700, curah_hujan_mm: 260, suhu_c: 28.0, kelembaban_pct: 88 },
    { periode: "W37 (Sep)*", tanggal: "08 Sep 2026", kasus_aktual: null, kasus_prediksi: 690, lower_bound: 635, upper_bound: 745, curah_hujan_mm: 275, suhu_c: 27.9, kelembaban_pct: 89 },
    { periode: "W38 (Sep)*", tanggal: "15 Sep 2026", kasus_aktual: null, kasus_prediksi: 715, lower_bound: 650, upper_bound: 780, curah_hujan_mm: 280, suhu_c: 27.8, kelembaban_pct: 90 },
  ],
  Diare: [
    { periode: "W28 (Jul)", tanggal: "07 Jul 2026", kasus_aktual: 145, kasus_prediksi: null, curah_hujan_mm: 45, suhu_c: 30.5, kelembaban_pct: 68 },
    { periode: "W29 (Jul)", tanggal: "14 Jul 2026", kasus_aktual: 152, kasus_prediksi: null, curah_hujan_mm: 62, suhu_c: 30.1, kelembaban_pct: 70 },
    { periode: "W30 (Jul)", tanggal: "21 Jul 2026", kasus_aktual: 168, kasus_prediksi: null, curah_hujan_mm: 110, suhu_c: 29.4, kelembaban_pct: 75 },
    { periode: "W31 (Jul)", tanggal: "28 Jul 2026", kasus_aktual: 184, kasus_prediksi: null, curah_hujan_mm: 145, suhu_c: 29.2, kelembaban_pct: 78 },
    { periode: "W32 (Ags)", tanggal: "04 Ags 2026", kasus_aktual: 205, kasus_prediksi: null, curah_hujan_mm: 180, suhu_c: 28.8, kelembaban_pct: 82 },
    { periode: "W33 (Ags)", tanggal: "11 Ags 2026", kasus_aktual: 232, kasus_prediksi: null, curah_hujan_mm: 210, suhu_c: 28.5, kelembaban_pct: 84 },
    { periode: "W34 (Ags)", tanggal: "18 Ags 2026", kasus_aktual: 268, kasus_prediksi: 268, lower_bound: 250, upper_bound: 286, curah_hujan_mm: 225, suhu_c: 28.4, kelembaban_pct: 85 },
    { periode: "W35 (Ags)*", tanggal: "25 Ags 2026", kasus_aktual: null, kasus_prediksi: 310, lower_bound: 285, upper_bound: 335, curah_hujan_mm: 240, suhu_c: 28.2, kelembaban_pct: 86 },
    { periode: "W36 (Sep)*", tanggal: "01 Sep 2026", kasus_aktual: null, kasus_prediksi: 345, lower_bound: 315, upper_bound: 375, curah_hujan_mm: 260, suhu_c: 28.0, kelembaban_pct: 88 },
    { periode: "W37 (Sep)*", tanggal: "08 Sep 2026", kasus_aktual: null, kasus_prediksi: 370, lower_bound: 330, upper_bound: 410, curah_hujan_mm: 275, suhu_c: 27.9, kelembaban_pct: 89 },
    { periode: "W38 (Sep)*", tanggal: "15 Sep 2026", kasus_aktual: null, kasus_prediksi: 388, lower_bound: 345, upper_bound: 431, curah_hujan_mm: 280, suhu_c: 27.8, kelembaban_pct: 90 },
  ],
};

// Climate vs Disease Correlation 12 Months Historical Data
export const CLIMATE_CORRELATION_DATA: ClimateCorrelationPoint[] = [
  { periode: "Sep 2025", curah_hujan_mm: 35, suhu_c: 31.4, kelembaban_pct: 62, kasus_dbd: 42, kasus_ispa: 310, kasus_diare: 110 },
  { periode: "Okt 2025", curah_hujan_mm: 78, suhu_c: 30.8, kelembaban_pct: 67, kasus_dbd: 65, kasus_ispa: 340, kasus_diare: 125 },
  { periode: "Nov 2025", curah_hujan_mm: 195, suhu_c: 29.5, kelembaban_pct: 78, kasus_dbd: 148, kasus_ispa: 420, kasus_diare: 180 },
  { periode: "Des 2025", curah_hujan_mm: 310, suhu_c: 28.6, kelembaban_pct: 86, kasus_dbd: 260, kasus_ispa: 490, kasus_diare: 260 },
  { periode: "Jan 2026", curah_hujan_mm: 380, suhu_c: 28.1, kelembaban_pct: 89, kasus_dbd: 340, kasus_ispa: 580, kasus_diare: 340 },
  { periode: "Feb 2026", curah_hujan_mm: 340, suhu_c: 28.3, kelembaban_pct: 87, kasus_dbd: 310, kasus_ispa: 540, kasus_diare: 295 },
  { periode: "Mar 2026", curah_hujan_mm: 240, suhu_c: 29.0, kelembaban_pct: 82, kasus_dbd: 215, kasus_ispa: 460, kasus_diare: 210 },
  { periode: "Apr 2026", curah_hujan_mm: 160, suhu_c: 29.7, kelembaban_pct: 76, kasus_dbd: 135, kasus_ispa: 390, kasus_diare: 165 },
  { periode: "Mei 2026", curah_hujan_mm: 90, suhu_c: 30.2, kelembaban_pct: 71, kasus_dbd: 85, kasus_ispa: 350, kasus_diare: 140 },
  { periode: "Jun 2026", curah_hujan_mm: 50, suhu_c: 30.9, kelembaban_pct: 66, kasus_dbd: 55, kasus_ispa: 320, kasus_diare: 120 },
  { periode: "Jul 2026", curah_hujan_mm: 68, suhu_c: 30.3, kelembaban_pct: 70, kasus_dbd: 74, kasus_ispa: 365, kasus_diare: 152 },
  { periode: "Ags 2026", curah_hujan_mm: 178, suhu_c: 28.7, kelembaban_pct: 83, kasus_dbd: 178, kasus_ispa: 565, kasus_diare: 268 },
];

// Backtesting Model Evaluation Data (Random Forest, XGBoost, LSTM)
export const BACKTEST_METRICS: BacktestMetric[] = [
  {
    model_name: "Gradient Boosting (XGBoost Regressor)",
    disease: "DBD",
    mae: 4.12,
    rmse: 6.38,
    r2: 0.914,
    accuracy_pct: 91.4,
    backtest_period: "2023 - 2026 (156 Minggu Evaluasi)",
    sample_size: 2496,
  },
  {
    model_name: "Random Forest Regressor (Baseline)",
    disease: "DBD",
    mae: 5.45,
    rmse: 7.92,
    r2: 0.876,
    accuracy_pct: 87.6,
    backtest_period: "2023 - 2026 (156 Minggu Evaluasi)",
    sample_size: 2496,
  },
  {
    model_name: "LSTM Time-Series Deep Learning",
    disease: "DBD",
    mae: 3.88,
    rmse: 5.91,
    r2: 0.932,
    accuracy_pct: 93.2,
    backtest_period: "2023 - 2026 (156 Minggu Evaluasi)",
    sample_size: 2496,
  },
  {
    model_name: "Gradient Boosting (XGBoost Regressor)",
    disease: "ISPA",
    mae: 12.40,
    rmse: 18.70,
    r2: 0.895,
    accuracy_pct: 89.5,
    backtest_period: "2023 - 2026 (156 Minggu Evaluasi)",
    sample_size: 2496,
  },
  {
    model_name: "Gradient Boosting (XGBoost Regressor)",
    disease: "Diare",
    mae: 7.15,
    rmse: 10.82,
    r2: 0.902,
    accuracy_pct: 90.2,
    backtest_period: "2023 - 2026 (156 Minggu Evaluasi)",
    sample_size: 2496,
  },
];

// Automated Action Recommendations
export const ACTION_RECOMMENDATIONS: ActionRecommendation[] = [
  {
    id: "ACT_001",
    title: "Fogging Fokus & PSN 3M Plus Masif di 3 Kecamatan",
    description: "Prediksi model menunjukkan potensi kenaikan kasus DBD 35% di Pedurungan, Banyumanik, dan Tembalang dalam 14 hari ke depan.",
    priority: "high",
    target_kecamatan: ["Pedurungan", "Banyumanik", "Tembalang"],
    disease: "DBD",
    action_type: "fogging",
    status: "pending",
    due_date: "28 Agustus 2026",
  },
  {
    id: "ACT_002",
    title: "Distribusi Masker & Edukasi Sanitasi Udara Genuk & Semarang Utara",
    description: "Peningkatan partikulat debu akibat pancaroba dan penurunan kelembaban memicu risiko tinggi lonjakan ISPA kelompok lansia dan balita.",
    priority: "high",
    target_kecamatan: ["Genuk", "Semarang Utara", "Semarang Timur"],
    disease: "ISPA",
    action_type: "masker",
    status: "in_progress",
    due_date: "30 Agustus 2026",
  },
  {
    id: "ACT_003",
    title: "Klorinasi Sumber Air Bersih & Distribusi Oralit Posko Rob",
    description: "Genangan rob dan curah hujan tinggi di pesisir Semarang meningkatkan kontaminasi saluran air tanah yang memicu bakteri diare.",
    priority: "high",
    target_kecamatan: ["Genuk", "Semarang Utara", "Gayamsari"],
    disease: "Diare",
    action_type: "klorinasi",
    status: "pending",
    due_date: "26 Agustus 2026",
  },
  {
    id: "ACT_004",
    title: "Buffer Stock Obat & RDT Dengue Puskesmas Semarang Barat",
    description: "Persiapan stok reagen Rapid Diagnostic Test Dengue NS1 dan infus cairan kristaloid untuk mengantisipasi peningkatan rujukan.",
    priority: "medium",
    target_kecamatan: ["Semarang Barat", "Candisari", "Ngaliyan"],
    disease: "DBD",
    action_type: "logistik_obat",
    status: "in_progress",
    due_date: "02 September 2026",
  },
  {
    id: "ACT_005",
    title: "Siaran Peringatan Dini Kesehatan via WhatsApp Broadcast Dinas",
    description: "Mengirimkan pesan edukasi 3M Plus dan nomor darurat puskesmas ke 45.000 warga terdaftar di kecamatan zona merah.",
    priority: "medium",
    target_kecamatan: ["Pedurungan", "Genuk", "Banyumanik"],
    disease: "DBD",
    action_type: "penyuluhan",
    status: "completed",
    due_date: "24 Agustus 2026",
  },
];

// BMKG Live Sync Status & API Metrics
export const BMKG_SYNC_STATUS: BmkgSyncStatus = {
  last_sync: "24 Agustus 2026, 17:45 WIB",
  status: "online",
  stations_active: 4, // Stasiun Maritim Tanjung Emas, Stasiun Klimatologi Semarang, AWS Ngaliyan, AWS Banyumanik
  next_sync_in: "15 menit lagi",
  latency_ms: 184,
  synced_features: ["Curah Hujan (RR)", "Suhu Rata-rata (T)", "Kelembaban Relatif (RH)", "Kecepatan Angin (ff)", "Radiasi Matahari (SS)"],
};

// Immutable Audit Logs
export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG_9941",
    timestamp: "24/08/2026 17:45:12",
    user: "Cron Service BMKG",
    role: "System Worker",
    action: "Sync Data Cuaca Otomatis",
    details: "Sukses menarik 168 data poin observasi iklim dari 4 stasiun BMKG Semarang.",
    status: "success",
  },
  {
    id: "LOG_9940",
    timestamp: "24/08/2026 15:30:20",
    user: "dr. Hendra Setiawan",
    role: "Admin Dinas Kesehatan",
    action: "Import Kasus Mingguan CSV",
    details: "Berhasil mengimpor 16 baris data kasus DBD Minggu 34 (Total 178 kasus).",
    status: "success",
  },
  {
    id: "LOG_9939",
    timestamp: "24/08/2026 14:12:05",
    user: "ML Engine v2.4",
    role: "AI Service",
    action: "Re-run Inference /predict",
    details: "Eksekusi model XGBoost prediksi 4 minggu ke depan. Confidence score: 92.8%.",
    status: "success",
  },
  {
    id: "LOG_9938",
    timestamp: "24/08/2026 11:05:44",
    user: "Siti Rahmawati, S.Kep",
    role: "Petugas Puskesmas Pedurungan",
    action: "Update Status Intervensi",
    details: "Mengubah status intervensi Fogging RW 04 menjadi In-Progress.",
    status: "info",
  },
];
