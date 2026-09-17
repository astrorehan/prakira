"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type L from "leaflet";
import type { GeoDistrictCollection, RiskLevel } from "@/types";
import { formatNumber, riskConfigOf } from "@/lib/utils";

/**
 * Peta perbandingan untuk Mesin Waktu.
 *
 * Dipisah dari `choropleth-map.tsx` karena masukannya berbeda: yang dilukis di
 * sini adalah satu bulan uji yang sudah lewat, bukan prakiraan bulan berjalan,
 * jadi tidak ada interval, tidak ada cuaca, dan tidak ada tautan ke tindakan.
 *
 * Peta ini sengaja tidak bisa digeser atau di-zoom. Dua peta berdampingan yang
 * masing-masing bisa digeser akan berpisah bingkai setelah dua tarikan, dan
 * perbandingan yang bingkainya berbeda tidak lagi membandingkan apa pun.
 * Penjelajahan peta yang sesungguhnya ada di `/dashboard`.
 */

export type RewindMapCell = {
  id: string;
  nama: string;
  riskClass: RiskLevel | null;
  score: number;
  cases: number;
};

type RewindMapProps = {
  geojson: GeoDistrictCollection;
  cells: RewindMapCell[];
  /** Menandai kunci render; ganti tiap bulan agar gaya poligon dihitung ulang. */
  monthKey: string;
  /** "Prakiraan" atau "Rekap resmi" — muncul di tooltip. */
  sourceLabel: string;
  monthLabel: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: string;
};

const SEMARANG_CENTER: [number, number] = [-7.015, 110.4];

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2cl4_1_60997fa79620518562fb2948";
const CARTO_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

export default function RewindMap({
  geojson,
  cells,
  monthKey,
  sourceLabel,
  monthLabel,
  selectedId,
  onSelect,
  height = "340px",
}: RewindMapProps) {
  const byId = useMemo(() => {
    const map = new Map<string, RewindMapCell>();
    for (const cell of cells) map.set(cell.id, cell);
    return map;
  }, [cells]);

  const styleFor = (feature?: Feature) => {
    const id = (feature?.properties as { id?: string } | undefined)?.id;
    const item = id ? byId.get(id) : undefined;
    const isSelected = selectedId === id;

    /* Kecamatan yang tidak ikut diuji tetap abu-abu. Mengecatnya hijau berarti
       mengaku "rendah" untuk bulan yang tidak pernah dinilai. */
    const fillColor = item ? riskConfigOf(item.riskClass).fill : "#E3E8E8";

    return {
      color: isSelected ? "#0E2225" : "#FFFFFF",
      weight: isSelected ? 2.5 : 1.1,
      fillColor,
      fillOpacity: isSelected ? 0.92 : item ? 0.75 : 0.45,
    };
  };

  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const props = feature.properties as { id?: string; nama?: string };
    const item = props.id ? byId.get(props.id) : undefined;

    const risk = riskConfigOf(item?.riskClass ?? null);
    const body = item
      ? `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:11px;border-top:1px solid #DFE6E6;padding-top:6px">
          <span style="color:#5A6C6E">${sourceLabel}:</span>
          <span style="font-weight:600;color:#0E2225">${formatNumber(item.cases)} kasus</span>
          <span style="color:#5A6C6E">Skor risiko:</span>
          <span style="font-weight:600;color:${risk.color}">${item.score}/100</span>
        </div>`
      : `<div style="font-size:11px;color:#5A6C6E;border-top:1px solid #DFE6E6;padding-top:6px">Tidak termasuk periode uji.</div>`;

    layer.bindTooltip(
      `
      <div style="font-family:var(--font-sans, system-ui);font-size:12px;min-width:200px;color:#0E2225;line-height:1.4">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:4px">
          <span style="font-size:10px;text-transform:uppercase;font-weight:600;letter-spacing:0.06em;color:#5A6C6E">${monthLabel}</span>
          <span style="background:${risk.color};color:#FFFFFF;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600">${risk.label.toUpperCase()}</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">${props.nama ?? "—"}</div>
        ${body}
      </div>`,
      {
        sticky: true,
        direction: "top",
        offset: [0, -8],
        className: "dsdc-map-tooltip",
      },
    );

    layer.on({
      mouseover: (e) => {
        (e.target as L.Path).setStyle({ fillOpacity: 0.92, weight: 2.2 });
      },
      mouseout: (e) => {
        (e.target as L.Path).setStyle(styleFor(feature));
      },
      click: () => {
        if (props.id && onSelect) onSelect(props.id);
      },
    });
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={SEMARANG_CENTER}
        zoom={11}
        style={{ height, width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        touchZoom={false}
        keyboard={false}
        attributionControl
        className="z-0"
      >
        <TileLayer
          attribution={CARTO_ATTRIBUTION}
          url={CARTO_TILE_URL}
          subdomains="abcd"
          maxZoom={20}
        />
        <GeoJSON
          key={`${monthKey}-${sourceLabel}-${selectedId ?? "none"}`}
          data={geojson as unknown as GeoJsonObject}
          style={styleFor}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}
