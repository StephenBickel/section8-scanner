import { calculate, defaultInputs, newDraft } from "./model";

interface LegacyProperty { address: string; price: number; monthly_rent: number; zillow_url: string }

export function analysisUrl(deal: LegacyProperty, city: string, demo = false) {
  const params = new URLSearchParams({ address: deal.address, price: String(deal.price), rent: String(deal.monthly_rent), city, source: demo ? "demo" : "scanner", url: deal.zillow_url });
  return `/analyze?${params}`;
}

export function normalizeFinancials<T extends LegacyProperty>(deal: T): T & { initial_cash: number } {
  const inputs = defaultInputs(deal.price, deal.monthly_rent);
  const result = calculate(inputs);
  return { ...deal, mortgage: result.debtService, expenses_total: result.operatingExpenses + result.capitalReserve + deal.monthly_rent * inputs.vacancyPercent / 100,
    dscr: result.debtCoverage ?? 0, monthly_cash_flow: result.monthlyCashFlow, annual_cash_flow: result.annualCashFlow,
    coc_return: result.cashOnCashPercent ?? 0, down_payment: deal.price * inputs.downPaymentPercent / 100, initial_cash: result.initialCash };
}

export function draftFromParams(params: Record<string, string | string[] | undefined>) {
  const draft = newDraft();
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const number = (key: string) => {
    const raw = get(key);
    const value = Number(raw);
    return raw && Number.isFinite(value) && value >= 0 && value <= 100000000 ? value : null;
  };
  draft.property = { address: get("address").slice(0, 300), city: get("city").slice(0, 100), sourceKind: get("source") === "demo" ? "demo" : get("source") === "scanner" ? "scanner" : "manual", sourceUrl: "", observedAt: null };
  try { const url = new URL(get("url")); if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) draft.property.sourceUrl = url.href.slice(0, 2000); } catch { /* Manual properties may have no source URL. */ }
  draft.inputs = defaultInputs(number("price"), number("rent"));
  return draft;
}
