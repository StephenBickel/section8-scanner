"use client";

import { useState } from "react";
import { BookmarkCheck, Download, Trash2, ExternalLink, StickyNote } from "lucide-react";
import { useSavedDealsStore } from "@/stores/saved-deals";
import { exportToCSV, exportToJSON } from "@/lib/export";

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
  auction: { label: "Auction", color: "text-[#ff4444] bg-[rgba(255,68,68,0.12)]", icon: "🔨" },
  pre_foreclosure: { label: "Pre-Foreclosure", color: "text-[#ffcc00] bg-[rgba(255,204,0,0.12)]", icon: "⚠️" },
  foreclosure: { label: "Foreclosure", color: "text-[#ff8844] bg-[rgba(255,136,68,0.12)]", icon: "🏦" },
  fsbo: { label: "FSBO", color: "text-[#88ccff] bg-[rgba(136,204,255,0.12)]", icon: "🏠" },
  standard: { label: "Standard", color: "text-[#777] bg-[rgba(119,119,119,0.08)]", icon: "" },
};

export default function SavedDealsPage() {
  const { deals, removeDeal, updateNote, clearAll } = useSavedDealsStore();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<"saved_at" | "score" | "cash_flow" | "price">("saved_at");

  const sorted = [...deals].sort((a, b) => {
    switch (sortBy) {
      case "score": return b.score - a.score;
      case "cash_flow": return b.monthly_cash_flow - a.monthly_cash_flow;
      case "price": return a.price - b.price;
      default: return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    }
  });

  const totalCashFlow = deals.reduce((sum, d) => sum + d.monthly_cash_flow, 0);
  const totalDownPayment = deals.reduce((sum, d) => sum + d.down_payment, 0);
  const avgScore = deals.length > 0 ? deals.reduce((sum, d) => sum + d.score, 0) / deals.length : 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Saved Deals</h1>
          <p className="text-sm text-[#777]">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} saved · Stored locally in your browser
          </p>
        </div>
        {deals.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(sorted, `saved-deals-${new Date().toISOString().slice(0, 10)}`)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border border-[#333] text-[#777] hover:text-[#00ff88] hover:border-[#00ff88] transition-colors"
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={() => exportToJSON(sorted, `saved-deals-${new Date().toISOString().slice(0, 10)}`)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border border-[#333] text-[#777] hover:text-[#00ff88] hover:border-[#00ff88] transition-colors"
            >
              <Download size={12} /> JSON
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border border-[#333] text-[#555] hover:text-[#ff4444] hover:border-[#ff4444] transition-colors"
            >
              <Trash2 size={12} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="mb-4 p-3 border border-[#ff4444] bg-[rgba(255,68,68,0.06)] rounded-lg flex items-center justify-between">
          <p className="text-xs text-[#ff4444]">Delete all {deals.length} saved deals? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowClearConfirm(false)} className="text-[10px] px-3 py-1 text-[#777] border border-[#333] rounded hover:text-white transition-colors">Cancel</button>
            <button onClick={() => { clearAll(); setShowClearConfirm(false); }} className="text-[10px] px-3 py-1 text-[#ff4444] border border-[#ff4444] rounded hover:bg-[rgba(255,68,68,0.1)] transition-colors">Delete All</button>
          </div>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="text-center py-20">
          <BookmarkCheck size={48} className="text-[#333] mx-auto mb-4" />
          <h2 className="text-lg text-[#555] mb-2">No saved deals yet</h2>
          <p className="text-sm text-[#444]">
            Click the bookmark icon on any deal to save it here for later.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111] border border-[#222] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Total Down Payment</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-white">{formatCurrency(totalDownPayment)}</p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Monthly Cash Flow</p>
              <p className={`text-lg font-bold font-[family-name:var(--font-mono)] ${cashFlowColor(totalCashFlow)}`}>+{formatCurrency(totalCashFlow)}/mo</p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Annual Income</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[#00ff88]">{formatCurrency(totalCashFlow * 12)}/yr</p>
            </div>
            <div className="bg-[#111] border border-[#222] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Avg Deal Score</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-white">{avgScore.toFixed(0)}</p>
            </div>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider text-[#555]">Sort:</span>
            {([
              ["saved_at", "Recent"],
              ["score", "Score"],
              ["cash_flow", "Cash Flow"],
              ["price", "Price"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${
                  sortBy === key
                    ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                    : "border-[#333] text-[#555] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Deal cards */}
          <div className="space-y-3">
            {sorted.map((deal) => {
              const config = LISTING_TYPE_CONFIG[deal.listing_type || "standard"] || LISTING_TYPE_CONFIG.standard;
              const isEditingThis = editingNote === deal.address;
              return (
                <div key={deal.address} className="bg-[#111] border border-[#222] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-white font-medium">{deal.address}</p>
                        {deal.listing_type && deal.listing_type !== "standard" && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${config.color}`}>
                            {config.icon} {config.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#555]">
                        Saved {new Date(deal.saved_at).toLocaleDateString()} · {deal.city.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded font-[family-name:var(--font-mono)] text-xs font-bold ${scoreBadgeColor(deal.score)}`}>
                        {deal.score}
                      </span>
                      <button
                        onClick={() => removeDeal(deal.address)}
                        className="text-[#555] hover:text-[#ff4444] transition-colors p-1"
                        title="Remove from saved"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-[10px] mb-3">
                    <div>
                      <span className="text-[#555] block">Price</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-white">{formatCurrency(deal.price)}</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">Beds/Baths</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-white">{deal.beds}/{deal.baths}</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">HUD Rent</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-[#00ff88]">{formatCurrency(deal.hud_rent)}/mo</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">DSCR</span>
                      <span className={`font-bold font-[family-name:var(--font-mono)] ${dscrColor(deal.dscr)}`}>{deal.dscr.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">Cash Flow</span>
                      <span className={`font-bold font-[family-name:var(--font-mono)] ${cashFlowColor(deal.monthly_cash_flow)}`}>+{formatCurrency(deal.monthly_cash_flow)}/mo</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">CoC Return</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-[#00ff88]">{deal.coc_return.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[#555] block">Down Payment</span>
                      <span className="font-bold font-[family-name:var(--font-mono)] text-white">{formatCurrency(deal.down_payment)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border-t border-[#1a1a1a] pt-2">
                    {isEditingThis ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this deal..."
                          className="flex-1 text-xs bg-[#0a0a0a] border border-[#333] rounded px-2 py-1.5 text-white placeholder-[#555]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateNote(deal.address, noteText);
                              setEditingNote(null);
                            }
                            if (e.key === "Escape") setEditingNote(null);
                          }}
                        />
                        <button
                          onClick={() => { updateNote(deal.address, noteText); setEditingNote(null); }}
                          className="text-[10px] px-2 py-1 text-[#00ff88] border border-[#00ff88] rounded hover:bg-[rgba(0,255,136,0.08)] transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="text-[10px] px-2 py-1 text-[#555] border border-[#333] rounded hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(deal.address); setNoteText(deal.notes || ""); }}
                        className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#777] transition-colors"
                      >
                        <StickyNote size={10} />
                        {deal.notes || "Add note..."}
                      </button>
                    )}
                  </div>

                  {/* Quick links */}
                  <div className="flex gap-2 mt-2">
                    {deal.zillow_url && (
                      <a
                        href={deal.zillow_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#00ff88] transition-colors"
                      >
                        <ExternalLink size={10} /> Zillow
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
