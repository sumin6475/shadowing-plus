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
  return value < 60
    ? `${value}s`
    : `${Math.floor(value / 60)} min${value % 60 ? ` ${value % 60}s` : ""}`;
}
