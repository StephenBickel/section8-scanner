import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateAlertEmailHtml,
  generateAlertEmailSubject,
} from "@/lib/alert-email";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Fetch unsent alerts
  const { data: pendingAlerts, error: alertsError } = await supabase
    .from("alerts")
    .select("*")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (alertsError) {
    return NextResponse.json({ error: alertsError.message }, { status: 500 });
  }

  if (!pendingAlerts || pendingAlerts.length === 0) {
    return NextResponse.json({ sent: 0, message: "No pending alerts" });
  }

  // Group by user
  const byUser = new Map<string, typeof pendingAlerts>();
  for (const alert of pendingAlerts) {
    const existing = byUser.get(alert.user_id) ?? [];
    existing.push(alert);
    byUser.set(alert.user_id, existing);
  }

  let sent = 0;
  let failed = 0;

  for (const [userId, userAlerts] of byUser) {
    // Get user's alert preferences
    const { data: prefs } = await supabase
      .from("alert_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get user profile for name/email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!profile) continue;

    const frequency = (prefs?.digest_frequency ?? "instant") as "instant" | "daily" | "weekly";
    const emailAddress = prefs?.email_address ?? profile.email;

    // Build deal objects for the email
    const dealCards = userAlerts.map((alert) => {
      const meta = alert.metadata as Record<string, unknown>;
      return {
        address: String(meta.address ?? "Unknown"),
        price: Number(meta.price ?? meta.new_price ?? 0),
        deal_score: Number(meta.score ?? 0),
        monthly_cash_flow: Number(meta.monthly_cash_flow ?? 0),
        hud_rent: meta.hud_rent ? Number(meta.hud_rent) : null,
        beds: Number(meta.beds ?? 0),
        baths: Number(meta.baths ?? 0),
        zillow_url: meta.zillow_url ? String(meta.zillow_url) : null,
      };
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://section8scanner.com";
    const html = generateAlertEmailHtml({
      userName: profile.full_name ?? "Investor",
      deals: dealCards,
      alertType: frequency,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
    });

    const subject = generateAlertEmailSubject(frequency, dealCards.length);

    // Send via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.log(
        `RESEND_API_KEY not set — would send "${subject}" to ${emailAddress} with ${dealCards.length} deals`,
      );
      // Mark as sent anyway in dev so they don't pile up
      const alertIds = userAlerts.map((a) => a.id);
      await supabase
        .from("alerts")
        .update({ sent_at: new Date().toISOString() })
        .in("id", alertIds);
      sent += userAlerts.length;
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "alerts@section8scanner.com",
          to: emailAddress,
          subject,
          html,
        }),
      });

      if (res.ok) {
        const alertIds = userAlerts.map((a) => a.id);
        await supabase
          .from("alerts")
          .update({ sent_at: new Date().toISOString() })
          .in("id", alertIds);
        sent += userAlerts.length;
      } else {
        const errBody = await res.text();
        console.error(`Resend API error for user ${userId}:`, errBody);
        failed += userAlerts.length;
      }
    } catch (err) {
      console.error(`Failed to send email to ${emailAddress}:`, err);
      failed += userAlerts.length;
    }
  }

  return NextResponse.json({ sent, failed });
}
