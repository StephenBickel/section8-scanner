import { describe, expect, it } from "vitest";

import { parseScanRequest } from "./scan-request";

describe("parseScanRequest", () => {
  it("applies safe defaults and returns canonical query parameters", () => {
    const parsed = parseScanRequest(new URLSearchParams());

    expect(parsed).toEqual({
      city: "cleveland-oh",
      maxPrice: 100_000,
      minScore: 40,
      maxPages: 3,
    });
  });

  it("accepts values inside the supported bounds", () => {
    expect(parseScanRequest(new URLSearchParams({
      city: "st-louis-mo",
      maxPrice: "250000",
      minScore: "72.5",
      maxPages: "5",
    }))).toEqual({
      city: "st-louis-mo",
      maxPrice: 250_000,
      minScore: 72.5,
      maxPages: 5,
    });
  });

  it.each([
    ["city", "../secrets"],
    ["city", "a".repeat(81)],
    ["maxPrice", "0"],
    ["maxPrice", "5000001"],
    ["maxPrice", "not-a-number"],
    ["minScore", "-1"],
    ["minScore", "101"],
    ["maxPages", "0"],
    ["maxPages", "11"],
    ["maxPages", "1.5"],
  ])("rejects invalid %s=%s", (name, value) => {
    expect(() => parseScanRequest(new URLSearchParams({ [name]: value }))).toThrow();
  });
});
