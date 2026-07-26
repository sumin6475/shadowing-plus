// Phrase Bank spaced-review logic. Pure, no I/O — persisted to phrase_items by
// the Phrase Bank page through the RLS anon client (same pattern as bookmark
// verdicts). Mirrors the shape of srs.ts but is keyed on the learner-facing
// "quick check" from the design rather than again/good/easy.
//
// The three checks and their first-review intervals come straight from the
// design's echo copy (2 / 4 / 10 days). On a repeat check the interval grows
// multiplicatively (SM-2-lite), so a phrase the learner keeps producing on
// their own drifts further out instead of nagging.

export type PhraseQuickCheck = "recognized" | "withhelp" | "onmyown";

// The four STORED learning states. `refresh` is derived, never stored.
export type PhraseLearningStatus =
  | "new"
  | "recognizing"
  | "practicing"
  | "ready";

// The five DISPLAY states (adds `refresh` for an overdue phrase).
export type PhraseDisplayStatus = PhraseLearningStatus | "refresh";

const EASE_FLOOR = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Per-check tuning: target status, first-review days, ease delta, repeat growth,
// and whether a repeat RESETS to the fixed interval. The two weaker checks are
// fixed (recognizing → always 2 days, practicing → always 4): if the learner
// still only recognizes a phrase, it should keep coming back soon rather than
// drift out. Only "used it on my own" earns SM-2-style spacing that grows.
const CHECK_RULES: Record<
  PhraseQuickCheck,
  { status: PhraseLearningStatus; firstDays: number; easeDelta: number; growth: number; reset: boolean }
> = {
  recognized: { status: "recognizing", firstDays: 2, easeDelta: -0.1, growth: 1, reset: true },
  withhelp: { status: "practicing", firstDays: 4, easeDelta: 0, growth: 1, reset: true },
  onmyown: { status: "ready", firstDays: 10, easeDelta: 0.15, growth: 1.3, reset: false },
};

export interface PhraseSrsState {
  ease_factor: number | null;
  interval_days: number | null;
  lapses: number | null;
}

export interface PhraseSrsNext {
  learning_status: PhraseLearningStatus;
  ease_factor: number;
  interval_days: number;
  lapses: number;
  due_at: string;
  last_reviewed_at: string;
  last_practiced_at: string;
}

/**
 * Apply a learner quick-check to a phrase's SRS state. First review uses the
 * fixed design interval (2/4/10 days); a repeat multiplies the prior interval
 * by ease × growth. Ease is clamped at the SM-2 floor.
 */
export function applyQuickCheck(
  state: PhraseSrsState,
  check: PhraseQuickCheck,
  now: Date = new Date(),
): PhraseSrsNext {
  const rule = CHECK_RULES[check];
  const oldEase = state.ease_factor ?? 2.5;
  const oldInterval = state.interval_days ?? 0;

  const interval =
    rule.reset || oldInterval <= 0 ? rule.firstDays : oldInterval * oldEase * rule.growth;
  const ease = Math.max(EASE_FLOOR, oldEase + rule.easeDelta);
  const nowIso = now.toISOString();

  return {
    learning_status: rule.status,
    ease_factor: ease,
    interval_days: interval,
    lapses: state.lapses ?? 0,
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    last_reviewed_at: nowIso,
    last_practiced_at: nowIso,
  };
}

/**
 * Fold a stored row into one of the five display states. A never-practiced
 * `new` phrase is always shown as `new` (we don't nag something the learner
 * only just saved). Any other status whose `due_at` is in the past surfaces as
 * `refresh`.
 */
export function deriveDisplayStatus(
  row: { learning_status: string; due_at: string | null },
  now: Date = new Date(),
): PhraseDisplayStatus {
  const status = row.learning_status as PhraseLearningStatus;
  if (status === "new") return "new";
  if (row.due_at && new Date(row.due_at).getTime() < now.getTime()) {
    return "refresh";
  }
  return status;
}
