import { describe, it, expect } from "vitest";
import {
  removeHallucinations,
  _detectHallucinations,
  _removeNonEnglish,
} from "../remove_hallucinations";
import type { PipelineSegment } from "@/lib/types";

describe("removeHallucinations: non-English filter", () => {
  it("drops segments that are mostly non-Latin", () => {
    const input: PipelineSegment[] = [
      { text: "안녕하세요 반갑습니다", start: 0, end: 1 },
      { text: "Hello there", start: 1, end: 2 },
    ];
    const out = _removeNonEnglish(input);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("Hello there");
  });
});

describe("removeHallucinations: R1 anchor (repeated 4-grams)", () => {
  it("flags a segment with a 4-gram repeated 3+ times and ≥20 words", () => {
    const repeated = "thank you so much ".repeat(6).trim(); // 24 words, 4-gram x6
    const input: PipelineSegment[] = [
      { text: "Normal opening sentence here.", start: 0, end: 2 },
      { text: repeated, start: 2, end: 30 },
      { text: "Then we continue with a different topic.", start: 30, end: 33 },
    ];
    const out = _detectHallucinations(input);
    expect(out.map((s) => s.text)).toEqual([
      "Normal opening sentence here.",
      "Then we continue with a different topic.",
    ]);
  });

  it("does not flag a segment with <20 words even if 4-gram repeats", () => {
    const input: PipelineSegment[] = [
      { text: "thank you so much thank you so much thank you so much", start: 0, end: 2 },
    ];
    expect(_detectHallucinations(input)).toHaveLength(1);
  });
});

describe("removeHallucinations: R3 + R4 cascade", () => {
  it("flags a high-containment neighbor of an anchor (R3)", () => {
    const anchor = "thank you so much ".repeat(6).trim();
    const r3Neighbor = "thank you so much thank you"; // bigrams nearly all in anchor
    const input: PipelineSegment[] = [
      { text: "Intro.", start: 0, end: 1 },
      { text: anchor, start: 1, end: 20 },
      { text: r3Neighbor, start: 20, end: 22 },
      { text: "Outro line.", start: 22, end: 24 },
    ];
    const out = _detectHallucinations(input);
    expect(out.map((s) => s.text)).toEqual(["Intro.", "Outro line."]);
  });

  it("R4 bridges a short orphan between two flagged neighbors", () => {
    const anchor = "thank you so much ".repeat(6).trim();
    const input: PipelineSegment[] = [
      { text: "Open.", start: 0, end: 1 },
      { text: anchor, start: 1, end: 10 },
      { text: "umm", start: 10, end: 11 }, // <6 words orphan
      { text: anchor, start: 11, end: 20 },
      { text: "Close.", start: 20, end: 21 },
    ];
    const out = _detectHallucinations(input);
    expect(out.map((s) => s.text)).toEqual(["Open.", "Close."]);
  });
});

describe("removeHallucinations: combined", () => {
  it("removes both non-English and repetition-loop segments in one call", () => {
    const anchor = "thank you so much ".repeat(6).trim();
    const input: PipelineSegment[] = [
      { text: "Welcome.", start: 0, end: 1 },
      { text: "안녕하세요 반갑습니다 정말로", start: 1, end: 2 },
      { text: anchor, start: 2, end: 10 },
      { text: "Goodbye.", start: 10, end: 11 },
    ];
    const out = removeHallucinations(input);
    expect(out.map((s) => s.text)).toEqual(["Welcome.", "Goodbye."]);
    // Reindexed
    expect(out.map((s) => s.index)).toEqual([0, 1]);
  });

  it("returns input unchanged when nothing matches", () => {
    const input: PipelineSegment[] = [
      { text: "Clean text one.", start: 0, end: 1 },
      { text: "Clean text two.", start: 1, end: 2 },
    ];
    expect(removeHallucinations(input)).toEqual(input);
  });
});
