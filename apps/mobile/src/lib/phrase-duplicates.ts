/** Conservative, offline phrase comparison. It finds wording overlap and
 * small typos; it does not claim semantic equivalence between paraphrases. */
export interface SavedPhraseCandidate {
  id: string;
  text: string;
  meaning: string | null;
  source: string | null;
}

export interface SavedPhraseMatch extends SavedPhraseCandidate {
  match: "exact" | "similar";
  score: number;
}

export function comparablePhrase(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function words(text: string): string[] {
  return comparablePhrase(text)
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/n't\b/g, " not")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\b(you|we|they)'re\b/g, "$1 are")
    .replace(/\b(i|you|we|they)'ve\b/g, "$1 have")
    .replace(/\b(i|you|he|she|it|we|they)'ll\b/g, "$1 will")
    .replace(/\b(it|he|she|that|there|what)'s\b/g, "$1 is")
    .split(" ").filter(Boolean);
}

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = next;
  }
  return previous[b.length];
}

const NEGATION = new Set(["not", "never", "no", "neither", "nor", "without", "cannot"]);
const POSSESSIVE = new Set(["my", "your", "his", "her", "its", "our", "their", "one's"]);
const FUNCTION_WORDS = new Set(["i", "am", "is", "are", "be", "to", "a", "an", "the", "it", "you", "we", "they", "he", "she", "my", "your", "our", "their", "of", "for", "and", "or", "in", "on", "at"]);

export function compareSavedPhrases(draft: string, saved: string): { match: "exact" | "similar"; score: number } | null {
  const a = comparablePhrase(draft);
  const b = comparablePhrase(saved);
  if (!a || !b) return null;
  if (a === b) return { match: "exact", score: 1 };
  const aw = words(a);
  const bw = words(b);
  if (aw.some(w => NEGATION.has(w)) !== bw.some(w => NEGATION.has(w))) return null;
  const ac = aw.join(" ");
  const bc = bw.join(" ");
  if (ac === bc) return { match: "similar", score: 0.99 };
  if (aw.length >= 3 && aw.length === bw.length && aw.every((word, i) => word === bw[i] || (POSSESSIVE.has(word) && POSSESSIVE.has(bw[i])))) {
    return { match: "similar", score: 0.97 };
  }

  // Only warn for a contained reusable phrase, not a shared single word.
  const [shorter, longer] = aw.length <= bw.length ? [aw, bw] : [bw, aw];
  const contains = (" " + longer.join(" ") + " ").includes(" " + shorter.join(" ") + " ");
  if (contains && shorter.length >= 3 && shorter.some(w => !FUNCTION_WORDS.has(w)) && shorter.length / longer.length >= 0.5) {
    return { match: "similar", score: 0.94 };
  }

  const longest = Math.max(ac.length, bc.length);
  const editsAllowed = longest >= 16 ? 2 : 1;
  if (Math.min(ac.length, bc.length) < 8 || Math.abs(ac.length - bc.length) > editsAllowed) return null;
  const edits = distance(ac, bc);
  const score = 1 - edits / longest;
  if (edits <= editsAllowed && score >= 0.88) {
    // For a whole-word substitution, shared words must include content, not
    // just scaffolding such as "I am" or "take the".
    const sharedContent = aw.some(w => !FUNCTION_WORDS.has(w) && bw.includes(w));
    const changedWords = aw.filter((w, i) => w !== bw[i]);
    const wholeWordChange = aw.length === bw.length && changedWords.some(w => bw.some(other => other !== w && distance(w, other) <= editsAllowed));
    if (wholeWordChange && !sharedContent && edits > 0 && aw.length > 1) return null;
    return { match: "similar", score };
  }
  return null;
}

export function rankSavedPhraseMatches(draft: string, candidates: SavedPhraseCandidate[], excludeId?: string): SavedPhraseMatch[] {
  return candidates.flatMap(candidate => {
    if (candidate.id === excludeId) return [];
    const result = compareSavedPhrases(draft, candidate.text);
    return result ? [{ ...candidate, ...result }] : [];
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
}
