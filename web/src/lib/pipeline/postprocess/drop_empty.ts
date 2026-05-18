import type { PipelineSegment } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Drop segments whose normalized text is empty or a single character.
 * Whisper sometimes emits stray punctuation or one-char tokens during silence.
 */
export function dropEmpty(segments: PipelineSegment[]): PipelineSegment[] {
  return segments.filter((s) => normalize(s.text).length > 1);
}
