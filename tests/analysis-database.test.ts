import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluate, defaultInputs, newDraft } from "../src/lib/analysis/model";
import { saveAnalysis } from "../src/lib/analysis/service";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const ID = "00000000-0000-4000-8000-000000000003";
const draft = { ...newDraft(), property: { ...newDraft().property, address: "Test property" }, inputs: defaultInputs(100000, 1400) };
const snapshot = evaluate(draft);
let db: PGlite;
async function role(name: string, user = A) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`set role ${name}`);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles (id uuid primary key);
    grant all on public.profiles to service_role;
    insert into public.profiles values ('${A}'), ('${B}');`);
  await db.exec(readFileSync(new URL("../supabase/migrations/20260928023816_guided_property_analyses.sql", import.meta.url), "utf8"));
}, 20000);
afterAll(async () => { await db?.close(); });

describe.sequential("analysis persistence in PostgreSQL", () => {
  it("stores server-calculated inputs/results and preserves them on retry", async () => {
    await role("service_role");
    const repository = { async save(id: string, userId: string, data: typeof snapshot) {
      const result = await db.query<{ saved: { id: string; created_at: string; snapshot: typeof snapshot } }>("select public.save_property_analysis($1, $2, $3) as saved", [id, userId, JSON.stringify(data)]);
      return result.rows[0].saved;
    } };
    const first = await saveAnalysis(repository, A, { id: ID, user_id: B, draft, result: { monthlyCashFlow: 999999 } });
    const retry = await saveAnalysis(repository, A, { id: ID, draft });
    expect(retry).toEqual(first);
    expect(first.snapshot).toEqual(snapshot);
    expect((await db.query("select * from public.property_analyses")).rows).toHaveLength(1);
    await expect(saveAnalysis(repository, A, { id: ID, draft: { ...draft, notes: "changed" } })).rejects.toThrow("Snapshot ID already used");
  });
  it("allows owner reads, blocks another account, and prevents caller-controlled computed writes", async () => {
    await role("authenticated", A);
    expect((await db.query("select id from public.property_analyses")).rows).toHaveLength(1);
    await expect(db.query("update public.property_analyses set snapshot = '{}'::jsonb")).rejects.toThrow(/permission denied/);
    await expect(db.query("insert into public.property_analyses(id,user_id,snapshot) values($1,$2,$3)", [crypto.randomUUID(), A, "{}"])).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.save_property_analysis($1,$2,$3)", [ID, A, JSON.stringify(snapshot)])).rejects.toThrow(/permission denied/);
    await role("authenticated", B);
    expect((await db.query("select id from public.property_analyses")).rows).toHaveLength(0);
    expect((await db.query("delete from public.property_analyses where id=$1 returning id", [ID])).rows).toHaveLength(0);
    await role("anon");
    await expect(db.query("select * from public.property_analyses")).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.property_analyses")).rejects.toThrow(/permission denied/);
  });
  it("caps account storage while permitting retries at the cap", async () => {
    await role("service_role");
    await db.query("insert into public.property_analyses(id,user_id,snapshot) select gen_random_uuid(),$1,$2 from generate_series(1,199)", [A, JSON.stringify(snapshot)]);
    await expect(db.query("select public.save_property_analysis($1,$2,$3)", [crypto.randomUUID(), A, JSON.stringify(snapshot)])).rejects.toThrow("Analysis storage limit reached");
    await expect(db.query("select public.save_property_analysis($1,$2,$3)", [ID, A, JSON.stringify(snapshot)])).resolves.toBeDefined();
    await role("authenticated", A);
    expect((await db.query("delete from public.property_analyses where id=$1 returning id", [ID])).rows).toHaveLength(1);
  });
});
