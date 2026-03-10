"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Building2, DollarSign, TrendingUp, X, Settings, ChevronDown, ChevronUp } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import SavingsCalculator from "@/components/SavingsCalculator";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioProperty, ManagementExpense } from "@/lib/types";
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

function AddPropertyModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    address: "",
    city: "",
    zip_code: "",
    purchase_price: "",
    beds: "",
    baths: "",
    sqft: "",
    current_rent: "",
    hud_rent: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("portfolio_properties").insert({
      user_id: user.id,
      address: form.address,
      city: form.city,
      zip_code: form.zip_code || null,
      purchase_price: parseInt(form.purchase_price),
      beds: parseInt(form.beds) || 0,
      baths: parseFloat(form.baths) || 0,
      sqft: parseInt(form.sqft) || 0,
      current_rent: form.current_rent ? parseFloat(form.current_rent) : null,
      hud_rent: form.hud_rent ? parseFloat(form.hud_rent) : null,
    });

    setSaving(false);
    onAdded();
    onClose();
  };

  const inputClass =
    "w-full px-3 py-2 bg-[#1a1a1a] border border-[#222] rounded-lg text-white text-sm focus:border-[#00ff88] focus:outline-none transition-colors font-[family-name:var(--font-mono)]";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Add Property
          </h3>
          <button onClick={onClose} className="text-[#555] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
              Address
            </label>
            <input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                City
              </label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
                placeholder="Cleveland, OH"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                ZIP
              </label>
              <input
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className={inputClass}
                placeholder="44101"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
              Purchase Price
            </label>
            <input
              required
              type="number"
              value={form.purchase_price}
              onChange={(e) =>
                setForm({ ...form, purchase_price: e.target.value })
              }
              className={inputClass}
              placeholder="65000"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Beds
              </label>
              <input
                type="number"
                value={form.beds}
                onChange={(e) => setForm({ ...form, beds: e.target.value })}
                className={inputClass}
                placeholder="3"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Baths
              </label>
              <input
                type="number"
                step="0.5"
                value={form.baths}
                onChange={(e) => setForm({ ...form, baths: e.target.value })}
                className={inputClass}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Sqft
              </label>
              <input
                type="number"
                value={form.sqft}
                onChange={(e) => setForm({ ...form, sqft: e.target.value })}
                className={inputClass}
                placeholder="1200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Current Rent
              </label>
              <input
                type="number"
                value={form.current_rent}
                onChange={(e) =>
                  setForm({ ...form, current_rent: e.target.value })
                }
                className={inputClass}
                placeholder="1400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                HUD FMR
              </label>
              <input
                type="number"
                value={form.hud_rent}
                onChange={(e) =>
                  setForm({ ...form, hud_rent: e.target.value })
                }
                className={inputClass}
                placeholder="1646"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 mt-2 rounded-lg font-bold text-sm uppercase tracking-wider bg-[#00ff88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all"
          >
            {saving ? "Adding..." : "Add Property"}
          </button>
        </form>
      </div>
    </div>
  );
}

type ManagementType = "self" | "property_manager" | "hybrid";

const SELF_MANAGE_TOOLS = [
  { name: "TenantCloud", cost: 15, description: "Rent collection + maintenance tracking" },
  { name: "RentSpree", cost: 4, description: "Tenant screening ($50 one-time, ~$4/mo amortized)" },
];

