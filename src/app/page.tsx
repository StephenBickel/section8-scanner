"use client";

import { useState, useRef, useCallback } from "react";

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
  const [city, setCity] = useState("cleveland-oh");
  const [maxPrice, setMaxPrice] = useState(100000);
  const [minScore, setMinScore] = useState(40);
  const [maxPages, setMaxPages] = useState(3);

  const [scanning, setScanning] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [progress, setProgress] = useState({ page: 0, totalPages: 0, count: 0 });
  const [scanDone, setScanDone] = useState(false);
  const [scanStats, setScanStats] = useState<{ total: number; deals: number } | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async () => {
    if (scanning) return;

    setScanning(true);
    setDeals([]);
    setScanDone(false);
    setScanStats(null);
    setError(null);
    setLogs([]);
    setProgress({ page: 0, totalPages: maxPages, count: 0 });
    setExpandedRow(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams({
        city,
        maxPrice: maxPrice.toString(),
        minScore: minScore.toString(),
        maxPages: maxPages.toString(),
      });

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiBase}/api/scan?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setError("Failed to connect to scanner");
        setScanning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const msg = JSON.parse(jsonStr);

            if (msg.type === "property") {
              setDeals((prev) => [...prev, msg.data as Deal]);
            } else if (msg.type === "progress") {
              setProgress({
                page: msg.page,
                totalPages: msg.total_pages,
                count: msg.count,
              });
            } else if (msg.type === "done") {
              setScanStats({ total: msg.total, deals: msg.deals });
              setScanDone(true);
              if (msg.demo) setIsDemo(true);
            } else if (msg.type === "error") {
              setError(msg.message);
            } else if (msg.type === "log") {
              setLogs((prev) => [...prev, msg.message]);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setScanning(false);
    }
  }, [city, maxPrice, minScore, maxPages, scanning]);

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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 min-w-80 border-r border-[#222] bg-[#111] flex flex-col p-6 gap-6 overflow-y-auto">
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

        {/* City input */}
        <div>
          <label className="block text-xs text-[#777] uppercase tracking-wider mb-2">
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="cleveland-oh"
            className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm font-[family-name:var(--font-mono)] focus:border-[#00ff88] focus:outline-none transition-colors"
          />
          <p className="text-[10px] text-[#555] mt-1">
            Format: city-state (e.g. cleveland-oh)
          </p>
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {isDemo && (
          <div className="bg-yellow-900/30 border-b border-yellow-700/50 px-4 py-2 text-center text-sm text-yellow-300">
            ⚡ Demo Mode — showing sample Cleveland data. Run locally on Mac mini for live Zillow scanning.
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
                  <span className="text-[#00ff88]">1.</span> Enter a city in
                  the format{" "}
                  <code className="font-[family-name:var(--font-mono)] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                    cleveland-oh
                  </code>
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
                Requires HUD_API_TOKEN env var for Fair Market Rent data
              </div>
            </div>
          </div>
        ) : (
          /* Results table */
          <div className="p-6">
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

            <div className="border border-[#222] rounded-xl overflow-hidden bg-[#111]">
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
                        HUD FMR
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
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DealRow({
  deal,
  rank,
  expanded,
  onToggle,
}: {
  deal: Deal;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
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
          </td>
        </tr>
      )}
    </>
  );
}
