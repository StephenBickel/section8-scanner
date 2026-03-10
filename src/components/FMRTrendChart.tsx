"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { FMRHistoryEntry } from "@/lib/types";

interface FMRTrendChartProps {
  zipCode: string;
  compact?: boolean;
}

const BED_COLORS: Record<string, string> = {
  efficiency: "#555",
  one_bed: "#777",
  two_bed: "#00ff88",
  three_bed: "#aaff44",
  four_bed: "#ffcc00",
};

const BED_LABELS: Record<string, string> = {
  efficiency: "Studio",
  one_bed: "1 Bed",
  two_bed: "2 Bed",
  three_bed: "3 Bed",
  four_bed: "4 Bed",
};

export default function FMRTrendChart({ zipCode, compact = false }: FMRTrendChartProps) {
  const [data, setData] = useState<FMRHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zipCode) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fmr/${zipCode}`);
        if (!res.ok) throw new Error("Failed to load FMR data");
        const json = await res.json();
        setData(json.history ?? []);
      } catch {
        setError("No FMR data available");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [zipCode]);

  if (loading) {
    return (
      <div className="text-xs text-[#555] py-4 text-center">
        Loading FMR trends...
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="text-xs text-[#555] py-4 text-center">
        {error ?? "No FMR history for this zip code"}
      </div>
    );
  }

  // Calculate YoY change for the most recent year
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const yoyChange =
    sorted.length >= 2
      ? (((sorted[sorted.length - 1].two_bed - sorted[sorted.length - 2].two_bed) /
          sorted[sorted.length - 2].two_bed) *
          100)
      : null;

  const chartData = sorted.map((entry) => ({
    year: entry.year,
    Studio: entry.efficiency,
    "1 Bed": entry.one_bed,
    "2 Bed": entry.two_bed,
    "3 Bed": entry.three_bed,
    "4 Bed": entry.four_bed,
  }));

  const height = compact ? 160 : 240;

  return (
    <div>
      {yoyChange !== null && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-[#777] uppercase tracking-wider">
            FMR Trend (2-Bed)
          </span>
          <span
            className={`text-[10px] font-bold font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded ${
              yoyChange >= 0
                ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
                : "bg-[rgba(255,68,68,0.12)] text-[#ff4444]"
            }`}
          >
            {yoyChange >= 0 ? "+" : ""}
            {yoyChange.toFixed(1)}% YoY
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="year"
            tick={{ fill: "#555", fontSize: 11 }}
            axisLine={{ stroke: "#222" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#555", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a1a",
              border: "1px solid #222",
              borderRadius: 8,
              fontSize: 12,
              color: "#e0e0e0",
            }}
            formatter={(value) => [`$${Number(value)}`, undefined]}
            labelStyle={{ color: "#777" }}
          />
          {!compact && <Legend wrapperStyle={{ fontSize: 11, color: "#777" }} />}
          {Object.entries(BED_LABELS).map(([key, label]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={label}
              stroke={BED_COLORS[key]}
              strokeWidth={key === "two_bed" ? 2 : 1}
              dot={{ r: 3, fill: BED_COLORS[key] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
