import { type AnalysisSnapshot, type SavedAnalysis } from "./model";

export function analysisCSV(snapshot: AnalysisSnapshot): string {
  const rows: (string | number)[][] = [
    ["Field", "Value"], ["Model version", snapshot.modelVersion], ["Scenario", snapshot.draft.name],
    ["Address", snapshot.draft.property.address], ["City", snapshot.draft.property.city],
    ["Source kind", snapshot.draft.property.sourceKind], ["Source URL", snapshot.draft.property.sourceUrl],
    ["Source observed at", snapshot.draft.property.observedAt ?? "Unknown"],
    ["Decision", snapshot.draft.decision], ["Notes", snapshot.draft.notes],
    ["Evidence needing review", snapshot.draft.staleEvidence.join(", ") || "None"],
    ...Object.entries(snapshot.draft.inputs).map(([k,v]) => [`Input: ${k}`, v ?? "Unknown"]),
    ...Object.entries(snapshot.result).map(([k,v]) => [`Base: ${k}`, v ?? "Not applicable"]),
    ...Object.entries(snapshot.downside).map(([k,v]) => [`Downside: ${k}`, v ?? "Not applicable"]),
    ...Object.entries(snapshot.downsideAssumptions).map(([k,v]) => [`Downside assumption: ${k}`, v]),
    ...Object.entries(snapshot.draft.evidence).map(([k,v]) => [`User evidence: ${k}`, v || "Not recorded"]),
  ];
  return rows.map(row => row.map(value => {
    const text = typeof value === "string" && /^[\s]*[=+\-@]/.test(value) ? `'${value}` : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\n");
}

export function downloadAnalysis(snapshot: AnalysisSnapshot, format: "json" | "csv", saved?: SavedAnalysis) {
  const body = format === "csv" ? analysisCSV(snapshot) : JSON.stringify(saved ?? snapshot, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: format === "csv" ? "text/csv" : "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `property-analysis.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
