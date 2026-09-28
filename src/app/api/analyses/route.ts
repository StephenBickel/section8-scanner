import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { saveAnalysis } from "@/lib/analysis/service";
import { parseDraft, validId } from "@/lib/analysis/validation";
import type { SavedAnalysis } from "@/lib/analysis/model";
import { sameOrigin } from "@/lib/security/same-origin";

export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return reply({ error: "Sign in to view saved analyses." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (id && !validId(id)) return reply({ error: "Invalid analysis ID." }, 400);
  let query = db.from("property_analyses").select("id,created_at,snapshot").eq("user_id", user.id);
  if (id) query = query.eq("id", id);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(id ? 1 : 200);
  if (error) return reply({ error: "Saved analyses are unavailable. Please try again later." }, 503);
  if (id && !data?.length) return reply({ error: "Analysis not found in your account." }, 404);
  return reply(id ? data![0] : data ?? []);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return reply({ error: "Sign in to save this analysis." }, 401);

  let body: { id: string; draft: ReturnType<typeof parseDraft> };
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing request body.");
    const decoder = new TextDecoder();
    let raw = "";
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 48000) { await reader.cancel(); return reply({ error: "Analysis is too large." }, 413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const input = JSON.parse(raw);
    if (!validId(input.id)) throw new Error("Invalid snapshot ID.");
    body = { id: input.id, draft: parseDraft(input.draft) };
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Invalid analysis." }, 400);
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return reply({ error: "Account saving is not configured yet. Export your analysis to keep a copy." }, 503);
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let failureStatus = 503;
  let failureMessage = "Could not save your analysis. Your changes are still on this page; please retry.";
  try {
    const saved = await saveAnalysis({
      async save(id, userId, snapshot) {
        const { data, error } = await admin.rpc("save_property_analysis", { p_id: id, p_user_id: userId, p_snapshot: snapshot });
        if (error) {
          if (error.code === "23505") { failureStatus = 409; failureMessage = "This save ID was already used. Make a new snapshot and retry."; }
          if (error.code === "P0001") { failureStatus = 429; failureMessage = "Your account has 200 snapshots. Remove an old snapshot before saving another."; }
          throw new Error("Persistence failed");
        }
        return data as SavedAnalysis;
      },
    }, user.id, body);
    return reply(saved, 201);
  } catch {
    return reply({ error: failureMessage }, failureStatus);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return reply({ error: "Sign in to delete an analysis." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return reply({ error: "Invalid analysis ID." }, 400);
  const { error } = await db.from("property_analyses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return reply({ error: "Could not delete the analysis." }, 503);
  return reply({ deleted: true });
}
