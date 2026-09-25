"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type {
  KecamatanData,
  DiseaseType,
  GeoDistrictCollection,
  DistrictTriggerSummary,
  CitizenReport,
} from "@/types";
import {
  cn,
  formatMaybeIncidence,
  formatMaybeNumber,
  formatMaybePercent,
  riskConfigOf,
} from "@/lib/utils";
import { formatMonth, relativeAge } from "@/lib/period";
import L from "leaflet";
import { Layers } from "lucide-react";

type ChoroplethMapProps = {
  geojson: GeoDistrictCollection;
  districts: KecamatanData[];
  disease?: DiseaseType;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  triggers?: DistrictTriggerSummary[];
  reports?: CitizenReport[];
  liveConnected?: boolean;
  onReportSelect?: (report: CitizenReport) => void;
  defaultShowTriggers?: boolean;
  userDistrict?: string | null;
};

const SEMARANG_CENTER: [number, number] = [-7.005, 110.42];

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2cl4_1_60997fa79620518562fb2948";
const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

const KIND_EMOJIS: Record<string, string> = {
  gejala: "🌡️",
  jentik: "🦟",
  genangan: "💧",
  sampah: "🗑️",
  saluran: "🌊",
};

const KIND_LABELS: Record<string, string> = {
  gejala: "Gejala pada orang",
  jentik: "Temuan jentik nyamuk",
  genangan: "Genangan air bertahan",
  sampah: "Timbunan sampah",
  saluran: "Saluran tersumbat",
};

