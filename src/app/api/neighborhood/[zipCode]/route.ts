import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaticNeighborhoodData } from "@/lib/neighborhood";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ zipCode: string }> }
) {
  const { zipCode } = await params;

  if (!zipCode || zipCode.length < 5) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check cache
  const { data: cached } = await supabase
    .from("neighborhood_scores")
    .select("*")
    .eq("zip_code", zipCode)
    .single();

  if (cached) {
    return NextResponse.json({
      crime_score: cached.crime_score,
      crime_grade: cached.crime_grade,
      school_score: cached.school_score,
      walkability_score: cached.walkability_score,
      data_source: cached.data_source,
      fetched_at: cached.fetched_at,
    });
  }

  // Generate from static data
  const data = getStaticNeighborhoodData(zipCode);

  // Cache it (best-effort, don't fail if insert fails due to RLS)
  await supabase.from("neighborhood_scores").insert({
    zip_code: zipCode,
    crime_score: data.crime_score,
    crime_grade: data.crime_grade,
    school_score: data.school_score,
    walkability_score: data.walkability_score,
    data_source: "static_fbi_ucr",
    raw_data: { source: "static", prefix: zipCode.slice(0, 3) },
  });

  return NextResponse.json({
    crime_score: data.crime_score,
    crime_grade: data.crime_grade,
    school_score: data.school_score,
    walkability_score: data.walkability_score,
    data_source: "static_fbi_ucr",
    fetched_at: new Date().toISOString(),
  });
}
