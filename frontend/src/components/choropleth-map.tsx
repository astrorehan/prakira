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
  userRole?: string | null;
};

const SEMARANG_CENTER: [number, number] = [-7.005, 110.42];

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2cl4_1_60997fa79620518562fb2948";
const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

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
  onReportSelect,
  defaultShowTriggers = true,
  userDistrict,
  userRole,
}: ChoroplethMapProps) {
  const showTriggers = defaultShowTriggers;

  const byId = useMemo(() => {
    const map = new Map<string, KecamatanData>();
    for (const d of districts) map.set(d.id, d);
    return map;
  }, [districts]);

  const isPuskesmas = userRole === "puskesmas";

  // Laporan yang relevan sesuai kewenangan:
  // - Puskesmas: laporan masuk yang belum diverifikasi di wilayah kerjanya (belum dikirim ke dinkes)
  // - Dinkes: laporan masuk dan terverifikasi oleh puskesmas (yang sudah dikirim ke dinkes) namun belum ditangani
  const displayReports = useMemo(() => {
    if (isPuskesmas) {
      return reports.filter((r) => {
        if (r.status !== "menunggu" && r.status !== "perlu_informasi") return false;
        if (userDistrict && r.kecamatan.toLowerCase() !== userDistrict.toLowerCase()) return false;
        return true;
      });
    }

    return reports.filter((r) => {
      if (r.status !== "terverifikasi") return false;
      // Sudah ditangani (misal sudah diteruskan ke DLH/instansi terkait):
      if (r.forwarding?.state === "diteruskan") return false;
      // Laporan mandiri warga yang selesai di puskesmas dan tidak dikirim ke dinkes:
      if (r.routing?.handlingMode === "mandiri_warga" && !r.forwarding?.state) return false;
      return true;
    });
  }, [reports, isPuskesmas, userDistrict]);

  const reportsByKecamatan = useMemo(() => {
    const map = new Map<string, CitizenReport[]>();
    for (const r of displayReports) {
      const key = r.kecamatan.toLowerCase();
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [displayReports]);

  const reportsKey = useMemo(() => {
    const ids = displayReports.map((r) => `${r.id}:${r.status}`).join(",");
    return `${displayReports.length}-${ids}`;
  }, [displayReports]);

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
      const districtReportsList = reportsByKecamatan.get(item.nama.toLowerCase()) ?? [];
      const reportCountInDist = districtReportsList.length;

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

      const kindCounts: Record<string, number> = {};
      for (const r of districtReportsList) {
        kindCounts[r.kind] = (kindCounts[r.kind] ?? 0) + 1;
      }
      const breakdownText = Object.entries(kindCounts)
        .map(([k, count]) => `${count} ${KIND_LABELS[k] ?? k}`)
        .join(" · ");

      const statusBadgeText = isPuskesmas
        ? "Laporan Masuk (Belum Diverifikasi)"
        : "Laporan Terverifikasi (Belum Ditangani)";

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
            reportCountInDist > 0
              ? `
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #DFE6E6;font-size:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;color:#0E2225;font-weight:600;margin-bottom:4px">
                <span style="color:#0B4A57;">${statusBadgeText}:</span>
                <span style="background:${isPuskesmas ? "#FDF6E9" : "#EAF4F5"};color:${isPuskesmas ? "#D4933A" : "#0B4A57"};border:1px solid ${isPuskesmas ? "#F6DBA9" : "#D6E9EC"};padding:1px 6px;border-radius:9999px;font-size:11px;font-weight:600;">${reportCountInDist}</span>
              </div>
              ${breakdownText ? `<div style="font-size:11px;color:#5A6C6E;">${breakdownText}</div>` : ""}
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

    const pinColor = isPuskesmas ? "#D4933A" : "#0B4A57";

    return displayReports
      .filter((r) => {
        if (!r.location || typeof r.location.latitude !== "number" || typeof r.location.longitude !== "number") {
          return false;
        }
        return Number.isFinite(r.location.latitude) && Number.isFinite(r.location.longitude);
      })
      .map((report) => {
        const kindLabel = KIND_LABELS[report.kind] ?? report.kind;
        const statusLabel = isPuskesmas ? "Perlu Verifikasi" : "Menunggu Penanganan";
        const statusBadgeClass = isPuskesmas
          ? "border-risk-medium-br bg-risk-medium-bg text-risk-medium"
          : "border-brand-300/40 bg-brand-50 text-brand-700";

        const icon = L.divIcon({
          className: "prakira-report-pin-marker",
          html: `
            <div style="cursor:pointer;display:flex;flex-direction:column;align-items:center;">
              <svg width="22" height="28" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(14,34,37,0.3));">
                <path d="M12 0C5.37 0 0 5.37 0 12C0 20.25 12 30 12 30C12 30 24 20.25 24 12C24 5.37 18.63 0 12 0Z" fill="${pinColor}"/>
                <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
              </svg>
            </div>
          `,
          iconSize: [22, 28],
          iconAnchor: [11, 28],
        });

        return {
          report,
          lat: report.location!.latitude,
          lng: report.location!.longitude,
          icon,
          kindLabel,
          statusLabel,
          statusBadgeClass,
        };
      });
  }, [showTriggers, displayReports, isPuskesmas]);

  // 2. Penanda ringkasan agregat di pusat kecamatan
  const districtMarkers = useMemo(() => {
    if (!showTriggers) return [];

    const badgeBg = isPuskesmas ? "#D4933A" : "#0B4A57";

    return districts
      .filter((d) => d.koordinat && d.koordinat.length === 2)
      .map((d) => {
        const dReports = reportsByKecamatan.get(d.nama.toLowerCase()) ?? [];
        const count = dReports.length;

        // Hitung rincian jenis untuk laporan
        const kindCounts: Record<string, number> = {};
        for (const r of dReports) {
          kindCounts[r.kind] = (kindCounts[r.kind] ?? 0) + 1;
        }

        const icon = L.divIcon({
          className: "dsdc-trigger-marker-div",
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <div style="position:relative;display:inline-flex;align-items:center;gap:4px;background:${badgeBg};color:#ffffff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;box-shadow:0 1px 2px rgba(14,34,37,0.12);border:1.5px solid #FFFFFF;white-space:nowrap;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>${count}</span>
              </div>
            </div>
          `,
          iconSize: [40, 24],
          iconAnchor: [20, 12],
        });

        return {
          district: d,
          count,
          dReports,
          kindCounts,
          icon,
        };
      })
      .filter(({ count }) => count > 0);
  }, [showTriggers, districts, reportsByKecamatan, isPuskesmas]);

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
      `}</style>

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
          pinpointMarkers.map(({ report, lat, lng, icon, statusLabel, statusBadgeClass, kindLabel }) => (
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
              <LeafletTooltip direction="top" offset={[0, -28]} className="dsdc-map-tooltip">
                <div className="p-1 max-w-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-2xs font-semibold text-paper-500">
                      {report.id}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-2xs font-semibold uppercase border",
                        statusBadgeClass,
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="text-body-sm font-semibold text-foreground">
                    {kindLabel}
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
                      href={isPuskesmas ? "/verifikasi" : "/tindakan"}
                      className="text-brand-700 font-semibold hover:underline"
                    >
                      {isPuskesmas ? "Buka antrean verifikasi →" : "Buka tindak lanjut →"}
                    </a>
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
          ))}

        {/* 2. Titik agregat per kecamatan */}
        {showTriggers &&
          districtMarkers.map(({ district, count, dReports, kindCounts, icon }) => (
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

                  <div className="text-caption font-semibold text-paper-800">
                    {count} {isPuskesmas ? "laporan masuk (belum diverifikasi)" : "laporan terverifikasi (belum ditangani)"}
                  </div>

                  <div className="text-caption text-paper-600 space-y-0.5 pt-1 border-t border-border">
                    {Object.entries(kindCounts).map(([kind, kCount]) => (
                      <div key={kind}>• {kCount} {KIND_LABELS[kind] ?? kind}</div>
                    ))}
                  </div>

                  {dReports.length > 0 && (
                    <div className="text-caption text-brand-700 font-semibold pt-1 border-t border-dashed border-border">
                      Klik wilayah untuk detail →
                    </div>
                  )}
                </div>
              </LeafletTooltip>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
