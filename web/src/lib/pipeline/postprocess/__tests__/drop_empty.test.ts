import { describe, it, expect } from "vitest";
import { dropEmpty } from "../drop_empty";
import type { PipelineSegment } from "@/lib/types";

describe("dropEmpty", () => {
  it("removes segments with empty or single-character text", () => {
    const input: PipelineSegment[] = [
      { text: "", start: 0, end: 1 },
      { text: " ", start: 1, end: 2 },
      { text: ".", start: 2, end: 3 },
      { text: "Hi", start: 3, end: 4 },
      { text: "Real sentence.", start: 4, end: 5 },
    ];
    const out = dropEmpty(input);
    expect(out.map((s) => s.text)).toEqual(["Hi", "Real sentence."]);
  });

  it("keeps the input shape (does not mutate)", () => {
    const input: PipelineSegment[] = [
      { text: "Keep me", start: 0, end: 1, words: [{ word: "Keep", start: 0, end: 0.5 }, { word: "me", start: 0.5, end: 1 }] },
    ];
    const out = dropEmpty(input);
    expect(out[0]).toEqual(input[0]);
    expect(out[0].words).toBe(input[0].words);
  });
});
