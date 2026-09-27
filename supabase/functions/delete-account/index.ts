// Delete the caller's own account (App Store 5.1.1(v) in-app deletion).
//
// Flow: verify the caller's JWT with the anon client → best-effort cleanup of
// derived blobs (avatars bucket, R2 phrase-TTS cache) → service-role
// auth.admin.deleteUser(). Every user table references auth.users(id) ON
// DELETE CASCADE (migrations 008/013/014/016/019/020/022/023), so the single
// admin delete removes all rows. Blob cleanup failures are logged but never
// block the deletion — the account must always come out deleted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

// ── R2 phrase-TTS cache cleanup (mirrors phrase-tts key layout:
//    phrase-tts/{promptVersion}/{userId}/{fingerprint}.mp3) ──
function r2Configured(): boolean {
  return Boolean(
    Deno.env.get("R2_ACCESS_KEY_ID") &&
      Deno.env.get("R2_SECRET_ACCESS_KEY") &&
      Deno.env.get("R2_ACCOUNT_ID") &&
      Deno.env.get("R2_BUCKET_NAME"),
  );
}

function awsClient(): AwsClient {
  return new AwsClient({
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
    region: "auto",
    service: "s3",
  });
}

function bucketUrl(query: string): string {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET_NAME")!;
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}?${query}`;
}

function objectUrl(key: string): string {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET_NAME")!;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
}

async function listXml(aws: AwsClient, query: string): Promise<string> {
  const response = await aws.fetch(bucketUrl(query), { method: "GET" });
  if (!response.ok) throw new Error(`R2 list failed (${response.status})`);
  return await response.text();
}

/** Delete every phrase-tts object for the user across all prompt versions. */
async function deleteTtsCache(userId: string): Promise<void> {
  if (!r2Configured()) return;
  const aws = awsClient();

  // Prompt versions live one level under phrase-tts/ — discover them so a
  // version bump never orphans a user's audio.
  const versionsXml = await listXml(aws, "list-type=2&delimiter=%2F&prefix=phrase-tts%2F");
  const versionPrefixes = [...versionsXml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g)]
    .map((m) => m[1])
    .filter((p) => p !== "phrase-tts/");

  for (const versionPrefix of versionPrefixes) {
    const prefix = `${versionPrefix}${userId}/`;
    // One page (max 1000) is far beyond any real per-user cache size.
    const xml = await listXml(aws, `list-type=2&prefix=${encodeURIComponent(prefix)}`);
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    for (const key of keys) {
      const res = await aws.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status}) for ${key}`);
    }
  }
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await anon.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Best-effort blob cleanup. Never blocks the account deletion itself.
  try {
    const { data: files, error } = await admin.storage.from("avatars").list(user.id);
    if (error) throw new Error(error.message);
    if (files?.length) {
      const { error: removeError } = await admin.storage
        .from("avatars")
        .remove(files.map((f) => `${user.id}/${f.name}`));
      if (removeError) throw new Error(removeError.message);
    }
  } catch (e) {
    console.error("avatar cleanup failed for", user.id, e);
  }
  try {
    await deleteTtsCache(user.id);
  } catch (e) {
    console.error("tts cache cleanup failed for", user.id, e);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("account deletion failed for", user.id, deleteError);
    return json({ error: "We couldn’t delete your account. Please try again." }, 500);
  }

  return json({ ok: true });
});
