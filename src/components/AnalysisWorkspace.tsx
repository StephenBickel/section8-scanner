"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, Save } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { DILIGENCE, defaultInputs, evaluate, evidenceKeyForInput, inputErrors, newDraft, nextSteps, type AnalysisDraft, type AnalysisInputs, type SavedAnalysis } from "@/lib/analysis/model";
import { parseDraft, validId } from "@/lib/analysis/validation";
import { downloadAnalysis } from "@/lib/analysis/export";
import { keepPendingDraft, readPendingDraft, removePendingDraft } from "@/lib/analysis/pending-draft";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const inputClass = "mt-1 w-full rounded-lg border border-[#3a3a3a] bg-[#101010] px-3 py-2.5 text-sm text-white focus:border-[#00ff88] focus:outline-none focus:ring-1 focus:ring-[#00ff88]";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#3a3a3a] px-3 py-2 text-sm text-[#ddd] hover:border-[#00ff88] disabled:opacity-40";

const groups: { title: string; help: string; fields: [keyof AnalysisInputs, string][] }[] = [
  { title: "Purchase & financing", help: "Repair financing is separate. Closing costs, holding costs, and reserves are paid in cash.", fields: [["purchasePrice", "Purchase price ($)"], ["downPaymentPercent", "Down payment (%)"], ["interestPercent", "Interest rate (%)"], ["loanYears", "Loan term (years)"], ["repairs", "Total repairs ($)"], ["financedRepairs", "Financed repairs ($)"], ["closingCosts", "Closing costs ($)"], ["holdingCosts", "Pre-rental holding costs ($)"], ["initialReserves", "Initial cash reserves ($)"]] },
  { title: "Rent & operating costs", help: "Enter monthly amounts. Percentage expenses use scheduled rent. Defaults are assumptions to review, not verified quotes.", fields: [["monthlyRent", "Monthly rent assumption ($)"], ["monthlyTaxes", "Monthly property taxes ($)"], ["monthlyInsurance", "Monthly insurance ($)"], ["vacancyPercent", "Vacancy (%)"], ["managementPercent", "Management (%)"], ["maintenancePercent", "Maintenance (%)"], ["capitalReservePercent", "Capital reserve (%)"], ["monthlyUtilities", "Owner utilities ($/month)"], ["monthlyOther", "Other costs ($/month)"]] },
];

interface Props { initialDraft: AnalysisDraft; analysisId?: string; resumeId?: string }
export default function AnalysisWorkspace(props: Props) {
  const { user, loading } = useAuthStore();
  if (loading) return <p className="p-8 text-[#bbb]" role="status">Opening your workspace…</p>;
  return <Workspace key={`${user?.id ?? "guest"}:${props.analysisId ?? "new"}`} {...props} ownerId={user?.id} />;
}

