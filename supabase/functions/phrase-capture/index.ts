// Private photo OCR or learner-triggered text drafting. Uploaded images and
// supplied context are passed through for this request only and never stored.
//
// The gloss and the context translation come back in the LEARNER'S language,
// not Korean. The app is N:1 (many first languages : one target, English), so
// the client sends `first_language` — the server cannot look it up, because L1
// lives on the device, not in a column.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const KINDS = new Set(["word", "phrasal_verb", "pattern", "idiom", "phrase"]);
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

const clean = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

/** Learner first languages the app offers (mirror of src/lib/first-language.ts).
 *  Keys are lowercased because the lookup lowercases: the client sends the L1
 *  code verbatim and one of them is script-tagged (`zh-Hant`), so a
 *  case-sensitive map would miss it and silently gloss in the fallback
 *  language. */
const L1_NAMES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  "zh-hant": "Traditional Chinese (as written in Taiwan)",
  ja: "Japanese",
  es: "Spanish",
  ru: "Russian",
};

/** Back-compat: builds shipped before 2026-09 send no `first_language`, and
 *  every one of those users is Korean. Drop this default once they age out. */
const DEFAULT_L1 = "ko";

function learnerLanguage(value: unknown): string {
  const code = typeof value === "string" ? value.trim().toLowerCase() : "";
  return L1_NAMES[code] ?? L1_NAMES[DEFAULT_L1];
}

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

  const body = (await req.json().catch(() => null)) as { image_base64?: unknown; mime_type?: unknown; context_text?: unknown; phrase_text?: unknown; first_language?: unknown } | null;
  const lang = learnerLanguage(body?.first_language);
  const base64 = typeof body?.image_base64 === "string" ? body.image_base64 : "";
  const suppliedContext = clean(body?.context_text, 1600);
  const suppliedPhrase = clean(body?.phrase_text, 240);
  if (!base64 && !suppliedContext && !suppliedPhrase) return json({ error: "Add a phrase, some text, or a photo first." }, 400);
  if (base64.length > 8_000_000) return json({ error: "Choose a smaller photo." }, 400);
  const mime = body?.mime_type === "image/png" ? "image/png" : "image/jpeg";
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "Phrase capture is not configured." }, 500);

  const openai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: base64
        ? [
            {
              role: "system",
              content:
                "Read the visible English learning text in this photo. Preserve the wording and line order. " +
                "Choose one short reusable expression or sentence pattern that appears EXACTLY in the extracted text. " +
                `Never invent missing words. Give a short ${lang} meaning and a brief English usage note. ` +
                `Translate the complete extracted context naturally into ${lang} without omitting clauses. ` +
                "If text is unclear, return what is legible and lower confidence. Return JSON only.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Return {"context_text":"all legible text","context_translation":"natural ${lang} translation of all context_text","suggested_phrase":"exact substring","kind":"word|phrasal_verb|pattern|idiom|phrase","meaning":"short ${lang} meaning","usage_note":"brief English nuance","confidence":0.0}.`,
                },
                { type: "image_url", image_url: { url: `data:${mime};base64,${base64}`, detail: "high" } },
              ],
            },
          ]
        : suppliedPhrase
          ? [
              {
                role: "system",
                content:
                  "Draft learning details for the exact English phrase the learner chose. Never rewrite, correct, expand, or replace the phrase. " +
                  "Use the optional context only to disambiguate its meaning and usage. Classify it as word, phrasal_verb, pattern, idiom, or phrase. " +
                  `Give a short ${lang} meaning and a brief English usage note. If context is supplied, translate all of it naturally into ${lang}. Return JSON only.`,
              },
              {
                role: "user",
                content:
                  'Phrase (return exactly): ' + suppliedPhrase +
                  (suppliedContext ? '\nContext: ' + suppliedContext : "") +
                  `\nReturn {"context_text":"the supplied context or empty string","context_translation":"natural ${lang} translation of all context, or empty string","suggested_phrase":"the exact supplied phrase","kind":"word|phrasal_verb|pattern|idiom|phrase","meaning":"short ${lang} meaning","usage_note":"brief English nuance","confidence":1.0}.`,
              },
            ]
          : [
            {
              role: "system",
              content:
                "Help a learner capture useful English from text they supplied. Preserve their text exactly. " +
                "Choose one short reusable expression or sentence pattern that appears EXACTLY in the supplied text. " +
                "If the input is already a short expression, use the whole expression. Never rewrite or invent words. " +
                `Give a short ${lang} meaning, a brief English usage note, and a natural ${lang} translation of the complete supplied text. Return JSON only.`,
            },
            {
              role: "user",
              content:
                'Text: ' + suppliedContext + `\nReturn {"context_text":"the supplied text","context_translation":"natural ${lang} translation of all supplied text","suggested_phrase":"exact substring","kind":"word|phrasal_verb|pattern|idiom|phrase","meaning":"short ${lang} meaning","usage_note":"brief English nuance","confidence":0.0}.`,
            },
            ],
    }),
  });
  if (!openai.ok) return json({ error: `Couldn’t fill this phrase right now (OpenAI ${openai.status}).` }, 502);
  const payload = await openai.json();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(payload?.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return json({ error: "Couldn’t understand the extracted text." }, 502);
  }
  // Text modes preserve learner-owned inputs. The model may choose a substring
  // from context, but it may never rewrite an explicitly supplied phrase.
  const context = base64 ? clean(parsed.context_text, 1600) : suppliedContext;
  let phrase = suppliedPhrase || clean(parsed.suggested_phrase, 240);
  if (!suppliedPhrase && phrase && !context.toLocaleLowerCase("en").includes(phrase.toLocaleLowerCase("en"))) phrase = "";
  const rawKind = clean(parsed.kind, 24);
  return json({
    context_text: context,
    context_translation: clean(parsed.context_translation, 1200),
    suggested_phrase: phrase,
    kind: KINDS.has(rawKind) ? rawKind : "phrase",
    meaning: clean(parsed.meaning, 500),
    usage_note: clean(parsed.usage_note, 500),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
  });
});