function PropertyCard({ property: prop }: { property: PortfolioProperty }) {
  const [showManagement, setShowManagement] = useState(false);
  const [mgmtType, setMgmtType] = useState<ManagementType>("self");
  const [pmFeePct, setPmFeePct] = useState(10);

  const rent = prop.current_rent ?? 0;
  const pmMonthlyCost = rent * (pmFeePct / 100);
  const pmAnnualCost = pmMonthlyCost * 12;
  const selfManageMonthlyCost = SELF_MANAGE_TOOLS.reduce((s, t) => s + t.cost, 0);
  const selfManageAnnualCost = selfManageMonthlyCost * 12;
  const annualSavings = pmAnnualCost - selfManageAnnualCost;

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm text-white font-medium">{prop.address}</h3>
          <p className="text-xs text-[#555]">{prop.city}</p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            prop.vacancy_status === "occupied"
              ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
              : prop.vacancy_status === "turning"
                ? "bg-[rgba(255,204,0,0.12)] text-[#ffcc00]"
                : "bg-[rgba(255,68,68,0.12)] text-[#ff4444]"
          }`}
        >
          {prop.vacancy_status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <span className="text-[10px] text-[#555] block">Purchase</span>
          <span className="text-xs font-bold text-white font-[family-name:var(--font-mono)]">
            {formatCurrency(prop.purchase_price)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#555] block">Rent</span>
          <span className="text-xs font-bold text-[#00ff88] font-[family-name:var(--font-mono)]">
            {prop.current_rent ? `${formatCurrency(prop.current_rent)}/mo` : "—"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#555] block">
            {prop.beds}bd / {prop.baths}ba
          </span>
          <span className="text-xs text-[#777] font-[family-name:var(--font-mono)]">
            {prop.sqft > 0 ? `${prop.sqft.toLocaleString()} sqft` : "—"}
          </span>
        </div>
      </div>

      {/* Management toggle */}
      <button
        onClick={() => setShowManagement(!showManagement)}
        className="mt-3 pt-3 border-t border-[#222] w-full flex items-center justify-between text-[10px] text-[#777] uppercase tracking-wider hover:text-[#00ff88] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Settings size={10} />
          Management
        </span>
        {showManagement ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showManagement && (
        <div className="mt-3 space-y-3">
          {/* Management type selector */}
          <div className="flex gap-1">
            {(["self", "property_manager", "hybrid"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMgmtType(type)}
                className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                  mgmtType === type
                    ? "border-[#00ff88] text-[#00ff88] bg-[rgba(0,255,136,0.08)]"
                    : "border-[#222] text-[#555] hover:border-[#555]"
                }`}
              >
                {type === "self" ? "Self-Managed" : type === "property_manager" ? "PM" : "Hybrid"}
              </button>
            ))}
          </div>

          {mgmtType === "property_manager" || mgmtType === "hybrid" ? (
            <div>
              <label className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">
                PM Fee: {pmFeePct}%
              </label>
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={pmFeePct}
                onChange={(e) => setPmFeePct(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-[#777] font-[family-name:var(--font-mono)] mt-1">
                PM cost: {formatCurrency(pmMonthlyCost)}/mo ({formatCurrency(pmAnnualCost)}/yr)
              </div>
            </div>
          ) : null}

          {mgmtType === "self" || mgmtType === "hybrid" ? (
            <div>
              <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-2">
                Recommended Tools
              </span>
              <div className="space-y-1.5">
                {SELF_MANAGE_TOOLS.map((tool) => (
                  <div key={tool.name} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#e0e0e0]">{tool.name}</span>
                      <span className="text-[#555] ml-2">{tool.description}</span>
                    </div>
                    <span className="text-[#777] font-[family-name:var(--font-mono)]">
                      ${tool.cost}/mo
                    </span>
                  </div>
                ))}
                <div className="text-[10px] text-[#555] mt-1">
                  Find a local realtor for showings (~$50-100/showing)
                </div>
              </div>
            </div>
          ) : null}

          {/* Savings summary */}
          {rent > 0 && (
            <div className="bg-[#0d0d0d] rounded-lg p-3 flex items-center justify-between">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">
                Annual Savings vs PM
              </span>
              <span className={`text-sm font-bold font-[family-name:var(--font-mono)] ${annualSavings > 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                {annualSavings > 0 ? "+" : ""}{formatCurrency(annualSavings)}/yr
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortfolioContent() {
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadProperties = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("portfolio_properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProperties(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const totalValue = properties.reduce((s, p) => s + p.purchase_price, 0);
  const totalRent = properties.reduce((s, p) => s + (p.current_rent ?? 0), 0);
  const occupiedCount = properties.filter(
    (p) => p.vacancy_status === "occupied"
  ).length;

  const chartData = properties.map((p) => ({
    name: p.address.split(",")[0].split(" ").slice(-2).join(" "),
    rent: p.current_rent ?? 0,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Portfolio</h1>
          <p className="text-sm text-[#777]">Track your Section 8 properties</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus size={14} />
          Add Property
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Properties",
            value: properties.length.toString(),
            icon: Building2,
          },
          {
            label: "Total Value",
            value: formatCurrency(totalValue),
            icon: DollarSign,
          },
          {
            label: "Monthly Rent",
            value: formatCurrency(totalRent),
            icon: TrendingUp,
          },
          {
            label: "Occupied",
            value: `${occupiedCount}/${properties.length}`,
            icon: Building2,
          },
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
            <span className="text-xl font-bold text-white font-[family-name:var(--font-mono)]">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Cash flow chart */}
      {properties.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-lg p-4 mb-8">
          <h3 className="text-xs text-[#777] uppercase tracking-wider mb-4">
            Monthly Rent by Property
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#555", fontSize: 10 }}
                  stroke="#222"
                />
                <YAxis tick={{ fill: "#555", fontSize: 10 }} stroke="#222" />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #222",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#e0e0e0",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), "Rent"]}
                />
                <Bar dataKey="rent" fill="#00ff88" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Property list */}
      {loading ? (
        <div className="text-xs text-[#555]">Loading...</div>
      ) : properties.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-lg p-12 text-center">
          <div className="text-4xl mb-4 opacity-20">&#127968;</div>
          <p className="text-sm text-[#555] mb-3">
            No properties in your portfolio yet
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-[#00ff88] hover:underline"
          >
            Add your first property &rarr;
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {properties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      )}

      {/* Portfolio-wide savings calculator */}
      {properties.length > 0 && (
        <div className="mt-8">
          <SavingsCalculator />
        </div>
      )}

      {showAdd && (
        <AddPropertyModal
          onClose={() => setShowAdd(false)}
          onAdded={loadProperties}
        />
      )}
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <PortfolioContent />
    </AuthGuard>
  );
}
