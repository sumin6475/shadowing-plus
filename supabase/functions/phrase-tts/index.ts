// Authenticated, cached pronunciation for one owned Phrase Bank item.
// The OpenAI key and private R2 credentials never reach the mobile bundle.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1";

const MODEL = "gpt-4o-mini-tts";
const VOICE = "marin";
const PROMPT_VERSION = "phrase-pronunciation-v2";
const MEDIA_URL_TTL_SEC = 12 * 60 * 60;
const INSTRUCTIONS =
  "Speak the provided English phrase exactly once in natural contemporary American English at a normal conversational pace. " +
  "Use authentic connected speech, including natural reductions, linking, stress, and rhythm, while keeping every word intelligible. " +
  "Do not slow down for language learners. Do not introduce, explain, spell, repeat, add, or remove words.";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

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

function objectUrl(key: string): string {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET_NAME")!;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
}

async function signKey(key: string): Promise<string> {
  const signed = await awsClient().sign(`${objectUrl(key)}?X-Amz-Expires=${MEDIA_URL_TTL_SEC}`, {
    method: "GET",
    aws: { signQuery: true },
  });
  return signed.url;
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isCached(key: string): Promise<boolean> {
  const response = await awsClient().fetch(objectUrl(key), { method: "HEAD" });
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`R2 cache check failed (${response.status})`);
}

async function generateAndCache(key: string, text: string, apiKey: string): Promise<void> {
  const openai = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
    }),
  });
  if (!openai.ok) {
    console.error("OpenAI phrase TTS failed", openai.status, await openai.text());
    throw new Error(`OpenAI speech failed (${openai.status})`);
  }

  const audio = await openai.arrayBuffer();
  if (!audio.byteLength) throw new Error("OpenAI speech returned empty audio");
  const stored = await awsClient().fetch(objectUrl(key), {
    method: "PUT",
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
    body: audio,
  });
  if (!stored.ok) throw new Error(`R2 cache write failed (${stored.status})`);
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as { phrase_id?: unknown } | null;
  const phraseId = typeof body?.phrase_id === "string" ? body.phrase_id.trim() : "";
  if (!phraseId || phraseId.length > 80) return json({ error: "Missing phrase id" }, 400);

  // RLS proves ownership; callers cannot synthesize arbitrary text or another
  // learner's phrase by supplying text in the request.
  const { data: phrase, error: phraseError } = await supabase
    .from("phrase_items")
    .select("text")
    .eq("id", phraseId)
    .eq("status", "ready")
    .maybeSingle();
  if (phraseError) return json({ error: "Couldn’t load this phrase." }, 500);
  const text = typeof phrase?.text === "string" ? phrase.text.replace(/\s+/g, " ").trim().slice(0, 240) : "";
  if (!text) return json({ error: "Phrase not found" }, 404);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "AI voice is not configured." }, 500);
  if (!Deno.env.get("R2_ACCOUNT_ID") || !Deno.env.get("R2_ACCESS_KEY_ID") || !Deno.env.get("R2_SECRET_ACCESS_KEY") || !Deno.env.get("R2_BUCKET_NAME")) {
    return json({ error: "Audio cache is not configured." }, 500);
  }

  try {
    const fingerprint = await hash(`${PROMPT_VERSION}\n${MODEL}\n${VOICE}\n${text}`);
    const key = `phrase-tts/${PROMPT_VERSION}/${user.id}/${fingerprint}.mp3`;
    const cached = await isCached(key);
    if (!cached) await generateAndCache(key, text, apiKey);
    return json({ audio_url: await signKey(key), cached, voice: VOICE, model: MODEL });
  } catch (error) {
    console.error("Phrase TTS failed", error);
    return json({ error: "Couldn’t create this voice right now." }, 502);
  }
});
