"use client";

import { useState, useCallback, useEffect } from "react";
import { Bookmark, Building2, Mail, Shield } from "lucide-react";
import CitySelector from "@/components/CitySelector";
import CrimeGradeBadge from "@/components/CrimeGradeBadge";
import OutreachModal from "@/components/OutreachModal";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { useScanStore } from "@/stores/scan";

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
}

type SortKey = "score" | "price" | "dscr" | "monthly_cash_flow" | "coc_return";

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

  // Save search state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [outreachDeal, setOutreachDeal] = useState<Deal | null>(null);
  const [neighborhoodCache, setNeighborhoodCache] = useState<Record<string, { crime_grade: string; crime_score: number }>>({});

  const { user, profile } = useAuthStore();

  // Fetch neighborhood data for deal zip codes
  const fetchNeighborhood = useCallback(async (zipCode: string) => {
    if (!zipCode || neighborhoodCache[zipCode]) return;
    try {
      const res = await fetch(`/api/neighborhood/${zipCode}`);
      if (res.ok) {
        const data = await res.json();
        setNeighborhoodCache((prev) => ({
          ...prev,
          [zipCode]: { crime_grade: data.crime_grade, crime_score: data.crime_score },
        }));
      }
    } catch {
      // ignore
    }
  }, [neighborhoodCache]);

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

  const sortedDeals = [...deals].sort((a, b) => {
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

  const SortHeader = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a] cursor-pointer hover:text-[#00ff88] whitespace-nowrap select-none ${className || ""}`}
    >
      {label}
      {sortKey === field && (
        <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>
      )}
    </th>
  );

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
                  ? `${deals.length} Deals Found`
                  : `${deals.length} deals so far...`}
              </h2>
              {scanning && (
                <div className="flex items-center gap-2 text-xs text-[#00ff88] font-[family-name:var(--font-mono)]">
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#00ff88] inline-block" />
                  Streaming...
                </div>
              )}
            </div>

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
                      <SortHeader label="Price" field="price" />
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                        Beds
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-[#777] bg-[#1a1a1a]">
                        HUD Payment Standard
                      </th>
                      <SortHeader label="DSCR" field="dscr" />
                      <SortHeader label="Cash Flow" field="monthly_cash_flow" />
                      <SortHeader label="CoC%" field="coc_return" />
                      <SortHeader label="Score" field="score" />
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
                        isInvestor={true}
                        crimeGrade={neighborhoodCache[deal.zip_code]?.crime_grade}
                        onExpand={() => fetchNeighborhood(deal.zip_code)}
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
                      <p className="text-xs text-white font-medium">{deal.address}</p>
                      <p className="text-[10px] text-[#555] font-[family-name:var(--font-mono)]">
                        {formatCurrency(deal.price)} &middot; {deal.beds}bd/{deal.baths}ba
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] ${scoreBadgeColor(deal.score)}`}>
                      {deal.score}
                    </span>
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
                      <span className="text-[#555] block">HUD Payment Std</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-[#00ff88]">
                        {formatCurrency(deal.hud_rent)}/mo
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 items-center">
                    {neighborhoodCache[deal.zip_code] && (
                      <CrimeGradeBadge grade={neighborhoodCache[deal.zip_code].crime_grade} />
                    )}
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

// --- Rehab & All-In Cost Estimator ---
const CLOSING_COST_PCT = 0.03;
const HQS_BUFFER = 3000;
const HOLDING_COST_MONTHLY = 1500;
const DOWN_PAYMENT_PCT = 0.15;
const INTEREST_RATE = 0.08;
const LOAN_TERM_YEARS = 30;
const PROPERTY_TAX_RATE = 0.015;
const INSURANCE_MONTHLY = 100;
const MGMT_FEE_PCT = 0.10;

type RehabTier = "light" | "moderate" | "heavy";

function estimateRehab(price: number, sqft: number): { amount: number; tier: RehabTier; months: number } {
  const pricePerSqft = sqft > 0 ? price / sqft : 60;

  if (pricePerSqft < 40) {
    // Very cheap per sqft = likely needs heavy work
    const amount = Math.round(sqft > 0 ? sqft * 30 : 40000);
    return { amount: Math.min(Math.max(amount, 25000), 55000), tier: "heavy", months: 4 };
  } else if (pricePerSqft < 65) {
    // Moderate
    const amount = Math.round(sqft > 0 ? sqft * 18 : 22000);
    return { amount: Math.min(Math.max(amount, 12000), 35000), tier: "moderate", months: 3 };
  } else {
    // Higher price/sqft = probably in better shape
    const amount = Math.round(sqft > 0 ? sqft * 8 : 10000);
    return { amount: Math.min(Math.max(amount, 5000), 18000), tier: "light", months: 2 };
  }
}

function calcAllIn(price: number, rehabCost: number, rehabMonths: number, monthlyRent: number) {
  const closing = Math.round(price * CLOSING_COST_PCT);
  const holding = Math.round(HOLDING_COST_MONTHLY * rehabMonths);
  const allInCost = price + rehabCost + closing + holding + HQS_BUFFER;
  const downPayment = Math.round(allInCost * DOWN_PAYMENT_PCT);
  const loanAmount = allInCost - downPayment;
  const monthlyRate = INTEREST_RATE / 12;
  const nPayments = LOAN_TERM_YEARS * 12;
  const mortgage = monthlyRate === 0
    ? loanAmount / nPayments
    : loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1);
  const taxes = allInCost * PROPERTY_TAX_RATE / 12;
  const insurance = INSURANCE_MONTHLY;
  const management = monthlyRent * MGMT_FEE_PCT;
  const totalExpenses = mortgage + taxes + insurance + management;
  const monthlyCashFlow = monthlyRent - totalExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const dscr = mortgage > 0 ? monthlyRent / mortgage : 0;
  const cocReturn = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
  const rentToPrice = allInCost > 0 ? (monthlyRent / allInCost) * 100 : 0;

  return {
    allInCost, closing, holding, hqsBuffer: HQS_BUFFER, downPayment,
    mortgage: Math.round(mortgage), totalExpenses: Math.round(totalExpenses),
    monthlyCashFlow: Math.round(monthlyCashFlow), annualCashFlow: Math.round(annualCashFlow),
    dscr, cocReturn, rentToPrice,
  };
}

const TIER_COLORS: Record<RehabTier, string> = {
  light: "text-[#00ff88]",
  moderate: "text-[#ffcc00]",
  heavy: "text-[#ff4444]",
};

const TIER_BG: Record<RehabTier, string> = {
  light: "bg-[rgba(0,255,136,0.08)] border-[rgba(0,255,136,0.2)]",
  moderate: "bg-[rgba(255,204,0,0.08)] border-[rgba(255,204,0,0.2)]",
  heavy: "bg-[rgba(255,68,68,0.08)] border-[rgba(255,68,68,0.2)]",
};

function DealRow({
  deal,
  rank,
  expanded,
  onToggle,
  onAddToPortfolio,
  onContactSeller,
  showPortfolioBtn,
  isInvestor,
  crimeGrade,
  onExpand,
}: {
  deal: Deal;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  onAddToPortfolio: () => void;
  onContactSeller: () => void;
  showPortfolioBtn: boolean;
  isInvestor?: boolean;
  crimeGrade?: string;
  onExpand?: () => void;
}) {
  const rehab = estimateRehab(deal.price, deal.sqft);
  const [rehabCost, setRehabCost] = useState(rehab.amount);
  const [rehabMonths, setRehabMonths] = useState(rehab.months);
  const [showAllIn, setShowAllIn] = useState(false);

  useEffect(() => {
    if (expanded && onExpand) onExpand();
  }, [expanded, onExpand]);

  // Recalc all-in numbers
  const allIn = calcAllIn(deal.price, rehabCost, rehabMonths, deal.monthly_rent);

  // Estimate PM savings: 10% of rent * 12 months minus $15/mo self-manage tools * 12
  const pmSavings = Math.round(deal.monthly_rent * 0.10 * 12 - 15 * 12);

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[rgba(0,255,136,0.03)] transition-colors border-t border-[#222]"
      >
        <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[#555] text-xs">
          {rank}
        </td>
        <td className="px-4 py-3 text-white whitespace-nowrap text-xs">
          {deal.address}
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs whitespace-nowrap">
          {formatCurrency(deal.price)}
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">
          {deal.beds}
        </td>
        <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-[#00ff88] whitespace-nowrap">
          {formatCurrency(deal.hud_rent)}/mo
        </td>
        <td
          className={`px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-bold ${dscrColor(deal.dscr)}`}
        >
          {deal.dscr.toFixed(2)}
        </td>
        <td
          className={`px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-bold whitespace-nowrap ${cashFlowColor(deal.monthly_cash_flow)}`}
        >
          {deal.monthly_cash_flow >= 0 ? "+" : ""}
          {formatCurrency(deal.monthly_cash_flow)}/mo
        </td>
        <td
          className={`px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-bold ${deal.coc_return > 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}
        >
          {deal.coc_return.toFixed(1)}%
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block px-2.5 py-1 rounded-md font-[family-name:var(--font-mono)] text-xs font-bold ${scoreBadgeColor(deal.score)}`}
          >
            {deal.score}
          </span>
        </td>
      </tr>

      {/* Expanded details */}
      {expanded && (
        <tr className="border-t border-[#1a1a1a]">
          <td colSpan={9} className="px-6 py-4 bg-[#0d0d0d]">
            {/* As-Is Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Mortgage
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {formatCurrency(deal.mortgage)}/mo
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Total Expenses
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {formatCurrency(deal.expenses_total)}/mo
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Down Payment
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {formatCurrency(deal.down_payment)}
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Annual Cash Flow
                </span>
                <span
                  className={`font-[family-name:var(--font-mono)] ${cashFlowColor(deal.annual_cash_flow)}`}
                >
                  {formatCurrency(deal.annual_cash_flow)}/yr
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Rent-to-Price
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {deal.rent_to_price.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Sqft
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {deal.sqft > 0 ? deal.sqft.toLocaleString() : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Baths
                </span>
                <span className="font-[family-name:var(--font-mono)] text-white">
                  {deal.baths}
                </span>
              </div>
              <div>
                <span className="text-[#555] uppercase tracking-wider block mb-1">
                  Zillow
                </span>
                {deal.zillow_url ? (
                  <a
                    href={deal.zillow_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#00ff88] underline hover:no-underline"
                  >
                    View Listing &rarr;
                  </a>
                ) : (
                  <span className="text-[#555]">—</span>
                )}
              </div>
            </div>

            {/* All-In Cost Calculator */}
            <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAllIn(!showAllIn); }}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777] hover:text-white transition-colors"
              >
                <span className={`transition-transform ${showAllIn ? "rotate-90" : ""}`}>▶</span>
                All-In Cost Calculator
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${TIER_BG[rehab.tier]}`}>
                  <span className={TIER_COLORS[rehab.tier]}>Est. {rehab.tier} rehab</span>
                </span>
              </button>

              {showAllIn && (
                <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Cost Breakdown */}
                  <div className={`p-3 rounded border ${TIER_BG[rehab.tier]}`}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[#555] uppercase tracking-wider block mb-1">Purchase</span>
                        <span className="font-[family-name:var(--font-mono)] text-white">{formatCurrency(deal.price)}</span>
                      </div>
                      <div>
                        <label className="text-[#555] uppercase tracking-wider block mb-1">
                          Rehab Cost
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[#777] text-xs">$</span>
                          <input
                            type="number"
                            value={rehabCost}
                            onChange={(e) => setRehabCost(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-24 bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 font-[family-name:var(--font-mono)] text-white text-xs focus:border-[#00ff88] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[#555] uppercase tracking-wider block mb-1">
                          Rehab Months
                        </label>
                        <input
                          type="number"
                          value={rehabMonths}
                          onChange={(e) => setRehabMonths(Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                          className="w-16 bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 font-[family-name:var(--font-mono)] text-white text-xs focus:border-[#00ff88] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[#555] uppercase tracking-wider block mb-1">Closing (3%)</span>
                        <span className="font-[family-name:var(--font-mono)] text-[#777]">{formatCurrency(allIn.closing)}</span>
                      </div>
                      <div>
                        <span className="text-[#555] uppercase tracking-wider block mb-1">Holding ({rehabMonths}mo)</span>
                        <span className="font-[family-name:var(--font-mono)] text-[#777]">{formatCurrency(allIn.holding)}</span>
                      </div>
                      <div>
                        <span className="text-[#555] uppercase tracking-wider block mb-1">HQS Buffer</span>
                        <span className="font-[family-name:var(--font-mono)] text-[#777]">{formatCurrency(allIn.hqsBuffer)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#333] flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">All-In Cost</span>
                      <span className="font-[family-name:var(--font-mono)] text-lg font-bold text-white">{formatCurrency(allIn.allInCost)}</span>
                    </div>
                  </div>

                  {/* Recalculated Metrics — side by side */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2 rounded bg-[#111] border border-[#222]">
                      <span className="text-[#555] uppercase tracking-wider block mb-1">Down Payment (15%)</span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-[family-name:var(--font-mono)] text-white">{formatCurrency(allIn.downPayment)}</span>
                        <span className="text-[10px] text-[#555]">was {formatCurrency(deal.down_payment)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#111] border border-[#222]">
                      <span className="text-[#555] uppercase tracking-wider block mb-1">DSCR</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-[family-name:var(--font-mono)] font-bold ${dscrColor(allIn.dscr)}`}>{allIn.dscr.toFixed(2)}</span>
                        <span className="text-[10px] text-[#555]">was {deal.dscr.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#111] border border-[#222]">
                      <span className="text-[#555] uppercase tracking-wider block mb-1">Monthly Cash Flow</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-[family-name:var(--font-mono)] font-bold ${cashFlowColor(allIn.monthlyCashFlow)}`}>
                          {allIn.monthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(allIn.monthlyCashFlow)}
                        </span>
                        <span className="text-[10px] text-[#555]">was {deal.monthly_cash_flow >= 0 ? "+" : ""}{formatCurrency(deal.monthly_cash_flow)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#111] border border-[#222]">
                      <span className="text-[#555] uppercase tracking-wider block mb-1">Cash-on-Cash</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-[family-name:var(--font-mono)] font-bold ${allIn.cocReturn > 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                          {allIn.cocReturn.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-[#555]">was {deal.coc_return.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick rehab presets */}
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-[#555] uppercase tracking-wider self-center">Quick set:</span>
                    {([
                      { label: "Light ($10K)", cost: 10000, months: 2 },
                      { label: "Moderate ($25K)", cost: 25000, months: 3 },
                      { label: "Heavy ($40K)", cost: 40000, months: 4 },
                      { label: "None ($0)", cost: 0, months: 0 },
                    ] as const).map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => { setRehabCost(preset.cost); setRehabMonths(preset.months); }}
                        className={`px-2 py-1 rounded border transition-colors ${
                          rehabCost === preset.cost
                            ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                            : "border-[#333] text-[#777] hover:border-[#555] hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Neighborhood & Section 8 stats */}
            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-4 items-center text-xs">
              {crimeGrade && (
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-[#555]" />
                  <span className="text-[#555] uppercase tracking-wider">Crime Grade:</span>
                  <CrimeGradeBadge grade={crimeGrade} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[#555]">Avg S8 tenant stay:</span>
                <span className="font-[family-name:var(--font-mono)] text-white">7 years</span>
              </div>
              {pmSavings > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[#555]">Self-manage savings:</span>
                  <span className="font-[family-name:var(--font-mono)] text-[#00ff88]">
                    ~{formatCurrency(pmSavings)}/yr
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons in expanded row */}
            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-2">
              {showPortfolioBtn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPortfolio();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase text-[#777] border border-[#222] rounded-md hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
                >
                  <Building2 size={10} />
                  Add to Portfolio
                </button>
              )}
              {showPortfolioBtn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContactSeller();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase border rounded-md transition-colors text-[#777] border-[#222] hover:border-[#00ff88] hover:text-[#00ff88]"
                >
                  <Mail size={10} />
                  Contact Seller
                </button>
              )}
              {deal.zillow_url && (
                <a
                  href={deal.zillow_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase text-[#777] border border-[#222] rounded-md hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
                >
                  View on Zillow
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
