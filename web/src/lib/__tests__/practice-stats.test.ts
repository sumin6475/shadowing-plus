import { describe, it, expect } from "vitest";
import {
  dailyMinutes,
  currentStreak,
  type PracticeSession,
} from "../practice-stats";

// Fixed "now": 2026-07-20 15:00 LOCAL. Sessions are timestamped at LOCAL noon on
// their day, so the ±14h timezone offset can't push them across midnight — the
// tests stay deterministic regardless of the runner's timezone.
const NOW = new Date(2026, 6, 20, 15, 0, 0);
function on(daysAgo: number, seconds: number): PracticeSession {
  const d = new Date(2026, 6, 20, 12, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return { seconds, occurred_at: d.toISOString() };
}

describe("dailyMinutes", () => {
  it("returns `days` entries oldest→newest, last one is today", () => {
    const out = dailyMinutes([], 7, NOW);
    expect(out).toHaveLength(7);
    expect(out[6].isToday).toBe(true);
    expect(out.slice(0, 6).every((d) => !d.isToday)).toBe(true);
    expect(out.every((d) => d.minutes === 0)).toBe(true);
  });

  it("sums seconds into minutes per local day", () => {
    const out = dailyMinutes([on(0, 120), on(0, 60), on(2, 180)], 7, NOW);
    expect(out[6].minutes).toBe(3); // today: 120+60 = 180s = 3min
    expect(out[4].minutes).toBe(3); // 2 days ago: 180s = 3min
    expect(out[5].minutes).toBe(0); // yesterday: none
  });

  it("ignores sessions older than the window", () => {
    const out = dailyMinutes([on(30, 600)], 7, NOW);
    expect(out.every((d) => d.minutes === 0)).toBe(true);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak([on(0, 90), on(1, 90), on(2, 90)], NOW)).toBe(3);
  });

  it("stops at the first gap", () => {
    // today + 2 days ago, but yesterday missing → only today counts
    expect(currentStreak([on(0, 90), on(2, 90)], NOW)).toBe(1);
  });

  it("stays alive on yesterday when today has no practice yet", () => {
    expect(currentStreak([on(1, 90), on(2, 90)], NOW)).toBe(2);
  });

  it("does not count a day below the minute threshold", () => {
    expect(currentStreak([on(0, 30)], NOW)).toBe(0); // 30s < 60s
  });

  it("is 0 with no sessions", () => {
    expect(currentStreak([], NOW)).toBe(0);
  });
});
