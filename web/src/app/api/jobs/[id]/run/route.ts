import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { getJob } from "@/lib/pipeline/jobs";
import { getSessionUserId } from "@/lib/supabase-server";

export const maxDuration = 300; // Vercel Pro; ignored on Hobby (capped at 60s)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const job = await getJob(id);
    // 404 (not 403) when the job isn't the caller's — don't leak existence.
    if (!job || job.user_id !== userId) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    const isYoutube = job.source_key?.startsWith("youtube://");
    await runPipeline(id, isYoutube ? "translate" : "extract");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
