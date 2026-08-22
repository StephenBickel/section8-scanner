import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const requestedLimit = Number(searchParams.get("limit") || "50");
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;

  if (search.length > 100 || !/^[a-z0-9\s#.'-]*$/i.test(search)) {
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  }

  let query = supabase
    .from("seller_contacts")
    .select("id, deal_id, address, city, zip_code, owner_name, owner_email, owner_phone, skip_trace_source, skip_traced_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`address.ilike.%${search}%,owner_name.ilike.%${search}%,city.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { address, city, zip_code, owner_name, owner_email, owner_phone } = body;

  if (typeof address !== "string" || typeof owner_name !== "string" || !address.trim() || !owner_name.trim()) {
    return NextResponse.json({ error: "Address and owner name required" }, { status: 400 });
  }
  if (address.length > 300 || owner_name.length > 200) {
    return NextResponse.json({ error: "Contact fields are too long" }, { status: 400 });
  }

  const optionalString = (value: unknown, maximum: number) =>
    typeof value === "string" && value.length <= maximum ? value.trim() || null : null;

  const { data, error } = await supabase
    .from("seller_contacts")
    .insert({
      user_id: user.id,
      address: address.trim(),
      city: optionalString(city, 120) || "",
      zip_code: optionalString(zip_code, 20),
      owner_name: owner_name.trim(),
      owner_email: optionalString(owner_email, 320),
      owner_phone: optionalString(owner_phone, 40),
      skip_trace_source: "manual",
      skip_traced_at: new Date().toISOString(),
    })
    .select("id, deal_id, address, city, zip_code, owner_name, owner_email, owner_phone, skip_trace_source, skip_traced_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
