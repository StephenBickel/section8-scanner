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
  { params }: { params: Promise<{ zipCode: string }> },
) {
  const { zipCode } = await params;
  const { supabase } = getSupabase(request);

  const { data, error } = await supabase
    .from("fmr_history")
    .select("*")
    .eq("zip_code", zipCode)
    .order("year", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    zip_code: zipCode,
    history: data ?? [],
  });
}
