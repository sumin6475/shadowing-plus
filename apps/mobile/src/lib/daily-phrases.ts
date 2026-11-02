// daily-phrases.ts — today's Phrase Bank review queue.
//
// Rank the whole bank with an inspectable 1/3/7/30 schedule plus stage, age,
// last review, and last self-talk use. Freeze the top N for the local calendar
// day so the list is stable until the learner changes the daily count.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

import {
  fetchLastSelfTalkUsedAt,
  fetchPhrases,
  nextReviewInterval,
  type LearningStatus,
  type PhraseItem,
} from "./phrases";
import {
  balancedPhrasesForDay,
  type DailyRankInput,
} from "./daily-phrase-ranking";

export {
  balancedPhrasesForDay,
  discoverySlotsForDay,
  isDiscoveryPhrase,
  isReinforcementPhrase,
  phraseUrgencyScore,
  rankPhrasesForDay,
} from "./daily-phrase-ranking";

export { nextReviewInterval };
export const REVIEW_LADDER_DAYS = [1, 3, 7, 30] as const;
/** The learner picks any whole number in this range (Settings stepper). */
export const MIN_PHRASES_PER_DAY = 1;
export const MAX_PHRASES_PER_DAY = 20;
export const DEFAULT_PHRASES_PER_DAY = 5;

const COUNT_KEY = "phrases_per_day";
const QUEUE_KEY = "daily_phrase_queue";
const QUEUE_STRATEGY = 2;

let countOverride: number | null = null;

export type RankInput = DailyRankInput;

type QueueCache = {
  date: string;
  ids: string[];
  count: number;
  strategy: number;
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when an ISO timestamp falls on the learner's local calendar day. */
export function reviewedOnLocalDay(iso: string | null | undefined, day = localDateKey()): boolean {
  if (!iso) return false;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  return localDateKey(at) === day;
}

export function tomorrowDateKey(from = new Date()): string {
  return localDateKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1));
}

export function isPhrasesPerDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_PHRASES_PER_DAY && value <= MAX_PHRASES_PER_DAY;
}

export function phrasesPerDay(): number {
  return countOverride ?? DEFAULT_PHRASES_PER_DAY;
}

export function setPhrasesPerDay(value: number | null): void {
  countOverride = value && isPhrasesPerDay(value) ? value : null;
}

export async function loadPhrasesPerDay(): Promise<void> {
  try {
    const saved = Number(await AsyncStorage.getItem(COUNT_KEY));
    if (isPhrasesPerDay(saved)) countOverride = saved;
  } catch {
    // Keep the default of 5.
  }
}

export async function persistPhrasesPerDay(value: number): Promise<void> {
  if (!isPhrasesPerDay(value)) return;
  setPhrasesPerDay(value);
  try {
    await AsyncStorage.setItem(COUNT_KEY, String(value));
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // In-memory override still applies for this session.
  }
}

export function toRankInput(phrase: PhraseItem, lastSelfTalkUsedAt: string | null): RankInput {
  return {
    id: phrase.id,
    learningStatus: phrase.learningStatus,
    createdAt: phrase.createdAt,
    dueAt: phrase.dueAt,
    intervalDays: phrase.intervalDays,
    lastReviewedAt: phrase.lastReviewedAt,
    lastPracticedAt: phrase.lastPracticedAt,
    lastSelfTalkUsedAt,
    lapses: phrase.lapses,
    reviewPinUntil: phrase.reviewPinUntil,
  };
}

function parseQueue(value: string | null): QueueCache | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as QueueCache;
    if (
      !parsed?.date ||
      !Array.isArray(parsed.ids) ||
      !isPhrasesPerDay(parsed.count) ||
      parsed.strategy !== QUEUE_STRATEGY
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Today's N phrases. Same local day returns the frozen list; a new day reranks. */
export async function todaysPhrases(): Promise<PhraseItem[]> {
  const [phrases, usedAt] = await Promise.all([fetchPhrases(), fetchLastSelfTalkUsedAt()]);
  const n = phrasesPerDay();
  const today = localDateKey();
  const byId = new Map(phrases.map((phrase) => [phrase.id, phrase]));
  let cached: QueueCache | null = null;
  try {
    cached = parseQueue(await AsyncStorage.getItem(QUEUE_KEY));
  } catch {
    cached = null;
  }

  const hydrate = (ids: string[]): PhraseItem[] =>
    ids.map((id) => byId.get(id)).filter((phrase): phrase is PhraseItem => Boolean(phrase));

  if (cached && cached.date === today && cached.count === n) {
    const kept = hydrate(cached.ids);
    if (kept.length >= n || kept.length === phrases.length) return kept.slice(0, n);
    const taken = new Set(kept.map((phrase) => phrase.id));
    const extras = balancedPhrasesForDay(
      phrases.map((phrase) => toRankInput(phrase, usedAt[phrase.id] ?? null)),
      today,
      n,
    ).filter((phrase) => !taken.has(phrase.id));
    const next = [...kept, ...hydrate(extras.map((item) => item.id))].slice(0, n);
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ date: today, ids: next.map((phrase) => phrase.id), count: n, strategy: QUEUE_STRATEGY } satisfies QueueCache));
    } catch {
      // Frozen ids still work for this session.
    }
    return next;
  }

  const ranked = balancedPhrasesForDay(
    phrases.map((phrase) => toRankInput(phrase, usedAt[phrase.id] ?? null)),
    today,
    n,
  );
  const next = hydrate(ranked.map((item) => item.id));
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ date: today, ids: next.map((phrase) => phrase.id), count: n, strategy: QUEUE_STRATEGY } satisfies QueueCache));
  } catch {
    // Ranking still returns a list for this session.
  }
  return next;
}

export function shouldPromptStage(input: {
  reason: "used" | "review";
  learningStatus: LearningStatus;
  reviewsSinceStage: number;
  nextIntervalDays: number;
}): boolean {
  if (input.reason === "used") return true;
  if (input.reviewsSinceStage >= 3) return true;
  if (input.nextIntervalDays >= 7 && (input.learningStatus === "new" || input.learningStatus === "recognizing")) return true;
  if (input.nextIntervalDays >= 30 && input.learningStatus !== "ready") return true;
  return false;
}

export function promptPhraseStage(opts: {
  text: string;
  onChoose: (stage: LearningStatus) => void;
}): void {
  Alert.alert(
    "How available is this phrase?",
    `“${opts.text}”\n\nRecognize: I understand it when I see it.\nUse with help: I can use it with a hint.\nUse on my own: I can bring it into speaking.`,
    [
      { text: "Recognize", onPress: () => opts.onChoose("recognizing") },
      { text: "Use with help", onPress: () => opts.onChoose("practicing") },
      { text: "Use on my own", onPress: () => opts.onChoose("ready") },
      { text: "Not now", style: "cancel" },
    ],
  );
}
