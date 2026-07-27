import { NextRequest, NextResponse } from "next/server";

import { audioKeyFor, consumeAsrNonce, getJob } from "@/lib/pipeline/jobs";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { exists } from "@/lib/r2";
import { verifyYoutubeAsrSignature } from "@/lib/youtube-asr";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyYoutubeAsrSignature(rawBody, req.headers.get("x-shadowing-asr-timestamp"), req.headers.get("x-shadowing-asr-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { jobId?: unknown; nonce?: unknown };
  try { body = JSON.parse(rawBody) as { jobId?: unknown; nonce?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid callback." }, { status: 400 }); }
  if (typeof body.jobId !== "string" || typeof body.nonce !== "string") {
    return NextResponse.json({ error: "Invalid callback." }, { status: 400 });
  }
  const job = await getJob(body.jobId);
  if (!job || job.ingestion_mode !== "youtube_asr" || !await exists(audioKeyFor(job))) {
    return NextResponse.json({ error: "Audio upload is missing." }, { status: 409 });
  }
  const accepted = await consumeAsrNonce(body.jobId, body.nonce);
  if (!accepted) return NextResponse.json({ error: "Callback was already used or expired." }, { status: 409 });
  try {
    await runPipeline(body.jobId, "transcribe");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ASR pipeline failed." }, { status: 502 });
  }
}
