import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { getSignedDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Resolve a video's stored media references into playable URLs.
 *
 * Since the R2-privacy change, `videos.audio_url` / `video_url` hold a bare R2
 * object KEY (not a world-readable public URL). This route signs those keys
 * into short-lived download URLs so media is never publicly reachable. External
 * references (YouTube `youtube://…` and any `http(s)://…`) are passed through
 * unchanged — they are public by nature and can't be signed.
 *
 * NOTE (Phase 1): once auth lands, this route must also verify the caller's
 * session owns `videoId` before signing. Today it is service-key + unscoped,
 * matching the rest of the single-user app.
 */
function isExternal(ref: string | null): boolean {
  if (!ref) return false;
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("youtube://")
  );
}

// Sign for 12h (not the 1h default): these URLs are preloaded when a list
// mounts and must still be valid when the user taps play much later in the
// same session. Playback has a re-sign-on-failure fallback for the rare
// expiry, so a long-lived URL just avoids most of those round-trips.
const MEDIA_URL_TTL_SEC = 12 * 60 * 60;

async function resolve(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  if (isExternal(ref)) return ref;
  return getSignedDownloadUrl(ref, MEDIA_URL_TTL_SEC); // ref is an R2 key
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scope by owner so a user can't sign someone else's media by guessing a UUID.
  const { data, error } = await supabaseAdmin()
    .from("videos")
    .select("audio_url, video_url")
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [audioUrl, videoUrl] = await Promise.all([
    resolve(data.audio_url as string | null),
    resolve(data.video_url as string | null),
  ]);

  return NextResponse.json({ audioUrl, videoUrl });
}
