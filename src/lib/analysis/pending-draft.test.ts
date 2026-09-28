import { describe, expect, it } from "vitest";
import { defaultInputs, newDraft } from "./model";
import { keepPendingDraft, readPendingDraft, removePendingDraft } from "./pending-draft";

describe("explicit sign-in draft handoff", () => {
  it("preserves the exact draft across tabs, expires it, and leaves unrelated browser data alone", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); }, key: (index: number) => Array.from(data.keys())[index] ?? null, get length() { return data.size; } };
    const draft = newDraft(); draft.property.address = "Example"; draft.inputs = defaultInputs(100000, 1400);
    data.set("unrelated", "keep");
    const id = keepPendingDraft(draft, storage, 1000);
    expect(readPendingDraft(id, storage, 2000)).toEqual(draft);
    expect(() => readPendingDraft(id, storage, 1801000)).toThrow("expired");
    const another = keepPendingDraft(draft, storage, 2000);
    removePendingDraft(another, storage);
    expect(data.size).toBe(1);
    expect(data.get("unrelated")).toBe("keep");
  });
});
