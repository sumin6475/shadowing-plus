// Pure selection logic for the daily phrase queue. Native persistence and data
// loading live in daily-phrases.ts so this policy stays cheap to test.

export type DailyRankInput = {
  id: string;
  learningStatus: "new" | "recognizing" | "practicing" | "ready";
  createdAt: string;
  dueAt: string;
  intervalDays: number;
  lastReviewedAt: string | null;
  lastPracticedAt: string | null;
  lastSelfTalkUsedAt: string | null;
  lapses: number;
  reviewPinUntil: string | null;
};

const DAY_MS = 86_400_000;
const REINFORCEMENT_INTERVALS = new Set([1, 3, 7]);

export function phraseUrgencyScore(phrase: DailyRankInput, today: string, now = Date.now()): number {
  const overdueDays = Math.floor((now - new Date(phrase.dueAt).getTime()) / DAY_MS);
  const dueBoost = overdueDays >= 0 ? 20 + Math.min(40, overdueDays * 8) : Math.max(-24, overdueDays * 4);
  const stageBoost =
    phrase.learningStatus === "ready" ? 0 : phrase.learningStatus === "practicing" ? 16 : 30;
  const ageDays = Math.max(0, Math.floor((now - new Date(phrase.createdAt).getTime()) / DAY_MS));
  const ageBoost = phrase.lastReviewedAt ? 0 : Math.min(20, 8 + ageDays * 2);
  const lastTouch = phrase.lastReviewedAt ?? phrase.lastPracticedAt;
  const staleDays = lastTouch ? Math.max(0, Math.floor((now - new Date(lastTouch).getTime()) / DAY_MS)) : ageDays;
  const staleBoost = Math.min(25, staleDays * 1.5);
  let usedBoost = 8;
  if (phrase.lastSelfTalkUsedAt) {
    const usedDays = Math.floor((now - new Date(phrase.lastSelfTalkUsedAt).getTime()) / DAY_MS);
    usedBoost = usedDays <= 3 ? -10 : usedDays <= 14 ? 0 : 6;
  }
  const pinBoost = phrase.reviewPinUntil === today ? 1000 : 0;
  const lapseBoost = Math.min(16, phrase.lapses * 4);
  return dueBoost + stageBoost + ageBoost + staleBoost + usedBoost + pinBoost + lapseBoost;
}

export function rankPhrasesForDay<T extends DailyRankInput>(
  phrases: T[],
  today: string,
  limit: number,
  now = Date.now(),
): T[] {
  return [...phrases]
    .sort((a, b) => {
      const score = phraseUrgencyScore(b, today, now) - phraseUrgencyScore(a, today, now);
      if (score !== 0) return score;
      const due = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (due !== 0) return due;
      return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(0, limit));
}

/** New/unreviewed language and 30-day returns form the 20% discovery lane. */
export function isDiscoveryPhrase(phrase: DailyRankInput): boolean {
  return !phrase.lastReviewedAt || phrase.intervalDays >= 30;
}

/** The 1/3/7-day ladder forms the 80% reinforcement lane. */
export function isReinforcementPhrase(phrase: DailyRankInput): boolean {
  return Boolean(phrase.lastReviewedAt) && REINFORCEMENT_INTERVALS.has(phrase.intervalDays);
}

/**
 * At two or more phrases, keep at least one item in both lanes. At one phrase
 * per day, spread the 20% discovery share across a stable five-day cycle so
 * rounding never starves either lane.
 */
export function discoverySlotsForDay(limit: number, today: string): number {
  if (limit <= 0) return 0;
  if (limit === 1) {
    const day = Math.floor(Date.parse(`${today}T00:00:00Z`) / DAY_MS);
    return Number.isFinite(day) && day % 5 === 0 ? 1 : 0;
  }
  return Math.max(1, Math.min(limit - 1, Math.round(limit * 0.2)));
}

/** Select the 20/80 mix, then preserve the existing urgency order on screen. */
export function balancedPhrasesForDay<T extends DailyRankInput>(
  phrases: T[],
  today: string,
  limit: number,
  now = Date.now(),
): T[] {
  const size = Math.max(0, limit);
  if (!size || !phrases.length) return [];

  const ranked = rankPhrasesForDay(phrases, today, phrases.length, now);
  const discovery = ranked.filter(isDiscoveryPhrase);
  const reinforcement = ranked.filter(isReinforcementPhrase);
  const discoverySlots = discoverySlotsForDay(size, today);
  const reinforcementSlots = size - discoverySlots;
  const selected = new Set<string>();

  for (const phrase of discovery.slice(0, discoverySlots)) selected.add(phrase.id);
  for (const phrase of reinforcement.slice(0, reinforcementSlots)) selected.add(phrase.id);

  // A small bank, a missed review rung, or a newly deleted phrase should not
  // leave the learner with fewer cards. Spill from the best remaining items.
  for (const phrase of ranked) {
    if (selected.size >= size) break;
    selected.add(phrase.id);
  }

  return ranked.filter((phrase) => selected.has(phrase.id)).slice(0, size);
}
