import { describe, it, expect } from "vitest";
import {
  applyQuickCheck,
  deriveDisplayStatus,
  type PhraseSrsState,
} from "../phrase-srs";

const NOW = new Date("2026-07-26T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function fresh(): PhraseSrsState {
  return { ease_factor: 2.5, interval_days: 0, lapses: 0 };
}

describe("applyQuickCheck — first review", () => {
  it("recognized → recognizing, due in 2 days", () => {
    const next = applyQuickCheck(fresh(), "recognized", NOW);
    expect(next.learning_status).toBe("recognizing");
    expect(next.interval_days).toBe(2);
    expect(new Date(next.due_at).getTime() - NOW.getTime()).toBe(2 * DAY);
    expect(next.last_practiced_at).toBe(NOW.toISOString());
  });

  it("withhelp → practicing, due in 4 days, ease unchanged", () => {
    const next = applyQuickCheck(fresh(), "withhelp", NOW);
    expect(next.learning_status).toBe("practicing");
    expect(next.interval_days).toBe(4);
    expect(next.ease_factor).toBe(2.5);
  });

  it("onmyown → ready, due in 10 days, ease bonus", () => {
    const next = applyQuickCheck(fresh(), "onmyown", NOW);
    expect(next.learning_status).toBe("ready");
    expect(next.interval_days).toBe(10);
    expect(next.ease_factor).toBeCloseTo(2.65, 5);
  });
});

describe("applyQuickCheck — repeat review", () => {
  it("grows the interval multiplicatively on a repeat onmyown", () => {
    const state: PhraseSrsState = { ease_factor: 2.5, interval_days: 10, lapses: 0 };
    const next = applyQuickCheck(state, "onmyown", NOW);
    // 10 * 2.5 * 1.3
    expect(next.interval_days).toBeCloseTo(32.5, 5);
  });

  it("resets a repeat recognized back to 2 days (weak recall keeps it close)", () => {
    const state: PhraseSrsState = { ease_factor: 2.5, interval_days: 20, lapses: 0 };
    expect(applyQuickCheck(state, "recognized", NOW).interval_days).toBe(2);
  });

  it("resets a repeat withhelp back to 4 days", () => {
    const state: PhraseSrsState = { ease_factor: 2.5, interval_days: 20, lapses: 0 };
    expect(applyQuickCheck(state, "withhelp", NOW).interval_days).toBe(4);
  });

  it("never lets ease fall below the floor", () => {
    const state: PhraseSrsState = { ease_factor: 1.3, interval_days: 5, lapses: 1 };
    const next = applyQuickCheck(state, "recognized", NOW);
    expect(next.ease_factor).toBe(1.3);
  });

  it("tolerates null prior SRS fields (pre-migration rows)", () => {
    const next = applyQuickCheck(
      { ease_factor: null, interval_days: null, lapses: null },
      "withhelp",
      NOW,
    );
    expect(next.interval_days).toBe(4);
    expect(next.lapses).toBe(0);
  });
});

describe("deriveDisplayStatus", () => {
  it("keeps a never-practiced new phrase as new, even if due_at is past", () => {
    expect(
      deriveDisplayStatus(
        { learning_status: "new", due_at: "2020-01-01T00:00:00.000Z" },
        NOW,
      ),
    ).toBe("new");
  });

  it("surfaces an overdue practiced phrase as refresh", () => {
    expect(
      deriveDisplayStatus(
        { learning_status: "ready", due_at: "2026-07-20T00:00:00.000Z" },
        NOW,
      ),
    ).toBe("refresh");
  });

  it("keeps a not-yet-due practiced phrase at its stored status", () => {
    expect(
      deriveDisplayStatus(
        { learning_status: "practicing", due_at: "2026-08-10T00:00:00.000Z" },
        NOW,
      ),
    ).toBe("practicing");
  });

  it("treats a missing due_at as not overdue", () => {
    expect(
      deriveDisplayStatus({ learning_status: "recognizing", due_at: null }, NOW),
    ).toBe("recognizing");
  });
});
