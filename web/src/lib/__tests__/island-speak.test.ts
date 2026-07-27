import { describe, it, expect } from "vitest";
import { parseDiagnosis, repairSchedule, usedInAttempt, type PhraseRef } from "../island-speak";

const PHRASES: PhraseRef[] = [
  { id: "p1", text: "actually use what you already saved" },
  { id: "p2", text: "make decisions under pressure" },
];

describe("parseDiagnosis", () => {
  it("falls back to a valid gap for missing/unknown input", () => {
    expect(parseDiagnosis(null, [], 4).gap).toBe("meaning");
    expect(parseDiagnosis({ gap: "vibes" }, [], 4).gap).toBe("meaning");
  });

  it("normalizes gap spelling (spaces/dashes → underscore)", () => {
    expect(parseDiagnosis({ gap: "new language" }, [], 4).gap).toBe("new_language");
    expect(parseDiagnosis({ gap: "NEW-LANGUAGE" }, [], 4).gap).toBe("new_language");
  });

  it("resolves a retrieval phrase to a real saved item (fuzzy contains)", () => {
    const d = parseDiagnosis(
      { gap: "retrieval", phraseText: "use what you already saved", quote: "um different" },
      PHRASES,
      4,
    );
    expect(d.gap).toBe("retrieval");
    expect(d.phraseItemId).toBe("p1");
    expect(d.phraseText).toBe("actually use what you already saved");
  });

  it("nulls an unresolved retrieval phrase rather than inventing one", () => {
    const d = parseDiagnosis({ gap: "retrieval", phraseText: "a phrase I never saved" }, PHRASES, 4);
    expect(d.phraseItemId).toBeNull();
    expect(d.phraseText).toBeNull();
  });

  it("keeps a suggestion only for new_language", () => {
    expect(parseDiagnosis({ gap: "new_language", suggestion: "we ran a small pilot" }, [], 4).suggestion).toBe(
      "we ran a small pilot",
    );
    expect(parseDiagnosis({ gap: "meaning", suggestion: "ignored" }, [], 4).suggestion).toBeNull();
  });

  it("only accepts an in-range beat index", () => {
    expect(parseDiagnosis({ gap: "meaning", beatIndex: 2 }, [], 4).beatIndex).toBe(2);
    expect(parseDiagnosis({ gap: "meaning", beatIndex: 9 }, [], 4).beatIndex).toBeNull();
    expect(parseDiagnosis({ gap: "meaning", beatIndex: -1 }, [], 4).beatIndex).toBeNull();
    expect(parseDiagnosis({ gap: "meaning", beatIndex: 1.5 }, [], 4).beatIndex).toBeNull();
  });

  it("bounds the quote and normalizes whitespace", () => {
    const d = parseDiagnosis({ gap: "meaning", quote: "  it   is  " + "x".repeat(400) }, [], 4);
    expect(d.quote.length).toBeLessThanOrEqual(200);
    expect(d.quote.startsWith("it is")).toBe(true);
  });
});

describe("usedInAttempt", () => {
  it("is earned only when the phrase actually appears (case/space-insensitive)", () => {
    expect(usedInAttempt("Mine helps you ACTUALLY use  what you already saved.", PHRASES[0].text)).toBe(true);
    expect(usedInAttempt("nothing like it here", PHRASES[0].text)).toBe(false);
  });

  it("is false when there is no phrase in play", () => {
    expect(usedInAttempt("anything", null)).toBe(false);
    expect(usedInAttempt("anything", "")).toBe(false);
  });
});

describe("repairSchedule", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("schedules ~1 minute for 'not yet'", () => {
    const s = repairSchedule("not_yet", now);
    expect(Math.round(s.interval_days * 1440)).toBe(1);
    expect(s.due_at).toBe("2026-07-26T00:01:00.000Z");
  });

  it("schedules 2 days for 'recognized' and 7 for 'came back'", () => {
    expect(repairSchedule("recognized", now).due_at).toBe("2026-07-28T00:00:00.000Z");
    expect(repairSchedule("came_back", now).due_at).toBe("2026-08-02T00:00:00.000Z");
  });
});
