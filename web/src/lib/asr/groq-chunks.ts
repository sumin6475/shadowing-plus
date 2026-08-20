import type { AsrWord } from "./types";

/** Stay under Groq's 25 MB attachment limit, with headroom for multipart overhead. */
export const GROQ_MAX_UPLOAD_BYTES = 24 * 1024 * 1024;

/** Groq cookbook default: 10-minute chunks stay well under 25 MB at speech bitrate. */
export const GROQ_CHUNK_SECONDS = 600;
export const GROQ_CHUNK_OVERLAP_SECONDS = 10;

export function isGroqTooLarge(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /413|request_too_large|too large|entity too large|25\s*mb/i.test(msg);
}

/**
 * Map each chunk's local word times onto the source timeline and drop the
 * overlap so a word that straddles a split is kept from the earlier chunk.
 * `offsetSec` is where this chunk begins in the source; `overlapSec` is how
 * much of the chunk's start already appeared in the previous chunk.
 */
export function mergeChunkWords(
  chunks: Array<{ offsetSec: number; overlapSec: number; words: AsrWord[] }>,
): AsrWord[] {
  const out: AsrWord[] = [];
  for (const chunk of chunks) {
    const skipBefore = chunk.offsetSec + chunk.overlapSec;
    for (const w of chunk.words) {
      const start = w.start == null ? null : w.start + chunk.offsetSec;
      const end = w.end == null ? null : w.end + chunk.offsetSec;
      if (start != null && start < skipBefore) continue;
      out.push({ ...w, start, end });
    }
  }
  return out;
}
