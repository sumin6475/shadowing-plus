import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { getJob } from "@/lib/pipeline/jobs";
import { runPipeline } from "@/lib/pipeline/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function OPTIONS(req: NextRequest) { return new Response(null, { status: 204, headers: extensionCors(req) }); }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getExtensionUserId(req); const { id } = await params;
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const job = await getJob(id);
  if (!job || job.user_id !== userId) return extensionJson(req, { error: "Not found" }, { status: 404 });
  return extensionJson(req, { id: job.id, status: job.status, stage: job.current_stage, progress: job.progress, error: job.error, videoId: job.video_id });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getExtensionUserId(req); const { id } = await params;
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const job = await getJob(id);
  if (!job || job.user_id !== userId) return extensionJson(req, { error: "Not found" }, { status: 404 });
  try { await runPipeline(id, "translate"); return extensionJson(req, { ok: true }); }
  catch (error) { return extensionJson(req, { error: error instanceof Error ? error.message : "Preparation failed." }, { status: 502 }); }
}
