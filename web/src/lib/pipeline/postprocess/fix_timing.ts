import type { PipelineSegment } from "@/lib/types";

/**
 * Cap abnormally long segments (>60s) and clamp end_time so it never
 * overruns the next segment's start or the audio duration.
 * Re-indexes segments at the end.
 */
export function fixTiming(
  segments: PipelineSegment[],
  audioDuration: number,
): PipelineSegment[] {
  if (segments.length === 0) return segments;
  const result = segments.map((s) => ({ ...s }));

  // 1. Cap segments longer than 60s.
  for (let i = 0; i < result.length; i++) {
    if (result[i].end - result[i].start > 60.0) {
      if (i + 1 < result.length) {
        result[i].end = result[i + 1].start;
      } else {
        result[i].end = result[i].start + 15.0;
      }
    }
  }

  // 2. Bound end_time within [start+0.5, min(next.start, audioDuration)].
  for (let i = 0; i < result.length; i++) {
    if (i + 1 < result.length) {
      result[i].end = Math.min(result[i].end, result[i + 1].start);
    }
    result[i].end = Math.min(result[i].end, audioDuration);
    result[i].end = Math.max(result[i].end, result[i].start + 0.5);
  }

  // 3. Reindex.
  result.forEach((s, i) => {
    s.index = i;
  });

  return result;
}
