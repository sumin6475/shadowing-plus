// Clip media URL resolver — Supabase Edge Function (Deno). MOBILE-ONLY.
//
// Same job as web/src/app/api/media/[videoId] (which the native app can't reach
// — see the Vercel "Protocol error" postmortem): look up a video's stored R2
// object keys (owner-scoped via RLS) and sign them into short-lived download
// URLs. External refs (http(s)://, youtube://) pass through. The audio itself
// streams straight from R2 (*.r2.cloudflarestorage.com), so only this signing
// hop moves to Supabase; playback never touches Vercel.
//
// Secrets (supabase secrets set, SEPARATE from Vercel env): R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME. SUPABASE_URL /
// SUPABASE_ANON_KEY are auto-injected. verify_jwt gates unauthenticated calls.

import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1";

// 12h like the web route: URLs are preloaded on list mount and must still be
// valid when the user taps play later in the session.
const MEDIA_URL_TTL_SEC = 12 * 60 * 60;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function isExternal(ref: string | null): boolean {
  if (!ref) return false;
  return ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("youtube://");
}

let cachedAws: AwsClient | null = null;
function awsClient(): AwsClient {
  if (!cachedAws) {
    cachedAws = new AwsClient({
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
      region: "auto",
      service: "s3",
    });
  }
  return cachedAws;
}

/** Presign a GET for one R2 object key (query-signed, no auth header needed). */
async function signKey(key: string): Promise<string> {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET_NAME")!;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}?X-Amz-Expires=${MEDIA_URL_TTL_SEC}`;
  const signed = await awsClient().sign(url, { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

async function resolve(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  if (isExternal(ref)) return ref; // public by nature; can't/needn't sign
  return signKey(ref); // ref is a private R2 key
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as { videoId?: unknown } | null;
  const videoId = typeof body?.videoId === "string" ? body.videoId : "";
  if (!videoId) return json({ error: "Missing videoId" }, 400);

  // RLS (videos owner policy) scopes this to the caller — a non-owned or absent
  // id simply returns no row, so we never sign someone else's media.
  const { data, error } = await supabase
    .from("videos")
    .select("audio_url, video_url")
    .eq("id", videoId)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);

  const [audioUrl, videoUrl] = await Promise.all([
    resolve((data as { audio_url: string | null }).audio_url),
    resolve((data as { video_url: string | null }).video_url),
  ]);
  return json({ audioUrl, videoUrl });
});
