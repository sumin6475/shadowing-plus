import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  // localhost에서만 동작
  const host = request.headers.get("host") || "";
  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    return NextResponse.json(
      { error: "Video only available on localhost" },
      { status: 404 },
    );
  }

  const { videoId } = await params;

  // DB에서 로컬 경로 조회
  const { data, error } = await supabase
    .from("videos")
    .select("local_video_path")
    .eq("id", videoId)
    .single();

  if (error || !data?.local_video_path) {
    return NextResponse.json(
      { error: "Video path not found" },
      { status: 404 },
    );
  }

  const filePath = data.local_video_path;

  // 파일 존재 확인
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return NextResponse.json(
      { error: "Video file not found on disk" },
      { status: 404 },
    );
  }

  const fileSize = fileStat.size;
  const range = request.headers.get("range");
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };
  const contentType = mimeTypes[ext] || "video/mp4";

  // Range 요청 처리 (영상 시킹에 필수)
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": contentType,
      },
    });
  }

  // Range 없으면 전체 파일
  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Length": fileSize.toString(),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    },
  });
}
