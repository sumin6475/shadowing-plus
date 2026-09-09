// Bank-only phrase retrieval after a Speak session. MOBILE-ONLY.
// Vector Top-K narrows the owned bank; the model may choose one exact id
// or return null. It cannot generate language outside the learner's Phrase Bank.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const DAY_MS = 86_400_000;
const REJECTION_COOLDOWN_DAYS = 30;
const REJECTION_WINDOW_MS = REJECTION_COOLDOWN_DAYS * DAY_MS;
const STORY_TIE_BONUS = 8;
const STORY_TIE_MARGIN = 0.05;
const USED_FULL_WEIGHT_DAYS = 56;
const USED_DECAY_DAYS = 180;
const USED_POINTS_PER = 5;
const USED_POINTS_CAP = 15;
const MAX_VECTOR_MATCHES = 5;
const MAX_USED_VECTOR = 8;
const MAX_BANK_SCAN = 400;
const MIN_SIMILARITY = 0.75;
const MIN_USED_SIMILARITY = 0.82;
const MIN_CONFIDENCE = 80;
const MAX_FALLBACK_ROWS = 160;
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
  rejectedRecently: boolean;
  rank: number;
}

interface PhraseRow {
  id: string;
  text: string;
  meaning_ko: string | null;
  usage_note: string | null;
  source_context: unknown;
  phrase_story_links?: unknown;
  phrase_events?: unknown;
}

interface PhraseSuggestion {
  phraseItemId: string;
  text: string;
  meaning: string;
  usageNote: string;
  sourceLabel: string;
  linkedToStory: boolean;
  said: string;
  why: string;
}

interface UsedMatch {
  phraseItemId: string;
  text: string;
  said: string;
  score: number;
}

const clamp = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

const normalized = (value: string) => value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en");

const comparable = (value: string) =>
  normalized(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/["'.,!?;:()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sourceLabel = (value: unknown): string => {
  const context = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const explicit = clamp(context.source_label, 80);
  if (explicit) return explicit;
  if (context.source === "image_ocr") return "Saved from photo";
  if (context.source === "speak") return "Saved while talking";
  if (context.source === "paste") return "Pasted text";
  return "Your Phrase Bank";
};

function pickSentences(transcript: string): string[] {
  const parts = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => clamp(part, 400))
    .filter((part) => part.length >= 12);
  if (!parts.length) return [clamp(transcript, 800)];
  return [...parts].sort((a, b) => b.length - a.length).slice(0, 5);
}

function findSaidSpan(transcript: string, phrase: string): string {
  const needle = comparable(phrase);
  if (!needle) return "";
  if (comparable(transcript).includes(needle)) return clamp(phrase, 240);
  for (const sentence of pickSentences(transcript)) {
    if (comparable(sentence).includes(needle)) return clamp(sentence, 500);
  }
  return "";
}

function fuzzyUsed(transcript: string, rows: { id: string; text: string }[]): UsedMatch[] {
  const used: UsedMatch[] = [];
  for (const row of rows) {
    const text = clamp(row.text, 240);
    const said = findSaidSpan(transcript, text);
    if (!said) continue;
    used.push({ phraseItemId: row.id, text, said, score: 1 });
  }
  return used;
}

function parseUsedConfirm(
  raw: string,
  transcript: string,
  candidates: { id: string; text: string; score: number }[],
): UsedMatch[] {
  let obj: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    obj = parsed as Record<string, unknown>;
  } catch {
    return [];
  }
  const rows = obj.matches ?? obj.used;
  if (!Array.isArray(rows)) return [];
  const used: UsedMatch[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (row.used !== true) continue;
    const id = clamp(row.id ?? row.phraseItemId ?? row.phrase_item_id, 80);
    const candidate = candidates.find((entry) => entry.id === id);
    const said = clamp(row.said, 500);
    if (!candidate || !said || !normalized(transcript).includes(normalized(said))) continue;
    used.push({ phraseItemId: candidate.id, text: candidate.text, said, score: candidate.score });
  }
  return used;
}

