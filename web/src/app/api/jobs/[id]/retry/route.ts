import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/pipeline/jobs";
import { runPipeline, STAGE_SEQUENCE } from "@/lib/pipeline/orchestrator";
import { getSessionUserId } from "@/lib/supabase-server";
import type { StageName } from "@/lib/types";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await getJob(id);
  if (!job || job.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let stage: StageName;
  try {
    const body = (await req.json()) as { stage?: StageName };
    if (body.stage && STAGE_SEQUENCE.includes(body.stage)) {
      stage = body.stage;
    } else if (job.current_stage && STAGE_SEQUENCE.includes(job.current_stage)) {
      stage = job.current_stage;
    } else if (job.ingestion_mode === "youtube_asr") {
      // A completed worker upload can be resumed from transcription. If the
      // worker never uploaded audio, stage 2 returns a clear, retryable error.
      stage = "transcribe";
    } else {
      stage = "extract";
    }
  } catch {
    stage = job.current_stage && STAGE_SEQUENCE.includes(job.current_stage)
      ? job.current_stage
      : job.ingestion_mode === "youtube_asr"
        ? "transcribe"
        : "extract";
  }

  try {
    await runPipeline(id, stage);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
