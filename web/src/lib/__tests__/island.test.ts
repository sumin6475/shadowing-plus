import { describe, it, expect } from "vitest";
import { parseBeats } from "../island";

describe("parseBeats", () => {
  it("returns [] for non-array / malformed input", () => {
    expect(parseBeats(null)).toEqual([]);
    expect(parseBeats({})).toEqual([]);
    expect(parseBeats({ beats: "nope" })).toEqual([]);
  });

  it("keeps well-formed beats and normalizes whitespace", () => {
    const out = parseBeats({
      beats: [
        { text: "  I design   learning tools ", evidence: "shipped an app" },
        { text: "I care about retrieval", evidence: null },
      ],
    });
    expect(out).toEqual([
      { text: "I design learning tools", evidence: "shipped an app" },
      { text: "I care about retrieval", evidence: null },
    ]);
  });

  it("drops beats with empty text", () => {
    const out = parseBeats({ beats: [{ text: "   " }, { text: "real beat" }] });
    expect(out).toEqual([{ text: "real beat", evidence: null }]);
  });

  it("coerces non-string evidence to null", () => {
    const out = parseBeats({ beats: [{ text: "beat", evidence: 42 }] });
    expect(out[0].evidence).toBeNull();
  });

  it("caps the number of beats at 6", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ text: `beat ${i}` }));
    expect(parseBeats({ beats: many })).toHaveLength(6);
  });

  it("bounds an overly long beat", () => {
    const out = parseBeats({ beats: [{ text: "x".repeat(500) }] });
    expect(out[0].text.length).toBe(300);
  });
});
