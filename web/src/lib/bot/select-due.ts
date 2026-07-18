// Pick the day's review batch from a set of due bookmarks. Pure, no I/O —
// unit-tested like srs.ts. The caller fetches due bookmarks (due_at <= now)
// and passes them here; this decides which, and how many, to send.
//
// Ordering (per ver2.0 phase-0 design §2):
//   1. most overdue first (oldest due_at)
//   2. then most lapses (struggling cards first)
//   3. then oldest bookmark (created_at) as a stable tiebreaker

export interface DueCard {
  id: string;
  due_at: string;
  lapses: number;
  created_at: string;
}

export const DEFAULT_BATCH_SIZE = 5;

/**
 * Return up to `limit` cards to review now, ordered by urgency. Cards not yet
 * due (due_at > now) are filtered out defensively so the caller can pass a
 * superset. A non-positive `limit` returns an empty batch.
 */
export function selectDue<T extends DueCard>(
  cards: T[],
  now: Date = new Date(),
  limit: number = DEFAULT_BATCH_SIZE,
): T[] {
  if (limit <= 0) return [];
  const nowMs = now.getTime();

  const due = cards.filter((c) => {
    const t = Date.parse(c.due_at);
    return Number.isFinite(t) && t <= nowMs;
  });

  due.sort((a, b) => {
    // 1. most overdue first → smallest due_at first
    const da = Date.parse(a.due_at);
    const db = Date.parse(b.due_at);
    if (da !== db) return da - db;
    // 2. most lapses first
    if (a.lapses !== b.lapses) return b.lapses - a.lapses;
    // 3. oldest bookmark first
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });

  return due.slice(0, limit);
}
