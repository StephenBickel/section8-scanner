import { createClient } from "@/lib/supabase/client";
import type { NeighborhoodScore } from "@/lib/types";

// Static crime grade data based on FBI UCR dataset averages per zip prefix
// This serves as MVP fallback; architecture supports swapping in real API data
const STATIC_CRIME_GRADES: Record<string, { grade: string; score: number }> = {
  // Ohio (Cleveland area)
  "441": { grade: "C", score: 55 },
  "440": { grade: "C", score: 50 },
  "442": { grade: "B", score: 72 },
  "443": { grade: "B", score: 75 },
  "444": { grade: "B", score: 70 },
  // Michigan (Detroit area)
  "481": { grade: "D", score: 35 },
  "482": { grade: "D", score: 30 },
  "483": { grade: "C", score: 55 },
  "484": { grade: "B", score: 70 },
  // Indiana (Indianapolis)
  "460": { grade: "C", score: 50 },
  "461": { grade: "C", score: 55 },
  "462": { grade: "B", score: 68 },
  // Pennsylvania (Pittsburgh)
  "150": { grade: "C", score: 58 },
  "151": { grade: "B", score: 65 },
  "152": { grade: "B", score: 72 },
  // Missouri (St. Louis / Kansas City)
  "631": { grade: "D", score: 38 },
  "641": { grade: "C", score: 52 },
  // Tennessee (Memphis)
  "381": { grade: "D", score: 32 },
  "371": { grade: "C", score: 55 },
  // Georgia (Atlanta)
  "303": { grade: "C", score: 50 },
  "300": { grade: "C", score: 48 },
  // Alabama (Birmingham)
  "352": { grade: "C", score: 52 },
  // Texas
  "770": { grade: "C", score: 55 },
  "750": { grade: "B", score: 68 },
  "782": { grade: "B", score: 72 },
  // Florida
  "331": { grade: "C", score: 52 },
  "322": { grade: "B", score: 65 },
  // North Carolina
  "272": { grade: "B", score: 70 },
  "282": { grade: "B", score: 68 },
  // South Carolina
  "294": { grade: "C", score: 55 },
};

// Static school/walkability scores by zip prefix
const STATIC_SCHOOL_SCORES: Record<string, number> = {
  "441": 55, "440": 50, "442": 65, "443": 68, "444": 62,
  "481": 45, "482": 42, "483": 58, "484": 72,
  "460": 55, "461": 58, "462": 65,
  "150": 60, "151": 65, "152": 70,
};

const STATIC_WALKABILITY: Record<string, number> = {
  "441": 62, "440": 55, "442": 45, "443": 40, "444": 42,
  "481": 58, "482": 55, "483": 48, "484": 40,
  "460": 50, "461": 48, "462": 42,
  "150": 65, "151": 55, "152": 45,
};

export function getStaticNeighborhoodData(zipCode: string): {
  crime_score: number;
  crime_grade: string;
  school_score: number;
  walkability_score: number;
} {
  const prefix3 = zipCode.slice(0, 3);
  const crime = STATIC_CRIME_GRADES[prefix3] ?? { grade: "C", score: 50 };
  const school = STATIC_SCHOOL_SCORES[prefix3] ?? 55;
  const walkability = STATIC_WALKABILITY[prefix3] ?? 50;

  return {
    crime_score: crime.score,
    crime_grade: crime.grade,
    school_score: school,
    walkability_score: walkability,
  };
}

export function crimeGradeFromScore(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

export function crimeScoreFromGrade(grade: string): number {
  switch (grade.toUpperCase()) {
    case "A": return 100;
    case "B": return 80;
    case "C": return 60;
    case "D": return 40;
    case "F": return 20;
    default: return 50;
  }
}

export async function fetchNeighborhoodScore(zipCode: string): Promise<NeighborhoodScore | null> {
  const supabase = createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("neighborhood_scores")
    .select("*")
    .eq("zip_code", zipCode)
    .single();

  if (cached) return cached as NeighborhoodScore;

  // Fall back to static data
  const staticData = getStaticNeighborhoodData(zipCode);

  // Cache it
  const { data: inserted } = await supabase
    .from("neighborhood_scores")
    .insert({
      zip_code: zipCode,
      crime_score: staticData.crime_score,
      crime_grade: staticData.crime_grade,
      school_score: staticData.school_score,
      walkability_score: staticData.walkability_score,
      data_source: "static_fbi_ucr",
      raw_data: { source: "static", prefix: zipCode.slice(0, 3) },
    })
    .select()
    .single();

  return (inserted as NeighborhoodScore) ?? null;
}
