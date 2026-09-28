import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { evaluate, defaultInputs, newDraft } from "@/lib/analysis/model";

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

    const price = Number(deal.price);
    const rent = Number(deal.monthly_rent);
    if (!Number.isFinite(price) || price <= 0 || deal.monthly_rent == null || !Number.isFinite(rent) || rent < 0) {
      return NextResponse.json({ error: "This property needs a valid price and rent assumption before generating a report." }, { status: 422 });
    }
    // Legacy reports start from the same explicit default case as discovery.
    // A state alone cannot identify the property's county tax rate.
    const draft = newDraft();
    draft.property = { address: String(deal.address ?? "Property"), city: String(deal.city ?? ""), sourceKind: "scanner", sourceUrl: "", observedAt: null };
    draft.inputs = defaultInputs(price, rent);
    const analysis = evaluate(draft);
    const expenses = {
      mortgage: analysis.result.debtService, property_tax: draft.inputs.monthlyTaxes,
      insurance: draft.inputs.monthlyInsurance, management: rent * 0.1,
      maintenance: rent * 0.05, vacancy: rent * 0.05, capital_reserve: analysis.result.capitalReserve,
      total: Math.round((rent - analysis.result.monthlyCashFlow) * 100) / 100,
      tax_source: "Unverified 1.5% assumption", insurance_source: "Unverified $120/month assumption",
    };
    const normalizedDeal = { ...deal, monthly_cash_flow: analysis.result.monthlyCashFlow,
      cash_on_cash: analysis.result.cashOnCashPercent, coc_return: analysis.result.cashOnCashPercent,
      dscr: analysis.result.debtCoverage, initial_cash: analysis.result.initialCash };

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
    reportData = { deal: normalizedDeal, expenses, analysis, fmr_history: fmrHistory };
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
