import type { KecamatanData, DiseaseType, BmkgSyncStatus, TrendPoint } from "@/types";
import { getKecamatanDataList, TREND_DATA, BMKG_SYNC_STATUS } from "./mock-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function fetchDistricts(disease: DiseaseType = "DBD"): Promise<KecamatanData[]> {
  if (!API_BASE) {
    return getKecamatanDataList(disease);
  }
  try {
    const res = await fetch(`${API_BASE}/api/districts?disease=${disease}`, { cache: "no-store" });
    if (!res.ok) throw new Error("API Offline, using local model data");
    return await res.json();
  } catch {
    return getKecamatanDataList(disease);
  }
}

export async function fetchTrendPredictions(disease: DiseaseType = "DBD"): Promise<TrendPoint[]> {
  if (!API_BASE) {
    return TREND_DATA[disease];
  }
  try {
    const res = await fetch(`${API_BASE}/api/predict/trend?disease=${disease}`);
    if (!res.ok) throw new Error("API Offline, using local forecast");
    return await res.json();
  } catch {
    return TREND_DATA[disease];
  }
}

export async function fetchBmkgStatus(): Promise<BmkgSyncStatus> {
  if (!API_BASE) {
    return BMKG_SYNC_STATUS;
  }
  try {
    const res = await fetch(`${API_BASE}/api/bmkg/status`);
    if (!res.ok) throw new Error("API Offline");
    return await res.json();
  } catch {
    return BMKG_SYNC_STATUS;
  }
}
