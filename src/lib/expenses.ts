import { calculate, defaultInputs } from "@/lib/analysis/model";
import { createClient } from "@/lib/supabase/client";

export interface ExpenseBreakdownResult {
  mortgage: number;
  property_tax: number;
  insurance: number;
  management: number;
  maintenance: number;
  vacancy: number;
  capital_reserve: number;
  total: number;
  sources: {
    tax: string;
    insurance: string;
  };
}

// Default fallback rates
const DEFAULT_TAX_RATE = 1.5; // Editable assumption, not a verified rate
const DEFAULT_INSURANCE_MONTHLY = 120; // Editable assumption, not a quote
const DEFAULT_MANAGEMENT_PCT = 10; // 10% of rent
const DEFAULT_MAINTENANCE_PCT = 5; // 5% of rent
const DEFAULT_VACANCY_PCT = 5; // 5% of rent

export async function getRealExpenses(
  price: number,
  monthlyRent: number,
  state: string,
  county?: string,
): Promise<ExpenseBreakdownResult> {
  const supabase = createClient();

  // Fetch real tax rate
  let taxRate = DEFAULT_TAX_RATE;
  let taxSource = `Estimated (${DEFAULT_TAX_RATE}% assumed)`;

  if (county) {
    const { data: taxData } = await supabase
      .from("county_tax_rates")
      .select("*")
      .eq("state", state)
      .ilike("county", county)
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (taxData) {
      taxRate = taxData.effective_tax_rate;
      taxSource = `${taxData.county} Co. ${taxRate}% (${taxData.year})`;
    }
  }

  // Fetch real insurance
  let insuranceMonthly = DEFAULT_INSURANCE_MONTHLY;
  let insuranceSource = `Estimated ($${DEFAULT_INSURANCE_MONTHLY}/mo assumed)`;

  const { data: insData } = await supabase
    .from("insurance_estimates")
    .select("*")
    .eq("state", state)
    .order("year", { ascending: false })
    .limit(1)
    .single();

  if (insData) {
    insuranceMonthly = insData.avg_monthly_premium;
    insuranceSource = `${state} avg $${Math.round(insData.avg_annual_premium)}/yr (${insData.year})`;
  }

  return getExpensesSync(price, monthlyRent, taxRate, insuranceMonthly, taxSource, insuranceSource);
}

export function getExpensesSync(
  price: number,
  monthlyRent: number,
  taxRate: number,
  insuranceMonthly: number,
  taxSource: string,
  insuranceSource: string,
): ExpenseBreakdownResult {
  const inputs = { ...defaultInputs(price, monthlyRent), monthlyTaxes: price * taxRate / 1200, monthlyInsurance: insuranceMonthly };
  const result = calculate(inputs);
  return {
    mortgage: result.debtService, property_tax: inputs.monthlyTaxes, insurance: insuranceMonthly,
    management: monthlyRent * DEFAULT_MANAGEMENT_PCT / 100,
    maintenance: monthlyRent * DEFAULT_MAINTENANCE_PCT / 100,
    vacancy: monthlyRent * DEFAULT_VACANCY_PCT / 100,
    capital_reserve: result.capitalReserve,
    total: Math.round((monthlyRent - result.monthlyCashFlow) * 100) / 100,
    sources: { tax: taxSource, insurance: insuranceSource },
  };
}
