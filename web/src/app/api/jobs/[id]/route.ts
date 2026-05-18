import { NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/pipeline/jobs";
import { deleteKey, jobKey } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
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