export default function ChoroplethMap({
  geojson,
  districts,
  disease = "DBD",
  selectedId,
  onSelect,
  center = SEMARANG_CENTER,
  zoom = 12,
  height = "520px",
  triggers = [],
  reports = [],
  liveConnected = false,
  onReportSelect,
  defaultShowTriggers = true,
  userDistrict,
}: ChoroplethMapProps) {
  const [showTriggers, setShowTriggers] = useState(defaultShowTriggers);
  const [reportFilter, setReportFilter] = useState<"all" | "my_district" | "menunggu" | "terverifikasi">("all");

  const byId = useMemo(() => {
    const map = new Map<string, KecamatanData>();
    for (const d of districts) map.set(d.id, d);
    return map;
  }, [districts]);

  const triggerByKecamatan = useMemo(() => {
    const map = new Map<string, DistrictTriggerSummary>();
    for (const t of triggers) {
      map.set(t.kecamatan.toLowerCase(), t);
    }
    return map;
  }, [triggers]);

  // Kelompokkan laporan warga aktif per kecamatan (mengecualikan yang ditolak)
  const activeReports = useMemo(() => {
    return reports.filter((r) => r.status !== "ditolak");
  }, [reports]);

  const reportsByKecamatan = useMemo(() => {
    const map = new Map<string, CitizenReport[]>();
    for (const r of activeReports) {
      const key = r.kecamatan.toLowerCase();
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [activeReports]);

  // Statistik agregat laporan real-time
  const { pendingTotal, verifiedTotal, allReportsTotal, myDistrictTotal } = useMemo(() => {
    const pending = activeReports.filter((r) => r.status === "menunggu").length;
    const verified = activeReports.filter((r) => r.status === "terverifikasi").length;
    const myDist = userDistrict
      ? activeReports.filter((r) => r.kecamatan.toLowerCase() === userDistrict.toLowerCase()).length
      : 0;
    return {
      pendingTotal: pending,
      verifiedTotal: verified,
      allReportsTotal: activeReports.length,
      myDistrictTotal: myDist,
    };
  }, [activeReports, userDistrict]);

  const reportsKey = useMemo(() => {
    const statuses = activeReports.map((r) => `${r.id}:${r.status}`).join(",");
    const triggersSum = triggers.reduce((s, t) => s + t.total, 0);
    return `${reports.length}-${pendingTotal}-${verifiedTotal}-${triggersSum}-${statuses}`;
  }, [reports.length, pendingTotal, verifiedTotal, triggers, activeReports]);

  useEffect(() => {
    // Fix default marker icon assets for Leaflet
    // @ts-expect-error private leaflet property
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    return () => {
      const container = document.getElementById("prakira-choropleth-map");
      if (container) {
        // @ts-expect-error private leaflet property
        container._leaflet_id = null;
      }
    };
  }, []);

  const styleFor = (feature?: Feature) => {
    const id = (feature?.properties as { id?: string } | undefined)?.id;
    const item = id ? byId.get(id) : undefined;
    const isSelected = selectedId === id;

    // "Data tidak memadai" is its own class, never a fallback to low risk.
    let fillColor = "#E3E8E8";
    let fillOpacity = 0.7;

    if (item) {
      fillColor = riskConfigOf(item.tingkat_risiko).fill;
      fillOpacity = item.tingkat_risiko ? 0.7 : 0.5;
    }

    return {
      color: isSelected ? "#0E2225" : "#FFFFFF",
      weight: isSelected ? 2.5 : 1.2,
      fillColor,
      fillOpacity: isSelected ? 0.88 : fillOpacity,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as { id?: string; nama?: string; kode_bps?: string };
    const item = props.id ? byId.get(props.id) : undefined;

    if (item) {
      const riskCfg = riskConfigOf(item.tingkat_risiko);
      const triggerInfo = triggerByKecamatan.get(item.nama.toLowerCase());
      const districtReportsList = reportsByKecamatan.get(item.nama.toLowerCase()) ?? [];
      const pendingInDist = districtReportsList.filter((r) => r.status === "menunggu").length;
      const verifiedInDist = districtReportsList.filter((r) => r.status === "terverifikasi").length;
      const triggerTotal = Math.max(triggerInfo?.total ?? 0, verifiedInDist);

      const predicted =
        item.kasus_prediksi === null
          ? "belum ada prediksi"
          : `${formatMaybeNumber(item.kasus_prediksi)} kasus${item.kasus_prediksi_lower === null || item.kasus_prediksi_upper === null
            ? " (rentang belum terkalibrasi)"
            : ` (${formatMaybeNumber(item.kasus_prediksi_lower)}–${formatMaybeNumber(item.kasus_prediksi_upper)})`}`;
      const delta =
        item.delta_periode === null
          ? ""
          : ` · ${formatMaybePercent(item.delta_periode)} vs bulan lalu`;
      const rain =
        item.cuaca.curah_hujan_mm === null
          ? "—"
          : `${formatMaybeNumber(item.cuaca.curah_hujan_mm)} mm${item.cuaca.status_cuaca ? ` (${item.cuaca.status_cuaca})` : ""}`;

      const triggerBreakdown = triggerInfo
        ? [
            triggerInfo.byKind.jentik ? `${triggerInfo.byKind.jentik} Jentik` : "",
            triggerInfo.byKind.genangan ? `${triggerInfo.byKind.genangan} Genangan` : "",
            triggerInfo.byKind.sampah ? `${triggerInfo.byKind.sampah} Sampah` : "",
            triggerInfo.byKind.saluran ? `${triggerInfo.byKind.saluran} Saluran` : "",
            triggerInfo.byKind.gejala ? `${triggerInfo.byKind.gejala} Gejala` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "";

      const html = `
        <div style="font-family:var(--font-sans, system-ui);font-size:12px;min-width:250px;color:#0E2225;line-height:1.4">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:0.06em;color:#5A6C6E">
              KECAMATAN
            </span>
            <span style="background:${riskCfg.color};color:#FFFFFF;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600">
              ${riskCfg.label.toUpperCase()}
            </span>
          </div>

          <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:#0E2225">
            ${item.nama}
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;border-top:1px solid #DFE6E6;padding-top:6px">
            <span style="color:#5A6C6E">Kasus ${formatMonth(item.periode_observasi)}:</span>
            <span style="font-weight:600;color:#0E2225">${formatMaybeNumber(item.kasus_aktif)} kasus${delta}</span>

            <span style="color:#5A6C6E">Prakiraan ${formatMonth(item.periode_prediksi)}:</span>
            <span style="font-weight:600;color:#A8442C">${predicted}</span>

            <span style="color:#5A6C6E">Insidensi:</span>
            <span style="font-weight:600">${formatMaybeIncidence(item.incidence_rate)}</span>

            <span style="color:#5A6C6E">Curah hujan:</span>
            <span style="font-weight:600;color:#0B4A57">${rain}</span>

            <span style="color:#5A6C6E">Skor risiko:</span>
            <span style="font-weight:600;color:${riskCfg.color}">${item.skor_risiko === null ? "—" : `${item.skor_risiko}/100`}</span>
          </div>

          ${
            pendingInDist > 0 || triggerTotal > 0
              ? `
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #DFE6E6;font-size:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;color:#0E2225;font-weight:600;margin-bottom:4px">
                <span style="color:#0B4A57;">Sinyal Laporan Warga:</span>
                <div style="display:flex;gap:4px;">
                  ${pendingInDist > 0 ? `<span style="background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:4px;font-size:11px;">${pendingInDist} Masuk</span>` : ""}
                  ${triggerTotal > 0 ? `<span style="background:#CCFBF1;color:#115E59;padding:1px 6px;border-radius:4px;font-size:11px;">${triggerTotal} Terverifikasi</span>` : ""}
                </div>
              </div>
              ${triggerBreakdown ? `<div style="font-size:11px;color:#5A6C6E;">${triggerBreakdown}</div>` : ""}
            </div>
          `
              : ""
          }

          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #DFE6E6;font-size:12px;color:#0B4A57;font-weight:600">
            Klik untuk rekomendasi intervensi lengkap →
          </div>
        </div>
      `;

      layer.bindTooltip(html, {
        sticky: true,
        direction: "top",
        offset: [0, -8],
        className: "dsdc-map-tooltip",
      });
    }

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.88, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle(styleFor(feature));
      },
      click: () => {
        if (props.id && onSelect) {
          onSelect(props.id);
        }
      },
    });
  };

  // 1. Titik koordinat presisi (pinpoint GPS) laporan warga
  const pinpointMarkers = useMemo(() => {
    if (!showTriggers) return [];

    return activeReports
      .filter((r) => {
        if (!r.location || typeof r.location.latitude !== "number" || typeof r.location.longitude !== "number") {
          return false;
        }
        if (!Number.isFinite(r.location.latitude) || !Number.isFinite(r.location.longitude)) {
          return false;
        }
        if (reportFilter === "my_district") {
          return userDistrict ? r.kecamatan.toLowerCase() === userDistrict.toLowerCase() : true;
        }
        if (reportFilter === "menunggu") return r.status === "menunggu";
        if (reportFilter === "terverifikasi") return r.status === "terverifikasi";
        return true;
      })
      .map((report) => {
        const isPending = report.status === "menunggu";
        const isVerified = report.status === "terverifikasi";
        const isInfoNeeded = report.status === "perlu_informasi";
        const emoji = KIND_EMOJIS[report.kind] ?? "📍";
        const kindName = KIND_LABELS[report.kind] ?? report.kind;

        const bg = isPending ? "#D97706" : isVerified ? "#0D9488" : "#0284C7";
        const statusTag = isPending ? "MASUK" : isVerified ? "TERVERIF" : "INFO";
        const statusTitle = isPending
          ? "Perlu Pemeriksaan"
          : isVerified
            ? "Terverifikasi"
            : "Perlu Info Tambahan";
        const statusBadgeClass = isPending
          ? "bg-amber-100 text-amber-900 border border-amber-300"
          : isVerified
            ? "bg-teal-100 text-teal-900 border border-teal-300"
            : "bg-sky-100 text-sky-900 border border-sky-300";
        const width = isPending ? 76 : isVerified ? 88 : 66;
        const height = 24;

        const pulseRing = isPending
          ? `<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(217,119,6,0.35);border-radius:9999px;animation:pulse 1.8s infinite;pointer-events:none;"></div>`
          : "";

        const icon = L.divIcon({
          className: "prakira-report-pin-marker",
          html: `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;width:${width}px;">
              <div style="position:relative;display:inline-flex;align-items:center;gap:3px;background:${bg};color:#ffffff;padding:2px 7px;border-radius:9999px;font-size:10px;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #FFFFFF;white-space:nowrap;line-height:1.2;">
                ${pulseRing}
                <span style="font-size:11px;">${emoji}</span>
                <span style="font-size:9px;letter-spacing:0.03em;text-transform:uppercase;">${statusTag}</span>
              </div>
              <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ${bg};margin-top:-1px;"></div>
            </div>
          `,
          iconSize: [width, height + 5],
          iconAnchor: [width / 2, height + 5],
        });

        return {
          report,
          lat: report.location!.latitude,
          lng: report.location!.longitude,
          icon,
          isPending,
          isVerified,
          isInfoNeeded,
          kindName,
          statusTitle,
          statusBadgeClass,
        };
      });
  }, [showTriggers, activeReports, reportFilter, userDistrict]);

  // 2. Penanda ringkasan agregat di pusat kecamatan
  const districtMarkers = useMemo(() => {
    if (!showTriggers) return [];

    return districts
      .filter((d) => d.koordinat && d.koordinat.length === 2)
      .map((d) => {
        const trigger = triggerByKecamatan.get(d.nama.toLowerCase());
        const dReports = reportsByKecamatan.get(d.nama.toLowerCase()) ?? [];
        const pendingReports = dReports.filter((r) => r.status === "menunggu");
        const verifiedReports = dReports.filter((r) => r.status === "terverifikasi");
        const pendingCount = pendingReports.length;
        const verifiedCount = Math.max(trigger?.total ?? 0, verifiedReports.length);
        const totalCount = pendingCount + verifiedCount;
        const isUserDist = userDistrict ? d.nama.toLowerCase() === userDistrict.toLowerCase() : false;

        return {
          district: d,
          trigger,
          dReports,
          pendingReports,
          verifiedReports,
          pendingCount,
          verifiedCount,
          totalCount,
          isUserDist,
        };
      })
      .filter(({ pendingCount, verifiedCount, totalCount, isUserDist }) => {
        if (totalCount === 0) return false;
        if (reportFilter === "my_district") return isUserDist;
        if (reportFilter === "menunggu") return pendingCount > 0;
        if (reportFilter === "terverifikasi") return verifiedCount > 0;
        return true;
      })
      .map(({ district, trigger, dReports, pendingReports, verifiedReports, pendingCount, verifiedCount, isUserDist }) => {
        const infoCount = dReports.filter((r) => r.status === "perlu_informasi").length;
        const showPendingBadge = reportFilter !== "terverifikasi" && pendingCount > 0;
        const showVerifiedBadge = reportFilter !== "menunggu" && verifiedCount > 0;
        const badgeWidth = showPendingBadge && showVerifiedBadge ? 116 : showPendingBadge ? 68 : 78;

        const icon = L.divIcon({
          className: "dsdc-trigger-marker-div",
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;width:${badgeWidth}px;height:24px;">
              ${
                showPendingBadge
                  ? `<div style="position:absolute;width:34px;height:34px;background:rgba(217, 119, 6, 0.4);border-radius:9999px;animation:pulse 1.8s infinite;"></div>`
                  : `<div style="position:absolute;width:28px;height:28px;background:rgba(13, 148, 136, 0.25);border-radius:9999px;"></div>`
              }
              <div style="position:relative;display:inline-flex;align-items:center;gap:3px;background:${showPendingBadge ? "#D97706" : "#0D9488"};color:#ffffff;padding:2px 7px;border-radius:9999px;font-size:10px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1.5px solid #FFFFFF;white-space:nowrap;">
                ${
                  showPendingBadge
                    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
                    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><polyline points="20 6 9 17 4 12"/></svg>`
                }
                ${showPendingBadge ? `<span>${pendingCount} Baru</span>` : ""}
                ${showPendingBadge && showVerifiedBadge ? `<span>·</span>` : ""}
                ${showVerifiedBadge ? `<span>${verifiedCount} Terverif</span>` : ""}
              </div>
            </div>
          `,
          iconSize: [badgeWidth, 24],
          iconAnchor: [badgeWidth / 2, 12],
        });

        // Hitung rincian jenis untuk laporan masuk
        const pendingKindCounts: Record<string, number> = {};
        for (const r of pendingReports) {
          pendingKindCounts[r.kind] = (pendingKindCounts[r.kind] ?? 0) + 1;
        }

        return {
          district,
          trigger,
          dReports,
          pendingReports,
          verifiedReports,
          pendingCount,
          verifiedCount,
          infoCount,
          pendingKindCounts,
          isUserDist,
          icon,
        };
      });
  }, [showTriggers, districts, triggerByKecamatan, reportsByKecamatan, reportFilter, userDistrict]);

  return (
    <div className="relative w-full h-full min-h-[420px] overflow-hidden rounded-2xl border border-border">
      <style jsx global>{`
        .leaflet-tooltip.dsdc-map-tooltip {
          background: #ffffff;
          border: 1px solid rgba(14, 34, 37, 0.12);
          border-radius: 14px;
          padding: 10px 12px;
          color: #0e2225;
          box-shadow:
            0 4px 8px rgba(14, 34, 37, 0.06),
            0 28px 56px -20px rgba(14, 34, 37, 0.22);
        }
        .leaflet-tooltip.dsdc-map-tooltip::before {
          display: none;
        }
        .leaflet-control-zoom a {
          background-color: #ffffff !important;
          color: #0e2225 !important;
          border: 1px solid #dfe6e6 !important;
          border-radius: 10px !important;
          margin-bottom: 4px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #eaf4f5 !important;
          color: #0b4a57 !important;
        }
        .dsdc-trigger-marker-div,
        .prakira-report-pin-marker {
          background: transparent;
          border: none;
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.2;
          }
        }
      `}</style>

      {/* Floating Layer & Filter Control */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {/* Real-time streaming badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-caption font-semibold backdrop-blur-md shadow-xs transition-all",
              liveConnected
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-800"
                : "bg-white/80 border-paper-200 text-muted-foreground",
            )}
            title={
              liveConnected
                ? "Aliran real-time aktif — laporan masuk & verifikasi diperbarui seketika"
                : "Menghubungkan ke aliran real-time…"
            }
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                liveConnected ? "bg-emerald-500 animate-pulse" : "bg-paper-400",
              )}
            />
            <span className="text-2xs uppercase tracking-wider font-bold">
              {liveConnected ? "Real-Time" : "Sinkron"}
            </span>
          </div>

          {/* Layer toggle button */}
          <button
            type="button"
            onClick={() => setShowTriggers(!showTriggers)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-caption sm:text-xs font-semibold backdrop-blur-md shadow-xs transition-all",
              showTriggers
                ? "bg-white/95 border-amber-300/80 text-amber-900 shadow-amber-500/10"
                : "bg-white/80 border-paper-200 text-muted-foreground hover:text-foreground",
            )}
            title="Tampilkan / Sembunyikan sinyal laporan warga di peta"
          >
            <Layers className={cn("h-3.5 w-3.5", showTriggers ? "text-amber-600" : "text-paper-500")} />
            <span>Sinyal Laporan Warga</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                showTriggers ? "bg-amber-500 ring-2 ring-amber-200" : "bg-paper-300",
              )}
            />
          </button>
        </div>

        {/* Filter pills saat layer aktif */}
        {showTriggers && (
          <div className="flex items-center gap-1 bg-white/95 border border-border rounded-xl p-1 shadow-xs backdrop-blur-md text-2xs">
            <button
              type="button"
              onClick={() => setReportFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded-lg font-semibold transition-all",
                reportFilter === "all"
                  ? "bg-paper-800 text-white shadow-xs"
                  : "text-paper-600 hover:text-paper-900 hover:bg-paper-100",
              )}
            >
              Semua ({allReportsTotal})
            </button>
            {userDistrict && (
              <button
                type="button"
                onClick={() => setReportFilter("my_district")}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold transition-all",
                  reportFilter === "my_district"
                    ? "bg-brand-700 text-white shadow-xs"
                    : "text-brand-800 hover:bg-brand-50",
                )}
                title={`Tampilkan laporan hanya di wilayah kerja ${userDistrict}`}
              >
                Wilayah Saya ({myDistrictTotal})
              </button>
            )}
            <button
              type="button"
              onClick={() => setReportFilter("menunggu")}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold transition-all",
                reportFilter === "menunggu"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-800 hover:bg-amber-50",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Masuk ({pendingTotal})
            </button>
            <button
              type="button"
              onClick={() => setReportFilter("terverifikasi")}
              className={cn(
                "px-2 py-0.5 rounded-lg font-semibold transition-all",
                reportFilter === "terverifikasi"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-teal-800 hover:bg-teal-50",
              )}
            >
              Terverifikasi ({verifiedTotal})
            </button>
          </div>
        )}
      </div>

      <MapContainer
        id="prakira-choropleth-map"
        key="prakira-choropleth-map"
        center={center}
        zoom={zoom}
        style={{ height, width: "100%" }}
        zoomControl={true}
        className="z-0"
      >
        <TileLayer
          attribution={CARTO_ATTRIBUTION}
          url={CARTO_TILE_URL}
          subdomains="abcd"
          maxZoom={19}
        />
        <GeoJSON
          key={`semarang-${disease}-${selectedId}-${reportsKey}`}
          data={geojson as unknown as GeoJsonObject}
          style={styleFor}
          onEachFeature={onEachFeature}
        />

        {/* 1. Titik presisi laporan warga (pinpoint GPS) */}
        {showTriggers &&
          pinpointMarkers.map(({ report, lat, lng, icon, statusTitle, statusBadgeClass, kindName }) => (
            <Marker
              key={`pin-${report.id}`}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onReportSelect?.(report);
                  if (onSelect) {
                    const match = districts.find(
                      (d) => d.nama.toLowerCase() === report.kecamatan.toLowerCase(),
                    );
                    if (match) onSelect(match.id);
                  }
                },
              }}
            >
              <LeafletTooltip direction="top" offset={[0, -12]} className="dsdc-map-tooltip">
                <div className="p-1 max-w-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-2xs font-bold text-paper-500">
                      {report.id}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-2xs font-bold uppercase",
                        statusBadgeClass,
                      )}
                    >
                      {statusTitle}
                    </span>
                  </div>

                  <div className="text-body-sm font-semibold text-foreground">
                    {KIND_EMOJIS[report.kind] ?? "📍"} {kindName}
                  </div>

                  <div className="text-caption text-paper-600">
                    Kec. {report.kecamatan}
                    {report.kelurahan ? `, Kel. ${report.kelurahan}` : ""}
                    {report.rtRw ? ` (RT/RW ${report.rtRw})` : ""}
                  </div>

                  {report.landmark && (
                    <div className="text-caption text-paper-500 italic">
                      Patokan: {report.landmark}
                    </div>
                  )}

                  <div className="text-caption bg-paper-50 p-2 rounded-lg border border-border text-paper-700 line-clamp-3">
                    &ldquo;{report.description}&rdquo;
                  </div>

                  <div className="flex items-center justify-between text-2xs text-paper-500 pt-1 border-t border-border">
                    <span>{relativeAge(report.submittedAt)}</span>
                    <a
                      href="/verifikasi"
                      className="text-brand-700 font-semibold hover:underline"
                    >
                      Buka antrean verifikasi →
                    </a>
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
          ))}

        {/* 2. Titik agregat per kecamatan */}
        {showTriggers &&
          districtMarkers.map(
            ({
              district,
              trigger,
              dReports,
              pendingCount,
              verifiedCount,
              infoCount,
              pendingKindCounts,
              icon,
            }) => (
              <Marker
                key={`trigger-${district.id}`}
                position={district.koordinat}
                icon={icon}
                eventHandlers={{
                  click: () => onSelect?.(district.id),
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -10]} className="dsdc-map-tooltip">
                  <div className="text-xs p-1 max-w-xs space-y-1">
                    <div className="font-semibold text-foreground text-body-sm">{district.nama}</div>

                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {pendingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {pendingCount} Laporan Masuk
                        </span>
                      )}
                      {verifiedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                          {verifiedCount} Terverifikasi
                        </span>
                      )}
                      {infoCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
                          {infoCount} Perlu Info
                        </span>
                      )}
                    </div>

                    {pendingCount > 0 && (
                      <div className="text-caption text-amber-800 mt-1 pt-1 border-t border-amber-200">
                        <span className="font-semibold">Laporan Masuk:</span>{" "}
                        {Object.entries(pendingKindCounts)
                          .map(([kind, count]) => `${count} ${KIND_LABELS[kind] ?? kind}`)
                          .join(" · ")}
                      </div>
                    )}

                    {trigger && (
                      <div className="text-caption text-muted-foreground mt-1 space-y-0.5 pt-1 border-t border-border">
                        {trigger.byKind.jentik > 0 && <div>• {trigger.byKind.jentik} Titik Jentik</div>}
                        {trigger.byKind.genangan > 0 && (
                          <div>• {trigger.byKind.genangan} Genangan Air</div>
                        )}
                        {trigger.byKind.sampah > 0 && <div>• {trigger.byKind.sampah} Tumpukan Sampah</div>}
                        {trigger.byKind.saluran > 0 && (
                          <div>• {trigger.byKind.saluran} Saluran Tersumbat</div>
                        )}
                        {trigger.byKind.gejala > 0 && (
                          <div>• {trigger.byKind.gejala} Sinyal Gejala</div>
                        )}
                      </div>
                    )}

                    {dReports.length > 0 && (
                      <div className="text-caption text-brand-700 font-semibold pt-1 border-t border-dashed border-border">
                        Klik wilayah untuk detail & rekomendasi →
                      </div>
                    )}
                  </div>
                </LeafletTooltip>
              </Marker>
            ),
          )}
      </MapContainer>
    </div>
  );
}
