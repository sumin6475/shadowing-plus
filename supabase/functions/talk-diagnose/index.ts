// Speak-session diagnosis with personal Phrase Bank retrieval. MOBILE-ONLY.
// The model may select an owned phrase only by candidate id; every returned id
// is validated server-side before the learner sees "From your Phrase Bank".
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const MAX_MOMENTS = 3;
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

interface Candidate {
  id: string;
  text: string;
  meaning: string;
  note: string;
  sourceLabel: string;
  linkedToStory: boolean;
  rank: number;
}

interface TalkMoment {
  label: string;
  said: string;
  want: string;
  example: string;
  phraseItemId: string | null;
  source: "saved" | "generated";
  sourceLabel: string | null;
}

const clamp = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

const sourceLabel = (value: unknown): string => {
  const context = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const explicit = clamp(context.source_label, 80);
  if (explicit) return explicit;
  if (context.source === "image_ocr") return "Saved from screenshot";
  if (context.source === "speak") return "Saved while talking";
  if (context.source === "paste") return "Pasted text";
  return "Your Phrase Bank";
};

function parseMoments(raw: string, candidates: Candidate[]): TalkMoment[] {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw);
  } catch {
    return [];
  }
  const rows = Array.isArray(obj.moments) ? obj.moments : [];
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const out: TalkMoment[] = [];
  for (const value of rows) {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const said = clamp(row.said, 200);
    if (!said) continue;
    const requestedId = clamp(row.phraseItemId ?? row.phrase_item_id, 80);
    const owned = requestedId ? byId.get(requestedId) ?? null : null;
    const generated = clamp(row.want, 120);
    const want = owned?.text ?? generated;
    if (!want) continue;
    out.push({
      label: clamp(row.label, 40) || "A moment",
      said,
      want,
      example: clamp(row.example, 240) || owned?.note || "",
      phraseItemId: owned?.id ?? null,
      source: owned ? "saved" : "generated",
      sourceLabel: owned?.sourceLabel ?? null,
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

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as { transcript?: unknown; topic?: unknown; story_id?: unknown } | null;
  const transcript = clamp(body?.transcript, 4000);
  const topic = clamp(body?.topic, 200) || null;
  const storyId = clamp(body?.story_id, 80) || null;
  if (!transcript) return json({ error: "Say something first." }, 400);

  const phraseSelect =
    "id, text, meaning_ko, usage_note, source_context, phrase_story_links(story_id, used_count), phrase_events(event, story_id, created_at)";
  const { data: generalRows, error: phraseError } = await supabase
    .from("phrase_items")
    .select(phraseSelect)
    .eq("status", "ready")
    .order("last_practiced_at", { ascending: true, nullsFirst: true })
    .limit(80);
  if (phraseError) return json({ error: "Couldn’t load your Phrase Bank." }, 500);

  // The general pool stays bounded, but every phrase linked to the active Story
  // must remain eligible as the bank grows. Fetch that pool separately so a
  // Story phrase cannot fall beyond the first 80 general rows.
  let linkedRows: typeof generalRows = [];
  if (storyId) {
    const linked = await supabase
      .from("phrase_items")
      .select(
        "id, text, meaning_ko, usage_note, source_context, phrase_story_links!inner(story_id, used_count), phrase_events(event, story_id, created_at)",
      )
      .eq("status", "ready")
      .eq("phrase_story_links.story_id", storyId)
      .limit(80);
    if (linked.error) return json({ error: "Couldn’t load Story phrases." }, 500);
    linkedRows = linked.data;
  }
  const phraseRows = [...new Map([...(generalRows ?? []), ...(linkedRows ?? [])].map((row) => [row.id as string, row])).values()];

  const rejectionCutoff = Date.now() - 30 * 86_400_000;
  const candidates: Candidate[] = (phraseRows ?? []).map((row) => {
    const links = Array.isArray(row.phrase_story_links) ? row.phrase_story_links as { story_id?: string; used_count?: number }[] : [];
    const events = Array.isArray(row.phrase_events) ? row.phrase_events as { event?: string; story_id?: string | null; created_at?: string }[] : [];
    const linked = Boolean(storyId && links.some((link) => link.story_id === storyId));
    const usedCount = links.reduce((sum, link) => sum + Number(link.used_count ?? 0), 0);
    const rejectedRecently = Boolean(storyId && events.some((event) =>
      event.event === "rejected" && event.story_id === storyId && new Date(event.created_at ?? 0).getTime() >= rejectionCutoff
    ));
    return {
      id: row.id as string,
      text: clamp(row.text, 240),
      meaning: clamp(row.meaning_ko, 200),
      note: clamp(row.usage_note, 240),
      sourceLabel: sourceLabel(row.source_context),
      linkedToStory: linked,
      rank: (linked ? 100 : 0) + Math.min(30, usedCount * 5) - (rejectedRecently ? 200 : 0),
    };
  }).filter((candidate) => candidate.rank > -100);
  candidates.sort((a, b) => b.rank - a.rank);

  const candidateList = candidates.length
    ? candidates.map((p) => `- id=${p.id} | phrase="${p.text}" | meaning="${p.meaning}" | note="${p.note}" | current_story=${p.linkedToStory}`).join("\n")
    : "(none saved yet)";
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You coach a non-native English speaker after an unscripted self-talk attempt. Find up to 3 high-leverage moments, not every small error. " +
            "Prefer a saved phrase when it naturally expresses what the learner was trying to say, especially one linked to the current Story. " +
            "To use saved language, copy its exact id into phraseItemId; never alter that phrase. If no candidate truly fits, set phraseItemId to null and generate one short new suggestion. " +
            "Copy `said` verbatim from the transcript. Never invent facts. Return JSON only.",
        },
        {
          role: "user",
          content:
            (topic ? `Topic / Story: ${topic}\n\n` : "") +
            `My saved Phrase Bank candidates:\n${candidateList}\n\n` +
            `My transcript (verbatim):\n"""${transcript}"""\n\n` +
            'Return {"moments":[{"label":"max 4 words","said":"verbatim span","phraseItemId":"exact candidate id or null","want":"new suggestion only when id is null, max 10 words","example":"one short example"}]}.',
        },
      ],
    }),
  });
  if (!openaiRes.ok) return json({ error: `Couldn’t analyze this session (OpenAI ${openaiRes.status}).` }, 502);
  const data = await openaiRes.json();
  const moments = parseMoments(data?.choices?.[0]?.message?.content ?? "{}", candidates);

  const suggested = moments.filter((moment) => moment.phraseItemId);
  if (suggested.length) {
    await supabase.from("phrase_events").insert(
      suggested.map((moment) => ({
        user_id: user.id,
        phrase_item_id: moment.phraseItemId,
        story_id: storyId,
        event: "suggested",
        evidence: { transcript_quote: moment.said, source: "talk_diagnose" },
      })),
    );
  }

  return json({ moments });
});
