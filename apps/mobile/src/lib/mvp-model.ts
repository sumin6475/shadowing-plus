/** MVP state is derived from independently reversible completion timestamps. */
export interface Progress {
  pronounced_at: string | null;
  examples_seen_at: string | null;
  own_example_at: string | null;
}
export const STEPS = [
  "pronounced_at",
  "examples_seen_at",
  "own_example_at",
] as const;
export type Step = (typeof STEPS)[number];
export const completedSteps = (p: Progress) =>
  STEPS.filter((key) => Boolean(p[key])).length;
export const phraseStage = (p: Progress): "Collected" | "Learning" | "Ready" =>
  completedSteps(p) === 3
    ? "Ready"
    : completedSteps(p) === 0
      ? "Collected"
      : "Learning";
export const readyAt = (p: Progress) =>
  completedSteps(p) === 3
    ? Math.max(...STEPS.map((key) => Date.parse(p[key]!)))
    : 0;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
/** True when any checklist step was ticked on `day` (local calendar date). */
export const practicedOn = (p: Progress, day: Date) =>
  STEPS.some((key) => !!p[key] && dayKey(new Date(p[key]!)) === dayKey(day));
/** Today's phrases: the oldest ones not yet Ready. A phrase practiced today
 *  stays in even once it turns Ready, so finishing one never swaps it out and
 *  the "done/total" count only moves forward during the day. */
export function todaysPicks<T extends Progress & { createdAt: string }>(
  phrases: T[],
  count: number,
  now = new Date(),
): T[] {
  return phrases
    .filter((p) => phraseStage(p) !== "Ready" || practicedOn(p, now))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(0, count);
}
/** Phrases to try in a mirror session, as cards: today's picks first — the
 *  same ones the Phrases home shows — then the most recently Ready. Between
 *  them every saved phrase is eligible, so the deck is never empty while the
 *  learner has one. `firstId` (the phrase "Use it in the mirror" came from)
 *  leads when given. */
export function hintPicks<T extends Progress & { id: string; createdAt: string }>(
  phrases: T[],
  count: number,
  now = new Date(),
  firstId?: string | null,
): T[] {
  const ready = phrases
    .filter((p) => readyAt(p) > 0)
    .sort((a, b) => readyAt(b) - readyAt(a));
  const first = phrases.filter((p) => p.id === firstId);
  const out: T[] = [];
  for (const p of [...first, ...todaysPicks(phrases, count, now), ...ready]) {
    if (out.length === count) break;
    if (!out.some((q) => q.id === p.id)) out.push(p);
  }
  return out;
}
export interface OutlinePoint {
  section: string | null;
  text: string;
}
/** A note's outline as the points to cover while speaking. The section
 *  headings label the points under them and aren't points themselves; empty
 *  template bullets are dropped. */
export function outlinePoints(lines: string[]): OutlinePoint[] {
  let section: string | null = null;
  const points: OutlinePoint[] = [];
  for (const line of lines) {
    const text = line.replace(/^\s*[-•]\s*/, "").trim();
    if (!text) continue;
    if (/^(Opening|Body|Closing)$/.test(text)) section = text;
    else points.push({ section, text });
  }
  return points;
}
export type Period = "Today" | "Yesterday" | "Last 7 days" | "Last 30 days" | "Earlier";
/** Which list section a saved date falls in, counted in calendar days. */
export function periodOf(iso: string, now = new Date()): Period {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round(
    (start(now).getTime() - start(new Date(iso)).getTime()) / 86_400_000,
  );
  return days <= 0
    ? "Today"
    : days === 1
      ? "Yesterday"
      : days <= 7
        ? "Last 7 days"
        : days <= 30
          ? "Last 30 days"
          : "Earlier";
}
export const NOTE_TEMPLATE = "Opening\n- \n\nBody\n- \n\nClosing\n- ";
/** First real line of a note — headings and bullet markers dropped. */
export const notePreview = (body: string) =>
  body
    .replace(/Opening|Body|Closing/g, "")
    .split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .join(" · ") || "A blank page for your next conversation.";
/** True when a note holds nothing but the untouched template: no title, and
 *  no line beyond the section headings and empty bullets. */
export const isBlankNote = (title: string, body: string) =>
  !title.trim() &&
  body
    .split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .every((l) => !l || /^(Opening|Body|Closing)$/.test(l));
export function durationLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60),
    rest = value % 60;
  // Past an hour, seconds are noise and "77 min 31s" stops reading as a time.
  if (minutes < 60) return rest ? `${minutes} min ${rest}s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60),
    left = minutes % 60;
  return left ? `${hours} h ${left} min` : `${hours} h`;
}
/** Stat-sized duration, for a number that sits in a grid cell: "48s",
 *  "3m 12s", "1h 17m". */
export function compactDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60),
    rest = value % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60),
    left = minutes % 60;
  return left ? `${hours}h ${left}m` : `${hours}h`;
}
const spokenTokens = (transcript: string) =>
  transcript
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
/** What a session's transcript adds up to. Pace needs a quarter minute of
 *  speech before it means anything — three words in two seconds is not
 *  90 wpm — so shorter sessions get null. */
export function sessionStats(transcript: string, seconds: number) {
  const tokens = spokenTokens(transcript);
  const words = tokens.length;
  return {
    words,
    distinct: new Set(tokens).size,
    wpm: seconds >= 15 && words ? Math.round((words * 60) / seconds) : null,
  };
}
/** One date format for the whole app: "Sep 12", and the year only when it
 *  isn't this one. Numeric locale dates (9/12/2026) read as noise next to it. */
export function dateLabel(iso: string | number | Date, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
/** Same date, plus the clock — for a single session's own screen. */
export function dateTimeLabel(iso: string | number | Date, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${dateLabel(date, now)} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
/** Speaking time is time spent speaking, not time with the screen open: a
 *  mirror left running in silence must not keep adding seconds. A tick counts
 *  only within this much of the last words the recognizer returned — long
 *  enough to carry a normal pause between sentences. */
export const SPEECH_IDLE_GRACE_MS = 10_000;
export const tickCountsAsSpeaking = (nowMs: number, lastHeardMs: number) =>
  nowMs - lastHeardMs <= SPEECH_IDLE_GRACE_MS;
