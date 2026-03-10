"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

interface SavingsCalculatorProps {
  compact?: boolean;
}

export default function SavingsCalculator({ compact = false }: SavingsCalculatorProps) {
  const [numProperties, setNumProperties] = useState(3);
  const [avgRent, setAvgRent] = useState(1400);
  const [pmFeePct, setPmFeePct] = useState(10);

  const selfManageCostPerProperty = 15; // TenantCloud
  const annualPMCost = numProperties * avgRent * (pmFeePct / 100) * 12;
  const annualSelfManageCost = numProperties * selfManageCostPerProperty * 12;
  const annualSavings = annualPMCost - annualSelfManageCost;

  const chartData = [
    { name: "Property Manager", cost: Math.round(annualPMCost) },
    { name: "Self-Manage", cost: Math.round(annualSelfManageCost) },
  ];

  const inputClass =
    "w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors font-[family-name:var(--font-mono)]";

  return (
    <div className={compact ? "" : "bg-[#111] border border-[#222] rounded-lg p-6"}>
      {!compact && (
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Management Savings Calculator
        </h3>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            Properties
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={numProperties}
            onChange={(e) => setNumProperties(Math.max(1, parseInt(e.target.value) || 1))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            Avg Rent
          </label>
          <input
            type="number"
            min={500}
            step={100}
            value={avgRent}
            onChange={(e) => setAvgRent(parseInt(e.target.value) || 1000)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            PM Fee %
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={pmFeePct}
            onChange={(e) => setPmFeePct(Math.min(20, parseInt(e.target.value) || 10))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            PM Cost/yr
          </span>
          <span className="text-sm font-bold text-[#ff4444] font-[family-name:var(--font-mono)]">
            {formatCurrency(annualPMCost)}
          </span>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            Self-Manage/yr
          </span>
          <span className="text-sm font-bold text-[#ffcc00] font-[family-name:var(--font-mono)]">
            {formatCurrency(annualSelfManageCost)}
          </span>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
          <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
            You Save/yr
          </span>
          <span className="text-sm font-bold text-[#00ff88] font-[family-name:var(--font-mono)]">
            {formatCurrency(annualSavings)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              type="number"
              tick={{ fill: "#555", fontSize: 10 }}
              stroke="#222"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#777", fontSize: 10 }}
              stroke="#222"
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid #222",
                borderRadius: 8,
                fontSize: 12,
                color: "#e0e0e0",
              }}
              formatter={(value) => [formatCurrency(Number(value)), "Annual Cost"]}
            />
            <Bar dataKey="cost" fill="#00ff88" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
