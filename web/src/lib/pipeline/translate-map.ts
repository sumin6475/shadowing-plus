/** Sentinel stored when a batch entry is missing or empty. Not shown in the player. */
export const TRANSLATION_FAILED = "[translation failed]";

/**
 * Align model output to a batch of N source lines. Prefers the returned `n`
 * (1-based) so a dropped/reordered entry doesn't shift every later line;
 * falls back to array position when `n` is omitted.
 */
export function mapBatchTranslations(
  items: Array<{ n?: number; translation?: string }>,
  batchLength: number,
): string[] {
  const byNum = new Map<number, string>();
  for (const it of items) {
    const n = typeof it?.n === "number" ? it.n : undefined;
    const t = typeof it?.translation === "string" ? it.translation : "";
    if (n !== undefined && t.trim() && !byNum.has(n)) byNum.set(n, t);
  }
  const keyed = byNum.size > 0;
  return Array.from({ length: batchLength }, (_, k) => {
    if (keyed) return byNum.get(k + 1) ?? TRANSLATION_FAILED;
    const positional = items[k]?.translation;
    return typeof positional === "string" && positional.trim()
      ? positional
      : TRANSLATION_FAILED;
  });
}

/**
 * True when this line should be sent back to the translator: empty, the
 * failure sentinel, or a long source whose gloss is far too short to have
 * covered the clauses (the model summarized instead of translating).
 */
export function translationNeedsRetry(
  source: string,
  translation: string | null | undefined,
): boolean {
  const t = (translation ?? "").trim();
  if (!t || t === TRANSLATION_FAILED) return true;
  const src = source.trim();
  if (src.length < 180) return false;
  return t.length / src.length < 0.28;
}

/** Hide the failure sentinel so the player shows a blank line, not the tag. */
export function visibleTranslation(
  translation: string | null | undefined,
): string | null {
  const t = (translation ?? "").trim();
  if (!t || t === TRANSLATION_FAILED) return null;
  return t;
}

/**
 * Pack segment character-lengths into batches. `maxCount` is the cap on
 * lines; `charBudget` keeps a handful of paragraph-length lines from sharing
 * one completion (that's when the model starts summarizing).
 */
export function packTranslateBatches(
  lengths: number[],
  maxCount: number,
  charBudget: number,
): { start: number; count: number }[] {
  const out: { start: number; count: number }[] = [];
  let i = 0;
  while (i < lengths.length) {
    let count = 0;
    let chars = 0;
    while (i + count < lengths.length && count < maxCount) {
      const len = lengths[i + count];
      if (count > 0 && chars + len > charBudget) break;
      chars += len;
      count++;
    }
    if (count === 0) count = 1;
    out.push({ start: i, count });
    i += count;
  }
  return out;
}
