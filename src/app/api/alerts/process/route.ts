import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  // Verify cron API key
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Fetch all users with alert preferences enabled
  const { data: alertPrefs, error: prefsError } = await supabase
    .from("alert_preferences")
    .select("*")
    .eq("email_enabled", true);

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 });
  }

  let processed = 0;
  let newAlerts = 0;
  let emailsQueued = 0;

  for (const pref of alertPrefs ?? []) {
    // Get user's saved searches with alerts enabled
    const { data: searches } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", pref.user_id)
      .eq("alert_enabled", true);

    if (!searches || searches.length === 0) continue;

    for (const search of searches) {
      processed++;

      // Get existing deals for this search's city
      const { data: existingDeals } = await supabase
        .from("deals")
        .select("id, address, price")
        .eq("city", search.city)
        .eq("is_active", true);

      const existingAddresses = new Set(
        (existingDeals ?? []).map((d) => d.address),
      );
      const existingPrices = new Map(
        (existingDeals ?? []).map((d) => [d.address, d.price]),
      );

      // Try to scan for new deals via the scanner backend
      let scanDeals: Array<Record<string, unknown>> = [];
      try {
        const scannerUrl = process.env.SCANNER_URL ?? "http://localhost:5001";
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

        if (scanRes.ok) {
          const result = await scanRes.json();
          scanDeals = result.deals ?? [];
        }
      } catch {
        // Scanner unavailable — skip this search
        continue;
      }

      for (const deal of scanDeals) {
        const address = String(deal.address ?? "");
        const price = Number(deal.price ?? 0);
        const score = Number(deal.score ?? 0);

        if (score < pref.min_deal_score) continue;

        if (!existingAddresses.has(address)) {
          // New deal
          if (pref.notify_new_deals) {
            await supabase.from("alerts").insert({
              user_id: pref.user_id,
              saved_search_id: search.id,
              alert_type: "new_deal",
              channel: "email",
              metadata: { address, price, score, city: search.city },
            });
            newAlerts++;
            emailsQueued++;
          }
        } else {
          // Check for price drop
          const oldPrice = existingPrices.get(address);
          if (
            oldPrice &&
            price < oldPrice &&
            pref.notify_price_drops
          ) {
            const dropPct = ((oldPrice - price) / oldPrice) * 100;
            if (dropPct >= pref.price_drop_threshold) {
              await supabase.from("alerts").insert({
                user_id: pref.user_id,
                saved_search_id: search.id,
                alert_type: "price_drop",
                channel: "email",
                metadata: {
                  address,
                  old_price: oldPrice,
                  new_price: price,
                  drop_pct: dropPct,
                },
              });
              newAlerts++;
              emailsQueued++;
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    processed,
    new_alerts: newAlerts,
    emails_queued: emailsQueued,
  });
}
