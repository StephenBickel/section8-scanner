import { describe, expect, it } from "vitest";
import { calculate, defaultInputs, evaluate, newDraft, nextSteps } from "./model";
import { parseDraft } from "./validation";
import { analysisCSV } from "./export";
import { normalizeFinancials } from "./legacy";

const fixture = () => ({ ...defaultInputs(100000, 1400), repairs: 15000, closingCosts: 3000, holdingCosts: 2000, initialReserves: 5000, monthlyTaxes: 200, monthlyInsurance: 120 });
describe("acquisition financial model", () => {
  it("matches an independently specified acquisition case", () => {
    expect(calculate(fixture())).toMatchObject({ initialCash: 50000, loanPrincipal: 75000, debtService: 524.41, netOperatingIncome: 800, monthlyCashFlow: 205.59, cashOnCashPercent: 4.93, debtCoverage: 1.53 });
  });
  it("keeps repairs, closing, holding and reserves in cash unless repair financing is explicit", () => {
    const base = calculate(fixture());
    const financed = calculate({ ...fixture(), financedRepairs: 10000 });
    expect(base.initialCash - financed.initialCash).toBe(10000);
    expect(financed.loanPrincipal - base.loanPrincipal).toBe(10000);
    expect(financed.monthlyCashFlow).toBeLessThan(base.monthlyCashFlow);
  });
  it("supports zero-interest and cash purchases without infinite ratios", () => {
    expect(calculate({ ...fixture(), interestPercent: 0 }).debtService).toBe(208.33);
    expect(calculate({ ...fixture(), interestPercent: 1e-20 }).debtService).toBe(208.33);
    const cash = calculate({ ...fixture(), downPaymentPercent: 100 });
    expect(cash.debtService).toBe(0);
    expect(cash.debtCoverage).toBeNull();
    expect(cash.initialCash).toBe(125000);
    const zeroCash = calculate({ ...defaultInputs(100000, 1400), downPaymentPercent: 0, closingCosts: 0, initialReserves: 0 });
    expect(zeroCash.cashOnCashPercent).toBeNull();
  });
  it("allows negative cash flow and zero rent but rejects missing or invalid inputs", () => {
    expect(calculate({ ...fixture(), monthlyRent: 0 }).monthlyCashFlow).toBeLessThan(0);
    for (const override of [{ monthlyRent: null }, { purchasePrice: null }, { interestPercent: NaN }, { repairs: -1 }, { loanYears: 0 }, { loanYears: 1.5 }, { vacancyPercent: 101 }, { financedRepairs: 20000 }]) {
      expect(() => calculate({ ...fixture(), ...override })).toThrow();
    }
  });
  it("records the exact inputs and a bounded downside without mutating the base case", () => {
    const draft = { ...newDraft(), inputs: fixture() };
    const before = structuredClone(draft);
    const snapshot = evaluate(draft);
    expect(snapshot.result).toEqual(calculate(fixture()));
    expect(snapshot.downside.monthlyCashFlow).toBeLessThan(snapshot.result.monthlyCashFlow);
    expect(draft).toEqual(before);
    expect(JSON.parse(JSON.stringify(snapshot)).draft.inputs).toEqual(fixture());
  });
  it("requires recorded evidence to resolve a diligence item", () => {
    const draft = newDraft();
    expect(nextSteps(draft)).toHaveLength(5);
    draft.evidence.insurance = "Quote reviewed with insurer on September 27.";
    expect(nextSteps(draft).map(s => s.key)).not.toContain("insurance");
    draft.staleEvidence = ["insurance"];
    expect(nextSteps(draft).map(s => s.key)).toContain("insurance");
    expect(draft.evidence.insurance).toContain("Quote reviewed");
  });
  it("uses the same model for discovery and exports the exact scenario with provenance", () => {
    const deal = normalizeFinancials({ address: "Example", price: 100000, monthly_rent: 1400, zillow_url: "" });
    expect(deal).toMatchObject({ monthly_cash_flow: calculate(defaultInputs(100000, 1400)).monthlyCashFlow, initial_cash: 33000 });
    const draft = newDraft();
    draft.inputs = fixture();
    draft.property.sourceKind = "demo";
    draft.staleEvidence = ["insurance"];
    draft.notes = '=HYPERLINK("https://example.test")';
    const csv = analysisCSV(evaluate(draft));
    expect(csv).toContain('"Source kind","demo"');
    expect(csv).toContain('"Input: repairs","15000"');
    expect(csv).toContain('"Evidence needing review","insurance"');
    expect(csv).toContain('"Base: monthlyCashFlow","205.59"');
    expect(csv).toContain('"\'=HYPERLINK');
  });
});

describe("untrusted analysis input", () => {
  const draft = () => ({ ...newDraft(), property: { ...newDraft().property, address: "Example property" }, inputs: fixture() });
  it("accepts only validated inputs and strips caller-supplied results and ownership", () => {
    const parsed = parseDraft({ ...draft(), user_id: "someone-else", result: { monthlyCashFlow: 999999 } });
    expect(parsed).not.toHaveProperty("result");
    expect(parsed).not.toHaveProperty("user_id");
    expect(evaluate(parsed).result.monthlyCashFlow).toBe(205.59);
  });
  it("rejects missing fields, numeric strings, unsafe URLs and oversize notes", () => {
    expect(() => parseDraft({ ...draft(), inputs: { purchasePrice: 1 } })).toThrow();
    expect(() => parseDraft({ ...draft(), inputs: { ...fixture(), monthlyRent: "1400" } })).toThrow();
    expect(() => parseDraft({ ...draft(), property: { ...draft().property, sourceUrl: "javascript:alert(1)" } })).toThrow();
    expect(() => parseDraft({ ...draft(), notes: "x".repeat(5001) })).toThrow();
  });
});
