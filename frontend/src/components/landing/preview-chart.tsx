"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const TREND_DATA = [
  { minggu: "W28", prediksi: 68, aktual: 68 },
  { minggu: "W29", prediksi: 74, aktual: 74 },
  { minggu: "W30", prediksi: 89, aktual: 89 },
  { minggu: "W31", prediksi: 104, aktual: 104 },
  { minggu: "W32", prediksi: 128, aktual: 128 },
  { minggu: "W33", prediksi: 152, aktual: 152 },
  { minggu: "W34", prediksi: 178, aktual: 178 },
  { minggu: "W35*", prediksi: 215, aktual: null },
  { minggu: "W36*", prediksi: 258, aktual: null },
  { minggu: "W37*", prediksi: 292, aktual: null },
];

export default function PreviewChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={TREND_DATA}>
        <CartesianGrid stroke="#DFE6E6" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="minggu"
          tick={{ fill: "#5A6C6E", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#5A6C6E", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #DFE6E6",
            fontSize: 12,
            background: "rgba(255, 255, 255, 0.95)",
            
          }}
        />
        <Line
          type="monotone"
          dataKey="aktual"
          stroke="#0B4A57"
          strokeWidth={2.2}
          dot={{ r: 3.5, fill: "#0B4A57" }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="prediksi"
          stroke="#A32B1F"
          strokeWidth={2.2}
          strokeDasharray="4 4"
          dot={{ r: 3.5, fill: "#A32B1F" }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
