// Speak session "stuck" coaching — Supabase Edge Function (Deno). MOBILE-ONLY.
//
// Companion to talk-diagnose. When the learner taps "Stuck" during a self-talk
// session, they jot a quick note about what they wanted to say but couldn't —
// often in their native language (Korean etc.). This function turns each note
// into the natural English way to say it, plus one example. This is a SEPARATE
// analysis from talk-diagnose (which finds improvable moments in the whole
// transcript); the two run in parallel on finish.
//
// Same transport/auth/secret model as talk-diagnose: verify_jwt gateway +
// getUser() defense-in-depth, OPENAI_API_KEY from the Supabase secret store.

import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const MAX_HELP = 6;

const SYSTEM_PROMPT =
  "You help a non-native English speaker who is practicing by talking to themselves. " +
  "Whenever they hit a wall — they knew what they wanted to say but couldn't say it in English — they jotted a quick NOTE. " +
  "A note is often written in their native language (e.g. Korean), or a mix, or broken English. It describes the meaning they were reaching for. " +
  "For EACH note, give them the natural, spoken English for that meaning: " +
  "(1) `phrase` — the natural English way to say it, simple and conversational, in the first person where it fits (max 14 words); " +
  "(2) `example` — ONE short example sentence that uses `phrase` naturally; " +
  "(3) echo back the `at` timestamp you were given. " +
  "If a note is ambiguous, pick the most likely everyday meaning. Never invent specific facts, names, or numbers the note doesn't imply. " +
  "Return exactly one item per note, in the same order. Return JSON only.";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

interface StuckMoment {
  at: string;
  note: string;
}
interface StuckHelp {
  at: string;
  phrase: string;
  example: string;
}

/** Collapse whitespace and hard-cap length. */
function clamp(value: unknown, limit: number): string {
  const s = typeof value === "string" ? value : "";
  return s.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** Read + bound the incoming notes (cap count and each field; drop empty). */
function parseStuckMoments(raw: unknown): StuckMoment[] {
  if (!Array.isArray(raw)) return [];
  const out: StuckMoment[] = [];
  for (const m of raw) {
    const note = clamp((m as StuckMoment)?.note, 300);
    if (!note) continue; // a note with no text can't be coached
    out.push({ at: clamp((m as StuckMoment)?.at, 12) || "0:00", note });
    if (out.length >= MAX_HELP) break;
  }
  return out;
}

/** Bounded parse of the model's JSON. */
function parseHelp(raw: string): StuckHelp[] {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr = (obj as { help?: unknown })?.help;
  if (!Array.isArray(arr)) return [];
  const out: StuckHelp[] = [];
  for (const h of arr) {
    const phrase = clamp((h as StuckHelp)?.phrase, 160);
    if (!phrase) continue;
    out.push({
      at: clamp((h as StuckHelp)?.at, 12) || "0:00",
      phrase,
      example: clamp((h as StuckHelp)?.example, 240),
    });
    if (out.length >= MAX_HELP) break;
  }
  return out;
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

  const body = (await req.json().catch(() => null)) as { stuckMoments?: unknown; topic?: unknown } | null;
  const stuckMoments = parseStuckMoments(body?.stuckMoments);
  const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : null;
  if (stuckMoments.length === 0) return json({ help: [] });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const listed = stuckMoments.map((m, i) => `Note ${i + 1} (at ${m.at}): """${m.note}"""`).join("\n");
  const userContent =
    (topic ? `I was talking about: ${topic}\n\n` : "") +
    `Here are the notes I jotted when I got stuck:\n${listed}\n\n` +
    `Return JSON only: {"help":[{"at":"echo the timestamp","phrase":"natural English for that note, max 14 words","example":"one short example sentence"}]}. ` +
    `Exactly one item per note, same order.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => "");
    return json({ error: `Couldn’t turn your notes into English (OpenAI ${openaiRes.status}).`, detail: detail.slice(0, 200) }, 502);
  }

  const data = await openaiRes.json();
  const help = parseHelp(data?.choices?.[0]?.message?.content ?? "{}");
  return json({ help });
});
