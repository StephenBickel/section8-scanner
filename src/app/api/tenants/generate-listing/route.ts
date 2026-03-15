import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { generateListings } from "@/lib/listing-generator";
import type { PropertyListing } from "@/lib/types";

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

export async function POST(request: NextRequest) {
  const { supabase } = getSupabase(request);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const listings = generateListings(body as PropertyListing);

  // If listing_id provided, update the listing with generated content
  if (body.listing_id) {
    const { error } = await supabase
      .from("property_listings")
      .update({
        gosection8_listing: listings.gosection8,
        affordablehousing_listing: listings.affordablehousing,
        socialserve_listing: listings.socialserve,
        craigslist_listing: listings.craigslist,
        facebook_listing: listings.facebook,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.listing_id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(listings);
}
