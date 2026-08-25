import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to_email, to_name, subject, body: emailBody, deal_address, deal_zip, campaign_id } = body;

  if (
    typeof to_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email) || to_email.length > 320 ||
    typeof to_name !== "string" || !to_name.trim() || to_name.length > 200 ||
    typeof subject !== "string" || !subject.trim() || subject.length > 200 ||
    typeof emailBody !== "string" || !emailBody.trim() || emailBody.length > 50_000
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert seller contact
  const { data: contact } = await supabase
    .from("seller_contacts")
    .insert({
      user_id: user.id,
      address: typeof deal_address === "string" && deal_address.length <= 300 ? deal_address.trim() || "Unknown" : "Unknown",
      city: "",
      zip_code: typeof deal_zip === "string" && deal_zip.length <= 20 ? deal_zip.trim() || null : null,
      owner_name: to_name.trim(),
      owner_email: to_email.trim(),
      skip_trace_source: "manual",
      skip_traced_at: new Date().toISOString(),
    })
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

  console.log("[Outreach] Email queued");

  return NextResponse.json({
    success: true,
    message: "Email queued (placeholder — configure RESEND_API_KEY for real sending)",
  });
}
