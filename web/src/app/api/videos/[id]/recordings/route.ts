import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { getSignedDownloadUrl, getSignedUploadUrl } from "@/lib/r2";
import {
  RECORDING_MAX_BYTES,
  RECORDING_MAX_DURATION_SEC,
  RECORDING_MAX_PER_VIDEO,
  isUuid,
  normalizeRecordingMime,
  recordingR2Key,
} from "@/lib/recordings";

export const dynamic = "force-dynamic";

const DOWNLOAD_TTL_SEC = 12 * 60 * 60;

type RecordingRow = {
  id: string;
  duration_seconds: number | string;
  bytes: number;
  content_type: string;
  created_at: string;
  r2_key: string;
};

function migrationHint(message: string): boolean {
  return /practice_recordings|schema cache|does not exist/i.test(message);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await params;
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(videoId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = supabaseAdmin();
  const { data: video } = await db
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("practice_recordings")
    .select("id, duration_seconds, bytes, content_type, created_at, r2_key")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .order("created_at", { ascending: false });

  if (error) {
    const hint = migrationHint(error.message)
      ? " Apply supabase/migrations/021_practice_recordings.sql."
      : "";
    return NextResponse.json(
      { error: `Couldn't load recordings.${hint}` },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as RecordingRow[];
  const recordings = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      duration_seconds: Number(row.duration_seconds),
      bytes: row.bytes,
      content_type: row.content_type,
      created_at: row.created_at,
      url: await getSignedDownloadUrl(row.r2_key, DOWNLOAD_TTL_SEC),
    })),
  );

  return NextResponse.json({ recordings });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: videoId } = await params;
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(videoId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    contentType?: unknown;
    durationSeconds?: unknown;
    bytes?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentType =
    typeof body.contentType === "string"
      ? normalizeRecordingMime(body.contentType)
      : null;
  const durationSeconds = Number(body.durationSeconds);
  const bytes = Number(body.bytes);
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported audio type." }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
  }
  if (durationSeconds > RECORDING_MAX_DURATION_SEC) {
    return NextResponse.json(
      { error: "Recordings can be at most 45 minutes." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > RECORDING_MAX_BYTES) {
    return NextResponse.json(
      { error: "That recording is too large to save." },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();
  const { data: video } = await db
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count, error: countError } = await db
    .from("practice_recordings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("video_id", videoId);
  if (countError) {
    const hint = migrationHint(countError.message)
      ? " Apply supabase/migrations/021_practice_recordings.sql."
      : "";
    return NextResponse.json(
      { error: `Couldn't save the recording.${hint}` },
      { status: 500 },
    );
  }
  if ((count ?? 0) >= RECORDING_MAX_PER_VIDEO) {
    return NextResponse.json(
      { error: "Delete a take before recording another." },
      { status: 400 },
    );
  }

  const recordingId = crypto.randomUUID();
  const r2Key = recordingR2Key(userId, videoId, recordingId, contentType);
  const { data: inserted, error } = await db
    .from("practice_recordings")
    .insert({
      id: recordingId,
      user_id: userId,
      video_id: videoId,
      r2_key: r2Key,
      content_type: contentType,
      duration_seconds: Math.round(durationSeconds * 100) / 100,
      bytes: Math.round(bytes),
    })
    .select("id, duration_seconds, bytes, content_type, created_at")
    .single();
  if (error || !inserted) {
    const hint = error && migrationHint(error.message)
      ? " Apply supabase/migrations/021_practice_recordings.sql."
      : "";
    return NextResponse.json(
      { error: `${error?.message ?? "Insert failed."}${hint}` },
      { status: 500 },
    );
  }

  const uploadUrl = await getSignedUploadUrl(r2Key, contentType, 3600);
  return NextResponse.json({
    recording: inserted,
    uploadUrl,
  });
}
