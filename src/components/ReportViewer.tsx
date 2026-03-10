"use client";

import { useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DealReport } from "@/lib/types";

interface ReportViewerProps {
  report: DealReport;
}

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function scoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function scoreBadgeColor(score: number): string {
  if (score >= 90) return "bg-[rgba(0,255,136,0.15)] text-[#00ff88] border-[#00ff88]";
  if (score >= 75) return "bg-[rgba(170,255,68,0.12)] text-[#aaff44] border-[#aaff44]";
  if (score >= 60) return "bg-[rgba(255,204,0,0.12)] text-[#ffcc00] border-[#ffcc00]";
  return "bg-[rgba(255,68,68,0.12)] text-[#ff4444] border-[#ff4444]";
}

export default function ReportViewer({ report }: ReportViewerProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${report.title.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const data = report.data as Record<string, unknown>;

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-3 py-1.5 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
        >
          {downloading ? "Generating..." : "Download PDF"}
        </button>
        <button
          onClick={handlePrint}
          className="px-3 py-1.5 bg-[#1a1a1a] border border-[#222] text-[#777] text-xs font-bold uppercase rounded-lg hover:text-white transition-all"
        >
          Print
        </button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-[#0a0a0a] p-6 rounded-lg">
        {/* Header */}
        <div className="border-b border-[#222] pb-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="text-[10px] text-[#777] uppercase tracking-wider">
              Section 8 Scanner Report
            </span>
          </div>
          <h1 className="text-lg font-bold text-white">{report.title}</h1>
          <p className="text-xs text-[#555] mt-1">
            Generated {new Date(report.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {report.report_type === "single_deal" && <SingleDealReport data={data} />}
        {report.report_type === "market_summary" && <MarketSummaryReport data={data} />}
        {report.report_type === "portfolio_summary" && <PortfolioSummaryReport data={data} />}
      </div>
    </div>
  );
}

function SingleDealReport({ data }: { data: Record<string, unknown> }) {
  const deal = data.deal as Record<string, unknown> | undefined;
  const expenses = data.expenses as Record<string, unknown> | undefined;
  const neighborhood = data.neighborhood as Record<string, unknown> | undefined;

  if (!deal) return <div className="text-[#555] text-sm">No deal data available</div>;

  const score = Number(deal.deal_score ?? deal.score ?? 0);
  const price = Number(deal.price ?? 0);
  const cashFlow = Number(deal.monthly_cash_flow ?? 0);

  return (
    <div className="space-y-6">
      {/* Property Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-2">
            Property Overview
          </div>
          <div className="text-sm text-white font-medium mb-1">
            {String(deal.address ?? "N/A")}
          </div>
          <div className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
            {Number(deal.beds ?? 0)}bd / {Number(deal.baths ?? 0)}ba / {Number(deal.sqft ?? 0).toLocaleString()} sqft
          </div>
          <div className="text-lg font-bold text-white font-[family-name:var(--font-mono)] mt-2">
            {formatCurrency(price)}
          </div>
        </div>
        <div className="flex justify-end">
          <div className={`w-20 h-20 rounded-lg border flex flex-col items-center justify-center ${scoreBadgeColor(score)}`}>
            <span className="text-2xl font-bold font-[family-name:var(--font-mono)]">{score}</span>
            <span className="text-[9px] uppercase tracking-wider">{scoreGrade(score)}</span>
          </div>
        </div>
      </div>

      {/* Financial Analysis */}
      <div>
        <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Financial Analysis</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "DSCR", value: Number(deal.dscr ?? 0).toFixed(2) },
            { label: "Cash Flow", value: `${formatCurrency(cashFlow)}/mo` },
            { label: "Cash-on-Cash", value: `${Number(deal.cash_on_cash ?? deal.coc_return ?? 0).toFixed(1)}%` },
            { label: "Rent-to-Price", value: `${Number(deal.rent_to_price ?? 0).toFixed(2)}%` },
          ].map((m) => (
            <div key={m.label} className="bg-[#111] border border-[#222] rounded-lg p-3">
              <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{m.label}</div>
              <div className="text-sm font-bold text-white font-[family-name:var(--font-mono)]">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown */}
      {expenses && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Expense Breakdown</div>
          <div className="bg-[#111] border border-[#222] rounded-lg p-4 space-y-2">
            {[
              { label: "Mortgage", value: Number(expenses.mortgage ?? 0) },
              { label: `Property Tax (${String(expenses.tax_source ?? "est.")})`, value: Number(expenses.property_tax ?? 0) },
              { label: `Insurance (${String(expenses.insurance_source ?? "est.")})`, value: Number(expenses.insurance ?? 0) },
              { label: "Management (10%)", value: Number(expenses.management ?? 0) },
              { label: "Maintenance (5%)", value: Number(expenses.maintenance ?? 0) },
              { label: "Vacancy (5%)", value: Number(expenses.vacancy ?? 0) },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-[#777]">{item.label}</span>
                <span className="text-[#e0e0e0] font-[family-name:var(--font-mono)]">{formatCurrency(item.value)}/mo</span>
              </div>
            ))}
            <div className="border-t border-[#222] pt-2 flex justify-between text-xs font-bold">
              <span className="text-[#777]">Total</span>
              <span className="text-white font-[family-name:var(--font-mono)]">{formatCurrency(Number(expenses.total ?? 0))}/mo</span>
            </div>
          </div>
        </div>
      )}

      {/* Neighborhood */}
      {neighborhood && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Neighborhood</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Crime Grade", value: String(neighborhood.crime_grade ?? "N/A") },
              { label: "School Score", value: String(neighborhood.school_score ?? "N/A") },
              { label: "Walkability", value: String(neighborhood.walkability_score ?? "N/A") },
            ].map((m) => (
              <div key={m.label} className="bg-[#111] border border-[#222] rounded-lg p-3 text-center">
                <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{m.label}</div>
                <div className="text-sm font-bold text-white">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketSummaryReport({ data }: { data: Record<string, unknown> }) {
  const deals = (data.deals as Array<Record<string, unknown>>) ?? [];
  const stats = data.stats as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      {/* Market Stats */}
      {stats && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Market Overview</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Price", value: formatCurrency(Number(stats.avg_price ?? 0)) },
              { label: "Avg Rent", value: `${formatCurrency(Number(stats.avg_rent ?? 0))}/mo` },
              { label: "Avg Score", value: String(Number(stats.avg_score ?? 0).toFixed(0)) },
              { label: "Avg DSCR", value: String(Number(stats.avg_dscr ?? 0).toFixed(2)) },
            ].map((m) => (
              <div key={m.label} className="bg-[#111] border border-[#222] rounded-lg p-3">
                <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{m.label}</div>
                <div className="text-sm font-bold text-white font-[family-name:var(--font-mono)]">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Deals Table */}
      {deals.length > 0 && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">
            Top {Math.min(deals.length, 10)} Deals
          </div>
          <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="text-left p-3 text-[#555] font-medium uppercase tracking-wider text-[10px]">Address</th>
                  <th className="text-right p-3 text-[#555] font-medium uppercase tracking-wider text-[10px]">Price</th>
                  <th className="text-right p-3 text-[#555] font-medium uppercase tracking-wider text-[10px]">Score</th>
                  <th className="text-right p-3 text-[#555] font-medium uppercase tracking-wider text-[10px]">Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 10).map((deal, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    <td className="p-3 text-[#e0e0e0]">{String(deal.address ?? "")}</td>
                    <td className="p-3 text-right text-[#e0e0e0] font-[family-name:var(--font-mono)]">
                      {formatCurrency(Number(deal.price ?? 0))}
                    </td>
                    <td className="p-3 text-right text-[#00ff88] font-[family-name:var(--font-mono)]">
                      {Number(deal.deal_score ?? deal.score ?? 0)}
                    </td>
                    <td className="p-3 text-right font-[family-name:var(--font-mono)]">
                      <span className={Number(deal.monthly_cash_flow ?? 0) >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}>
                        {formatCurrency(Number(deal.monthly_cash_flow ?? 0))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioSummaryReport({ data }: { data: Record<string, unknown> }) {
  const properties = (data.properties as Array<Record<string, unknown>>) ?? [];
  const summary = data.summary as Record<string, unknown> | undefined;

  const chartData = properties.map((p) => ({
    name: String(p.address ?? "").split(",")[0],
    rent: Number(p.current_rent ?? 0),
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Portfolio Summary</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Total Properties", value: String(properties.length) },
              { label: "Monthly Income", value: formatCurrency(Number(summary.total_income ?? 0)) },
              { label: "Monthly Expenses", value: formatCurrency(Number(summary.total_expenses ?? 0)) },
              { label: "Monthly Cash Flow", value: formatCurrency(Number(summary.total_cash_flow ?? 0)) },
              { label: "Annual Projection", value: formatCurrency(Number(summary.total_cash_flow ?? 0) * 12) },
              { label: "PM vs Self-Manage Savings", value: `${formatCurrency(Number(summary.management_savings ?? 0))}/mo` },
            ].map((m) => (
              <div key={m.label} className="bg-[#111] border border-[#222] rounded-lg p-3">
                <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{m.label}</div>
                <div className="text-sm font-bold text-white font-[family-name:var(--font-mono)]">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rent Chart */}
      {chartData.length > 0 && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Monthly Rent by Property</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 10 }} axisLine={{ stroke: "#222" }} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`$${Number(value)}`, "Rent"]}
              />
              <Bar dataKey="rent" fill="#00ff88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Property Breakdown */}
      {properties.length > 0 && (
        <div>
          <div className="text-[10px] text-[#777] uppercase tracking-wider mb-3">Property Breakdown</div>
          <div className="space-y-2">
            {properties.map((p, i) => (
              <div key={i} className="bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium">{String(p.address ?? "")}</span>
                  <span className={`text-xs font-bold font-[family-name:var(--font-mono)] ${
                    String(p.vacancy_status) === "occupied" ? "text-[#00ff88]" : "text-[#ffcc00]"
                  }`}>
                    {String(p.vacancy_status ?? "unknown")}
                  </span>
                </div>
                <div className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                  Rent: {formatCurrency(Number(p.current_rent ?? 0))}/mo
                  {p.purchase_price ? ` · Purchased: ${formatCurrency(Number(p.purchase_price))}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
