import { createClient } from "@/lib/supabase/client";

export interface ExpenseBreakdownResult {
  mortgage: number;
  property_tax: number;
  insurance: number;
  management: number;
  maintenance: number;
  vacancy: number;
  total: number;
  sources: {
    tax: string;
    insurance: string;
  };
}

// Default fallback rates
const DEFAULT_TAX_RATE = 1.5; // 1.5% national average
const DEFAULT_INSURANCE_MONTHLY = 120; // ~$1440/yr national average
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
  let taxSource = `Estimated (${DEFAULT_TAX_RATE}% national avg)`;

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
  let insuranceSource = `Estimated ($${DEFAULT_INSURANCE_MONTHLY}/mo national avg)`;

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

  // Calculate DSCR loan mortgage (25% down, 7.5% rate, 30yr)
  const downPayment = price * 0.25;
  const loanAmount = price - downPayment;
  const monthlyRate = 0.075 / 12;
  const numPayments = 360;
  const mortgage =
    loanAmount > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;

  const propertyTax = (price * (taxRate / 100)) / 12;
  const management = monthlyRent * (DEFAULT_MANAGEMENT_PCT / 100);
  const maintenance = monthlyRent * (DEFAULT_MAINTENANCE_PCT / 100);
  const vacancy = monthlyRent * (DEFAULT_VACANCY_PCT / 100);

  return {
    mortgage: Math.round(mortgage),
    property_tax: Math.round(propertyTax),
    insurance: Math.round(insuranceMonthly),
    management: Math.round(management),
    maintenance: Math.round(maintenance),
    vacancy: Math.round(vacancy),
    total: Math.round(mortgage + propertyTax + insuranceMonthly + management + maintenance + vacancy),
    sources: {
      tax: taxSource,
      insurance: insuranceSource,
    },
  };
}

export function getExpensesSync(
  price: number,
  monthlyRent: number,
  taxRate: number,
  insuranceMonthly: number,
  taxSource: string,
  insuranceSource: string,
): ExpenseBreakdownResult {
  const downPayment = price * 0.25;
  const loanAmount = price - downPayment;
  const monthlyRate = 0.075 / 12;
  const numPayments = 360;
  const mortgage =
    loanAmount > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;

  const propertyTax = (price * (taxRate / 100)) / 12;
  const management = monthlyRent * (DEFAULT_MANAGEMENT_PCT / 100);
  const maintenance = monthlyRent * (DEFAULT_MAINTENANCE_PCT / 100);
  const vacancy = monthlyRent * (DEFAULT_VACANCY_PCT / 100);

  return {
    mortgage: Math.round(mortgage),
    property_tax: Math.round(propertyTax),
    insurance: Math.round(insuranceMonthly),
    management: Math.round(management),
    maintenance: Math.round(maintenance),
    vacancy: Math.round(vacancy),
    total: Math.round(mortgage + propertyTax + insuranceMonthly + management + maintenance + vacancy),
    sources: {
      tax: taxSource,
      insurance: insuranceSource,
    },
  };
}
