import AnalysisWorkspace from "@/components/AnalysisWorkspace";
import { draftFromParams } from "@/lib/analysis/legacy";

export default async function AnalyzePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <AnalysisWorkspace initialDraft={draftFromParams(params)} analysisId={typeof params.id === "string" ? params.id : undefined} resumeId={typeof params.resume === "string" ? params.resume : undefined} />;
}
