import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PLAN_LIMITS } from "@/lib/types";
import { getStaticNeighborhoodData } from "@/lib/neighborhood";

function getSupabase(request: NextRequest) {
  const response = NextResponse.next();
  return {
    supabase: createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    ),
    response,
  };
}

export async function POST(request: NextRequest) {
  const { supabase } = getSupabase(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan ?? "free") as keyof typeof PLAN_LIMITS;
  if (!PLAN_LIMITS[plan].reports) {
    return NextResponse.json(
      { error: "Reports require a Pro or Investor plan" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { type, deal_id, saved_search_id } = body as {
    type: string;
    deal_id?: string;
    saved_search_id?: string;
  };

  if (!["single_deal", "market_summary", "portfolio_summary"].includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  let reportData: Record<string, unknown> = {};
  let title = "";

  if (type === "single_deal") {
    if (!deal_id) {
      return NextResponse.json({ error: "deal_id required" }, { status: 400 });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Get real expenses
    const state = extractState(String(deal.city ?? ""));
    let expenses: Record<string, unknown> = {};

    if (state) {
      const { data: taxData } = await supabase
        .from("county_tax_rates")
        .select("*")
        .eq("state", state)
        .order("year", { ascending: false })
        .limit(1)
        .single();

      const { data: insData } = await supabase
        .from("insurance_estimates")
        .select("*")
        .eq("state", state)
        .order("year", { ascending: false })
        .limit(1)
        .single();

      const taxRate = taxData?.effective_tax_rate ?? 1.5;
      const insMonthly = insData?.avg_monthly_premium ?? 120;
      const price = Number(deal.price ?? 0);
      const rent = Number(deal.monthly_rent ?? 0);

      const loanAmount = price * 0.75;
      const monthlyRate = 0.075 / 12;
      const mortgage = loanAmount > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, 360)) / (Math.pow(1 + monthlyRate, 360) - 1)
        : 0;

      expenses = {
        mortgage: Math.round(mortgage),
        property_tax: Math.round((price * (taxRate / 100)) / 12),
        insurance: Math.round(insMonthly),
        management: Math.round(rent * 0.1),
        maintenance: Math.round(rent * 0.05),
        vacancy: Math.round(rent * 0.05),
        total: Math.round(mortgage + (price * (taxRate / 100)) / 12 + insMonthly + rent * 0.2),
        tax_source: taxData ? `${taxData.county} Co. ${taxRate}%` : "Estimated 1.5%",
        insurance_source: insData ? `${state} avg $${Math.round(insData.avg_annual_premium)}/yr` : "Estimated $120/mo",
      };
    }

    // Get neighborhood data
    const neighborhood = deal.zip_code
      ? getStaticNeighborhoodData(String(deal.zip_code))
      : null;

    // Get FMR history
    let fmrHistory: unknown[] = [];
    if (deal.zip_code) {
      const { data: fmr } = await supabase
        .from("fmr_history")
        .select("*")
        .eq("zip_code", String(deal.zip_code))
        .order("year", { ascending: true });
      fmrHistory = fmr ?? [];
    }

    title = `Deal Report: ${String(deal.address ?? "Unknown")}`;
    reportData = { deal, expenses, neighborhood, fmr_history: fmrHistory };
  } else if (type === "market_summary") {
    if (!saved_search_id) {
      return NextResponse.json({ error: "saved_search_id required" }, { status: 400 });
    }

    const { data: search } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("id", saved_search_id)
      .eq("user_id", user.id)
      .single();

    if (!search) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
    }

    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .eq("city", String(search.city))
      .eq("is_active", true)
      .order("deal_score", { ascending: false })
      .limit(20);

    const dealsList = deals ?? [];
    const avgPrice = dealsList.length ? dealsList.reduce((s, d) => s + Number(d.price ?? 0), 0) / dealsList.length : 0;
    const avgRent = dealsList.length ? dealsList.reduce((s, d) => s + Number(d.monthly_rent ?? 0), 0) / dealsList.length : 0;
    const avgScore = dealsList.length ? dealsList.reduce((s, d) => s + Number(d.deal_score ?? 0), 0) / dealsList.length : 0;
    const avgDscr = dealsList.length ? dealsList.reduce((s, d) => s + Number(d.dscr ?? 0), 0) / dealsList.length : 0;

    title = `Market Summary: ${String(search.city)}`;
    reportData = {
      deals: dealsList,
      stats: { avg_price: avgPrice, avg_rent: avgRent, avg_score: avgScore, avg_dscr: avgDscr },
      city: search.city,
    };
  } else if (type === "portfolio_summary") {
    const { data: properties } = await supabase
      .from("portfolio_properties")
      .select("*")
      .eq("user_id", user.id);

    const { data: transactions } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .eq("user_id", user.id);

    const propsList = properties ?? [];
    const txList = transactions ?? [];

    const totalIncome = txList
      .filter((t) => t.type === "rent" || t.type === "other_income")
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const totalExpenses = txList
      .filter((t) => t.type !== "rent" && t.type !== "other_income")
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);

    // Estimate PM savings
    const totalRent = propsList.reduce((s, p) => s + Number(p.current_rent ?? 0), 0);
    const pmCost = totalRent * 0.1;

    title = "Portfolio Summary Report";
    reportData = {
      properties: propsList,
      transactions: txList,
      summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_cash_flow: totalIncome - totalExpenses,
        management_savings: pmCost,
      },
    };
  }

  // Save report
  const { data: report, error: insertError } = await supabase
    .from("deal_reports")
    .insert({
      user_id: user.id,
      deal_id: deal_id ?? null,
      saved_search_id: saved_search_id ?? null,
      report_type: type,
      title,
      data: reportData,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(report, { status: 201 });
}

function extractState(city: string): string | null {
  // Try to extract state abbreviation from city string like "Cleveland, OH" or "cleveland-oh"
  const commaMatch = city.match(/,\s*([A-Z]{2})\s*$/i);
  if (commaMatch) return commaMatch[1].toUpperCase();

  const dashMatch = city.match(/-([a-z]{2})$/i);
  if (dashMatch) return dashMatch[1].toUpperCase();

  return null;
}
