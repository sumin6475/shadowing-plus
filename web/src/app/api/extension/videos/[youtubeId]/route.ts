import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

/** Load a previously prepared YouTube clip and its cached contextual translations. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ youtubeId: string }> },
) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const { youtubeId } = await params;
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    return extensionJson(req, { error: "Invalid YouTube video." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("video_id")
    .eq("user_id", userId)
    .eq("source_key", `youtube://${youtubeId}`)
    .eq("status", "ready")
    .maybeSingle();
  if (jobError) return extensionJson(req, { error: jobError.message }, { status: 500 });
  if (!job?.video_id) return extensionJson(req, { prepared: false });
  const { data: video, error: videoError } = await db.from("videos").select("id, title").eq("id", job.video_id).maybeSingle();
  if (videoError) return extensionJson(req, { error: videoError.message }, { status: 500 });
  if (!video) return extensionJson(req, { prepared: false });

  const { data: segments, error: segmentError } = await db
    .from("segments")
    .select("id, index, start_time, end_time, text, translation")
    .eq("video_id", video.id)
    .order("index");
  if (segmentError) return extensionJson(req, { error: segmentError.message }, { status: 500 });
  const ids = (segments ?? []).map((segment) => segment.id as string);
  const { data: bookmarks, error: bookmarkError } = ids.length
    ? await db.from("bookmarks").select("segment_id").eq("user_id", userId).in("segment_id", ids)
    : { data: [], error: null };
  if (bookmarkError) return extensionJson(req, { error: bookmarkError.message }, { status: 500 });
  const savedIds = new Set((bookmarks ?? []).map((bookmark) => bookmark.segment_id));
  return extensionJson(req, {
    prepared: true,
    videoId: video.id,
    title: video.title,
    segments: (segments ?? []).map((segment) => ({ ...segment, saved: savedIds.has(segment.id) })),
  });
}
