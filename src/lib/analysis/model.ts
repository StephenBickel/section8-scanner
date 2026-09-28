/** Shared by the browser and server. All percentages are 0–100, money is USD. */
export const MODEL_VERSION = "2026-09-27.1";

export interface AnalysisInputs {
  purchasePrice: number | null;
  monthlyRent: number | null;
  downPaymentPercent: number;
  interestPercent: number;
  loanYears: number;
  repairs: number;
  financedRepairs: number;
  closingCosts: number;
  holdingCosts: number;
  initialReserves: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  vacancyPercent: number;
  managementPercent: number;
  maintenancePercent: number;
  capitalReservePercent: number;
  monthlyUtilities: number;
  monthlyOther: number;
}

export const DILIGENCE = {
  rent: { title: "Confirm the rent assumption", detail: "Record the applicable local rent reference, utility treatment, and what still needs confirmation with the housing authority. A benchmark is not an approved rent." },
  taxes: { title: "Check the property taxes", detail: "Use the property's assessment or a local tax estimate that accounts for the purchase. Record the source and date." },
  insurance: { title: "Get an insurance quote", detail: "Request a quote for this property and rental use. Replace the monthly estimate with the quoted amount." },
  repairs: { title: "Review repairs and holding costs", detail: "Record an inspection or contractor estimate and the expected time before rent starts. Keep cash repairs separate from financed repairs." },
  financing: { title: "Review financing and reserves", detail: "Confirm the down payment, rate, term, eligible repair financing, closing costs, and cash reserves with your lender." },
} as const;
export type DiligenceKey = keyof typeof DILIGENCE;

export interface AnalysisDraft {
  name: string;
  property: { address: string; city: string; sourceKind: "manual" | "demo" | "scanner"; sourceUrl: string; observedAt: string | null };
  inputs: AnalysisInputs;
  evidence: Record<DiligenceKey, string>;
  staleEvidence: DiligenceKey[];
  decision: "investigate" | "pursue" | "pass";
  notes: string;
}

export interface AnalysisResult {
  initialCash: number;
  totalProjectCost: number;
  loanPrincipal: number;
  debtService: number;
  effectiveIncome: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  capitalReserve: number;
  cashFlowBeforeReserves: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCashPercent: number | null;
  debtCoverage: number | null;
}

export interface AnalysisSnapshot {
  modelVersion: string;
  draft: AnalysisDraft;
  result: AnalysisResult;
  downside: AnalysisResult;
  downsideAssumptions: { rentReductionPercent: number; addedVacancyPoints: number };
}

export interface SavedAnalysis {
  id: string;
  created_at: string;
  snapshot: AnalysisSnapshot;
}

export function defaultInputs(price: number | null = null, rent: number | null = null): AnalysisInputs {
  return {
    purchasePrice: price, monthlyRent: rent, downPaymentPercent: 25, interestPercent: 7.5,
    loanYears: 30, repairs: 0, financedRepairs: 0, closingCosts: price === null ? 0 : price * 0.03,
    holdingCosts: 0, initialReserves: 5000, monthlyTaxes: price === null ? 0 : price * 0.015 / 12,
    monthlyInsurance: 120, vacancyPercent: 5, managementPercent: 10, maintenancePercent: 5,
    capitalReservePercent: 5, monthlyUtilities: 0, monthlyOther: 0,
  };
}

export function newDraft(): AnalysisDraft {
  return {
    name: "Base case", property: { address: "", city: "", sourceKind: "manual", sourceUrl: "", observedAt: null },
    inputs: defaultInputs(), evidence: { rent: "", taxes: "", insurance: "", repairs: "", financing: "" },
    staleEvidence: [], decision: "investigate", notes: "",
  };
}

