import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("seller_contacts")
    .select("*")
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

  const body = await request.json();
  const { address, city, zip_code, owner_name, owner_email, owner_phone } = body;

  if (!address || !owner_name) {
    return NextResponse.json({ error: "Address and owner name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("seller_contacts")
    .insert({
      address,
      city: city || "",
      zip_code: zip_code || null,
      owner_name,
      owner_email: owner_email || null,
      owner_phone: owner_phone || null,
      skip_trace_source: "manual",
      skip_traced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
