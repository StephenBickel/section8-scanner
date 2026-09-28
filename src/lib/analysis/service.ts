import { evaluate, type AnalysisSnapshot, type SavedAnalysis } from "./model";
import { parseDraft, validId } from "./validation";

export interface AnalysisRepository {
  save(id: string, userId: string, snapshot: AnalysisSnapshot): Promise<SavedAnalysis>;
}

/** Callers supply an authenticated identity, never one taken from model/body input. */
export async function saveAnalysis(repository: AnalysisRepository, userId: string, input: unknown): Promise<SavedAnalysis> {
  if (!validId(userId)) throw new Error("An authenticated account is required.");
  if (!input || typeof input !== "object") throw new Error("Invalid save request.");
  const body = input as Record<string, unknown>;
  if (!validId(body.id)) throw new Error("Invalid snapshot ID.");
  // Outputs are calculated here; client-supplied results are never trusted.
  const snapshot = evaluate(parseDraft(body.draft));
  return repository.save(body.id, userId, snapshot);
}
