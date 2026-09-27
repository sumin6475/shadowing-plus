export interface TranscriptLine {
  text: string;
  translation: string | null;
}

export function matchesTranscriptQuery(
  line: TranscriptLine,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (line.text.toLowerCase().includes(q)) return true;
  return (line.translation ?? "").toLowerCase().includes(q);
}

export function isTranscriptLineVisible(
  line: TranscriptLine & { id: string },
  opts: { query: string; bookmarksOnly: boolean; bookmarkedIds: Set<string> },
): boolean {
  if (opts.bookmarksOnly && !opts.bookmarkedIds.has(line.id)) return false;
  return matchesTranscriptQuery(line, opts.query);
}
