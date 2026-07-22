import { NextRequest } from "next/server";
import { POST as importYoutube } from "@/app/api/youtube/import/route";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

/**
 * Personal-use full-video preparation. It reuses the existing owner-gated
 * YouTube caption import. The extension starts and monitors the resulting job
 * separately so its panel can show real stage progress instead of a spinner.
 */
export async function POST(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { url?: unknown; targetLang?: unknown } | null;
  if (typeof body?.url !== "string") {
    return extensionJson(req, { error: "A YouTube URL is required." }, { status: 400 });
  }
  const videoId = body.url.match(/(?:youtu\.be\/|\/shorts\/|\/live\/|\/embed\/|\/v\/|u\/\w\/|watch\?v=|&v=)([A-Za-z0-9_-]{11})/)?.[1]
    ?? (/^[A-Za-z0-9_-]{11}$/.test(body.url.trim()) ? body.url.trim() : null);
  if (!videoId) return extensionJson(req, { error: "Invalid YouTube URL." }, { status: 400 });

  // Preparation is cached per user + video. A second click never re-pays for
  // the profile/translation work or creates a duplicate clip.
  const { data: cached, error: cachedError } = await supabaseAdmin()
    .from("jobs")
    .select("video_id")
    .eq("user_id", userId)
    .eq("source_key", `youtube://${videoId}`)
    .eq("status", "ready")
    .maybeSingle();
  if (cachedError) return extensionJson(req, { error: cachedError.message }, { status: 500 });
  if (cached?.video_id) return extensionJson(req, { videoId: cached.video_id, cached: true });

  // Call the existing import handler in-process. Its user allowlist, caption
  // normalization, R2 checkpoints, and title handling remain the one source
  // of truth instead of duplicating a fragile caption fetcher.
  const importRequest = new NextRequest(new URL("/api/youtube/import", req.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: req.headers.get("authorization") ?? "",
    },
    body: JSON.stringify({ url: body.url, targetLang: body.targetLang }),
  });
  const imported = await importYoutube(importRequest);
  const importBody = (await imported.json().catch(() => ({}))) as { jobId?: string; error?: string };
  if (!imported.ok || !importBody.jobId) {
    return extensionJson(req, { error: importBody.error ?? "Unable to prepare this video." }, { status: imported.status });
  }

  return extensionJson(req, { jobId: importBody.jobId, cached: false });
}