async function confirmUsedByModel(
  apiKey: string,
  transcript: string,
  uncertain: { id: string; text: string; score: number }[],
): Promise<UsedMatch[]> {
  if (!uncertain.length) return [];
  const listed = uncertain
    .map((item) => JSON.stringify({ id: item.id, phrase: item.text }))
    .join("\n");
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Decide whether the learner actually produced each saved phrase in the transcript. " +
            "Allow obvious speech-to-text inflections of the same phrase. " +
            "Do not mark a phrase used just because the topic is related. " +
            "Return JSON only.",
        },
        {
          role: "user",
          content:
            `Saved phrases (one JSON object per line):\n${listed}\n\n` +
            `Transcript (verbatim):\n"""${transcript}"""\n\n` +
            'Return {"matches":[{"id":"exact supplied id","said":"verbatim transcript span","used":true}]} ' +
            "with only the phrases that were actually said. If none, return {\"matches\":[]}.",
        },
      ],
    }),
  });
  if (!openaiRes.ok) return [];
  const data = await openaiRes.json();
  return parseUsedConfirm(data?.choices?.[0]?.message?.content ?? "{}", transcript, uncertain);
}

function averageVectors(vectors: number[][]): number[] | null {
  if (!vectors.length || vectors.some((item) => item.length !== EMBEDDING_DIMS)) return null;
  const out = new Array<number>(EMBEDDING_DIMS).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < EMBEDDING_DIMS; index += 1) out[index] += vector[index] ?? 0;
  }
  for (let index = 0; index < EMBEDDING_DIMS; index += 1) out[index] /= vectors.length;
  return out;
}

function usedWeight(lastUsedAt: string | null | undefined): number {
  if (!lastUsedAt) return 0;
  const ageDays = (Date.now() - new Date(lastUsedAt).getTime()) / DAY_MS;
  if (ageDays <= USED_FULL_WEIGHT_DAYS) return 1;
  if (ageDays >= USED_DECAY_DAYS) return 0;
  return 1 - (ageDays - USED_FULL_WEIGHT_DAYS) / (USED_DECAY_DAYS - USED_FULL_WEIGHT_DAYS);
}

function decayedUsedPoints(links: { used_count?: number; last_used_at?: string | null }[]): number {
  const weighted = links.reduce((sum, link) => {
    return sum + Number(link.used_count ?? 0) * usedWeight(link.last_used_at);
  }, 0);
  return Math.min(USED_POINTS_CAP, weighted * USED_POINTS_PER);
}

function rankRows(
  rows: PhraseRow[],
  storyId: string | null,
  similarity?: Map<string, number>,
): Candidate[] {
  const rejectionCutoff = Date.now() - REJECTION_WINDOW_MS;
  const topSimilarity = similarity ? Math.max(0, ...similarity.values()) : 0;
  return rows
    .map((row) => {
      const links = Array.isArray(row.phrase_story_links)
        ? row.phrase_story_links as { story_id?: string; source?: string; used_count?: number; last_used_at?: string | null }[]
        : [];
      const events = Array.isArray(row.phrase_events)
        ? row.phrase_events as { event?: string; story_id?: string | null; created_at?: string }[]
        : [];
      const storyLinks = storyId ? links.filter((link) => link.story_id === storyId) : [];
      const linked = storyLinks.some((link) => link.source !== "suggested" || Number(link.used_count ?? 0) > 0);
      const rankedLinks = storyId ? storyLinks : links;
      const rejectedRecently = events.some((event) => {
        if (event.event !== "rejected" || new Date(event.created_at ?? 0).getTime() < rejectionCutoff) return false;
        return storyId ? event.story_id === storyId : event.story_id == null;
      });
      const sim = similarity?.get(row.id) ?? 0;
      const nearTop = !similarity || topSimilarity - sim <= STORY_TIE_MARGIN;
      const storyBonus = linked && nearTop ? STORY_TIE_BONUS : 0;
      return {
        id: row.id,
        text: clamp(row.text, 240),
        meaning: clamp(row.meaning_ko, 200),
        note: clamp(row.usage_note, 240),
        sourceLabel: sourceLabel(row.source_context),
        linkedToStory: linked,
        rejectedRecently,
        rank: Math.round(sim * 100) + storyBonus + decayedUsedPoints(rankedLinks) - (rejectedRecently ? 200 : 0),
      };
    })
    .filter((candidate) => candidate.text && !candidate.rejectedRecently)
    .sort((a, b) => b.rank - a.rank);
}

