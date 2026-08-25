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

export { nextReviewInterval };
export const REVIEW_LADDER_DAYS = [1, 3, 7, 30] as const;
export const PHRASES_PER_DAY_OPTIONS = [3, 5, 7, 10] as const;
export const DEFAULT_PHRASES_PER_DAY = 5;

const COUNT_KEY = "phrases_per_day";
const QUEUE_KEY = "daily_phrase_queue";
const DAY_MS = 86_400_000;

let countOverride: number | null = null;

export type RankInput = {
  id: string;
  learningStatus: LearningStatus;
  createdAt: string;
  dueAt: string;
  lastReviewedAt: string | null;
  lastPracticedAt: string | null;
  lastSelfTalkUsedAt: string | null;
  lapses: number;
  reviewPinUntil: string | null;
};

type QueueCache = {
  date: string;
  ids: string[];
  count: number;
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
  return typeof value === "number" && (PHRASES_PER_DAY_OPTIONS as readonly number[]).includes(value);
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

export function phraseUrgencyScore(phrase: RankInput, today: string, now = Date.now()): number {
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

export function rankPhrasesForDay(phrases: RankInput[], today: string, limit: number, now = Date.now()): RankInput[] {
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

export function toRankInput(phrase: PhraseItem, lastSelfTalkUsedAt: string | null): RankInput {
  return {
    id: phrase.id,
    learningStatus: phrase.learningStatus,
    createdAt: phrase.createdAt,
    dueAt: phrase.dueAt,
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
    if (!parsed?.date || !Array.isArray(parsed.ids) || !isPhrasesPerDay(parsed.count)) return null;
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
    const extras = rankPhrasesForDay(
      phrases.filter((phrase) => !taken.has(phrase.id)).map((phrase) => toRankInput(phrase, usedAt[phrase.id] ?? null)),
      today,
      n - kept.length,
    );
    const next = [...kept, ...hydrate(extras.map((item) => item.id))].slice(0, n);
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ date: today, ids: next.map((phrase) => phrase.id), count: n } satisfies QueueCache));
    } catch {
      // Frozen ids still work for this session.
    }
    return next;
  }

  const ranked = rankPhrasesForDay(
    phrases.map((phrase) => toRankInput(phrase, usedAt[phrase.id] ?? null)),
    today,
    n,
  );
  const next = hydrate(ranked.map((item) => item.id));
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ date: today, ids: next.map((phrase) => phrase.id), count: n } satisfies QueueCache));
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
