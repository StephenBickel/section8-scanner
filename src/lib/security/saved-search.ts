const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FREQUENCIES = new Set(["instant", "daily", "weekly"]);

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number, field: string): number {
  const number = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
}

export function parseSavedSearch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved search");
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const city = typeof input.city === "string" ? input.city : "";
  const frequency = input.alert_frequency === undefined ? "daily" : input.alert_frequency;

  if (!name || name.length > 100) throw new Error("name must be between 1 and 100 characters");
  if (city.length > 80 || !CITY_PATTERN.test(city)) throw new Error("city must be a lowercase slug");
  if (typeof frequency !== "string" || !FREQUENCIES.has(frequency)) throw new Error("Invalid alert frequency");

  return {
    name,
    city,
    max_price: boundedInteger(input.max_price, 100_000, 1, 5_000_000, "max_price"),
    min_score: boundedInteger(input.min_score, 40, 0, 100, "min_score"),
    max_pages: boundedInteger(input.max_pages, 3, 1, 10, "max_pages"),
    alert_enabled: input.alert_enabled === true,
    alert_frequency: frequency,
  };
}
