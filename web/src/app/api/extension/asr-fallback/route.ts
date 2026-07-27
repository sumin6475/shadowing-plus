import { NextRequest } from "next/server";

import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { audioKeyFor, createJob, markAsrAcquiring, setJobFailed } from "@/lib/pipeline/jobs";
import { getSignedUploadUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canImportYoutube } from "@/lib/youtubeImport";
import {
  canonicalYoutubeUrl,
  canonicalYoutubeVideoId,
  dispatchYoutubeAsrWorker,
  newAsrNonce,
  youtubeAsrConfigured,
  youtubeAsrMaxDurationSeconds,
} from "@/lib/youtube-asr";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function POST(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  if (!canImportYoutube(userId)) return extensionJson(req, { error: "Not found" }, { status: 404 });
  if (!youtubeAsrConfigured()) {
    return extensionJson(req, { error: "Private ASR fallback is not configured yet." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    url?: unknown; title?: unknown; durationSeconds?: unknown; confirmed?: unknown;
  } | null;
  if (body?.confirmed !== true) {
    return extensionJson(req, { error: "Confirm ASR generation before starting." }, { status: 400 });
  }
  const videoId = typeof body?.url === "string" ? canonicalYoutubeVideoId(body.url) : null;
  const duration = typeof body?.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
    ? Math.floor(body.durationSeconds) : 0;
  if (!videoId || duration <= 0) return extensionJson(req, { error: "A valid YouTube video and duration are required." }, { status: 400 });
  if (duration > youtubeAsrMaxDurationSeconds()) {
    return extensionJson(req, { error: `This video exceeds the private ASR limit of ${Math.floor(youtubeAsrMaxDurationSeconds() / 60)} minutes.` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const sourceKey = `youtube://${videoId}`;
  const { data: existing, error: existingError } = await db
    .from("jobs")
    .select("id, video_id, status, ingestion_mode")
    .eq("user_id", userId)
    .eq("source_key", sourceKey)
    .in("status", ["ready", "acquiring"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return extensionJson(req, { error: existingError.message }, { status: 500 });
  if (existing?.status === "ready" && existing.video_id) return extensionJson(req, { cached: true, videoId: existing.video_id });
  if (existing?.status === "acquiring") return extensionJson(req, { cached: false, jobId: existing.id });

  const nonce = newAsrNonce();
  const job = await createJob({
    title: typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 300) : "YouTube video",
    media_type: "video",
    source_key: sourceKey,
    user_id: userId,
    ingestion_mode: "youtube_asr",
    asr_nonce: nonce,
  });
  await markAsrAcquiring(job.id);
  try {
    const uploadUrl = await getSignedUploadUrl(audioKeyFor(job), "audio/mpeg", 15 * 60);
    const callbackUrl = new URL("/api/internal/youtube-asr/complete", req.url).toString();
    await dispatchYoutubeAsrWorker({
      jobId: job.id,
      videoId,
      videoUrl: canonicalYoutubeUrl(videoId),
      expectedDurationSeconds: duration,
      uploadUrl,
      callbackUrl,
      issuedAt: Date.now(),
      nonce,
    });
  } catch (error) {
    await setJobFailed(job.id, "acquire", "Private ASR worker could not start. Try again after checking the private worker.");
    return extensionJson(req, { error: error instanceof Error ? error.message : "Unable to start private ASR." }, { status: 502 });
  }
  return extensionJson(req, { cached: false, jobId: job.id });
}
