import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
      }
    ),
    response,
  };
}

export async function GET(request: NextRequest) {
  const { supabase } = getSupabase(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("portfolio_properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { supabase } = getSupabase(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (false && profile?.plan === "free") { // Internal tool — no plan gating
    return NextResponse.json(
      { error: "Portfolio tracking requires a Pro or Investor plan" },
      { status: 403 }
    );
  }

  const { count } = await supabase
    .from("portfolio_properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (false && profile?.plan === "pro" && (count ?? 0) >= 10) { // Internal tool — no plan gating
    return NextResponse.json(
      { error: "Pro plan limited to 10 properties. Upgrade to Investor for unlimited." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("portfolio_properties")
    .insert({
      user_id: user.id,
      deal_id: body.deal_id ?? null,
      address: body.address,
      city: body.city,
      zip_code: body.zip_code ?? null,
      purchase_price: body.purchase_price,
      purchase_date: body.purchase_date ?? null,
      beds: body.beds ?? 0,
      baths: body.baths ?? 0,
      sqft: body.sqft ?? 0,
      current_rent: body.current_rent ?? null,
      hud_rent: body.hud_rent ?? null,
      is_section8: body.is_section8 ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { supabase } = getSupabase(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("portfolio_properties")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
