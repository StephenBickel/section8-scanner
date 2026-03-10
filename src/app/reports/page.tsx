"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, ChevronDown, Lock } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import ReportViewer from "@/components/ReportViewer";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { PLAN_LIMITS } from "@/lib/types";
import type { DealReport, SavedSearch, Deal } from "@/lib/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReportsContent() {
  const { profile } = useAuthStore();
  const plan = (profile?.plan ?? "free") as keyof typeof PLAN_LIMITS;
  const canUseReports = PLAN_LIMITS[plan].reports;

  const [reports, setReports] = useState<DealReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DealReport | null>(null);

  // Generate form state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genType, setGenType] = useState<"single_deal" | "market_summary" | "portfolio_summary">("single_deal");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
    loadFormData();
  }, []);

  async function loadReports() {
    const supabase = createClient();
    const { data } = await supabase
      .from("deal_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports((data as DealReport[]) ?? []);
    setLoading(false);
  }

  async function loadFormData() {
    const supabase = createClient();
    const [dealsRes, searchesRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("is_active", true)
        .order("deal_score", { ascending: false })
        .limit(50),
      supabase
        .from("saved_searches")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (dealsRes.data) setDeals(dealsRes.data as Deal[]);
    if (searchesRes.data) setSavedSearches(searchesRes.data as SavedSearch[]);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body: Record<string, string> = { type: genType };
      if (genType === "single_deal" && selectedDealId) body.deal_id = selectedDealId;
      if (genType === "market_summary" && selectedSearchId) body.saved_search_id = selectedSearchId;

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const report = (await res.json()) as DealReport;
        setReports((prev) => [report, ...prev]);
        setSelectedReport(report);
        setShowGenerate(false);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }

  if (!canUseReports) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Reports</h1>
          <p className="text-sm text-[#777]">Generate deal, market, and portfolio reports</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
          <Lock size={32} className="text-[#555] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Pro Feature</h2>
          <p className="text-sm text-[#777] mb-4">
            Reports require a Pro or Investor plan.
          </p>
          <a
            href="/pricing"
            className="inline-block px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
          >
            Upgrade Now
          </a>
        </div>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedReport(null)}
          className="text-xs text-[#777] hover:text-white mb-4 transition-colors"
        >
          &larr; Back to Reports
        </button>
        <ReportViewer report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Reports</h1>
          <p className="text-sm text-[#777]">Generate deal, market, and portfolio reports</p>
        </div>
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus size={14} />
          Generate Report
        </button>
      </div>

      {/* Generate Form */}
      {showGenerate && (
        <div className="bg-[#111] border border-[#222] rounded-lg p-6 mb-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            New Report
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                Report Type
              </label>
              <div className="relative">
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as typeof genType)}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none appearance-none pr-8"
                >
                  <option value="single_deal">Single Deal Report</option>
                  <option value="market_summary">Market Summary</option>
                  <option value="portfolio_summary">Portfolio Summary</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
              </div>
            </div>

            {genType === "single_deal" && (
              <div>
                <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                  Select Deal
                </label>
                <div className="relative">
                  <select
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none appearance-none pr-8"
                  >
                    <option value="">Choose a deal...</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.address} — ${d.price.toLocaleString()} (Score: {d.deal_score})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
                </div>
              </div>
            )}

            {genType === "market_summary" && (
              <div>
                <label className="block text-xs text-[#777] uppercase tracking-wider mb-1.5">
                  Select Saved Search
                </label>
                <div className="relative">
                  <select
                    value={selectedSearchId}
                    onChange={(e) => setSelectedSearchId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none appearance-none pr-8"
                  >
                    <option value="">Choose a saved search...</option>
                    {savedSearches.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || (genType === "single_deal" && !selectedDealId) || (genType === "market_summary" && !selectedSearchId)}
              className="px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="text-xs text-[#555]">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
          <FileText size={32} className="text-[#555] mx-auto mb-4" />
          <p className="text-sm text-[#555] mb-3">No reports generated yet</p>
          <button
            onClick={() => setShowGenerate(true)}
            className="text-xs text-[#00ff88] hover:underline"
          >
            Generate your first report &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="w-full bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#555]" />
                  <span className="text-sm text-white font-medium">
                    {report.title}
                  </span>
                </div>
                <span className="text-[10px] bg-[rgba(0,255,136,0.12)] text-[#00ff88] px-1.5 py-0.5 rounded uppercase">
                  {report.report_type.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-[#555] font-[family-name:var(--font-mono)] ml-[22px]">
                {formatDate(report.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthGuard>
      <ReportsContent />
    </AuthGuard>
  );
}
