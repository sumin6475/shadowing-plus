// Pure aggregation over practice_sessions (migration 013) for the Home
// dashboard: minutes shadowed per day, and the current practice streak. Kept
// pure (data in → data out, `now` injectable) so it's unit-tested like the SRS
// and postprocess helpers. All day bucketing is in the viewer's LOCAL timezone,
// which is what "today" and "this week" mean to a user.

export interface PracticeSession {
  /** Active practice time recorded for this session. */
  seconds: number;
  /** ISO timestamp of when the session happened. */
  occurred_at: string;
}

export interface DayMinutes {
  /** Local calendar day, YYYY-MM-DD. */
  key: string;
  /** Short weekday label, e.g. "Mon". */
  label: string;
  minutes: number;
  /** True for the day equal to `now`'s local day. */
  isToday: boolean;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local-timezone calendar-day key (YYYY-MM-DD) for a date. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add `n` days on the local calendar (DST-safe — operates on the date part). */
function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

/** Total session seconds per local day. */
function secondsByDay(sessions: PracticeSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const t = new Date(s.occurred_at);
    if (Number.isNaN(t.getTime())) continue;
    const secs = Number.isFinite(s.seconds) ? Math.max(0, s.seconds) : 0;
    const key = dayKey(t);
    map.set(key, (map.get(key) ?? 0) + secs);
  }
  return map;
}

/**
 * Minutes practiced per local calendar day for the last `days` days, ordered
 * oldest → newest so it maps left→right onto a bar chart. `now` is injectable
 * for deterministic tests.
 */
export function dailyMinutes(
  sessions: PracticeSession[],
  days = 7,
  now: Date = new Date(),
): DayMinutes[] {
  const byDay = secondsByDay(sessions);
  const todayKey = dayKey(now);
  const out: DayMinutes[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = dayKey(d);
    out.push({
      key,
      label: WEEKDAY[d.getDay()],
      minutes: Math.round((byDay.get(key) ?? 0) / 60),
      isToday: key === todayKey,
    });
  }
  return out;
}

/**
 * Consecutive-day practice streak ending today — or yesterday, if today has no
 * qualifying practice yet, so an in-progress streak isn't shown as broken before
 * the day's first session. A day counts when its total practice ≥ `minSeconds`.
 */
export function currentStreak(
  sessions: PracticeSession[],
  now: Date = new Date(),
  minSeconds = 60,
): number {
  const byDay = secondsByDay(sessions);
  const counts = (d: Date) => (byDay.get(dayKey(d)) ?? 0) >= minSeconds;

  let cursor = new Date(now.getTime());
  if (!counts(cursor)) {
    const yesterday = addDays(now, -1);
    if (!counts(yesterday)) return 0;
    cursor = yesterday;
  }
  let streak = 0;
  while (counts(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
