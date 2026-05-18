import type { PipelineSegment } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge consecutive segments whose normalized text is identical.
 * The merged segment keeps the first occurrence's start/words and the last
 * occurrence's end (Whisper repeats the same line across adjacent chunks
 * during low-confidence stretches).
 */
export function mergeDuplicates(
  segments: PipelineSegment[],
): PipelineSegment[] {
  const out: PipelineSegment[] = [];
  for (const seg of segments) {
    const norm = normalize(seg.text);
    if (!norm) continue;
    const last = out[out.length - 1];
    if (last && normalize(last.text) === norm) {
      last.end = seg.end;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}
