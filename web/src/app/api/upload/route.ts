import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/pipeline/jobs";
import {
  AUDIO_LANGUAGE,
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
  // Per-clip translation language (migration 011). Audio is always English.
  // Optional — omitted uploads accept the DB default (Korean). Validated
  // against the option list so a client can't inject an arbitrary target.
  sourceLang?: string;
  targetLang?: string;
}

const TARGET_NAMES = new Set<string>(TRANSLATION_LANGUAGE_OPTIONS);

function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").trim();
  return trimmed || "upload.bin";
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
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

  // Audio is always English. Ignore a stale client sourceLang (older settings
  // stored spa/fra/etc.). Translation target is user-selectable.
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
    source_lang: AUDIO_LANGUAGE.code,
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