function Workspace({ initialDraft, analysisId, resumeId, ownerId }: Props & { ownerId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [saved, setSaved] = useState<SavedAnalysis | null>(null);
  const [loading, setLoading] = useState(!!analysisId || !!resumeId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef<{ fingerprint: string; id: string } | null>(null);
  const errors = inputErrors(draft.inputs);
  const snapshot = errors.length ? null : evaluate(draft);
  const steps = nextSteps(draft);
  const unchanged = saved && JSON.stringify(saved.snapshot.draft) === JSON.stringify(draft);
  const displayed = unchanged ? saved.snapshot : snapshot;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        if (analysisId) {
          if (!ownerId) throw new Error("Sign in to the account that saved this analysis.");
          const response = await fetch(`/api/analyses?id=${encodeURIComponent(analysisId)}`, { signal: controller.signal });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "Could not load the analysis.");
          if (active) { setDraft(body.snapshot.draft); setSaved(body); }
        } else if (resumeId && validId(resumeId)) {
          const restored = await Promise.resolve(readPendingDraft(resumeId, localStorage));
          if (active) setDraft(restored);
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not open the analysis."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [analysisId, ownerId, resumeId]);

  function edit(next: AnalysisDraft) { setDraft(next); setMessage(""); setError(""); }
  function changeInput(key: keyof AnalysisInputs, value: string) {
    const number = value === "" ? (key === "purchasePrice" || key === "monthlyRent" ? null : NaN) : Number(value);
    const inputs = { ...draft.inputs, [key]: number };
    // Seed estimates when first entering a manual property, then leave them editable.
    if (key === "purchasePrice" && draft.inputs.purchasePrice === null && number !== null && Number.isFinite(number)) {
      inputs.closingCosts = Math.round(number * 0.03);
      inputs.monthlyTaxes = Math.round(number * 0.015 / 12 * 100) / 100;
    }
    edit({ ...draft, inputs, staleEvidence: Array.from(new Set([...draft.staleEvidence, evidenceKeyForInput(key), ...(key === "purchasePrice" ? ["taxes" as const] : [])])) });
  }
  function example() {
    const value = newDraft();
    value.property = { address: "Example rental — illustrative only", city: "Sample market", sourceKind: "demo", sourceUrl: "", observedAt: null };
    value.inputs = { ...defaultInputs(100000, 1400), repairs: 15000, closingCosts: 3000, holdingCosts: 2000, monthlyTaxes: 200 };
    edit(value); setSaved(null);
  }
  async function save() {
    setError(""); setMessage("");
    let checked: AnalysisDraft;
    try { checked = parseDraft(draft); } catch (e) { setError(e instanceof Error ? e.message : "Review your inputs."); return; }
    if (!ownerId) {
      let id: string;
      try { id = keepPendingDraft(checked, localStorage); }
      catch { setError("This browser cannot keep the draft during sign-in. Export a copy before signing in."); return; }
      router.push(`/login?next=${encodeURIComponent(`/analyze?resume=${id}`)}`);
      return;
    }
    setSaving(true);
    const fingerprint = JSON.stringify(checked);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pending.current.id, draft: checked }) });
      const body = await response.json();
      if (!response.ok) { if (response.status === 409) pending.current = null; throw new Error(body.error || "Could not save the analysis."); }
      setSaved(body); setDraft(body.snapshot.draft); setMessage("Saved to your account. This snapshot keeps these exact assumptions and results.");
      if (resumeId) removePendingDraft(resumeId, localStorage);
      window.history.replaceState(null, "", `/analyze?id=${body.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Please retry."); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="p-8" role="status">Loading your saved work…</p>;
  if (analysisId && !saved) return <div className="p-8 space-y-4"><p role="alert">{error || "Analysis unavailable."}</p><Link className={secondary} href={`/login?next=${encodeURIComponent(`/analyze?id=${analysisId}`)}`}>Sign in</Link> <Link className={secondary} href="/analyze">Start a new analysis</Link></div>;

  return <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-[#aaa] inline-flex gap-2 items-center"><ArrowLeft size={15} /> Property search</Link>
        <Link href="/saved" className="text-sm text-[#00ff88]">Saved analyses →</Link>
      </div>
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div><p className="text-xs tracking-widest uppercase text-[#00ff88] mb-2">Your property workspace</p><h1 className="text-2xl md:text-3xl font-semibold">Does this property work for you?</h1><p className="mt-2 text-sm text-[#aaa] max-w-xl">Review the assumptions, test the downside, and keep track of what needs checking.</p></div>
        {!saved && <button className={secondary} onClick={example}>Try an example</button>}
      </header>
      <div className={`rounded-lg border px-4 py-3 text-sm ${draft.property.sourceKind === "demo" ? "border-amber-700/60 text-amber-200 bg-amber-950/20" : "border-[#333] text-[#bbb]"}`}>
        {draft.property.sourceKind === "demo" ? "Illustrative example. These numbers are not a verified listing or an approved rent." : draft.property.sourceKind === "scanner" ? "Imported property. Source freshness and rent approval are unverified; review every assumption." : "Manual analysis. The property details and assumptions are supplied by you."}
        <span className="block mt-1">Rent is an underwriting assumption. Local payment standards and actual approved rent may differ.</span>
      </div>
      <fieldset disabled={saving} className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5 min-w-0">
          <section className="rounded-xl border border-[#292929] bg-[#141414] p-5 space-y-4">
            <h2 className="text-lg font-semibold">1. Set up your analysis</h2>
            <label className="block text-sm text-[#bbb]">Property address<input className={inputClass} value={draft.property.address} maxLength={300} onChange={e => edit({ ...draft, property: { ...draft.property, address: e.target.value }, staleEvidence: Object.keys(DILIGENCE) as (keyof typeof DILIGENCE)[] })} placeholder="Enter a property address" /></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm text-[#bbb]">City / market<input className={inputClass} value={draft.property.city} maxLength={100} onChange={e => edit({ ...draft, property: { ...draft.property, city: e.target.value }, staleEvidence: Object.keys(DILIGENCE) as (keyof typeof DILIGENCE)[] })} /></label>
              <label className="text-sm text-[#bbb]">Scenario name<input className={inputClass} value={draft.name} maxLength={100} onChange={e => edit({ ...draft, name: e.target.value })} /></label>
            </div>
            <label className="block text-sm text-[#bbb]">Listing or source link (optional)<input className={inputClass} type="url" value={draft.property.sourceUrl} maxLength={2000} onChange={e => edit({ ...draft, property: { ...draft.property, sourceUrl: e.target.value } })} placeholder="https://…" /></label>
            <p className="text-xs text-[#aaa]">Source date: {draft.property.observedAt ? new Date(draft.property.observedAt).toLocaleDateString() : "Unknown — confirm freshness before relying on this analysis."}</p>
          </section>
          {groups.map(group => <section key={group.title} className="rounded-xl border border-[#292929] bg-[#141414] p-5">
            <h2 className="text-lg font-semibold">{group.title}</h2><p className="text-sm text-[#aaa] mt-1 mb-4">{group.help}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{group.fields.map(([key, label]) => <label key={key} className="text-sm text-[#bbb]">{label}<input type="number" min="0" max={key.endsWith("Percent") ? 100 : key === "loanYears" ? 50 : 100000000} step={key === "loanYears" ? 1 : "any"} className={inputClass} value={draft.inputs[key] !== null && Number.isFinite(draft.inputs[key]) ? draft.inputs[key]! : ""} onChange={e => changeInput(key, e.target.value)} /></label>)}</div>
          </section>)}
        </div>
        <div className="space-y-5 min-w-0">
          <section className="rounded-xl border border-[#365044] bg-[#121b17] p-5" aria-label="Analysis results">
            <h2 className="text-lg font-semibold">2. Review the numbers</h2>
            {errors.length > 0 ? <ul className="text-sm text-amber-200 mt-4 space-y-2">{errors.map((item, i) => <li key={i}>{item}</li>)}</ul> : displayed && <>
              <div className="grid grid-cols-2 gap-4 my-5">
                <div><p className="text-sm text-[#bbb]">Initial cash needed</p><p data-testid="initial-cash" className="text-2xl font-semibold mt-1">{money(displayed.result.initialCash)}</p><p className="text-xs text-[#aaa] mt-1">Includes repairs, costs and reserves</p></div>
                <div><p className="text-sm text-[#bbb]">Monthly cash flow</p><p data-testid="monthly-cash-flow" className={`text-2xl font-semibold mt-1 ${displayed.result.monthlyCashFlow >= 0 ? "text-[#00ff88]" : "text-rose-300"}`}>{money(displayed.result.monthlyCashFlow)}</p><p className="text-xs text-[#aaa] mt-1">After vacancy and capital reserves</p></div>
              </div>
              <dl className="text-sm space-y-2 border-t border-[#365044] pt-4">{([
                ["Loan principal", money(displayed.result.loanPrincipal)], ["Monthly debt payment", money(displayed.result.debtService)], ["Monthly operating income (NOI)", money(displayed.result.netOperatingIncome)],
                ["Cash-on-cash return", displayed.result.cashOnCashPercent === null ? "Not applicable" : `${displayed.result.cashOnCashPercent}%`],
                ["NOI / debt payment", displayed.result.debtCoverage === null ? "No debt" : `${displayed.result.debtCoverage}×`],
              ]).map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-[#bbb]">{label}</dt><dd className="text-right">{value}</dd></div>)}</dl>
              <p className="text-xs text-[#aaa] mt-3">Debt coverage uses NOI before capital reserves. Lender definitions may differ. Projections are before income taxes.</p>
              <div className="mt-5 rounded-lg border border-[#45402f] bg-[#242117] p-4"><p className="text-sm font-semibold text-amber-100">Downside check</p><p className="text-sm text-[#bbb] mt-1">Rent falls 10%; vacancy increases {displayed.downsideAssumptions.addedVacancyPoints} percentage points.</p><p className="mt-2 text-xl font-semibold text-amber-100" data-testid="downside-cash-flow">{money(displayed.downside.monthlyCashFlow)} / month</p></div>
            </>}
          </section>
          <section className="rounded-xl border border-[#292929] bg-[#141414] p-5">
            <h2 className="text-lg font-semibold">3. Verify what matters</h2>
            <div className="my-4 rounded-lg bg-[#202620] p-3"><p className="text-xs uppercase tracking-wider text-[#aaffbb]">Your next action</p><p className="text-sm mt-1">{steps[0]?.title ?? "Review your evidence and decide whether to investigate further."}</p></div>
            <p className="text-sm text-[#aaa] mb-4">{5 - steps.length} of 5 items have your notes. These are your records, not independent verification. Changing related assumptions reopens the task; your notes stay intact.</p>
            <div className="space-y-3">{Object.entries(DILIGENCE).map(([key, item]) => <details key={key} className="border border-[#333] rounded-lg p-3"><summary className="cursor-pointer text-sm font-medium">{draft.evidence[key as keyof typeof DILIGENCE].trim() && !draft.staleEvidence.includes(key as keyof typeof DILIGENCE) && <Check size={14} className="inline mr-2 text-[#00ff88]" />}{item.title}</summary><p className="text-sm text-[#aaa] mt-3">{item.detail}</p>{draft.staleEvidence.includes(key as keyof typeof DILIGENCE) && draft.evidence[key as keyof typeof DILIGENCE] && <p className="text-sm text-amber-200 mt-2">Assumptions changed. Review and update your note for this scenario.</p>}<label className="block text-sm text-[#bbb] mt-3">Evidence for {key}<textarea className={inputClass} rows={3} maxLength={2000} placeholder="Source, date, what you checked, and any remaining questions" value={draft.evidence[key as keyof typeof DILIGENCE]} onChange={e => edit({ ...draft, evidence: { ...draft.evidence, [key]: e.target.value }, staleEvidence: draft.staleEvidence.filter(item => item !== key) })} /></label></details>)}</div>
          </section>
          <section className="rounded-xl border border-[#292929] bg-[#141414] p-5 space-y-3">
            <h2 className="text-lg font-semibold">4. Keep your decision</h2>
            <label className="block text-sm text-[#bbb]">My next move<select className={inputClass} value={draft.decision} onChange={e => edit({ ...draft, decision: e.target.value as AnalysisDraft["decision"] })}><option value="investigate">Keep investigating</option><option value="pursue">Pursue with my team</option><option value="pass">Pass on this property</option></select></label>
            <label className="block text-sm text-[#bbb]">Decision notes<textarea className={inputClass} rows={3} maxLength={5000} value={draft.notes} onChange={e => edit({ ...draft, notes: e.target.value })} placeholder="Why this property is worth pursuing, or why you are passing" /></label>
            <button onClick={save} disabled={!snapshot || !draft.property.address.trim() || !draft.name.trim() || saving || !!unchanged} className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#00ff88] px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"><Save size={16} />{saving ? "Saving…" : unchanged ? "Snapshot saved" : ownerId ? saved ? "Save a new snapshot" : "Save to my account" : "Sign in to save this analysis"}</button>
            <p className="text-xs text-[#aaa]">Each save keeps an immutable snapshot. Further edits become a new snapshot, so earlier decisions stay intact.</p>
            <div className="flex flex-wrap gap-2"><button className={secondary} disabled={!displayed} onClick={() => displayed && downloadAnalysis(displayed, "json", unchanged ? saved! : undefined)}><Download size={14} /> Export JSON</button><button className={secondary} disabled={!displayed} onClick={() => displayed && downloadAnalysis(displayed, "csv")}><Download size={14} /> Export CSV</button></div>
            {saved && <p className="text-xs text-[#aaa]">Saved {new Date(saved.created_at).toLocaleString()}. Model {saved.snapshot.modelVersion}.</p>}
          </section>
        </div>
      </fieldset>
      {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-green-800 bg-green-950/20 p-4 text-sm text-green-200">{message}</p>}
    </div>
  </main>;
}
