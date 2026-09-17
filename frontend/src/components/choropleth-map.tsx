"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type { KecamatanData, DiseaseType, GeoDistrictCollection, DistrictTriggerSummary } from "@/types";
import {
  cn,
  formatMaybeIncidence,
  formatMaybeNumber,
  formatMaybePercent,
  riskConfigOf,
} from "@/lib/utils";
import { formatMonth } from "@/lib/period";
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
  defaultShowTriggers?: boolean;
};

const SEMARANG_CENTER: [number, number] = [-7.005, 110.42];

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2cl4_1_60997fa79620518562fb2948";
const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

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
  defaultShowTriggers = true,
}: ChoroplethMapProps) {
  const [showTriggers, setShowTriggers] = useState(defaultShowTriggers);

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

  useEffect(() => {
    // Fix default marker icon assets for Leaflet
    // @ts-expect-error private leaflet property
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const styleFor = (feature?: Feature) => {
    const id = (feature?.properties as { id?: string } | undefined)?.id;
    const item = id ? byId.get(id) : undefined;
    const isSelected = selectedId === id;

    // "Data tidak memadai" is its own class, never a fallback to low risk.
    let fillColor = "#E3E8E8";
    let fillOpacity = 0.7;

    /* Kecamatan tanpa prediksi memakai abu-abu `RISK_UNKNOWN`, bukan hijau
       "rendah". Peta yang mengecat kekosongan sebagai aman adalah bug
       kepercayaan yang paling mudah ditemukan juri (PRD §7-H2). */
    if (item) {
      fillColor = riskConfigOf(item.tingkat_risiko).fill;
      fillOpacity = item.tingkat_risiko ? 0.7 : 0.5;
    }

    return {
      // White hairline borders read the fills as districts, not as blotches.
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
      const triggerTotal = triggerInfo?.total ?? 0;

      const predicted =
        item.kasus_prediksi === null
          ? "belum ada prediksi"
          : `${formatMaybeNumber(item.kasus_prediksi)} kasus (${formatMaybeNumber(item.kasus_prediksi_lower)}–${formatMaybeNumber(item.kasus_prediksi_upper)})`;
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
            <span style="font-size:10px;text-transform:uppercase;font-weight:600;letter-spacing:0.06em;color:#5A6C6E">
              KECAMATAN
            </span>
            <span style="background:${riskCfg.color};color:#FFFFFF;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600">
              ${riskCfg.label.toUpperCase()}
            </span>
          </div>

          <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:#0E2225">
            ${item.nama}
          </div>

          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:11px;border-top:1px solid #DFE6E6;padding-top:6px">
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
            triggerTotal > 0
              ? `
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #DFE6E6;font-size:11px;">
              <div style="display:flex;justify-content:space-between;color:#0E2225;font-weight:600;margin-bottom:2px">
                <span style="color:#0B4A57;">Sinyal Pemicu Lingkungan:</span>
                <span style="background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:4px;font-size:10px">${triggerTotal} terverifikasi</span>
              </div>
              <div style="font-size:10px;color:#5A6C6E;">
                ${triggerBreakdown}
              </div>
            </div>
          `
              : ""
          }

          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #DFE6E6;font-size:10px;color:#0B4A57;font-weight:600">
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

  // Build trigger markers for districts with verified signals
  const triggerMarkers = useMemo(() => {
    if (!showTriggers) return [];
    return districts
      .filter((d) => {
        const t = triggerByKecamatan.get(d.nama.toLowerCase());
        return t && t.total > 0 && d.koordinat && d.koordinat.length === 2;
      })
      .map((d) => {
        const trigger = triggerByKecamatan.get(d.nama.toLowerCase())!;
        return {
          district: d,
          trigger,
          icon: L.divIcon({
            className: "dsdc-trigger-marker-div",
            html: `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                <div style="position:absolute;width:28px;height:28px;background:rgba(217, 119, 6, 0.35);border-radius:9999px;animation:pulse 2s infinite;"></div>
                <div style="position:relative;display:flex;align-items:center;gap:3px;background:#D97706;color:#ffffff;padding:2px 7px;border-radius:9999px;font-size:10px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1.5px solid #FFFFFF;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>${trigger.total}</span>
                </div>
              </div>
            `,
            iconSize: [36, 24],
            iconAnchor: [18, 12],
          }),
        };
      });
  }, [showTriggers, districts, triggerByKecamatan]);

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
        .dsdc-trigger-marker-div {
          background: transparent;
          border: none;
        }
      `}</style>

      {/* Floating Layer Control */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTriggers(!showTriggers)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-2xs sm:text-xs font-semibold backdrop-blur-md shadow-xs transition-all",
            showTriggers
              ? "bg-white/95 border-amber-300/80 text-amber-900 shadow-amber-500/10"
              : "bg-white/80 border-paper-200 text-muted-foreground hover:text-foreground",
          )}
          title="Tampilkan / Sembunyikan sinyal pemicu lingkungan terverifikasi"
        >
          <Layers className={cn("h-3.5 w-3.5", showTriggers ? "text-amber-600" : "text-paper-500")} />
          <span>Sinyal Pemicu Warga</span>
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              showTriggers ? "bg-amber-500 ring-2 ring-amber-200" : "bg-paper-300",
            )}
          />
        </button>
      </div>

      <MapContainer
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
          key={`semarang-${disease}-${selectedId}`}
          data={geojson as unknown as GeoJsonObject}
          style={styleFor}
          onEachFeature={onEachFeature}
        />

        {/* Environmental trigger markers */}
        {showTriggers &&
          triggerMarkers.map(({ district, trigger, icon }) => (
            <Marker
              key={`trigger-${district.id}`}
              position={district.koordinat}
              icon={icon}
              eventHandlers={{
                click: () => onSelect?.(district.id),
              }}
            >
              <LeafletTooltip direction="top" offset={[0, -10]} className="dsdc-map-tooltip">
                <div className="text-xs p-1">
                  <div className="font-semibold text-foreground">{district.nama}</div>
                  <div className="text-2xs text-amber-700 font-medium mt-0.5">
                    {trigger.total} Laporan Lingkungan Terverifikasi
                  </div>
                  <div className="text-3xs text-muted-foreground mt-1 space-y-0.5">
                    {trigger.byKind.jentik > 0 && <div>• {trigger.byKind.jentik} Titik Jentik</div>}
                    {trigger.byKind.genangan > 0 && (
                      <div>• {trigger.byKind.genangan} Genangan Air</div>
                    )}
                    {trigger.byKind.sampah > 0 && <div>• {trigger.byKind.sampah} Tumpukan Sampah</div>}
                    {trigger.byKind.saluran > 0 && (
                      <div>• {trigger.byKind.saluran} Saluran Tersumbat</div>
                    )}
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
