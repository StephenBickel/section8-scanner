"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import type { SavedAnalysis } from "@/lib/analysis/model";
import { downloadAnalysis } from "@/lib/analysis/export";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function SavedAnalyses() {
  const { user, loading } = useAuthStore();
  if (loading) return <p role="status">Loading your account…</p>;
  if (!user) return <div className="space-y-3"><p className="text-[#bbb]">Sign in to save analyses across devices. You can try the worksheet and export a copy without an account.</p><Link className="text-[#00ff88]" href="/login?next=%2Fsaved">Sign in →</Link></div>;
  return <AccountAnalyses key={user.id} ownerId={user.id} />;
}

function AccountAnalyses({ ownerId }: { ownerId: string }) {
  const [items, setItems] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analyses", { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load saved analyses.");
      setItems(body);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ownerId, reload]);

  async function remove(item: SavedAnalysis) {
    if (!window.confirm(`Delete the saved snapshot “${item.snapshot.draft.name}” for ${item.snapshot.draft.property.address}?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/analyses?id=${item.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setItems(current => current.filter(row => row.id !== item.id));
      setSelected(current => current.filter(id => id !== item.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete snapshot."); }
  }
  if (loading) return <p role="status">Loading saved analyses…</p>;
  const comparison = items.filter(item => selected.includes(item.id));
  return <div className="space-y-5">
    {error && <div role="alert" className="text-rose-200"><p>{error}</p><button className="underline mt-2" onClick={() => { setError(""); setLoading(true); setReload(n => n + 1); }}>Retry</button></div>}
    {!items.length && !error && <p className="text-[#aaa]">No account snapshots yet. Start an analysis, review its assumptions, then save it here.</p>}
    {comparison.length >= 2 && <section aria-label="Scenario comparison" className="rounded-xl border border-[#355b46] p-4 overflow-x-auto"><h2 className="text-lg mb-2">Compare your scenarios</h2><p className="text-sm text-[#aaa] mb-3">Each column uses its own saved assumptions. Open the worksheet to review the full inputs.</p><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Metric</th>{comparison.map(item => <th key={item.id} className="p-2 text-left">{item.snapshot.draft.name}<span className="block font-normal text-xs text-[#aaa]">{item.snapshot.draft.property.address}</span></th>)}</tr></thead><tbody>{([
      ["Purchase price", (item: SavedAnalysis) => money(item.snapshot.draft.inputs.purchasePrice!)],
      ["Rent assumption", (item: SavedAnalysis) => money(item.snapshot.draft.inputs.monthlyRent!)],
      ["Down payment / interest", (item: SavedAnalysis) => `${item.snapshot.draft.inputs.downPaymentPercent}% / ${item.snapshot.draft.inputs.interestPercent}%`],
      ["Repairs", (item: SavedAnalysis) => money(item.snapshot.draft.inputs.repairs)],
      ["Cash needed", (item: SavedAnalysis) => money(item.snapshot.result.initialCash)],
      ["Monthly cash flow", (item: SavedAnalysis) => money(item.snapshot.result.monthlyCashFlow)],
      ["Downside cash flow", (item: SavedAnalysis) => money(item.snapshot.downside.monthlyCashFlow)],
    ] as const).map(([label, value]) => <tr key={label} className="border-t border-[#333]"><th className="p-2 text-left font-normal text-[#bbb]">{label}</th>{comparison.map(item => <td key={item.id} className="p-2">{value(item)}</td>)}</tr>)}</tbody></table></section>}
    <div className="grid gap-4 md:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-xl border border-[#333] bg-[#141414] p-5 space-y-3">
      <div className="flex justify-between gap-4"><h2 className="font-semibold break-words">{item.snapshot.draft.property.address}</h2><label className="text-xs text-[#bbb] flex gap-2 items-start"><input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id) && selected.length >= 3} onChange={e => setSelected(current => e.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />Compare</label></div>
      <p className="text-sm text-[#aaa]">{item.snapshot.draft.name} · {new Date(item.created_at).toLocaleString()}</p>
      <p className="text-xs text-amber-200">{item.snapshot.draft.property.sourceKind === "demo" ? "Illustrative example" : "Assumptions require verification"}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[#aaa]">Initial cash</dt><dd className="text-lg">{money(item.snapshot.result.initialCash)}</dd></div><div><dt className="text-[#aaa]">Monthly cash flow</dt><dd className="text-lg">{money(item.snapshot.result.monthlyCashFlow)}</dd></div></dl>
      <div className="flex flex-wrap gap-4 text-sm"><Link href={`/analyze?id=${item.id}`} className="text-[#00ff88]">Open worksheet →</Link><button onClick={() => downloadAnalysis(item.snapshot, "json", item)} className="text-[#bbb]">Export JSON</button><button onClick={() => remove(item)} className="text-rose-300 ml-auto">Delete</button></div>
    </article>)}</div>
  </div>;
}
