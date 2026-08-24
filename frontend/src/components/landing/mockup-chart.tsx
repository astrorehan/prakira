"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

const climateData = [
  { d: 1, v: 140 },
  { d: 2, v: 180 },
  { d: 3, v: 95 },
  { d: 4, v: 220 },
  { d: 5, v: 160 },
  { d: 6, v: 280 },
  { d: 7, v: 225 },
];

export default function MockupChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={climateData}>
        <defs>
          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B4A57" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0B4A57" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#0B4A57"
          strokeWidth={1.8}
          fill="url(#blueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
