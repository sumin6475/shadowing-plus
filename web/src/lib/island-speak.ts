// Speak Loop (Phase 3 of the "Explain what I do" island) — the CLIENT-SAFE core.
// The learner says their saved message once, the AI names ONE gap, they do one
// small repair, they say it again, and they mark honest evidence. This module
// holds only pure, browser-safe code:
//   • the STATIC per-gap UX copy (design-authored — stays polished),
//   • the evidence → schedule mapping, and
//   • the pure diagnosis parser + used-detection the page, route, and tests
//     share. The GPT call itself lives in island-speak-ai.ts (server-only) so
//     the OpenAI SDK never enters the client bundle.
//
// North star: own voice first; one failure, one next action; measure usable
// access, not memorization. The AI never invents facts — it names what happened.

export const QUOTE_LIMIT = 200;
export const LINE_LIMIT = 240;
export const SUGGEST_LIMIT = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SpeakGap = "meaning" | "new_language" | "retrieval" | "pressure";
export type EvidenceChoice = "not_yet" | "recognized" | "came_back";

export const SPEAK_GAPS: readonly SpeakGap[] = ["retrieval", "new_language", "meaning", "pressure"];

/** Design-authored copy for each gap type. Definitions + drill framing stay
 *  fixed so the UX voice is consistent; only the evidence is dynamic. */
export const SPEAK_GAP_META: Record<SpeakGap, { name: string; def: string; drillTitle: string; drillNote: string }> = {
  retrieval: {
    name: "Retrieval gap",
    def: "You have the phrase — it didn’t come out.",
    drillTitle: "Use your phrase once",
    drillNote: "Say one sentence of your own with it. That’s the whole drill.",
  },
  new_language: {
    name: "New language gap",
    def: "You needed a way to say it that you don’t have yet.",
    drillTitle: "Save one new phrase",
    drillNote: "Just one, clearly labeled new. It goes to your Phrase Bank.",
  },
  meaning: {
    name: "Meaning gap",
    def: "One idea didn’t come across.",
    drillTitle: "Revise that one beat",
    drillNote: "Edit it until it says what you mean. Nothing else.",
  },
  pressure: {
    name: "Pressure gap",
    def: "You froze or rushed under time.",
    drillTitle: "Thirty seconds, just the opening",
    drillNote: "Say only your first beat. Short and time-boxed on purpose.",
  },
};

/** Learner-facing evidence buttons → the island-SRS interval they schedule.
 *  Mirrors the design's echo copy (1 minute / 2 days / 7 days). */
export const SPEAK_EVIDENCE: { id: EvidenceChoice; label: string; sched: string }[] = [
  { id: "not_yet", label: "Not yet", sched: "~1 minute" },
  { id: "recognized", label: "I recognized it", sched: "~2 days" },
  { id: "came_back", label: "It came back", sched: "~7 days" },
];

export interface PhraseRef {
  id: string;
  text: string;
}

export interface Diagnosis {
  gap: SpeakGap;
  /** A verbatim span from attempt 1 (the moment the gap shows). */
  quote: string;
  /** 0-based beat this gap relates to, or null. */
  beatIndex: number | null;
  /** Retrieval only: the owned phrase they were reaching for (resolved to a
   *  real Phrase Bank item), or null when none matched. */
  phraseText: string | null;
  phraseItemId: string | null;
  /** New-language only: one short phrase to save. */
  suggestion: string | null;
  recapFail: string;
  recapChange: string;
}

export function asText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

/** True when the (owned or suggested) phrase actually shows up in the attempt —
 *  this is how "Used" is EARNED, not clicked. Pure so the page + tests agree. */
export function usedInAttempt(attempt: string, phrase: string | null): boolean {
  if (!phrase) return false;
  const a = normalize(attempt);
  const p = normalize(phrase);
  return p.length > 0 && a.includes(p);
}

/** Evidence choice → the leftover repair's next-review schedule (island SRS).
 *  Pure; the page persists the returned fields onto island_repairs. */
export function repairSchedule(choice: EvidenceChoice, now: Date = new Date()): { interval_days: number; due_at: string } {
  const days = choice === "not_yet" ? 1 / 1440 : choice === "recognized" ? 2 : 7;
  return { interval_days: days, due_at: new Date(now.getTime() + days * DAY_MS).toISOString() };
}

/**
 * Validate the model's JSON into a bounded Diagnosis. Pure — no I/O — so the
 * gap classification, quote, beat index, and phrase resolution can be
 * unit-tested independently of the OpenAI call. A retrieval phrase is resolved
 * against the learner's real saved phrases (exact normalized match, or one
 * containing the other); an unresolved phrase becomes null rather than a
 * fabricated bank item.
 */
export function parseDiagnosis(raw: unknown, phrases: PhraseRef[], beatCount: number): Diagnosis {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawGap = asText(obj.gap, 24).toLowerCase().replace(/[\s-]/g, "_");
  const gap: SpeakGap = (SPEAK_GAPS as readonly string[]).includes(rawGap) ? (rawGap as SpeakGap) : "meaning";

  let beatIndex: number | null = null;
  const bi = obj.beatIndex ?? obj.beat_index;
  if (typeof bi === "number" && Number.isInteger(bi) && bi >= 0 && bi < beatCount) beatIndex = bi;

  // Resolve a retrieval phrase to a real saved item; never invent one.
  let phraseText: string | null = null;
  let phraseItemId: string | null = null;
  if (gap === "retrieval") {
    const wanted = normalize(asText(obj.phraseText ?? obj.phrase, LINE_LIMIT));
    if (wanted) {
      const hit = phrases.find((p) => {
        const t = normalize(p.text);
        return t === wanted || t.includes(wanted) || wanted.includes(t);
      });
      if (hit) {
        phraseText = hit.text;
        phraseItemId = hit.id;
      }
    }
  }

  const suggestion = gap === "new_language" ? asText(obj.suggestion, SUGGEST_LIMIT) || null : null;

  return {
    gap,
    quote: asText(obj.quote, QUOTE_LIMIT),
    beatIndex,
    phraseText,
    phraseItemId,
    suggestion,
    recapFail: asText(obj.recapFail ?? obj.recap_fail, LINE_LIMIT),
    recapChange: asText(obj.recapChange ?? obj.recap_change, LINE_LIMIT),
  };
}
