"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Download, Gift, ExternalLink } from "lucide-react";
import Link from "next/link";
import { analysisUrl } from "@/lib/analysis/legacy";
import CitySelector from "@/components/CitySelector";
import OutreachModal from "@/components/OutreachModal";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { useScanStore } from "@/stores/scan";
import { getGrantsForCity, TYPE_LABELS, TYPE_COLORS, type GrantProgram } from "@/lib/grants";
import { useSavedDealsStore } from "@/stores/saved-deals";
import { exportToCSV, exportToJSON } from "@/lib/export";

interface Deal {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  hud_rent: number;
  monthly_rent: number;
  dscr: number;
  monthly_cash_flow: number;
  coc_return: number;
  score: number;
  zillow_url: string;
  mortgage: number;
  expenses_total: number;
  down_payment: number;
  annual_cash_flow: number;
  rent_to_price: number;
  zip_code: string;
  initial_cash?: number;
  listing_type?: "standard" | "auction" | "pre_foreclosure" | "foreclosure" | "fsbo";
}

type ListingTypeFilter = "all" | "standard" | "auction" | "pre_foreclosure" | "foreclosure" | "fsbo";

type SortKey = "score" | "price" | "dscr" | "monthly_cash_flow" | "coc_return";

function SortHeader({
  label,
  field,
  sortKey,
  sortAsc,
  onSort,
  className,
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (field: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a] cursor-pointer hover:text-[#00ff88] whitespace-nowrap select-none ${className || ""}`}
    >
      {label}
      {sortKey === field && <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>}
    </th>
  );
}

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function scoreBadgeColor(score: number): string {
  if (score >= 90) return "bg-[rgba(0,255,136,0.15)] text-[#00ff88]";
  if (score >= 75) return "bg-[rgba(170,255,68,0.12)] text-[#aaff44]";
  if (score >= 60) return "bg-[rgba(255,204,0,0.12)] text-[#ffcc00]";
  return "bg-[rgba(255,68,68,0.12)] text-[#ff4444]";
}

function dscrColor(dscr: number): string {
  if (dscr > 1.25) return "text-[#00ff88]";
  if (dscr >= 1.0) return "text-[#ffcc00]";
  return "text-[#ff4444]";
}

function cashFlowColor(cf: number): string {
  return cf >= 0 ? "text-[#00ff88]" : "text-[#ff4444]";
}

const LISTING_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  auction: { label: "Auction", color: "text-[#ff4444] bg-[rgba(255,68,68,0.12)] border-[rgba(255,68,68,0.3)]", icon: "🔨" },
  pre_foreclosure: { label: "Pre-Foreclosure", color: "text-[#ffcc00] bg-[rgba(255,204,0,0.12)] border-[rgba(255,204,0,0.3)]", icon: "⚠️" },
  foreclosure: { label: "Foreclosure", color: "text-[#ff8844] bg-[rgba(255,136,68,0.12)] border-[rgba(255,136,68,0.3)]", icon: "🏦" },
  fsbo: { label: "FSBO", color: "text-[#88ccff] bg-[rgba(136,204,255,0.12)] border-[rgba(136,204,255,0.3)]", icon: "🏠" },
  standard: { label: "Standard", color: "text-[#777] bg-[rgba(119,119,119,0.08)] border-[rgba(119,119,119,0.2)]", icon: "✓" },
};

