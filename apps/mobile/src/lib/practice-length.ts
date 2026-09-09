// practice-length.ts — account-scoped daily speaking goal. Stored in Auth
// `user_metadata.daily_speaking_goal_minutes` (NOT bare AsyncStorage), so the
// preference follows the signed-in account and never leaks across accounts.

export const DAILY_SPEAKING_GOAL_OPTIONS = [5, 10, 15, 20, 30] as const;
export const DEFAULT_DAILY_SPEAKING_GOAL_MINUTES = 10;

type UserMeta = Record<string, unknown> | null | undefined;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return NaN;
}

/** Parse the account's daily speaking goal; falls back to the implicit 10 min. */
export function dailySpeakingGoalMinutes(meta: UserMeta): number {
  const n = toNumber(meta?.daily_speaking_goal_minutes);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return DEFAULT_DAILY_SPEAKING_GOAL_MINUTES;
}

export function dailySpeakingGoalSeconds(meta: UserMeta): number {
  return dailySpeakingGoalMinutes(meta) * 60;
}

export function formatDailySpeakingGoal(minutes: number): string {
  return `${minutes} min / day`;
}
