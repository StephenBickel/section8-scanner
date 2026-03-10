"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Clock, Bell, TrendingUp } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import type { SavedSearch, ScanRun } from "@/lib/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashboardContent() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [searchesRes, scansRes] = await Promise.all([
        supabase
          .from("saved_searches")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("scan_runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(10),
      ]);

      if (searchesRes.data) setSavedSearches(searchesRes.data);
      if (scansRes.data) setRecentScans(scansRes.data);
      setLoading(false);
    }

    load();
  }, []);

  const totalDealsFound = recentScans.reduce((s, r) => s + r.deals_found, 0);
  const totalScans = recentScans.length;
  const activeAlerts = savedSearches.filter((s) => s.alert_enabled).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm text-[#777]">Your scanning activity and saved searches</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Scans", value: totalScans, icon: Search },
          { label: "Deals Found", value: totalDealsFound, icon: TrendingUp },
          { label: "Saved Searches", value: savedSearches.length, icon: Clock },
          { label: "Active Alerts", value: activeAlerts, icon: Bell },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[#111] border border-[#222] rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-[#555]" />
              <span className="text-[10px] text-[#555] uppercase tracking-wider">
                {label}
              </span>
            </div>
            <span className="text-2xl font-bold text-white font-[family-name:var(--font-mono)]">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Saved Searches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-[#777] uppercase tracking-widest">
              Saved Searches
            </h2>
            <Link href="/" className="text-xs text-[#00ff88] hover:underline">
              + New Scan
            </Link>
          </div>

          {loading ? (
            <div className="text-xs text-[#555]">Loading...</div>
          ) : savedSearches.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
              <p className="text-sm text-[#555] mb-3">No saved searches yet</p>
              <Link
                href="/"
                className="text-xs text-[#00ff88] hover:underline"
              >
                Run your first scan &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">
                      {search.name}
                    </span>
                    {search.alert_enabled && (
                      <span className="text-[10px] bg-[rgba(0,255,136,0.12)] text-[#00ff88] px-1.5 py-0.5 rounded">
                        {search.alert_frequency}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                    {search.city} &middot; max ${search.max_price.toLocaleString()} &middot; score {search.min_score}+
                  </div>
                  {search.last_run_at && (
                    <div className="text-[10px] text-[#555] mt-1">
                      Last run: {formatDate(search.last_run_at)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div>
          <h2 className="text-sm text-[#777] uppercase tracking-widest mb-4">
            Recent Scans
          </h2>

          {loading ? (
            <div className="text-xs text-[#555]">Loading...</div>
          ) : recentScans.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-lg p-8 text-center">
              <p className="text-sm text-[#555] mb-3">No scans yet</p>
              <Link
                href="/"
                className="text-xs text-[#00ff88] hover:underline"
              >
                Start scanning &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="bg-[#111] border border-[#222] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-[family-name:var(--font-mono)]">
                      {scan.city}
                    </span>
                    <span className="text-[10px] text-[#555]">
                      {formatDate(scan.started_at)}
                    </span>
                  </div>
                  <div className="text-xs text-[#555] font-[family-name:var(--font-mono)]">
                    {scan.properties_found} scanned &middot;{" "}
                    <span className="text-[#00ff88]">{scan.deals_found} deals</span>
                    {scan.new_deals > 0 && (
                      <span className="text-[#aaff44]"> ({scan.new_deals} new)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
