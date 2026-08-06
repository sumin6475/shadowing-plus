// Client-safe core for Speak session AI diagnosis: the shared type and the pure
// JSON parser that the route and its test use. The GPT call itself lives in
// talk-diagnose-ai.ts (server-only) so the OpenAI SDK / key never enter a client
// bundle — mirrors the island-speak.ts / island-speak-ai.ts split.

export const MAX_MOMENTS = 3;

export interface TalkMoment {
  /** ≤4 words naming what this moment is about. */
  label: string;
  /** A verbatim span copied from the transcript. */
  said: string;
  /** A more natural way to say it, in the learner's voice (≤10 words). */
  want: string;
  /** One short example sentence that uses `want`. */
  example: string;
}

/** Collapse whitespace and hard-cap length. */
export function clamp(value: unknown, limit: number): string {
  const s = typeof value === "string" ? value : "";
  return s.replace(/\s+/g, " ").trim().slice(0, limit);
}

/**
 * Bounded parse of the model's JSON: keep only well-formed moments (each must
 * quote something AND suggest something), cap the count and every field. Pure +
 * exported so it can be unit-tested without an API call.
 */
export function parseMoments(raw: string): TalkMoment[] {
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
    if (!said || !want) continue; // a moment must both quote and suggest
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
