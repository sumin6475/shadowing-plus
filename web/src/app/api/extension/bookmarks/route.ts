import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type BookmarkInput = {
  youtubeId?: unknown;
  title?: unknown;
  text?: unknown;
  translation?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function POST(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as BookmarkInput | null;
  const youtubeId = typeof body?.youtubeId === "string" ? body.youtubeId : "";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 300) : "YouTube video";
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1_200) : "";
  const translation = typeof body?.translation === "string" ? body.translation.trim().slice(0, 1_500) : null;
  const startTime = typeof body?.startTime === "number" && Number.isFinite(body.startTime) ? body.startTime : 0;
  const endTime = typeof body?.endTime === "number" && Number.isFinite(body.endTime) && body.endTime > startTime ? body.endTime : startTime + 3;
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId) || !text) {
    return extensionJson(req, { error: "Invalid YouTube sentence." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const source = `youtube://${youtubeId}`;
  const { data: existingVideo, error: videoError } = await db
    .from("videos")
    .select("id")
    .eq("user_id", userId)
    .eq("audio_url", source)
    .maybeSingle();
  if (videoError) return extensionJson(req, { error: videoError.message }, { status: 500 });
  let video = existingVideo;
  if (!video) {
    const created = await db
      .from("videos")
      .insert({ title, duration: null, audio_url: source, video_url: `https://www.youtube.com/watch?v=${youtubeId}`, media_type: "video", user_id: userId })
      .select("id")
      .single();
    if (created.error) return extensionJson(req, { error: created.error.message }, { status: 500 });
    video = created.data;
  }

  const existing = await db
    .from("segments")
    .select("id")
    .eq("video_id", video.id)
    .eq("text", text)
    .eq("start_time", startTime)
    .maybeSingle();
  if (existing.error) return extensionJson(req, { error: existing.error.message }, { status: 500 });

  let segmentId = existing.data?.id;
  if (!segmentId) {
    const { count } = await db.from("segments").select("id", { count: "exact", head: true }).eq("video_id", video.id);
    const created = await db
      .from("segments")
      .insert({ video_id: video.id, index: count ?? 0, start_time: startTime, end_time: endTime, text, translation, words: null })
      .select("id")
      .single();
    if (created.error) return extensionJson(req, { error: created.error.message }, { status: 500 });
    segmentId = created.data.id;
  }

  const previous = await db.from("bookmarks").select("id").eq("segment_id", segmentId).eq("user_id", userId).maybeSingle();
  if (previous.error) return extensionJson(req, { error: previous.error.message }, { status: 500 });
  if (previous.data) return extensionJson(req, { bookmarkId: previous.data.id, alreadySaved: true });
  const saved = await db.from("bookmarks").insert({ segment_id: segmentId, user_id: userId }).select("id").single();
  if (saved.error) return extensionJson(req, { error: saved.error.message }, { status: 500 });
  return extensionJson(req, { bookmarkId: saved.data.id, alreadySaved: false });
}
