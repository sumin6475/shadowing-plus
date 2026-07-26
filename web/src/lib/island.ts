import OpenAI from "openai";
import { recordUsage } from "@/lib/usage";

// Speaking Memory Island — "Explain what I do". The AI's ONLY job here is to
// organize a learner's own rough explanation into a few clear message beats.
// It must not invent facts, numbers, names, or claims the learner didn't make;
// the learner owns and edits every beat afterwards.

const MODEL = "gpt-4o-mini";
const MAX_BEATS = 6;
const BEAT_LIMIT = 300;

export type IslandStatus = "draft" | "shaping" | "ready" | "archived";
export type BeatSource = "learner" | "ai_structured";

export interface Island {
  id: string;
  kind: "explain_what_i_do";
  title: string | null;
  raw_answer: string | null;
  status: IslandStatus;
  created_at: string;
  updated_at: string;
}

export interface IslandBeat {
  id: string;
  island_id: string;
  position: number;
  text: string;
  evidence: string | null;
  source: BeatSource;
  created_at?: string;
  updated_at?: string;
}

export interface ShapedBeat {
  text: string;
  evidence: string | null;
}

/** Coerce untrusted text to a bounded, single-spaced string (empty if invalid). */
function asText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

/**
 * Validate the model's JSON into a bounded list of beats. Pure — no I/O — so it
 * can be unit-tested independently of the OpenAI call. Drops empty beats and
 * caps the count; a non-string evidence becomes null.
 */
export function parseBeats(raw: unknown): ShapedBeat[] {
  const beats = (raw as { beats?: unknown })?.beats;
  if (!Array.isArray(beats)) return [];
  const out: ShapedBeat[] = [];
  for (const b of beats) {
    const text = asText((b as { text?: unknown })?.text, BEAT_LIMIT);
    if (!text) continue;
    const evidence = asText((b as { evidence?: unknown })?.evidence, BEAT_LIMIT);
    out.push({ text, evidence: evidence || null });
    if (out.length >= MAX_BEATS) break;
  }
  return out;
}

const SYSTEM_PROMPT =
  "You help a non-native English speaker organize their OWN rough explanation of what they do into a short set of clear message beats they can speak from. " +
  "Hard rules: (1) Organize and lightly clarify only what they actually wrote — never invent facts, numbers, names, employers, or claims they did not make. " +
  "(2) Keep their meaning and their voice; you are structuring their words, not replacing them with a generic 'native answer'. " +
  "(3) Produce 3 to 6 beats, each one clear point in natural but simple English. " +
  "(4) If they gave a concrete example or piece of evidence for a beat, put it in 'evidence'; otherwise use null.";

/**
 * Turn a learner's rough answer into editable beats. Returns the shaped beats
 * (the caller persists them through the RLS client). A missing key throws; the
 * route surfaces that as a 500.
 */
export async function shapeBeats(rawAnswer: string, userId: string): Promise<ShapedBeat[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const answer = asText(rawAnswer, 4000);
  if (!answer) return [];

  const response = await new OpenAI({ apiKey }).chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Organize my rough explanation into beats.\n\n"""${answer}"""\n\nReturn JSON only: {"beats":[{"text":"one clear message point, in my voice","evidence":"a concrete example I gave, or null"}]}`,
      },
    ],
  });

  await recordUsage({
    userId,
    label: "Island: shape beats",
    provider: "openai",
    model: MODEL,
    kind: "island_shape",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });

  return parseBeats(JSON.parse(response.choices[0]?.message?.content ?? "{}"));
}
