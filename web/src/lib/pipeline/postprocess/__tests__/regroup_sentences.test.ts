import { describe, it, expect } from "vitest";
import { regroupSentences } from "../regroup_sentences";
import type { PipelineSegment } from "@/lib/types";

describe("regroupSentences", () => {
  it("splits a multi-sentence chunk into one segment per sentence", () => {
    const input: PipelineSegment[] = [
      {
        text: "First sentence. Second sentence! Third one?",
        start: 0,
        end: 6,
        words: [
          { word: "First", start: 0, end: 0.5 },
          { word: "sentence.", start: 0.5, end: 1.5 },
          { word: "Second", start: 1.5, end: 2.5 },
          { word: "sentence!", start: 2.5, end: 3.5 },
          { word: "Third", start: 3.5, end: 4.5 },
          { word: "one?", start: 4.5, end: 6 },
        ],
      },
    ];
    const out = regroupSentences(input);
    expect(out).toHaveLength(3);
    expect(out[0].text).toBe("First sentence.");
    expect(out[1].text).toBe("Second sentence!");
    expect(out[2].text).toBe("Third one?");
    expect(out.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it("does not split on abbreviations", () => {
    const input: PipelineSegment[] = [
      {
        text: "Mr. Smith arrived.",
        start: 0,
        end: 2,
        words: [
          { word: "Mr.", start: 0, end: 0.5 },
          { word: "Smith", start: 0.5, end: 1 },
          { word: "arrived.", start: 1, end: 2 },
        ],
      },
    ];
    const out = regroupSentences(input);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("Mr. Smith arrived.");
  });

  it("does not split on single-letter initials", () => {
    const input: PipelineSegment[] = [
      {
        text: "Micah R. Ensley spoke.",
        start: 0,
        end: 3,
        words: [
          { word: "Micah", start: 0, end: 0.5 },
          { word: "R.", start: 0.5, end: 0.8 },
          { word: "Ensley", start: 0.8, end: 1.8 },
          { word: "spoke.", start: 1.8, end: 3 },
        ],
      },
    ];
    const out = regroupSentences(input);
    expect(out).toHaveLength(1);
  });

  it("joins words across input segments and re-splits by sentence", () => {
    const input: PipelineSegment[] = [
      {
        text: "Half a sentence",
        start: 0,
        end: 2,
        words: [
          { word: "Half", start: 0, end: 0.5 },
          { word: "a", start: 0.5, end: 0.8 },
          { word: "sentence", start: 0.8, end: 2 },
        ],
      },
      {
        text: "that ends. Now next.",
        start: 2,
        end: 5,
        words: [
          { word: "that", start: 2, end: 2.5 },
          { word: "ends.", start: 2.5, end: 3.5 },
          { word: "Now", start: 3.5, end: 4 },
          { word: "next.", start: 4, end: 5 },
        ],
      },
    ];
    const out = regroupSentences(input);
    expect(out.map((s) => s.text)).toEqual([
      "Half a sentence that ends.",
      "Now next.",
    ]);
  });

  it("interpolates timings when words[] is missing", () => {
    const input: PipelineSegment[] = [
      {
        text: "No words. Just text.",
        start: 0,
        end: 4,
      },
    ];
    const out = regroupSentences(input);
    expect(out).toHaveLength(2);
    expect(out[0].text).toBe("No words.");
    expect(out[1].text).toBe("Just text.");
    // Interpolated timings should be increasing and within bounds.
    expect(out[0].start).toBeGreaterThanOrEqual(0);
    expect(out[1].end).toBeLessThanOrEqual(4);
    expect(out[0].end).toBeLessThanOrEqual(out[1].start);
  });

  it("returns empty input unchanged", () => {
    expect(regroupSentences([])).toEqual([]);
  });
});
