// search-model.ts — the pure half of global Search: normalising, scoring and
// ranking. No data access, so tests/search-model.test.mjs can run it directly.
// Ported from the cloud session's PR #11 onto the MVP's phrases and notes.

export function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Score one item. `primary` is the field the learner sees as the title; the
 * rest are secondary. Every query word must appear somewhere, else 0.
 * Higher is better: title starts with the query > a title word starts with it
 * > title contains it > every word is in the title > only a secondary field.
 */
export function scoreMatch(
  query: string,
  primary: string,
  secondary: (string | null | undefined)[] = [],
): number {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(primary);
  const rest = secondary
    .filter(Boolean)
    .map((field) => normalize(field as string))
    .join(" \n ");
  const words = q.split(" ");
  if (!words.every((word) => title.includes(word) || rest.includes(word))) return 0;
  if (title.startsWith(q)) return 100;
  if (title.includes(` ${q}`)) return 80;
  if (title.includes(q)) return 60;
  if (words.every((word) => title.includes(word))) return 40;
  return 20;
}

const GROUP_LIMIT = 30;

/** Best matches first; equal scores keep the loader's order (newest first). */
export function rank<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, order) => ({ item, order, score: score(item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, GROUP_LIMIT)
    .map((entry) => entry.item);
}

/** A short piece of `text` around the first query word, for result subtitles. */
export function snippet(
  text: string | null | undefined,
  query: string,
  radius = 36,
): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  const firstWord = normalize(query).split(" ")[0];
  const at = firstWord ? flat.toLowerCase().indexOf(firstWord) : -1;
  if (at < 0)
    return flat.length > radius * 2 ? `${flat.slice(0, radius * 2).trimEnd()}…` : flat;
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + firstWord.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}
