import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/pipeline/jobs";
import {
  AUDIO_LANGUAGE_OPTIONS,
  TRANSLATION_LANGUAGE_OPTIONS,
} from "@/lib/pipeline/languages";
import { checkClipQuota } from "@/lib/quota";
import { getSignedUploadUrl, jobKey } from "@/lib/r2";
import { getSessionUserId } from "@/lib/supabase-server";
import type { MediaType } from "@/lib/types";

interface UploadRequest {
  title: string;
  filename: string;
  contentType: string;
  mediaType: MediaType;
  // Per-clip language pair (migration 011). Optional — omitted uploads accept
  // the DB default (eng → Korean). Validated against the option lists below so
  // a client can't inject an arbitrary language code into the pipeline.
  sourceLang?: string;
  targetLang?: string;
}

const AUDIO_CODES = new Set<string>(AUDIO_LANGUAGE_OPTIONS.map((o) => o.code));
const TARGET_NAMES = new Set<string>(TRANSLATION_LANGUAGE_OPTIONS);

function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").trim();
  return trimmed || "upload.bin";
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cost guardrail: cap clips per account before any job (= paid pipeline run)
  // is created. Owners are exempt. See lib/quota.ts.
  const quota = await checkClipQuota(userId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `You've reached the beta limit of ${quota.limit} clips. Delete one to add another.`,
        code: "clip_limit",
        count: quota.count,
        limit: quota.limit,
      },
      { status: 429 },
    );
  }

  let body: UploadRequest;
  try {
    body = (await req.json()) as UploadRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title || !body.filename || !body.contentType || !body.mediaType) {
    return NextResponse.json(
      { error: "Missing required fields: title, filename, contentType, mediaType" },
      { status: 400 },
    );
  }
  if (body.mediaType !== "video" && body.mediaType !== "audio") {
    return NextResponse.json(
      { error: "mediaType must be 'video' or 'audio'" },
      { status: 400 },
    );
  }

  const filename = safeFilename(body.filename);

  // Accept the language pair only if it's a known option; otherwise leave it
  // unset so the DB default (eng → Korean) applies.
  const sourceLang =
    body.sourceLang && AUDIO_CODES.has(body.sourceLang)
      ? body.sourceLang
      : undefined;
  const targetLang =
    body.targetLang && TARGET_NAMES.has(body.targetLang)
      ? body.targetLang
      : undefined;

  // Create job first so the source_key is well-formed.
  const tempJob = await createJob({
    title: body.title.trim(),
    media_type: body.mediaType,
    source_key: "pending",
    user_id: userId,
    source_lang: sourceLang,
    target_lang: targetLang,
  });
  const sourceKey = jobKey(tempJob.id, `source-${filename}`);

  // Set the real source_key now that we have the job id.
  const { error } = await (await import("@/lib/supabase-admin"))
    .supabaseAdmin()
    .from("jobs")
    .update({ source_key: sourceKey })
    .eq("id", tempJob.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uploadUrl = await getSignedUploadUrl(sourceKey, body.contentType, 3600);

  return NextResponse.json({
    jobId: tempJob.id,
    sourceKey,
    uploadUrl,
  });
}
