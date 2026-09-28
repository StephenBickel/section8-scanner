import { describe, expect, it } from "vitest";
import { sameOrigin } from "./same-origin";
describe("cookie-authenticated mutation origin", () => {
  it("uses the public Host behind Next's internal URL", () => {
    expect(sameOrigin(new Request("http://localhost:3018/api/analyses", { headers: { host: "127.0.0.1:3018", origin: "http://127.0.0.1:3018" } }))).toBe(true);
    expect(sameOrigin(new Request("http://localhost/api/analyses", { headers: { host: "app.example.test", origin: "https://app.example.test", "x-forwarded-proto": "https" } }))).toBe(true);
  });
  it("rejects another host, port, protocol and opaque origins", () => {
    for (const origin of ["https://attacker.test", "http://127.0.0.1:4444", "https://127.0.0.1:3018", "null", "http://127.0.0.1:3018/path"]) {
      expect(sameOrigin(new Request("http://localhost:3018/api/analyses", { headers: { host: "127.0.0.1:3018", origin } }))).toBe(false);
    }
  });
});