export function inputErrors(inputs: AnalysisInputs): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(defaultInputs()) as (keyof AnalysisInputs)[]) {
    const value = inputs[key];
    if (value === null && (key === "purchasePrice" || key === "monthlyRent")) {
      errors.push(key === "purchasePrice" ? "Enter a purchase price." : "Enter a monthly rent assumption.");
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100_000_000) {
      errors.push(`Enter a valid non-negative number for ${key}.`);
    }
    if (key.endsWith("Percent") && typeof value === "number" && value > 100) errors.push(`${key} must be between 0 and 100.`);
  }
  if (inputs.purchasePrice !== null && inputs.purchasePrice <= 0) errors.push("Purchase price must be greater than zero.");
  if (inputs.loanYears < 1 || inputs.loanYears > 50 || !Number.isInteger(inputs.loanYears)) errors.push("Loan term must be a whole number between 1 and 50 years.");
  if (inputs.financedRepairs > inputs.repairs) errors.push("Financed repairs cannot exceed total repairs.");
  return errors;
}

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculate(inputs: AnalysisInputs): AnalysisResult {
  const errors = inputErrors(inputs);
  if (errors.length) throw new Error(errors.join(" "));
  const price = inputs.purchasePrice!;
  const rent = inputs.monthlyRent!;
  const downPayment = price * inputs.downPaymentPercent / 100;
  const loanPrincipal = price - downPayment + inputs.financedRepairs;
  const rate = inputs.interestPercent / 1200;
  const months = inputs.loanYears * 12;
  // log1p/expm1 avoid cancellation at very small positive interest rates.
  const debtService = loanPrincipal === 0 ? 0 : rate === 0 ? loanPrincipal / months : loanPrincipal * rate / -Math.expm1(-months * Math.log1p(rate));
  const initialCash = downPayment + inputs.repairs - inputs.financedRepairs + inputs.closingCosts + inputs.holdingCosts + inputs.initialReserves;
  const effectiveIncome = rent * (1 - inputs.vacancyPercent / 100);
  // Percentage expenses are deliberately based on scheduled rent, not collections.
  const operatingExpenses = inputs.monthlyTaxes + inputs.monthlyInsurance + inputs.monthlyUtilities + inputs.monthlyOther + rent * (inputs.managementPercent + inputs.maintenancePercent) / 100;
  const netOperatingIncome = effectiveIncome - operatingExpenses;
  const capitalReserve = rent * inputs.capitalReservePercent / 100;
  const cashFlowBeforeReserves = netOperatingIncome - debtService;
  const monthlyCashFlow = cashFlowBeforeReserves - capitalReserve;
  return {
    initialCash: cents(initialCash), totalProjectCost: cents(price + inputs.repairs + inputs.closingCosts + inputs.holdingCosts + inputs.initialReserves),
    loanPrincipal: cents(loanPrincipal), debtService: cents(debtService), effectiveIncome: cents(effectiveIncome),
    operatingExpenses: cents(operatingExpenses), netOperatingIncome: cents(netOperatingIncome), capitalReserve: cents(capitalReserve),
    cashFlowBeforeReserves: cents(cashFlowBeforeReserves), monthlyCashFlow: cents(monthlyCashFlow), annualCashFlow: cents(monthlyCashFlow * 12),
    cashOnCashPercent: initialCash > 0 ? cents(monthlyCashFlow * 12 / initialCash * 100) : null,
    debtCoverage: debtService > 0 ? cents(netOperatingIncome / debtService) : null,
  };
}

export function evaluate(draft: AnalysisDraft): AnalysisSnapshot {
  return {
    modelVersion: MODEL_VERSION, draft,
    result: calculate(draft.inputs),
    downside: calculate({ ...draft.inputs, monthlyRent: draft.inputs.monthlyRent === null ? null : draft.inputs.monthlyRent * 0.9, vacancyPercent: Math.min(100, draft.inputs.vacancyPercent + 5) }),
    downsideAssumptions: { rentReductionPercent: 10, addedVacancyPoints: Math.min(5, 100 - draft.inputs.vacancyPercent) },
  };
}

export function nextSteps(draft: AnalysisDraft) {
  return (Object.entries(DILIGENCE) as [DiligenceKey, typeof DILIGENCE[DiligenceKey]][])
    .filter(([key]) => !draft.evidence[key].trim() || draft.staleEvidence.includes(key)).map(([key, step]) => ({ key, ...step }));
}

export function evidenceKeyForInput(key: keyof AnalysisInputs): DiligenceKey {
  if (key === "monthlyRent" || key === "vacancyPercent") return "rent";
  if (key === "monthlyTaxes") return "taxes";
  if (key === "monthlyInsurance") return "insurance";
  if (["repairs", "holdingCosts", "maintenancePercent", "capitalReservePercent"].includes(key)) return "repairs";
  return "financing";
}
