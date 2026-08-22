import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    [null, "/dashboard"],
    ["/saved?filter=new", "/saved?filter=new"],
    ["/", "/"],
  ])("normalizes %s", (value, expected) => {
    expect(safeRedirectPath(value)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example",
    "@evil.example",
    "dashboard",
    "/%0d%0aLocation:https://evil.example",
  ])("rejects unsafe redirect target %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard");
  });
});
