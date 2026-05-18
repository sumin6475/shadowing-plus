import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/pipeline/jobs";
import { getSignedUploadUrl, jobKey } from "@/lib/r2";
import type { MediaType } from "@/lib/types";

interface UploadRequest {
  title: string;
  filename: string;
  contentType: string;
  mediaType: MediaType;
}

function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").trim();
  return trimmed || "upload.bin";
}

export async function POST(req: NextRequest) {
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

  // Create job first so the source_key is well-formed.
  const tempJob = await createJob({
    title: body.title.trim(),
    media_type: body.mediaType,
    source_key: "pending",
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
