import type { AnalysisDraft } from "./model";
import { parseDraft, validId } from "./validation";

const prefix = "analysis-resume:";
const lifetime = 30 * 60 * 1000;
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** An explicit sign-in handoff, including email links opened in another tab. */
export function keepPendingDraft(draft: AnalysisDraft, storage: DraftStorage, now = Date.now()): string {
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try { if (JSON.parse(storage.getItem(key) ?? "{}").expiresAt > now) continue; } catch { /* Discard expired or malformed handoffs. */ }
    storage.removeItem(key);
  }
  const id = crypto.randomUUID();
  storage.setItem(`${prefix}${id}`, JSON.stringify({ draft, expiresAt: now + lifetime }));
  return id;
}

export function readPendingDraft(id: string, storage: DraftStorage, now = Date.now()): AnalysisDraft {
  if (!validId(id)) throw new Error("Invalid draft link.");
  const key = `${prefix}${id}`;
  const value = JSON.parse(storage.getItem(key) ?? "null");
  if (!value || typeof value.expiresAt !== "number" || value.expiresAt <= now) {
    storage.removeItem(key);
    throw new Error("This temporary draft has expired. Open a saved analysis or start a new one.");
  }
  return parseDraft(value.draft);
}

export function removePendingDraft(id: string, storage: DraftStorage) {
  if (validId(id)) storage.removeItem(`${prefix}${id}`);
}