function ListingTypeBadge({ type }: { type: string }) {
  const config = LISTING_TYPE_CONFIG[type] || LISTING_TYPE_CONFIG.standard;
  if (type === "standard") return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

export default function Home() {
  // Global scan state — persists across page navigations
  const {
    city, maxPrice, minScore, maxPages,
    setCity, setMaxPrice, setMinScore, setMaxPages,
    scanning, deals, progress, scanDone, scanStats, isDemo, error, logs,
    startScan: startScanFromStore,
  } = useScanStore();

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Filters
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingTypeFilter>("all");
  const [hideAuctions, setHideAuctions] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState(0);
  const [maxBedsFilter, setMaxBedsFilter] = useState(0); // 0 = any
  const [minBedsFilter, setMinBedsFilter] = useState(0); // 0 = any
  const [minCashFlow, setMinCashFlow] = useState(0);
  const [minDscr, setMinDscr] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Save search state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [outreachDeal, setOutreachDeal] = useState<Deal | null>(null);

  const { user } = useAuthStore();
  const { addDeal: saveDeal, removeDeal: unsaveDeal, isDealSaved } = useSavedDealsStore();

  // Export handlers
  const handleExportCSV = () => {
    const cityLabel = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const ts = new Date().toISOString().slice(0, 10);
    exportToCSV(sortedDeals, `section8-${cityLabel}-${ts}`);
  };
  const handleExportJSON = () => {
    const cityLabel = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const ts = new Date().toISOString().slice(0, 10);
    exportToJSON(sortedDeals, `section8-${cityLabel}-${ts}`);
  };

  // Toggle save/unsave deal
  const toggleSaveDeal = (deal: Deal) => {
    if (isDealSaved(deal.address)) {
      unsaveDeal(deal.address);
    } else {
      saveDeal({ ...deal, city, source_kind: isDemo ? "demo" : "scanner" });
    }
  };

  const startScan = () => {
    setExpandedRow(null);
    startScanFromStore();
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          city,
          max_price: maxPrice,
          min_score: minScore,
          max_pages: maxPages,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => {
          setShowSaveModal(false);
          setSaveName("");
          setSaveStatus("idle");
        }, 1500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleAddToPortfolio = async (deal: Deal) => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      alert("Sign in to add properties to your portfolio");
      return;
    }

    const { error: insertError } = await supabase.from("portfolio_properties").insert({
      user_id: currentUser.id,
      address: deal.address,
      city,
      zip_code: deal.zip_code || null,
      purchase_price: deal.price,
      beds: deal.beds,
      baths: deal.baths,
      sqft: deal.sqft,
      current_rent: deal.monthly_rent,
      hud_rent: deal.hud_rent,
    });

    if (insertError) {
      alert(insertError.message);
    } else {
      alert("Added to portfolio!");
    }
  };

  // Apply filters
  const filteredDeals = deals.filter((d) => {
    if (hideAuctions && (d.listing_type === "auction" || d.listing_type === "pre_foreclosure")) return false;
    if (listingTypeFilter !== "all" && d.listing_type !== listingTypeFilter) return false;
    if (minPriceFilter > 0 && d.price < minPriceFilter) return false;
    if (minBedsFilter > 0 && d.beds < minBedsFilter) return false;
    if (maxBedsFilter > 0 && d.beds > maxBedsFilter) return false;
    if (minCashFlow > 0 && d.monthly_cash_flow < minCashFlow) return false;
    if (minDscr > 0 && d.dscr < minDscr) return false;
    return true;
  });

  // Count listing types for filter badges
  const listingTypeCounts = deals.reduce((acc, d) => {
    const t = d.listing_type || "standard";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * mul;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const avgDscr =
    deals.length > 0
      ? (deals.reduce((s, d) => s + d.dscr, 0) / deals.length).toFixed(2)
      : "—";

  return (
    <div className="flex flex-col md:flex-row h-full md:overflow-hidden overflow-y-auto">
      {/* Sidebar */}
      <aside className="w-80 min-w-80 border-r border-[#222] bg-[#111] flex flex-col p-6 gap-6 overflow-y-auto hidden md:flex">
        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Section 8 Scanner
            </h1>
            <span className="pulse-dot w-2 h-2 rounded-full bg-[#00ff88] inline-block" />
          </div>
          <p className="text-xs text-[#777] uppercase tracking-widest">
            Deal Finder
          </p>
        </div>

        {/* City selector */}
        <div>
          <label className="block text-xs text-[#777] uppercase tracking-wider mb-2">
            City
          </label>
          <CitySelector value={city} onChange={setCity} />
        </div>

        {/* Max Price */}
        <div>
          <label className="flex justify-between text-xs text-[#777] uppercase tracking-wider mb-2">
            <span>Max Price</span>
            <span className="text-[#00ff88] font-[family-name:var(--font-mono)] font-bold">
              {formatCurrency(maxPrice)}
            </span>
          </label>
          <input
            type="range"
            min={20000}
            max={200000}
            step={5000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </div>

        {/* Min Score */}
        <div>
          <label className="flex justify-between text-xs text-[#777] uppercase tracking-wider mb-2">
            <span>Min Score</span>
            <span className="text-[#00ff88] font-[family-name:var(--font-mono)] font-bold">
              {minScore}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>

        {/* Max Pages */}
        <div>
          <label className="flex justify-between text-xs text-[#777] uppercase tracking-wider mb-2">
            <span>Max Pages</span>
            <span className="text-[#00ff88] font-[family-name:var(--font-mono)] font-bold">
              {maxPages}
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
          />
          <p className="text-[10px] text-[#555] mt-1">
            Each page ~ 40 listings
          </p>
        </div>

        {/* Scan Button */}
        <button
          onClick={startScan}
          disabled={scanning}
          className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
            scanning
              ? "bg-[#1a1a1a] text-[#555] cursor-not-allowed"
              : "bg-[#00ff88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {scanning ? "Scanning..." : "Scan for Deals"}
        </button>

        {/* Save Search Button */}
        {scanDone && user && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-[#222] text-[#777] hover:border-[#00ff88] hover:text-[#00ff88] transition-colors flex items-center justify-center gap-2"
          >
            <Bookmark size={12} />
            Save This Search
          </button>
        )}

        {/* Progress */}
        {scanning && (
          <div className="scan-anim bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
            <p className="text-xs text-[#00ff88] font-[family-name:var(--font-mono)]">
              {progress.page > 0
                ? `Scanning page ${progress.page}/${progress.totalPages}...`
                : "Initializing scanner..."}
            </p>
            <p className="text-xs text-[#777] font-[family-name:var(--font-mono)] mt-1">
              {progress.count} results found &middot; {deals.length} deals
            </p>
          </div>
        )}

        {/* Stats */}
        {scanDone && scanStats && (
          <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3 text-xs text-[#777] font-[family-name:var(--font-mono)] space-y-1">
            <p>{scanStats.total} properties scanned</p>
            <p>
              <span className="text-[#00ff88]">{scanStats.deals}</span> deals
              found
            </p>
            <p>Avg DSCR: {avgDscr}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[rgba(255,68,68,0.1)] border border-[#ff4444] rounded-lg p-3 text-xs text-[#ff4444]">
            {error}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="text-[10px] text-[#555] font-[family-name:var(--font-mono)] max-h-32 overflow-y-auto space-y-0.5">
            {logs.slice(-10).map((log, i) => (
              <p key={i}>{log}</p>
            ))}
          </div>
        )}
      </aside>

      {/* Mobile controls */}
      <div className="md:hidden bg-[#111] border-b border-[#222] p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Section 8 Scanner
          </h1>
          <span className="pulse-dot w-2 h-2 rounded-full bg-[#00ff88] inline-block" />
        </div>
        <div>
          <label className="block text-xs text-[#777] uppercase tracking-wider mb-1">City</label>
          <CitySelector value={city} onChange={setCity} openDirection="down" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-[#777] uppercase tracking-wider mb-1">
              Max Price
            </label>
            <input
              type="range"
              min={20000}
              max={200000}
              step={5000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-[#00ff88] font-[family-name:var(--font-mono)] text-center">{formatCurrency(maxPrice)}</p>
          </div>
          <div>
            <label className="block text-[10px] text-[#777] uppercase tracking-wider mb-1">
              Min Score
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-[#00ff88] font-[family-name:var(--font-mono)] text-center">{minScore}</p>
          </div>
          <div>
            <label className="block text-[10px] text-[#777] uppercase tracking-wider mb-1">
              Pages
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-[#00ff88] font-[family-name:var(--font-mono)] text-center">{maxPages}</p>
          </div>
        </div>
        <button
          onClick={startScan}
          disabled={scanning}
          className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
            scanning
              ? "bg-[#1a1a1a] text-[#555] cursor-not-allowed"
              : "bg-[#00ff88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]"
          }`}
        >
          {scanning ? "Scanning..." : "Scan for Deals"}
        </button>
        {scanning && (
          <div className="bg-[#1a1a1a] border border-[#222] rounded-lg p-2">
            <p className="text-xs text-[#00ff88] font-[family-name:var(--font-mono)]">
              {progress.page > 0
                ? `Page ${progress.page}/${progress.totalPages} · ${progress.count} found · ${deals.length} deals`
                : "Initializing..."}
            </p>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:pb-0">
        {isDemo && (
          <div className="bg-yellow-900/30 border-b border-yellow-700/50 px-4 py-2 text-center text-sm text-yellow-300">
            Demo Mode — showing sample Cleveland data. Run locally on Mac mini for live Zillow scanning.
          </div>
        )}
        {deals.length === 0 && !scanning ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6 opacity-20">&#127968;</div>
              <h2 className="text-xl font-bold text-white mb-3">
                Find Section 8 Deals
              </h2>
              <div className="text-sm text-[#777] space-y-2">
                <p>
                  <span className="text-[#00ff88]">1.</span> Select a city from
                  the dropdown
                </p>
                <p>
                  <span className="text-[#00ff88]">2.</span> Adjust price,
                  score, and page filters
                </p>
                <p>
                  <span className="text-[#00ff88]">3.</span> Click{" "}
                  <span className="text-[#00ff88] font-semibold">
                    Scan for Deals
                  </span>{" "}
                  to search Zillow
                </p>
                <p>
                  <span className="text-[#00ff88]">4.</span> Results stream in
                  real-time, scored against HUD FMR
                </p>
              </div>
              <div className="mt-6 text-[10px] text-[#555] font-[family-name:var(--font-mono)]">
                Scores each deal 0–100 using DSCR, cash flow, and HUD Fair Market Rent data
              </div>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-[#777] uppercase tracking-widest">
                {scanDone
                  ? `${sortedDeals.length}${sortedDeals.length !== deals.length ? ` of ${deals.length}` : ""} Deals Found`
                  : `${deals.length} deals so far...`}
              </h2>
              <div className="flex items-center gap-2">
                {scanning && (
                  <div className="flex items-center gap-2 text-xs text-[#00ff88] font-[family-name:var(--font-mono)]">
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#00ff88] inline-block" />
                    Streaming...
                  </div>
                )}
                {sortedDeals.length > 0 && !scanning && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border border-[#333] text-[#777] hover:text-[#00ff88] hover:border-[#00ff88] transition-colors"
                      title="Export to CSV (spreadsheet)"
                    >
                      <Download size={12} /> CSV
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border border-[#333] text-[#777] hover:text-[#00ff88] hover:border-[#00ff88] transition-colors"
                      title="Export to JSON (raw data)"
                    >
                      <Download size={12} /> JSON
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter bar */}
            {deals.length > 0 && (
              <div className="mb-4">
                {/* Quick filters row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded border transition-colors ${showFilters ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]" : "border-[#333] text-[#777] hover:text-white hover:border-[#555]"}`}
                  >
                    ⚙ Filters {sortedDeals.length !== deals.length ? `(${deals.length - sortedDeals.length} hidden)` : ""}
                  </button>

                  {/* Auction toggle — always visible */}
                  <button
                    onClick={() => setHideAuctions(!hideAuctions)}
                    className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${hideAuctions ? "border-[#ff4444] text-[#ff4444] bg-[rgba(255,68,68,0.08)]" : "border-[#333] text-[#777] hover:text-white hover:border-[#555]"}`}
                  >
                    {hideAuctions ? "🔨 Auctions Hidden" : "🔨 Show Auctions"}
                    {(listingTypeCounts["auction"] || 0) + (listingTypeCounts["pre_foreclosure"] || 0) > 0 && (
                      <span className="ml-1 text-[10px] opacity-60">
                        ({(listingTypeCounts["auction"] || 0) + (listingTypeCounts["pre_foreclosure"] || 0)})
                      </span>
                    )}
                  </button>

                  {/* Listing type quick filters */}
                  {Object.entries(listingTypeCounts).map(([type, count]) => {
                    const config = LISTING_TYPE_CONFIG[type] || LISTING_TYPE_CONFIG.standard;
                    const active = listingTypeFilter === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setListingTypeFilter(active ? "all" : type as ListingTypeFilter)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${active ? config.color + " border-current" : "border-[#333] text-[#555] hover:text-[#999] hover:border-[#555]"}`}
                      >
                        {config.icon} {config.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Advanced filters — collapsible */}
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded border border-[#222] bg-[#111] mb-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#555] block mb-1">Min Price</label>
                      <input
                        type="number"
                        value={minPriceFilter || ""}
                        onChange={(e) => setMinPriceFilter(Number(e.target.value) || 0)}
                        placeholder="$0"
                        className="w-full px-2 py-1.5 text-xs font-[family-name:var(--font-mono)] bg-[#0a0a0a] border border-[#333] rounded text-white placeholder-[#555]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#555] block mb-1">Min Beds</label>
                      <select
                        value={minBedsFilter}
                        onChange={(e) => setMinBedsFilter(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0a0a0a] border border-[#333] rounded text-white"
                      >
                        <option value={0}>Any</option>
                        <option value={2}>2+</option>
                        <option value={3}>3+</option>
                        <option value={4}>4+</option>
                        <option value={5}>5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#555] block mb-1">Max Beds</label>
                      <select
                        value={maxBedsFilter}
                        onChange={(e) => setMaxBedsFilter(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0a0a0a] border border-[#333] rounded text-white"
                      >
                        <option value={0}>Any</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#555] block mb-1">Min Cash Flow</label>
                      <select
                        value={minCashFlow}
                        onChange={(e) => setMinCashFlow(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0a0a0a] border border-[#333] rounded text-white"
                      >
                        <option value={0}>Any</option>
                        <option value={200}>$200+/mo</option>
                        <option value={500}>$500+/mo</option>
                        <option value={750}>$750+/mo</option>
                        <option value={1000}>$1,000+/mo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#555] block mb-1">Min DSCR</label>
                      <select
                        value={minDscr}
                        onChange={(e) => setMinDscr(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs bg-[#0a0a0a] border border-[#333] rounded text-white"
                      >
                        <option value={0}>Any</option>
                        <option value={1.25}>1.25+</option>
                        <option value={1.5}>1.50+</option>
                        <option value={2.0}>2.00+</option>
                        <option value={2.5}>2.50+</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-5 flex justify-end">
                      <button
                        onClick={() => {
                          setListingTypeFilter("all");
                          setHideAuctions(false);
                          setMinPriceFilter(0);
                          setMinBedsFilter(0);
                          setMaxBedsFilter(0);
                          setMinCashFlow(0);
                          setMinDscr(0);
                        }}
                        className="text-[10px] uppercase text-[#555] hover:text-white transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block border border-[#222] rounded-xl overflow-hidden bg-[#111]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a] w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                        Address
                      </th>
                      <SortHeader label="Price" field="price" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                        Beds
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                        Rent assumption
                      </th>
                      <SortHeader label="DSCR" field="dscr" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Cash Flow" field="monthly_cash_flow" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="CoC%" field="coc_return" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Score" field="score" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((deal, i) => (
                      <DealRow
                        key={deal.address + i}
                        deal={deal}
                        rank={i + 1}
                        expanded={expandedRow === i}
                        onToggle={() =>
                          setExpandedRow(expandedRow === i ? null : i)
                        }
                        onAddToPortfolio={() => handleAddToPortfolio(deal)}
                        onContactSeller={() => setOutreachDeal(deal)}
                        showPortfolioBtn={!!user}
                        citySlug={city}
                        isDemo={isDemo}
                        isSaved={isDealSaved(deal.address)}
                        onToggleSave={() => toggleSaveDeal(deal)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {sortedDeals.map((deal, i) => (
                <div
                  key={deal.address + i}
                  className="bg-[#111] border border-[#222] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-white font-medium flex items-center gap-1.5">{deal.address} <ListingTypeBadge type={deal.listing_type || "standard"} /></p>
                      <p className="text-[10px] text-[#555] font-[family-name:var(--font-mono)]">
                        {formatCurrency(deal.price)} &middot; {deal.beds}bd/{deal.baths}ba
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        aria-label={`Bookmark ${deal.address} in this browser`}
                        onClick={() => toggleSaveDeal(deal)}
                        className={`p-1 rounded transition-colors ${isDealSaved(deal.address) ? "text-[#ffcc00]" : "text-[#555] hover:text-[#ffcc00]"}`}
                      >
                        {isDealSaved(deal.address) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] ${scoreBadgeColor(deal.score)}`}>
                        {deal.score}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-[#555] block">DSCR</span>
                      <span className={`font-bold font-[family-name:var(--font-mono)] ${dscrColor(deal.dscr)}`}>
                        {deal.dscr.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#555] block">Cash Flow</span>
                      <span className={`font-bold font-[family-name:var(--font-mono)] ${cashFlowColor(deal.monthly_cash_flow)}`}>
                        {formatCurrency(deal.monthly_cash_flow)}/mo
                      </span>
                    </div>
                    <div>
                      <span className="text-[#555] block">Rent assumption</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-[#00ff88]">
                        {formatCurrency(deal.hud_rent)}/mo
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 items-center">
                    <Link className="text-sm text-[#00ff88]" href={analysisUrl(deal, city, isDemo)}>Analyze property →</Link>
                    {deal.zillow_url && (
                      <a
                        href={deal.zillow_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#00ff88] hover:underline"
                      >
                        Zillow &rarr;
                      </a>
                    )}
                    {user && (
                      <button
                        onClick={() => handleAddToPortfolio(deal)}
                        className="text-[10px] text-[#777] hover:text-[#00ff88] ml-auto"
                      >
                        + Portfolio
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Outreach Modal */}
      {outreachDeal && (
        <OutreachModal
          deal={outreachDeal}
          onClose={() => setOutreachDeal(null)}
        />
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Save Search
            </h3>
            <div className="mb-4">
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`${city} under ${formatCurrency(maxPrice)}`}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none"
                autoFocus
              />
            </div>
            <div className="text-xs text-[#555] font-[family-name:var(--font-mono)] mb-4 space-y-0.5">
              <p>City: {city}</p>
              <p>Max price: {formatCurrency(maxPrice)}</p>
              <p>Min score: {minScore}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setSaveName(""); setSaveStatus("idle"); }}
                className="flex-1 py-2 rounded-lg text-xs text-[#777] border border-[#222] hover:border-[#555] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#00ff88] text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
              >
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved!"
                    : "Save"}
              </button>
            </div>
            {saveStatus === "error" && (
              <p className="text-xs text-[#ff4444] mt-2">Failed to save. Are you logged in?</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Grants Section ---
function GrantsSection({ citySlug }: { citySlug: string }) {
  const [showGrants, setShowGrants] = useState(false);
  const { local, federal } = getGrantsForCity(citySlug);
  const totalPrograms = local.length + federal.length;

  function GrantCard({ grant }: { grant: GrantProgram }) {
    return (
      <div className="p-3 rounded border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-white">{grant.name}</span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${TYPE_COLORS[grant.type]}`}>
            {TYPE_LABELS[grant.type]}
          </span>
        </div>
        <div className="text-xs font-[family-name:var(--font-mono)] text-[#00ff88] font-bold mb-1">
          {grant.amount}
        </div>
        <div className="text-[11px] text-[#777] mb-2">{grant.requirements}</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#555]">{grant.source}</span>
          <a
            href={grant.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-[#00ff88] hover:underline"
          >
            Apply <ExternalLink size={8} />
          </a>
        </div>
        {grant.phone && (
          <div className="mt-1 text-[10px] text-[#555]">📞 {grant.phone}</div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
      <button
        onClick={(e) => { e.stopPropagation(); setShowGrants(!showGrants); }}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777] hover:text-white transition-colors"
      >
        <span className={`transition-transform ${showGrants ? "rotate-90" : ""}`}>▶</span>
        <Gift size={12} />
        Rehab Grants & Assistance
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88]">
          {totalPrograms} programs
        </span>
      </button>

      {showGrants && (
        <div className="mt-3 space-y-4" onClick={(e) => e.stopPropagation()}>
          {local.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#555] mb-2">
                Local Programs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {local.map((g) => <GrantCard key={g.name} grant={g} />)}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#555] mb-2">
              Federal Programs (Available Everywhere)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {federal.map((g) => <GrantCard key={g.name} grant={g} />)}
            </div>
          </div>
          <p className="text-[10px] text-[#555] italic">
            Note: Grant availability and amounts change. Contact the administering agency to confirm current funding. Most programs require an application and have affordability compliance periods.
          </p>
        </div>
      )}
    </div>
  );
}

function DealRow({ deal, rank, expanded, onToggle, onAddToPortfolio, onContactSeller, showPortfolioBtn, citySlug, isSaved, onToggleSave, isDemo }: {
  deal: Deal; rank: number; expanded: boolean; onToggle: () => void; onAddToPortfolio: () => void;
  onContactSeller: () => void; showPortfolioBtn: boolean; citySlug: string; isSaved?: boolean; onToggleSave?: () => void;
  isDemo?: boolean;
}) {
  return <>
    <tr className="border-t border-[#222] text-xs">
      <td className="px-4 py-3 text-[#888]">{rank}</td>
      <td className="px-4 py-3"><button className="text-left text-white underline decoration-[#444] underline-offset-4" onClick={onToggle} aria-expanded={expanded}>{deal.address}</button><div className="mt-1"><ListingTypeBadge type={deal.listing_type || "standard"} /></div></td>
      <td className="px-4 py-3">{formatCurrency(deal.price)}</td><td className="px-4 py-3">{deal.beds}</td>
      <td className="px-4 py-3">{formatCurrency(deal.monthly_rent)}/mo</td><td className="px-4 py-3">{deal.dscr.toFixed(2)}</td>
      <td className={`px-4 py-3 ${cashFlowColor(deal.monthly_cash_flow)}`}>{formatCurrency(deal.monthly_cash_flow)}/mo</td>
      <td className="px-4 py-3">{deal.coc_return.toFixed(2)}%</td><td className="px-4 py-3 text-[#aaa]">{deal.score}</td>
    </tr>
    {expanded && <tr><td colSpan={9} className="p-5 bg-[#141414]">
      <p className="text-sm text-[#bbb] mb-3">Initial cash estimate: {formatCurrency(deal.initial_cash ?? deal.down_payment)}. Review financing, repairs, vacancy, and reserves in the worksheet.</p>
      <div className="flex flex-wrap gap-4 items-center text-sm">
        <Link href={analysisUrl(deal, citySlug, isDemo)} className="rounded-lg bg-[#00ff88] px-4 py-2 font-semibold text-black">Analyze property →</Link>
        <button onClick={onToggleSave} className="text-[#ccc]">{isSaved ? "Remove browser bookmark" : "Bookmark in this browser"}</button>
        {showPortfolioBtn && <button onClick={onAddToPortfolio} className="text-[#aaa]">Add to portfolio</button>}
        <button onClick={onContactSeller} className="text-[#aaa]">Outreach draft</button>
      </div>
      <p className="text-xs text-[#aaa] mt-3">Cash-on-cash uses initial cash including reserves. Rent and provider scores are unverified. Bookmarks retain the default case; save edited scenarios from the worksheet.</p>
      <GrantsSection citySlug={citySlug} />
    </td></tr>}
  </>;
}
