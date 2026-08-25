// Embed one or more owned Phrase Bank rows. MOBILE-ONLY.
// The OpenAI key never reaches the app. Callers send ids only; RLS decides
// which rows exist. learner_note is personal memo and is not embedded.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const MAX_BATCH = 40;
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
};

const clamp = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

const asId = (value: unknown) => {
  const id = clamp(value, 80);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
};

function embedInput(row: {
  text: string;
  meaning_ko: string | null;
  usage_note: string | null;
}) {
  const text = clamp(row.text, 240);
  const meaning = clamp(row.meaning_ko, 500);
  const note = clamp(row.usage_note, 500);
  return [
    `Phrase: ${text}`,
    meaning ? `Meaning: ${meaning}` : "",
    note ? `How used: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as {
    phrase_id?: unknown;
    phrase_ids?: unknown;
  } | null;
  const requested = [
    asId(body?.phrase_id),
    ...(Array.isArray(body?.phrase_ids) ? body.phrase_ids.map(asId) : []),
  ].filter(Boolean);
  const ids = [...new Set(requested)].slice(0, MAX_BATCH);
  if (!ids.length) return json({ error: "Missing phrase id" }, 400);

  const { data: rows, error: loadError } = await supabase
    .from("phrase_items")
    .select("id, text, meaning_ko, usage_note")
    .eq("status", "ready")
    .in("id", ids);
  if (loadError) return json({ error: "Couldn’t load these phrases." }, 500);
  const phrases = (rows ?? []).filter((row) => clamp(row.text, 240));
  if (!phrases.length) return json({ error: "Phrase not found" }, 404);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const openaiRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: phrases.map(embedInput),
    }),
  });
  if (!openaiRes.ok)
    return json(
      { error: `Couldn’t embed these phrases (OpenAI ${openaiRes.status}).` },
      502,
    );
  const payload = (await openaiRes.json()) as {
    data?: { embedding?: unknown; index?: number }[];
  };
  const vectors = new Map<number, number[]>();
  for (const item of payload.data ?? []) {
    const embedding = Array.isArray(item.embedding) ? item.embedding : [];
    if (typeof item.index === "number" && embedding.length === EMBEDDING_DIMS) {
      vectors.set(item.index, embedding);
    }
  }
  if (vectors.size !== phrases.length)
    return json({ error: "Couldn’t validate the embeddings." }, 502);

  const embedded: string[] = [];
  for (const [index, phrase] of phrases.entries()) {
    const embedding = vectors.get(index);
    if (!embedding) continue;
    const { error: writeError } = await supabase
      .from("phrase_items")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", phrase.id);
    if (writeError) return json({ error: "Couldn’t save the embedding." }, 500);
    embedded.push(phrase.id as string);
  }

  return json({ embedded: embedded.length, ids: embedded });
});
