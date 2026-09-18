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
export const NOTE_TEMPLATE = "Opening\n- \n\nBody\n- \n\nClosing\n- ";
export function durationLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return value < 60
    ? `${value}s`
    : `${Math.floor(value / 60)} min${value % 60 ? ` ${value % 60}s` : ""}`;
}
