import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("database authorization", () => {
  it("scopes seller contacts to their owner", () => {
    const schema = read("schema_phase2.sql");
    const route = read("src/app/api/outreach/contacts/route.ts");

    expect(schema).toMatch(/seller_contacts[\s\S]*user_id UUID NOT NULL REFERENCES profiles\(id\)/);
    expect(schema).toMatch(/seller_contacts_all[\s\S]*auth\.uid\(\) = user_id/);
    expect(schema).not.toMatch(/seller_contacts_select[\s\S]*USING \(true\)/);
    expect(route).toContain('.eq("user_id", user.id)');
    expect(route).toMatch(/\.insert\(\{[\s\S]*user_id: user\.id/);
    expect(route).not.toContain('.select("*")');
  });

  it("limits authenticated profile updates to display fields", () => {
    const schema = read("schema.sql");

    expect(schema).toMatch(/REVOKE UPDATE ON TABLE profiles FROM authenticated/i);
    expect(schema).toMatch(/GRANT UPDATE \(full_name, updated_at\) ON TABLE profiles TO authenticated/i);
    expect(schema).toMatch(/profiles_update[\s\S]*WITH CHECK \(auth\.uid\(\) = id\)/);
  });
});

describe("scanner execution boundary", () => {
  it("authenticates non-demo scans and never returns raw subprocess errors", () => {
    const route = read("src/app/api/scan/route.ts");

    expect(route).toContain("parseScanRequest");
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain("SCANNER_API_KEY");
    expect(route).not.toMatch(/message:\s*err\.message/);
    expect(route).not.toMatch(/message:\s*msg/);
  });

  it("protects and bounds the FastAPI scanner", () => {
    const server = read("api_server.py");

    expect(server).toContain("compare_digest");
    expect(server).toContain("SCANNER_API_KEY");
    expect(server).toMatch(/maxPrice: int = Query\(100000, ge=1, le=5000000\)/);
    expect(server).toMatch(/maxPages: int = Query\(3, ge=1, le=10\)/);
    expect(server).toContain("asyncio.Semaphore");
    expect(server).not.toContain('allow_origins=["*"]');
  });
});

describe("public repository hygiene", () => {
  it("contains no committed JWTs or project-specific Supabase reference", () => {
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: root, encoding: "utf8" }
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const text = files
      .filter((file) => !file.endsWith(".pyc"))
      .map((file) => {
        try { return read(file); } catch { return ""; }
      })
      .join("\n");

    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
    expect(text).not.toContain("heocvgxh" + "gmludycstedj");
  });

  it("ships portable configuration and excludes generated Python files", () => {
    const ignore = read(".gitignore");
    const tunnel = read("scripts/start-tunnel.sh");
    const tracked = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: root, encoding: "utf8" }
    );

    expect(read(".env.example")).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(ignore).toContain("!.env.example");
    expect(ignore).toContain("__pycache__/");
    expect(tunnel).not.toContain(".zshrc");
    expect(tunnel).not.toMatch(/prj_[A-Za-z0-9]+/);
    expect(tracked).not.toMatch(/\.pyc$/m);
  });
});
