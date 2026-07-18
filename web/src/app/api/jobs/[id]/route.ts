import { NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/pipeline/jobs";
import { deleteKey, jobKey } from "@/lib/r2";
import { getSessionUserId } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await getJob(id);
  if (!job || job.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await getJob(id);
  if (!job || job.user_id !== userId) {
    // Idempotent: nothing the caller owns to delete.
    return NextResponse.json({ ok: true });
  }
  // Best-effort R2 cleanup. Ignore individual failures.
  const keys = [
    job.source_key,
    jobKey(id, "audio.mp3"),
    jobKey(id, "raw_transcript.json"),
    jobKey(id, "segments.json"),
    jobKey(id, "segments_translated.json"),
  ];
  await Promise.allSettled(keys.map((k) => deleteKey(k)));
  await deleteJob(id);
  return NextResponse.json({ ok: true });
}
