import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { deleteKey, jobKey } from "@/lib/r2";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  // Confirm ownership before touching anything. 404 (not 403) to avoid leaking
  // that a video with this id exists for another user.
  const { data: video } = await db
    .from("videos")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!video) {
    return NextResponse.json({ ok: true });
  }

  // Find associated job (if any) for R2 cleanup
  const { data: jobs } = await db
    .from("jobs")
    .select("id, source_key")
    .eq("video_id", id)
    .eq("user_id", userId);

  // Cascade delete: segments + bookmarks via FK ON DELETE CASCADE
  const { error } = await db
    .from("videos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort R2 cleanup for every job that produced this video
  if (jobs && jobs.length > 0) {
    const keys: string[] = [];
    for (const j of jobs) {
      keys.push(
        j.source_key,
        jobKey(j.id, "audio.mp3"),
        jobKey(j.id, "raw_transcript.json"),
        jobKey(j.id, "segments.json"),
        jobKey(j.id, "segments_translated.json"),
      );
    }
    await Promise.allSettled(keys.map((k) => deleteKey(k)));
    await db.from("jobs").delete().eq("video_id", id);
  }

  return NextResponse.json({ ok: true });
}
