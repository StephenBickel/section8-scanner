import { defaultInputs, inputErrors, newDraft, type AnalysisDraft, type AnalysisInputs, type DiligenceKey } from "./model";

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
};
const text = (value: unknown, limit: number): string => {
  if (typeof value !== "string" || value.length > limit) throw new Error(`Expected text of at most ${limit} characters.`);
  return value.trim();
};
export const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function parseDraft(value: unknown): AnalysisDraft {
  const raw = object(value);
  const property = object(raw.property);
  const inputs = object(raw.inputs);
  const evidence = object(raw.evidence);
  const draft = newDraft();
  draft.name = text(raw.name, 100);
  draft.property.address = text(property.address, 300);
  draft.property.city = text(property.city, 100);
  if (!draft.name || !draft.property.address) throw new Error("Give the scenario a name and enter a property address.");
  if (!["manual", "demo", "scanner"].includes(String(property.sourceKind))) throw new Error("Invalid property source.");
  draft.property.sourceKind = property.sourceKind as AnalysisDraft["property"]["sourceKind"];
  draft.property.sourceUrl = text(property.sourceUrl, 2000);
  if (draft.property.sourceUrl) {
    const url = new URL(draft.property.sourceUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Source link must be an HTTP or HTTPS URL without credentials.");
  }
  if (property.observedAt !== null) {
    const time = text(property.observedAt, 40);
    if (!Number.isFinite(Date.parse(time))) throw new Error("Invalid source date.");
    draft.property.observedAt = new Date(time).toISOString();
  }
  for (const key of Object.keys(defaultInputs()) as (keyof AnalysisInputs)[]) {
    const input = inputs[key];
    if (input === null && (key === "purchasePrice" || key === "monthlyRent")) draft.inputs[key] = null;
    else {
      if (typeof input !== "number" || !Number.isFinite(input)) throw new Error(`Enter a number for ${key}.`);
      draft.inputs[key] = input;
    }
  }
  const errors = inputErrors(draft.inputs);
  if (errors.length) throw new Error(errors.join(" "));
  for (const key of Object.keys(draft.evidence) as DiligenceKey[]) draft.evidence[key] = text(evidence[key], 2000);
  if (!Array.isArray(raw.staleEvidence) || raw.staleEvidence.length > 5 || raw.staleEvidence.some(key => typeof key !== "string" || !Object.hasOwn(draft.evidence, key))) throw new Error("Invalid evidence review state.");
  draft.staleEvidence = [...new Set(raw.staleEvidence)] as DiligenceKey[];
  if (!["investigate", "pursue", "pass"].includes(String(raw.decision))) throw new Error("Invalid decision.");
  draft.decision = raw.decision as AnalysisDraft["decision"];
  draft.notes = text(raw.notes, 5000);
  return draft;
}
