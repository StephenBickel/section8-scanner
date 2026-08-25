import { describe, expect, it } from "vitest";

import { parseSavedSearch } from "./saved-search";

describe("parseSavedSearch", () => {
  it("normalizes a bounded saved search", () => {
    expect(parseSavedSearch({ name: " Cleveland deals ", city: "cleveland-oh", max_price: 100000 })).toEqual({
      name: "Cleveland deals",
      city: "cleveland-oh",
      max_price: 100000,
      min_score: 40,
      max_pages: 3,
      alert_enabled: false,
      alert_frequency: "daily",
    });
  });

  it("rejects malformed or unbounded values", () => {
    expect(() => parseSavedSearch({ name: "", city: "cleveland-oh", max_price: 100000 })).toThrow();
    expect(() => parseSavedSearch({ name: "x", city: "../etc", max_price: 100000 })).toThrow();
    expect(() => parseSavedSearch({ name: "x", city: "cleveland-oh", max_price: 9000000 })).toThrow();
    expect(() => parseSavedSearch({ name: "x", city: "cleveland-oh", max_price: 100000, alert_frequency: "secondly" })).toThrow();
  });
});
