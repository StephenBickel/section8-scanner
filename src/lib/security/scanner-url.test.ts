import { describe, expect, it } from "vitest";

import { isAllowedScannerUrl, safeZillowUrl } from "./scanner-url";

describe("scanner URLs", () => {
  it("requires HTTPS except for loopback development servers", () => {
    expect(isAllowedScannerUrl("https://scanner.example.com")).toBe(true);
    expect(isAllowedScannerUrl("http://localhost:8000")).toBe(true);
    expect(isAllowedScannerUrl("http://127.0.0.1:8000")).toBe(true);
    expect(isAllowedScannerUrl("http://scanner.example.com")).toBe(false);
    expect(isAllowedScannerUrl("file:///tmp/scanner")).toBe(false);
  });

  it("accepts only credential-free HTTPS Zillow links", () => {
    expect(safeZillowUrl("https://www.zillow.com/homedetails/123")).toBe("https://www.zillow.com/homedetails/123");
    expect(safeZillowUrl("https://zillow.com/")).toBe("https://zillow.com/");
    expect(safeZillowUrl("https://zillow.com.evil.test/phish")).toBeNull();
    expect(safeZillowUrl("javascript:alert(1)")).toBeNull();
    expect(safeZillowUrl("https://user:pass@zillow.com/")).toBeNull();
  });
});
