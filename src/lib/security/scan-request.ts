export type ScanRequest = {
  city: string;
  maxPrice: number;
  minScore: number;
  maxPages: number;
};

const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function boundedNumber(
  value: string | null,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
  integer = false
): number {
  const parsed = value === null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  if (integer && !Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

export function parseScanRequest(searchParams: URLSearchParams): ScanRequest {
  const city = searchParams.get("city") || "cleveland-oh";
  if (city.length > 80 || !CITY_PATTERN.test(city)) {
    throw new Error("city must be a lowercase slug");
  }

  return {
    city,
    maxPrice: boundedNumber(searchParams.get("maxPrice"), 100_000, "maxPrice", 1, 5_000_000, true),
    minScore: boundedNumber(searchParams.get("minScore"), 40, "minScore", 0, 100),
    maxPages: boundedNumber(searchParams.get("maxPages"), 3, "maxPages", 1, 10, true),
  };
}

export function toScanSearchParams(request: ScanRequest): URLSearchParams {
  return new URLSearchParams({
    city: request.city,
    maxPrice: String(request.maxPrice),
    minScore: String(request.minScore),
    maxPages: String(request.maxPages),
  });
}
