// Speak session AI diagnosis — Supabase Edge Function (Deno). MOBILE-ONLY.
//
// Why this exists: the native iOS app's fetch to Vercel fails ("Protocol
// error"), while it reaches supabase.co reliably. So the mobile API lives here,
// on the transport the app already trusts. The WEB app is unaffected — it keeps
// using its own Vercel route (web/src/app/api/talk/diagnose). Do not wire the
// web to this function.
//
// Secrets: OPENAI_API_KEY comes from `supabase secrets set` (Supabase project
// secret store — SEPARATE from Vercel env; setting it here never touches the web
// deploy). SUPABASE_URL / SUPABASE_ANON_KEY are auto-injected by the platform.
//
// Auth: verify_jwt is on by default, so Supabase's gateway rejects
// unauthenticated calls before this runs; we also resolve the user for
// defense-in-depth. Mirrors the logic in web/src/lib/talk-diagnose-ai.ts.

import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const MAX_MOMENTS = 3;

const SYSTEM_PROMPT =
  "You are a speaking coach for a non-native English speaker who just did a short, unscripted 'talk to yourself' session. " +
  "You get the on-device transcript of what they actually said (English only; stalls and rough grammar included) and, optionally, the topic they were talking about. " +
  "Find UP TO 3 moments where they could say something more naturally — the highest-leverage spots, not every small slip. " +
  "For each moment: (1) copy a VERBATIM span from their transcript into `said`; " +
  "(2) give ONE natural, simple rephrasing in their own voice in `want` (max 10 words); " +
  "(3) write ONE short example sentence in `example` that uses `want`; " +
  "(4) give a `label` (max 4 words) for what the moment is about. " +
  "Hard rules: never invent facts, numbers, names, or claims they did not make. " +
  "If the transcript is too short or already natural, return fewer moments — or none. " +
  "Return JSON only.";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

interface TalkMoment {
  label: string;
  said: string;
  want: string;
  example: string;
}

/** Collapse whitespace and hard-cap length. */
function clamp(value: unknown, limit: number): string {
  const s = typeof value === "string" ? value : "";
  return s.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** Bounded parse of the model's JSON — same rules as the web parser. */
function parseMoments(raw: string): TalkMoment[] {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr = (obj as { moments?: unknown })?.moments;
  if (!Array.isArray(arr)) return [];
  const out: TalkMoment[] = [];
  for (const m of arr) {
    const said = clamp((m as TalkMoment)?.said, 200);
    const want = clamp((m as TalkMoment)?.want, 120);
    if (!said || !want) continue;
    out.push({
      label: clamp((m as TalkMoment)?.label, 40) || "A moment",
      said,
      want,
      example: clamp((m as TalkMoment)?.example, 240),
    });
    if (out.length >= MAX_MOMENTS) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Resolve the caller (the app sends its Supabase JWT via functions.invoke).
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

  const body = (await req.json().catch(() => null)) as { transcript?: unknown; topic?: unknown } | null;
  const transcript = typeof body?.transcript === "string" ? body.transcript : "";
  const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : null;
  if (!transcript.trim()) return json({ error: "Say something first." }, 400);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const said = clamp(transcript, 4000);
  const userContent =
    (topic ? `Topic I was talking about: ${topic}\n\n` : "") +
    `My transcript (verbatim, ums and stalls included):\n"""${said}"""\n\n` +
    `Return JSON only: {"moments":[{"label":"max 4 words","said":"verbatim span from my transcript","want":"natural rephrasing, max 10 words","example":"one short example sentence"}]}. ` +
    `At most ${MAX_MOMENTS} moments; fewer or none if the transcript is short or already natural.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => "");
    return json({ error: `Couldn’t analyze this session (OpenAI ${openaiRes.status}).`, detail: detail.slice(0, 200) }, 502);
  }

  const data = await openaiRes.json();
  const moments = parseMoments(data?.choices?.[0]?.message?.content ?? "{}");
  return json({ moments });
  // NOTE: usage/cost tracking (usage_events) is intentionally NOT done here yet —
  // follow-up. The web route records it; the mobile path will get parity later.
});
