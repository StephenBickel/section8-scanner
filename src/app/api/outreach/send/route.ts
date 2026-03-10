import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (profile?.plan !== "investor") {
    return NextResponse.json({ error: "Investor plan required" }, { status: 403 });
  }

  const body = await request.json();
  const { to_email, to_name, subject, body: emailBody, deal_address, deal_zip, campaign_id } = body;

  if (!to_email || !to_name || !subject || !emailBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert seller contact
  const { data: contact } = await supabase
    .from("seller_contacts")
    .upsert(
      {
        address: deal_address || "Unknown",
        city: "",
        zip_code: deal_zip || null,
        owner_name: to_name,
        owner_email: to_email,
        skip_trace_source: "manual",
        skip_traced_at: new Date().toISOString(),
      },
      { onConflict: "address" }
    )
    .select()
    .single();

  // Record the outreach email
  if (contact && campaign_id) {
    await supabase.from("outreach_emails").insert({
      campaign_id,
      user_id: user.id,
      seller_contact_id: contact.id,
      subject,
      body: emailBody,
      status: "sent",
      sequence_step: 1,
      sent_at: new Date().toISOString(),
    });
  }

  // Placeholder email send
  // TODO: Integrate Resend API when RESEND_API_KEY is configured
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: '...', to: to_email, subject, html: emailBody });

  console.log(`[Outreach] Email queued to ${to_email}: "${subject}"`);

  return NextResponse.json({
    success: true,
    message: "Email queued (placeholder — configure RESEND_API_KEY for real sending)",
    to: to_email,
    subject,
  });
}
