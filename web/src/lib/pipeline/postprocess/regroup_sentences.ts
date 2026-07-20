import type { PipelineSegment, PipelineWord } from "@/lib/types";
import { SENTENCE_END_PUNCT, joinWords } from "../text";

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "st", "jr", "sr",
  "vs", "etc", "i.e", "e.g", "u.s", "u.k",
  "no", "vol", "fig", "p.m", "a.m",
  "inc", "ltd", "co",
]);
const TRAILING_QUOTES = "\"')]}»”’";

function stripTrailing(s: string, chars: string): string {
  let end = s.length;
  while (end > 0 && chars.includes(s[end - 1])) end--;
  return s.slice(0, end);
}

function endsSentence(word: string): boolean {
  const stripped = stripTrailing(word.trim(), TRAILING_QUOTES);
  if (!stripped) return false;
  if (!SENTENCE_END_PUNCT.has(stripped[stripped.length - 1])) return false;

  let bare = stripped;
  while (bare.length > 0 && SENTENCE_END_PUNCT.has(bare[bare.length - 1])) {
    bare = bare.slice(0, -1);
  }
  bare = stripTrailing(bare, TRAILING_QUOTES);
  if (!bare) return false;
  if (ABBREVIATIONS.has(bare.toLowerCase())) return false;
  // Single-letter initial (e.g. "R." in "Micah R. Ensley")
  if (bare.length === 1 && /[a-zA-Z]/.test(bare)) return false;
  return true;
}

function interpolateWordTimings(
  words: PipelineWord[],
  segStart: number,
  segEnd: number,
): PipelineWord[] {
  if (words.length === 0) return [];
  const span = Math.max(segEnd - segStart, 0.001);
  const lengths = words.map((w) => Math.max(w.word.trim().length, 1));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out: PipelineWord[] = [];
  let pos = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const s = w.start ?? segStart + (pos / total) * span;
    pos += lengths[i];
    const e = w.end ?? segStart + (pos / total) * span;
    out.push({ word: w.word, start: s, end: e });
  }
  return out;
}

function mergePunctTokens(words: PipelineWord[]): PipelineWord[] {
  const out: PipelineWord[] = [];
  for (const w of words) {
    const token = (w.word ?? "").trim();
    if (!token) continue;
    const isPunctOnly = [...token].every((c) => !/\p{L}|\p{N}/u.test(c));
    if (out.length > 0 && isPunctOnly) {
      const prev = out[out.length - 1];
      out[out.length - 1] = {
        word: (prev.word ?? "") + token,
        start: prev.start,
        end: w.end ?? prev.end,
      };
    } else {
      out.push({ word: w.word, start: w.start, end: w.end });
    }
  }
  return out;
}

function hasSentencePunct(words: PipelineWord[]): boolean {
  for (const w of words) {
    const s = w.word ?? "";
    for (const c of s) if (SENTENCE_END_PUNCT.has(c)) return true;
  }
  return false;
}

function buildWordStream(
  segments: PipelineSegment[],
): { stream: PipelineWord[]; hasRealTimings: boolean } {
  const stream: PipelineWord[] = [];
  let hasRealTimings = false;
  for (const seg of segments) {
    const words = mergePunctTokens(seg.words ?? []);
    const textTokens = (seg.text ?? "").split(/\s+/).filter(Boolean);

    if (words.length > 0 && hasSentencePunct(words)) {
      hasRealTimings = true;
      stream.push(...interpolateWordTimings(words, seg.start, seg.end));
      continue;
    }

    if (
      words.length > 0 &&
      textTokens.length > 0 &&
      words.length === textTokens.length
    ) {
      hasRealTimings = true;
      const aligned: PipelineWord[] = textTokens.map((tok, i) => ({
        word: tok,
        start: words[i].start,
        end: words[i].end,
      }));
      stream.push(...interpolateWordTimings(aligned, seg.start, seg.end));
      continue;
    }

    if (words.length > 0) {
      // Mismatch: keep real timings, sentence detection may be lossy.
      hasRealTimings = true;
      stream.push(...interpolateWordTimings(words, seg.start, seg.end));
      continue;
    }

    if (textTokens.length > 0) {
      const fake: PipelineWord[] = textTokens.map((t) => ({
        word: t,
        start: null,
        end: null,
      }));
      stream.push(...interpolateWordTimings(fake, seg.start, seg.end));
    }
  }
  return { stream, hasRealTimings };
}

/**
 * Re-segment by sentence boundaries (.!?…) detected at word ends.
 * Flattens word-level timings across all input segments into a single stream
 * then splits when a word ends a sentence (excluding abbreviations / single-letter initials).
 */
export function regroupSentences(
  segments: PipelineSegment[],
): PipelineSegment[] {
  if (segments.length === 0) return segments;

  const { stream } = buildWordStream(segments);
  if (stream.length === 0) return segments;

  const newSegments: PipelineSegment[] = [];
  let current: PipelineWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const text = joinWords(current.map((w) => w.word));
    if (!text) {
      current = [];
      return;
    }
    const first = current[0];
    const last = current[current.length - 1];
    newSegments.push({
      text,
      start: first.start ?? 0,
      end: last.end ?? first.start ?? 0,
      words: current.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    });
    current = [];
  };

  for (const w of stream) {
    current.push(w);
    if (endsSentence(w.word)) flush();
  }
  flush();

  return newSegments.map((s, i) => ({ ...s, index: i }));
}
