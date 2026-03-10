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
      },
    ),
    response,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> },
) {
  const { state } = await params;
  const stateUpper = state.toUpperCase();
  const { supabase } = getSupabase(request);

  const [taxRes, insRes] = await Promise.all([
    supabase
      .from("county_tax_rates")
      .select("*")
      .eq("state", stateUpper)
      .order("county", { ascending: true }),
    supabase
      .from("insurance_estimates")
      .select("*")
      .eq("state", stateUpper)
      .order("year", { ascending: false }),
  ]);

  if (taxRes.error || insRes.error) {
    return NextResponse.json(
      { error: taxRes.error?.message ?? insRes.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    state: stateUpper,
    county_tax_rates: taxRes.data ?? [],
    insurance_estimates: insRes.data ?? [],
  });
}
