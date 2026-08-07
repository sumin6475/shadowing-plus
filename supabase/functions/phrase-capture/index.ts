// Private screenshot OCR + phrase draft. The uploaded image is passed through
// to OpenAI for this request only; this function never stores it.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const KINDS = new Set(["word", "phrasal_verb", "pattern", "idiom", "phrase"]);
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const clean = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
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

  const body = (await req.json().catch(() => null)) as { image_base64?: unknown; mime_type?: unknown } | null;
  const base64 = typeof body?.image_base64 === "string" ? body.image_base64 : "";
  if (!base64 || base64.length > 8_000_000) return json({ error: "Choose a smaller screenshot." }, 400);
  const mime = body?.mime_type === "image/png" ? "image/png" : "image/jpeg";
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "Image capture is not configured." }, 500);

  const openai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Read the visible English learning text in this screenshot. Preserve the wording and line order. " +
            "Choose one short reusable expression or sentence pattern that appears EXACTLY in the extracted text. " +
            "Never invent missing words. Give a short Korean meaning and a brief English usage note. " +
            "If text is unclear, return what is legible and lower confidence. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Return {"context_text":"all legible text","suggested_phrase":"exact substring","kind":"word|phrasal_verb|pattern|idiom|phrase","meaning":"short Korean meaning","usage_note":"brief English nuance","confidence":0.0}.',
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}`, detail: "high" } },
          ],
        },
      ],
    }),
  });
  if (!openai.ok) return json({ error: `Couldn’t read this screenshot (OpenAI ${openai.status}).` }, 502);
  const payload = await openai.json();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return json({ error: "Couldn’t understand the extracted text." }, 502);
  }
  const context = clean(parsed.context_text, 1600);
  let phrase = clean(parsed.suggested_phrase, 240);
  if (phrase && !context.toLocaleLowerCase("en").includes(phrase.toLocaleLowerCase("en"))) phrase = "";
  const rawKind = clean(parsed.kind, 24);
  return json({
    context_text: context,
    suggested_phrase: phrase,
    kind: KINDS.has(rawKind) ? rawKind : "phrase",
    meaning: clean(parsed.meaning, 500),
    usage_note: clean(parsed.usage_note, 500),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
  });
});
