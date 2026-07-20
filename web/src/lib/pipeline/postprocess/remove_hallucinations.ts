import type { PipelineSegment } from "@/lib/types";

const NGRAM_SIZE = 4;
const NGRAM_MIN_REPEAT = 3;
const ANCHOR_MIN_WORDS = 20;
const CONTAINMENT = 0.7;
const ADJACENCY_WINDOW = 3;
const ORPHAN_MAX_WORDS = 6;

const STRIP_RE = /^[.,!?;:"'()[\]{}…—\-]+|[.,!?;:"'()[\]{}…—\-]+$/g;

function wordTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(STRIP_RE, "").toLowerCase())
    .filter((t) => t.length > 0);
}

function isMostlyLatin(text: string): boolean {
  let latin = 0;
  let total = 0;
  for (const c of text) {
    if (/\p{L}/u.test(c)) {
      total++;
      if (/[a-zA-Z]/.test(c)) latin++;
    }
  }
  return total === 0 ? false : latin / total > 0.5;
}

function ngramKeys(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(""));
  }
  return out;
}

function hasRepeatedNgram(
  tokens: string[],
  n: number,
  minRepeat: number,
): boolean {
  const counts = new Map<string, number>();
  for (const key of ngramKeys(tokens, n)) {
    const c = (counts.get(key) ?? 0) + 1;
    counts.set(key, c);
    if (c >= minRepeat) return true;
  }
  return false;
}

function bigramSet(tokens: string[]): Set<string> {
  return new Set(ngramKeys(tokens, 2));
}

/**
 * Conservative whisper repetition-loop detector. Three cascading rules:
 *
 *   R1 (anchor)     : segment has a 4-gram repeated ≥3 times AND ≥20 words.
 *   R3 (similarity) : unflagged segment within ±3 of an R1 anchor whose
 *                     unique bigrams are ≥70% contained in the anchor's set.
 *   R4 (orphan)     : unflagged short segment (<6 words) whose immediate
 *                     neighbors are both flagged.
 *
 * R3/R4 cascade only off R1, never off another R3/R4, so a single misfire
 * cannot snowball.
 */
function detectHallucinations(
  segments: PipelineSegment[],
): PipelineSegment[] {
  if (segments.length === 0) return segments;

  const tokensPerSeg = segments.map((s) => wordTokens(s.text ?? ""));

  const anchors = new Set<number>();
  for (let i = 0; i < tokensPerSeg.length; i++) {
    if (tokensPerSeg[i].length < ANCHOR_MIN_WORDS) continue;
    if (hasRepeatedNgram(tokensPerSeg[i], NGRAM_SIZE, NGRAM_MIN_REPEAT)) {
      anchors.add(i);
    }
  }

  const anchorBigrams = new Map<number, Set<string>>();
  for (const a of anchors) anchorBigrams.set(a, bigramSet(tokensPerSeg[a]));

  const r3Flags = new Set<number>();
  for (let i = 0; i < segments.length; i++) {
    if (anchors.has(i)) continue;
    const my = bigramSet(tokensPerSeg[i]);
    if (my.size === 0) continue;
    for (const a of anchors) {
      if (Math.abs(i - a) > ADJACENCY_WINDOW) continue;
      const ab = anchorBigrams.get(a)!;
      if (ab.size === 0) continue;
      let inter = 0;
      for (const x of my) if (ab.has(x)) inter++;
      if (inter / my.size >= CONTAINMENT) {
        r3Flags.add(i);
        break;
      }
    }
  }

  const flagged = new Set<number>([...anchors, ...r3Flags]);

  const r4Flags = new Set<number>();
  for (let i = 1; i < segments.length - 1; i++) {
    if (flagged.has(i)) continue;
    if (tokensPerSeg[i].length >= ORPHAN_MAX_WORDS) continue;
    if (flagged.has(i - 1) && flagged.has(i + 1)) r4Flags.add(i);
  }

  for (const x of r4Flags) flagged.add(x);
  if (flagged.size === 0) return segments;

  return segments
    .filter((_, i) => !flagged.has(i))
    .map((s, i) => ({ ...s, index: i }));
}

/**
 * Drop non-English (mostly non-Latin) segments. Common pattern: brief
 * silence is hallucinated into the model's training-set language (Korean,
 * Japanese, etc.) instead of English.
 */
function removeNonEnglish(segments: PipelineSegment[]): PipelineSegment[] {
  return segments.filter((s) => isMostlyLatin(s.text));
}

/**
 * Combined hallucination filter: non-Latin drop followed by repetition-loop
 * detection. Runs as a single post-processing step.
 *
 * `dropNonLatin` (default true) removes mostly-non-Latin segments — correct
 * when the source language is Latin-script (they're hallucinated foreign-script
 * noise). It MUST be false when the source itself is non-Latin (Japanese,
 * Korean, Chinese), or this would delete the entire legitimate transcript.
 */
export function removeHallucinations(
  segments: PipelineSegment[],
  opts: { dropNonLatin?: boolean } = {},
): PipelineSegment[] {
  const { dropNonLatin = true } = opts;
  const scoped = dropNonLatin ? removeNonEnglish(segments) : segments;
  return detectHallucinations(scoped);
}

// Exposed for tests and debugging.
export {
  detectHallucinations as _detectHallucinations,
  removeNonEnglish as _removeNonEnglish,
};
