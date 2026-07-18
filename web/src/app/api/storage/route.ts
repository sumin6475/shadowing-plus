import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { headSize } from "@/lib/r2";

// audio_url / video_url now hold a bare R2 object key (post R2-privacy change),
// except for external refs (YouTube), which we skip since they have no R2
// footprint. A bare key is anything without an URL scheme.
function r2KeyOrNull(ref: string | null): string | null {
  if (!ref) return null;
  if (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("youtube://")
  ) {
    return null;
  }
  return ref;
}

// R2 is the only source of truth for file sizes (no size column in the DB),
// so this is measured live. The clip count is tiny today; if the library
// grows large, cache this (e.g. a size column populated at persist time).
export const dynamic = "force-dynamic";

interface VideoRow {
  id: string;
  audio_url: string;
  video_url: string | null;
}

/**
 * Per-video R2 footprint in bytes, keyed by video id. A video clip stores its
 * original upload (video_url) plus the extracted audio.mp3 (audio_url); an
 * audio clip stores only the upload (audio_url). We HEAD whichever keys exist
 * and sum their ContentLength.
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin()
    .from("videos")
    .select("id, audio_url, video_url")
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const videos = (data ?? []) as VideoRow[];

  const entries = await Promise.all(
    videos.map(async (v) => {
      const keys = [v.audio_url, v.video_url]
        .map(r2KeyOrNull)
        .filter((k): k is string => Boolean(k));
      const sizes = await Promise.all(keys.map(headSize));
      const total = sizes.reduce((a, b) => a + b, 0);
      return [v.id, total] as const;
    }),
  );

  const sizes: Record<string, number> = {};
  for (const [id, bytes] of entries) sizes[id] = bytes;

  return NextResponse.json({ sizes });
}
