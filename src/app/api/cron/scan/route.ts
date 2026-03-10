import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Rate limit: process at most 5 searches concurrently with 2s delay between batches
const MAX_CONCURRENT = 5;
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Fetch all saved searches with alerts enabled
  const { data: searches, error: searchError } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("alert_enabled", true);

  if (searchError) {
    return NextResponse.json({ error: searchError.message }, { status: 500 });
  }

  if (!searches || searches.length === 0) {
    return NextResponse.json({ message: "No active saved searches", processed: 0 });
  }

  const scannerUrl = process.env.SCANNER_URL ?? "http://localhost:5001";
  let totalProcessed = 0;
  let totalNewDeals = 0;
  let totalPriceChanges = 0;

  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < searches.length; i += MAX_CONCURRENT) {
    const batch = searches.slice(i, i + MAX_CONCURRENT);

    const results = await Promise.allSettled(
      batch.map((search) => processSearch(supabase, scannerUrl, search)),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        totalProcessed++;
        totalNewDeals += result.value.newDeals;
        totalPriceChanges += result.value.priceChanges;
      }
    }

    if (i + MAX_CONCURRENT < searches.length) {
      await sleep(DELAY_MS);
    }
  }

  return NextResponse.json({
    processed: totalProcessed,
    total_searches: searches.length,
    new_deals: totalNewDeals,
    price_changes: totalPriceChanges,
  });
}

async function processSearch(
  supabase: SupabaseClient,
  scannerUrl: string,
  search: Record<string, unknown>,
): Promise<{ newDeals: number; priceChanges: number }> {
  const startedAt = new Date().toISOString();
  let newDeals = 0;
  let priceChanges = 0;
  let propertiesFound = 0;
  let dealsFound = 0;

  try {
    // Call the scanner backend
    const scanRes = await fetch(`${scannerUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: search.city,
        max_price: search.max_price,
        min_score: search.min_score,
        max_pages: search.max_pages ?? 3,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!scanRes.ok) return { newDeals: 0, priceChanges: 0 };

    const result = await scanRes.json();
    const scanDeals = (result.deals ?? []) as Array<Record<string, unknown>>;
    propertiesFound = Number(result.properties_scanned ?? scanDeals.length);
    dealsFound = scanDeals.length;

    // Get existing deals for comparison
    const { data: existingDeals } = await supabase
      .from("deals")
      .select("*")
      .eq("city", String(search.city))
      .eq("is_active", true);

    const existingByAddress = new Map(
      (existingDeals ?? []).map((d: Record<string, unknown>) => [String(d.address), d]),
    );

    for (const deal of scanDeals) {
      const address = String(deal.address ?? "");
      const existing = existingByAddress.get(address);

      if (!existing) {
        // New deal — insert
        await supabase.from("deals").insert({
          address,
          city: String(search.city),
          zip_code: String(deal.zip_code ?? ""),
          price: Number(deal.price ?? 0),
          beds: Number(deal.beds ?? 0),
          baths: Number(deal.baths ?? 0),
          sqft: Number(deal.sqft ?? 0),
          hud_rent: deal.hud_rent ? Number(deal.hud_rent) : null,
          monthly_rent: Number(deal.monthly_rent ?? 0),
          dscr: Number(deal.dscr ?? 0),
          monthly_cash_flow: Number(deal.monthly_cash_flow ?? 0),
          annual_cash_flow: Number(deal.annual_cash_flow ?? 0),
          cash_on_cash: Number(deal.coc_return ?? 0),
          rent_to_price: Number(deal.rent_to_price ?? 0),
          down_payment: Number(deal.down_payment ?? 0),
          mortgage: Number(deal.mortgage ?? 0),
          expenses_total: Number(deal.expenses_total ?? 0),
          deal_score: Number(deal.score ?? 0),
          zillow_url: deal.zillow_url ? String(deal.zillow_url) : null,
          is_active: true,
        });

        // Create new_deal alert
        await supabase.from("alerts").insert({
          user_id: String(search.user_id),
          saved_search_id: String(search.id),
          alert_type: "new_deal",
          channel: "email",
          metadata: {
            address,
            price: Number(deal.price ?? 0),
            score: Number(deal.score ?? 0),
            monthly_cash_flow: Number(deal.monthly_cash_flow ?? 0),
            hud_rent: deal.hud_rent ? Number(deal.hud_rent) : null,
            beds: Number(deal.beds ?? 0),
            baths: Number(deal.baths ?? 0),
            zillow_url: deal.zillow_url ? String(deal.zillow_url) : null,
          },
        });

        newDeals++;
      } else {
        // Check for price change
        const oldPrice = Number(existing.price ?? 0);
        const newPrice = Number(deal.price ?? 0);
        if (newPrice !== oldPrice && oldPrice > 0) {
          // Update deal price
          await supabase
            .from("deals")
            .update({
              price: newPrice,
              last_seen_at: new Date().toISOString(),
              price_history: [
                ...((existing.price_history as Array<{ price: number; date: string }>) ?? []),
                { price: newPrice, date: new Date().toISOString() },
              ],
            })
            .eq("id", String(existing.id));

          // Create price_drop alert if price went down
          if (newPrice < oldPrice) {
            await supabase.from("alerts").insert({
              user_id: String(search.user_id),
              saved_search_id: String(search.id),
              alert_type: "price_drop",
              channel: "email",
              metadata: {
                address,
                old_price: oldPrice,
                new_price: newPrice,
                drop_pct: ((oldPrice - newPrice) / oldPrice) * 100,
              },
            });
            priceChanges++;
          }
        } else {
          // Just update last_seen_at
          await supabase
            .from("deals")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", String(existing.id));
        }
      }
    }

    // Update saved search last_run_at
    await supabase
      .from("saved_searches")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", String(search.id));

    // Insert scan_runs record
    await supabase.from("scan_runs").insert({
      user_id: String(search.user_id),
      saved_search_id: String(search.id),
      city: String(search.city),
      max_price: Number(search.max_price),
      min_score: Number(search.min_score),
      properties_found: propertiesFound,
      deals_found: dealsFound,
      new_deals: newDeals,
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Error processing search ${String(search.id)}:`, err);
  }

  return { newDeals, priceChanges };
}
