import { describe, it, expect } from "vitest";
import { applyVerdict, type SrsState } from "../srs";

const NOW = new Date("2026-05-19T00:00:00.000Z");
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

function fresh(): SrsState {
  return { ease_factor: 2.5, interval_days: 0, lapses: 0 };
}

describe("applyVerdict — first review", () => {
  it("good on a brand-new card: interval = 2 days, ease unchanged", () => {
    const next = applyVerdict(fresh(), "good", NOW);
    expect(next.interval_days).toBe(2);
    expect(next.ease_factor).toBe(2.5);
    expect(next.lapses).toBe(0);
    expect(new Date(next.due_at).getTime() - NOW.getTime()).toBe(2 * DAY);
  });

  it("easy on a brand-new card: interval = 7 days, ease += 0.15", () => {
    const next = applyVerdict(fresh(), "easy", NOW);
    expect(next.interval_days).toBe(7);
    expect(next.ease_factor).toBeCloseTo(2.65, 10);
    expect(new Date(next.due_at).getTime() - NOW.getTime()).toBe(7 * DAY);
  });

  it("again on a brand-new card: interval stays 0, ease -= 0.2, lapses += 1, due ~1min", () => {
    const next = applyVerdict(fresh(), "again", NOW);
    expect(next.interval_days).toBe(0);
    expect(next.ease_factor).toBeCloseTo(2.3, 10);
    expect(next.lapses).toBe(1);
    expect(new Date(next.due_at).getTime() - NOW.getTime()).toBe(MIN);
  });
});

describe("applyVerdict — repeat reviews", () => {
  it("good after a 2-day interval: interval = 2 * 2.5 = 5 days", () => {
    const state: SrsState = { ease_factor: 2.5, interval_days: 2, lapses: 0 };
    const next = applyVerdict(state, "good", NOW);
    expect(next.interval_days).toBe(5);
    expect(next.ease_factor).toBe(2.5);
  });

  it("easy after a 7-day interval: interval = 7 * 2.5 * 1.3, ease += 0.15", () => {
    const state: SrsState = { ease_factor: 2.5, interval_days: 7, lapses: 0 };
    const next = applyVerdict(state, "easy", NOW);
    expect(next.interval_days).toBeCloseTo(22.75, 10);
    expect(next.ease_factor).toBeCloseTo(2.65, 10);
  });

  it("again on a mature card: resets interval to 0, lapses += 1", () => {
    const state: SrsState = { ease_factor: 2.2, interval_days: 12, lapses: 1 };
    const next = applyVerdict(state, "again", NOW);
    expect(next.interval_days).toBe(0);
    expect(next.lapses).toBe(2);
    expect(next.ease_factor).toBeCloseTo(2.0, 10);
  });
});

describe("applyVerdict — ease floor", () => {
  it("clamps ease at 1.3 even after repeated Again", () => {
    let state: SrsState = { ease_factor: 1.4, interval_days: 0, lapses: 0 };
    state = applyVerdict(state, "again", NOW); // 1.2 → floored to 1.3
    expect(state.ease_factor).toBe(1.3);
    state = applyVerdict(state, "again", NOW); // 1.1 → floored
    expect(state.ease_factor).toBe(1.3);
    expect(state.lapses).toBe(2);
  });
});

describe("applyVerdict — outputs", () => {
  it("records last_verdict and last_reviewed_at", () => {
    const next = applyVerdict(fresh(), "good", NOW);
    expect(next.last_verdict).toBe("good");
    expect(next.last_reviewed_at).toBe(NOW.toISOString());
  });

  it("produces ISO due_at strings (time-zone-safe)", () => {
    const next = applyVerdict(fresh(), "good", NOW);
    expect(next.due_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
