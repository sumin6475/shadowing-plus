// search.ts — global Search (opened by pulling down at the top of a tab).
// Loads the learner's phrases and Studio content once, then matches on-device
// as they type. Pure matching lives here so the screen only renders.
import { fetchPhrases, type PhraseItem } from "./phrases";
import {
  fetchSpeakingNotes,
  fetchStudioSituations,
  fetchStudioTopics,
  type SpeakingNote,
  type StudioSituation,
  type StudioTopic,
} from "./studio-information";

export interface SearchIndex {
  phrases: PhraseItem[];
  topics: StudioTopic[];
  situations: StudioSituation[];
  notes: SpeakingNote[];
}

export interface SearchResults {
  phrases: PhraseItem[];
  topics: StudioTopic[];
  situations: StudioSituation[];
  notes: SpeakingNote[];
  total: number;
}

const NOTE_LIMIT = 300;
const GROUP_LIMIT = 30;

export async function loadSearchIndex(): Promise<SearchIndex> {
  const [phrases, topics, situations, notes] = await Promise.all([
    fetchPhrases(),
    fetchStudioTopics(),
    fetchStudioSituations(),
    fetchSpeakingNotes({ limit: NOTE_LIMIT }),
  ]);
  return { phrases, topics, situations, notes };
}

export function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Score one item. `primary` is the field the learner sees as the title; the
 * rest are secondary. Every query word must appear somewhere, else 0.
 * Higher is better: title starts with the query > a title word starts with it
 * > title contains it > only a secondary field contains it.
 */
export function scoreMatch(query: string, primary: string, secondary: (string | null | undefined)[] = []): number {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(primary);
  const rest = secondary.filter(Boolean).map((field) => normalize(field as string)).join(" \n ");
  const words = q.split(" ");
  if (!words.every((word) => title.includes(word) || rest.includes(word))) return 0;

  if (title.startsWith(q)) return 100;
  if (title.includes(` ${q}`)) return 80;
  if (title.includes(q)) return 60;
  if (words.every((word) => title.includes(word))) return 40;
  return 20;
}

function rank<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, order) => ({ item, order, score: score(item) }))
    .filter((entry) => entry.score > 0)
    // Stable: equal scores keep the loader's order (newest first).
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, GROUP_LIMIT)
    .map((entry) => entry.item);
}

export function searchIndex(index: SearchIndex, query: string): SearchResults {
  const phrases = rank(index.phrases, (p) =>
    scoreMatch(query, p.text, [p.translation, p.usageNote, p.memo, p.context, p.source]),
  );
  const topics = rank(index.topics, (topic) => scoreMatch(query, topic.name));
  const situations = rank(index.situations, (s) => scoreMatch(query, s.title, [s.description, s.topicName]));
  const notes = rank(index.notes, (n) =>
    scoreMatch(query, n.title, [n.goal, n.body, n.situationTitle, n.topicName]),
  );
  return {
    phrases,
    topics,
    situations,
    notes,
    total: phrases.length + topics.length + situations.length + notes.length,
  };
}

/** A short piece of `text` around the first query word, for result subtitles. */
export function snippet(text: string | null | undefined, query: string, radius = 36): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  const firstWord = normalize(query).split(" ")[0];
  const at = firstWord ? flat.toLowerCase().indexOf(firstWord) : -1;
  if (at < 0) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2).trimEnd()}…` : flat;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + firstWord.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}
