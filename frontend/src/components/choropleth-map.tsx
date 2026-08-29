"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type {
  KecamatanData,
  DiseaseType,
  EnvironmentSignal,
  GeoDistrictCollection,
} from "@/types";
import {
  formatMaybeIncidence,
  formatMaybeNumber,
  formatMaybePercent,
  riskConfigOf,
} from "@/lib/utils";
import { formatMonth } from "@/lib/period";
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
  /**
   * Laporan lingkungan terverifikasi per kecamatan (PRD §4, S1).
   *
   * Lapisan ini **bukan** peta genangan. Ia memetakan laporan warga yang sudah
   * diverifikasi petugas — genangan, sampah, saluran tersumbat. Kecamatan tanpa
   * penanda berarti tidak ada laporan terverifikasi di sana, bukan berarti
   * kering. Wilayah dengan warga lebih aktif melapor akan tampak lebih ramai,
   * dan bias itu tidak bisa dikoreksi dari data ini sendiri.
   */
  environmentSignals?: EnvironmentSignal[];
  showEnvironment?: boolean;
};

const SEMARANG_CENTER: [number, number] = [-7.005, 110.42];

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2cl4_1_60997fa79620518562fb2948";
const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

export default function ChoroplethMap({
  geojson,
  districts,
  disease = "DBD",
  selectedId,
  onSelect,
  center = SEMARANG_CENTER,
  zoom = 12,
  height = "520px",
  environmentSignals = [],
  showEnvironment = false,
}: ChoroplethMapProps) {
  const byId = useMemo(() => {
    const map = new Map<string, KecamatanData>();
    for (const d of districts) map.set(d.id, d);
    return map;
  }, [districts]);

  /* Sinyal dipasangkan ke kecamatan lewat namanya: tabel laporan warga
     menyimpan nama kecamatan, bukan id peta. Sentroidnya diambil dari daftar
     kecamatan yang sudah ada di properti `districts`. */
  const signalMarkers = useMemo(() => {
    if (!showEnvironment || environmentSignals.length === 0) return [];

    const coordByName = new Map<string, [number, number]>();
    for (const d of districts) coordByName.set(d.nama, d.koordinat);

    const largest = environmentSignals.reduce(
      (max, s) => Math.max(max, s.total),
      0,
    );

    return environmentSignals
      .map((signal) => {
        const coord = coordByName.get(signal.kecamatan);
        if (!coord) return null;
        /* Jari-jari mengikuti akar jumlah, bukan jumlah itu sendiri: luas
           lingkaranlah yang dibaca mata, dan jari-jari linear melebih-lebihkan
           kecamatan teramai berlipat-lipat. */
        const scale = largest > 0 ? Math.sqrt(signal.total / largest) : 0;
        return { signal, coord, radius: 7 + scale * 13 };
      })
      .filter((m): m is { signal: EnvironmentSignal; coord: [number, number]; radius: number } => m !== null);
  }, [districts, environmentSignals, showEnvironment]);

  useEffect(() => {
    // Fix default marker icon assets
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

      const html = `
        <div style="font-family:var(--font-sans, system-ui);font-size:12px;min-width:240px;color:#0E2225;line-height:1.4">
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

  return (
    <div className="relative w-full h-full min-h-[420px] overflow-hidden rounded-2xl border border-border">
      <style jsx global>{`
        .leaflet-tooltip.dsdc-map-tooltip {
          background: #ffffff;
          border: 1px solid rgba(14, 34, 37, 0.12);
          border-radius: 14px;
          padding: 10px 12px;
          color: #0E2225;
          box-shadow: 0 4px 8px rgba(14, 34, 37, 0.06), 0 28px 56px -20px rgba(14, 34, 37, 0.22);
        }
        .leaflet-tooltip.dsdc-map-tooltip::before {
          display: none;
        }
        .leaflet-control-zoom a {
          background-color: #ffffff !important;
          color: #0E2225 !important;
          border: 1px solid #DFE6E6 !important;
          border-radius: 10px !important;
          margin-bottom: 4px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06) !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #EAF4F5 !important;
          color: #0B4A57 !important;
        }
      `}</style>

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
          maxZoom={20}
        />
        <GeoJSON
          key={`semarang-${disease}-${selectedId}`}
          data={geojson as unknown as GeoJsonObject}
          style={styleFor}
          onEachFeature={onEachFeature}
        />

        {/* Penanda memakai warna netral `paper`, bukan warna risiko: lapisan
            ini menandai laporan warga, dan mewarnainya dengan ramp risiko akan
            membuat dua sumber yang berbeda derajat keandalannya terbaca sama
            (docs/DESIGN-SYSTEM.md §2.4). */}
        {signalMarkers.map(({ signal, coord, radius }) => (
          <CircleMarker
            key={`env-${signal.kecamatan}`}
            center={coord}
            radius={radius}
            pathOptions={{
              color: "#24373A",
              weight: 1.5,
              fillColor: "#7C8D8F",
              fillOpacity: 0.35,
              dashArray: "3 3",
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} className="dsdc-map-tooltip">
              <span style={{ fontSize: 12, color: "#0E2225" }}>
                <strong>{signal.kecamatan}</strong>
                <br />
                {signal.total} laporan lingkungan terverifikasi
                <br />
                <span style={{ color: "#5A6C6E" }}>
                  Genangan {signal.genangan} · Sampah {signal.sampah} · Saluran{" "}
                  {signal.saluran}
                </span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