function parseSuggestion(
  raw: string,
  transcript: string,
  candidates: Candidate[],
): { suggestion: PhraseSuggestion | null; valid: boolean; confidence: number | null } {
  let obj: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { suggestion: null, valid: false, confidence: null };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { suggestion: null, valid: false, confidence: null };
  }

  if (obj.suggestion === null) return { suggestion: null, valid: true, confidence: null };
  if (!obj.suggestion || typeof obj.suggestion !== "object" || Array.isArray(obj.suggestion)) {
    return { suggestion: null, valid: false, confidence: null };
  }

  const row = obj.suggestion as Record<string, unknown>;
  const requestedId = clamp(row.phraseItemId ?? row.phrase_item_id, 80);
  const candidate = candidates.find((item) => item.id === requestedId);
  const said = clamp(row.said, 500);
  const why = clamp(row.why, 600);
  const confidence = Number(row.confidence);
  if (!candidate || !said || !why || !normalized(transcript).includes(normalized(said))) {
    return { suggestion: null, valid: false, confidence: null };
  }
  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    return { suggestion: null, valid: true, confidence: Number.isFinite(confidence) ? confidence : null };
  }
  if (comparable(transcript).includes(comparable(candidate.text))) {
    return { suggestion: null, valid: true, confidence };
  }

  return {
    valid: true,
    confidence,
    suggestion: {
      phraseItemId: candidate.id,
      text: candidate.text,
      meaning: candidate.meaning,
      usageNote: candidate.note,
      sourceLabel: candidate.sourceLabel,
      linkedToStory: candidate.linkedToStory,
      said,
      why,
    },
  };
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

  const body = (await req.json().catch(() => null)) as {
    transcript?: unknown;
    topic?: unknown;
    story_id?: unknown;
    talk_session_id?: unknown;
  } | null;
  const transcript = clamp(body?.transcript, 4000);
  const topic = clamp(body?.topic, 200) || null;
  const storyId = clamp(body?.story_id, 80) || null;
  const talkSessionId = clamp(body?.talk_session_id, 80) || null;
  if (!transcript) return json({ error: "Say something first." }, 400);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const phraseSelect =
    "id, text, meaning_ko, usage_note, source_context, phrase_story_links(story_id, source, used_count, last_used_at), phrase_events(event, story_id, created_at)";

  const loadByIds = async (ids: string[]): Promise<PhraseRow[]> => {
    if (!ids.length) return [];
    const { data, error } = await supabase.from("phrase_items").select(phraseSelect).eq("status", "ready").in("id", ids);
    if (error) throw new Error("load");
    return (data ?? []) as PhraseRow[];
  };

  const { data: bankRows, error: bankError } = await supabase
    .from("phrase_items")
    .select("id, text")
    .eq("status", "ready")
    .limit(MAX_BANK_SCAN);
  if (bankError) return json({ error: "Couldn’t load your Phrase Bank." }, 500);
  const bank = (bankRows ?? []) as { id: string; text: string }[];
  const used = fuzzyUsed(transcript, bank);
  const usedIds = new Set(used.map((item) => item.phraseItemId));

  let candidates: Candidate[] = [];
  let retrieval: "vector" | "fallback" = "vector";
  let matchRows: { id: string; similarity: number }[] = [];

  const sentences = pickSentences(transcript);
  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: sentences }),
  });
  const embedPayload = embedRes.ok
    ? ((await embedRes.json()) as { data?: { embedding?: unknown; index?: number }[] })
    : { data: [] };
  const sentenceVectors: number[][] = [];
  for (const item of embedPayload.data ?? []) {
    const embedding = Array.isArray(item.embedding) ? (item.embedding as number[]) : [];
    if (embedding.length === EMBEDDING_DIMS) sentenceVectors.push(embedding);
  }
  const queryVector = averageVectors(sentenceVectors);

  if (queryVector) {
    const { data: matches, error: matchError } = await supabase.rpc("match_owned_phrases", {
      query_embedding: JSON.stringify(queryVector),
      match_count: MAX_USED_VECTOR,
      min_similarity: MIN_SIMILARITY,
    });
    if (matchError) return json({ error: "Couldn’t search your Phrase Bank." }, 500);
    matchRows = (matches ?? []) as { id: string; similarity: number }[];
    const byId = new Map(bank.map((row) => [row.id, clamp(row.text, 240)]));
    const uncertain = matchRows
      .filter((row) => !usedIds.has(row.id) && Number(row.similarity) >= MIN_USED_SIMILARITY && byId.get(row.id))
      .map((row) => ({ id: row.id, text: byId.get(row.id) ?? "", score: Number(row.similarity) || 0 }));
    for (const item of await confirmUsedByModel(apiKey, transcript, uncertain)) {
      if (usedIds.has(item.phraseItemId)) continue;
      used.push(item);
      usedIds.add(item.phraseItemId);
    }

    const recommendMatches = matchRows.filter((row) => !usedIds.has(row.id));
    if (recommendMatches.length) {
      const details = await loadByIds(recommendMatches.map((row) => row.id));
      const similarity = new Map(recommendMatches.map((row) => [row.id, Number(row.similarity) || 0]));
      candidates = rankRows(details, storyId, similarity);
    } else if (matchRows.length) {
      candidates = [];
    } else {
      const { count } = await supabase
        .from("phrase_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready")
        .not("embedding", "is", null);
      if ((count ?? 0) > 0) candidates = [];
      else retrieval = "fallback";
    }
  } else {
    retrieval = "fallback";
  }

  if (retrieval === "fallback") {
    const { data: generalRows, error: phraseError } = await supabase
      .from("phrase_items")
      .select(phraseSelect)
      .eq("status", "ready")
      .order("last_practiced_at", { ascending: true, nullsFirst: true })
      .limit(MAX_FALLBACK_ROWS);
    if (phraseError) return json({ error: "Couldn’t load your Phrase Bank." }, 500);
    candidates = rankRows((generalRows ?? []) as PhraseRow[], storyId).slice(0, MAX_VECTOR_MATCHES);
  }

  if (used.length) {
    void supabase.from("phrase_events").insert(
      used.map((item) => ({
        user_id: user.id,
        phrase_item_id: item.phraseItemId,
        story_id: storyId,
        talk_session_id: talkSessionId,
        event: "retrieved",
        evidence: { transcript_quote: item.said, score: item.score, source: "talk_phrase_suggest" },
      })),
    );
  }

  candidates = candidates
    .filter((candidate) => !usedIds.has(candidate.id) && !comparable(transcript).includes(comparable(candidate.text)))
    .slice(0, MAX_VECTOR_MATCHES);
  if (!candidates.length) return json({ used, suggestion: null });

  const candidateList = candidates
    .map((candidate) =>
      JSON.stringify({
        id: candidate.id,
        phrase: candidate.text,
        meaning: candidate.meaning,
        how_used: candidate.note,
        current_story: candidate.linkedToStory,
      }),
    )
    .join("\n");

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.05,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a retrieval assistant for an intermediate English learner. " +
            "Your only job is to decide whether exactly one phrase the learner ALREADY SAVED would have helped them express a real idea in this transcript. " +
            "Select only from the supplied ids. Never generate, rewrite, combine, inflect, or improve a candidate. " +
            "Do not select a phrase merely because it shares keywords; it must fit the speaker’s intended meaning and professional context naturally. " +
            "Do not select a phrase that the learner already used successfully in the transcript. " +
            "Prefer a current-Story phrase when it genuinely fits, but never force a match. " +
            `If no candidate is a strong fit, or you are not at least ${MIN_CONFIDENCE} confident, return {"suggestion":null}. ` +
            "If one fits, copy a short said span verbatim, give an integer confidence 0-100, and explain in 1–2 concise sentences where the saved phrase could have helped. Return JSON only.",
        },
        {
          role: "user",
          content:
            (topic ? `Topic / Story: ${topic}\n\n` : "") +
            `Owned Phrase Bank candidates (one JSON object per line):\n${candidateList}\n\n` +
            `Transcript (verbatim):\n"""${transcript}"""\n\n` +
            `Return exactly {"suggestion":{"phraseItemId":"exact supplied id","said":"verbatim transcript span","why":"1–2 concise sentences","confidence":${MIN_CONFIDENCE}}} or {"suggestion":null}.`,
        },
      ],
    }),
  });
  if (!openaiRes.ok) return json({ error: `Couldn’t search your Phrase Bank (OpenAI ${openaiRes.status}).` }, 502);
  const data = await openaiRes.json();
  const parsed = parseSuggestion(data?.choices?.[0]?.message?.content ?? "{}", transcript, candidates);
  if (!parsed.valid) return json({ error: "Couldn’t validate the Phrase Bank suggestion." }, 502);
  if (!parsed.suggestion) return json({ used, suggestion: null });

  const { error: eventError } = await supabase.from("phrase_events").insert({
    user_id: user.id,
    phrase_item_id: parsed.suggestion.phraseItemId,
    story_id: storyId,
    talk_session_id: talkSessionId,
    event: "suggested",
    evidence: {
      transcript_quote: parsed.suggestion.said,
      source: "talk_phrase_suggest",
      why: parsed.suggestion.why,
      confidence: parsed.confidence,
      retrieval,
    },
  });
  if (eventError) return json({ error: "Couldn’t record the Phrase Bank suggestion." }, 500);

  return json({ used, suggestion: parsed.suggestion });
});