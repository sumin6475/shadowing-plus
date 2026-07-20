// Shared sentence-segmentation helpers used by both stage 2 (initial word
// grouping) and postprocess regroupSentences, so the two agree on where
// sentences end and how word tokens join back into display text.

/**
 * Sentence-ending punctuation. Latin (. ! ? …) plus the full-width CJK marks
 * that Japanese and Chinese use: 。(。) ！(！) ？(？) ．(．)
 * ‥(‥). Without the CJK marks a non-Latin transcript never finds a
 * boundary and collapses into one giant segment.
 */
export const SENTENCE_END_PUNCT = new Set([
  ".", "!", "?", "…",
  "。", "！", "？", "．", "‥",
]);

// CJK and related no-space scripts, by Unicode block: CJK symbols/punctuation
// (3000–303F), hiragana (3040–309F), katakana (30A0–30FF), CJK ext A
// (3400–4DBF), CJK unified ideographs (4E00–9FFF), CJK compatibility ideographs
// (F900–FAFF), and the half/full-width forms block incl. full-width punctuation
// (FF00–FFEF). Used only to decide whether two adjacent tokens need a space.
const CJK_RE =
  /[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/;

/** True if `ch` belongs to a script that isn't space-delimited (CJK). */
export function isCjkChar(ch: string): boolean {
  return CJK_RE.test(ch);
}

/**
 * Join word tokens into display text. Latin words are separated by spaces; two
 * adjacent CJK characters get none (Japanese/Chinese aren't space-delimited),
 * so the text reads naturally rather than with a space between every token.
 * Mixed boundaries (CJK↔Latin) keep a space.
 */
export function joinWords(words: string[]): string {
  let out = "";
  for (const raw of words) {
    const w = (raw ?? "").trim();
    if (!w) continue;
    if (out === "") {
      out = w;
      continue;
    }
    const prev = out[out.length - 1];
    const next = w[0];
    out += isCjkChar(prev) && isCjkChar(next) ? w : " " + w;
  }
  return out;
}
