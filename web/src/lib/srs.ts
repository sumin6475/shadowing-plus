// SM-2-lite. Pure function, no I/O. Persisted to bookmarks table by the
// /api/bookmarks/[id]/verdict route.
//
// Operation order matters for `again`: ease decays BEFORE the interval is
// reset, but the new ease is what's persisted. For `good`/`easy`, the new
// interval is computed with the OLD ease, then ease is updated. This matches
// canonical SM-2.

import type { SrsVerdict } from "./types";

const EASE_FLOOR = 1.3;
const AGAIN_PENALTY = 0.2;
const EASY_BONUS = 0.15;
const FIRST_GOOD_DAYS = 2;
const FIRST_EASY_DAYS = 7;
const AGAIN_DELAY_MIN = 1;

export interface SrsState {
  ease_factor: number;
  interval_days: number;
  lapses: number;
}

export interface SrsNext extends SrsState {
  due_at: string;
  last_verdict: SrsVerdict;
  last_reviewed_at: string;
}

export function applyVerdict(
  state: SrsState,
  verdict: SrsVerdict,
  now: Date = new Date(),
): SrsNext {
  const oldEase = state.ease_factor;
  const oldInterval = state.interval_days;

  let ease = oldEase;
  let interval = oldInterval;
  let lapses = state.lapses;
  let dueMs: number;

  if (verdict === "again") {
    ease = Math.max(EASE_FLOOR, oldEase - AGAIN_PENALTY);
    interval = 0;
    lapses = lapses + 1;
    dueMs = now.getTime() + AGAIN_DELAY_MIN * 60 * 1000;
  } else if (verdict === "good") {
    interval = oldInterval === 0 ? FIRST_GOOD_DAYS : oldInterval * oldEase;
    // ease unchanged on Good
    dueMs = now.getTime() + interval * 24 * 60 * 60 * 1000;
  } else {
    // easy
    interval =
      oldInterval === 0 ? FIRST_EASY_DAYS : oldInterval * oldEase * 1.3;
    ease = oldEase + EASY_BONUS;
    dueMs = now.getTime() + interval * 24 * 60 * 60 * 1000;
  }

  return {
    ease_factor: ease,
    interval_days: interval,
    lapses,
    due_at: new Date(dueMs).toISOString(),
    last_verdict: verdict,
    last_reviewed_at: now.toISOString(),
  };
}
