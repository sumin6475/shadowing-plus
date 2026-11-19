// learner-context.ts — the light personal layer for AI requests.
//
// What the app already knows about the learner, read under their own RLS and
// handed to a prompt as reference data: the English level they chose, the
// coaching profile compiled from their Speaking focus (goal, focus areas,
// voice), and the phrases already in their phrase bank. Nothing here compiles,
// infers or writes; every read is best-effort, so a missing table row (or a
// failed read) just leaves that line out.
//
// The phrase bank list is what makes the layer "learn": every phrase the
// learner saves changes what is recommended next.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type LearnerLevel = "a2" | "b1" | "b2" | "c1";
const LEVELS: readonly LearnerLevel[] = ["a2", "b1", "b2", "c1"];

export interface LearnerContext {
  level: LearnerLevel | null;
  /** From the compiled coaching profile; "" when there is none. */
  objective: string;
  /** "category — reason", from the compiled coaching profile. */
  focuses: string[];
  voice: string;
  difficulty: string;
  /** Newest first. */
  savedPhrases: string[];
}

export const EMPTY_LEARNER: LearnerContext = { level: null, objective: "", focuses: [], voice: "", difficulty: "", savedPhrases: [] };

/** How many saved phrases a prompt carries (newest first). */
export const SAVED_PHRASES_LIMIT = 40;

export const asLevel = (value: unknown): LearnerLevel | null =>
  typeof value === "string" && (LEVELS as readonly string[]).includes(value.trim().toLowerCase())
    ? (value.trim().toLowerCase() as LearnerLevel)
    : null;

/** Same ladder as talk-diagnose's level guide, phrased for any suggestion. */
const LEVEL_GUIDE: Record<LearnerLevel, string> = {
  a2: "A2 (basic) — prefer short, high-frequency everyday English; no idioms or formal register.",
  b1: "B1 (intermediate) — natural, common phrasing one small step above what they can already say; avoid rare or heavily formal words.",
  b2: "B2 (upper intermediate) — fluent, precise phrasing and common collocations; light idioms only when genuinely common.",
  c1: "C1 (advanced) — polished, professional-grade phrasing with sharp nuance; never watered down to textbook English.",
};

const clip = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

/** The compiled coaching profile (coaching_profile_versions.profile) as context fields. */
export function fromProfile(profile: unknown): Pick<LearnerContext, "objective" | "focuses" | "voice" | "difficulty"> {
  const p = (profile ?? {}) as { objective?: unknown; focuses?: unknown; voice?: unknown; difficulty?: unknown };
  const focuses = (Array.isArray(p.focuses) ? p.focuses : [])
    .map((f) => {
      const o = (f ?? {}) as { category?: unknown; reason?: unknown };
      const category = clip(o.category, 40).replace(/_/g, " ");
      const reason = clip(o.reason, 160);
      return category ? (reason ? `${category} — ${reason}` : category) : "";
    })
    .filter(Boolean)
    .slice(0, 3);
  return { objective: clip(p.objective, 240), focuses, voice: clip(p.voice, 24), difficulty: clip(p.difficulty, 24) };
}

/** The context as one reference block for a prompt; null when nothing is known. */
export function describeLearner(ctx: LearnerContext): string | null {
  const lines: string[] = [];
  if (ctx.level) lines.push(`English level: ${LEVEL_GUIDE[ctx.level]}`);
  if (ctx.objective) lines.push(`Their speaking goal: ${ctx.objective}`);
  if (ctx.focuses.length) lines.push(`What they are working on: ${ctx.focuses.join("; ")}`);
  if (ctx.voice || ctx.difficulty) {
    lines.push(`Preferred voice: ${[ctx.voice, ctx.difficulty && `difficulty ${ctx.difficulty}`].filter(Boolean).join(", ")}`);
  }
  if (ctx.savedPhrases.length) {
    lines.push(`Already in their phrase bank (never recommend these again as a phrase to save): ${JSON.stringify(ctx.savedPhrases)}`);
  }
  return lines.length ? lines.join("\n") : null;
}

/** Reads the layer for `userId`. `clientLevel` is the level chosen on this
 *  device, used only when the account has no saved coaching level. */
export async function loadLearnerContext(supabase: SupabaseClient, userId: string, clientLevel?: unknown): Promise<LearnerContext> {
  const ctx: LearnerContext = { ...EMPTY_LEARNER, level: asLevel(clientLevel), focuses: [], savedPhrases: [] };
  const [prefs, phrases] = await Promise.all([
    supabase.from("coaching_preferences").select("english_level,current_profile_version_id").eq("user_id", userId).maybeSingle(),
    supabase.from("phrase_items").select("text").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(SAVED_PHRASES_LIMIT),
  ]);
  if (prefs.error) console.error("learner-context: preferences", prefs.error.message);
  if (phrases.error) console.error("learner-context: phrases", phrases.error.message);
  const saved = asLevel(prefs.data?.english_level);
  if (saved) ctx.level = saved;
  ctx.savedPhrases = (phrases.data ?? []).map((row: { text?: unknown }) => clip(row.text, 120)).filter(Boolean);
  const versionId = prefs.data?.current_profile_version_id;
  if (versionId) {
    const version = await supabase.from("coaching_profile_versions").select("profile").eq("id", versionId).maybeSingle();
    if (version.error) console.error("learner-context: profile", version.error.message);
    else Object.assign(ctx, fromProfile(version.data?.profile));
  }
  return ctx;
}
