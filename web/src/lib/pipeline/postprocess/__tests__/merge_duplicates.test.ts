import { describe, it, expect } from "vitest";
import { mergeDuplicates } from "../merge_duplicates";
import type { PipelineSegment } from "@/lib/types";

describe("mergeDuplicates", () => {
  it("merges consecutive duplicates and extends end time", () => {
    const input: PipelineSegment[] = [
      { text: "Hello world.", start: 0, end: 2 },
      { text: "Hello world.", start: 2, end: 4 },
      { text: "Different.", start: 4, end: 6 },
    ];
    const out = mergeDuplicates(input);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ text: "Hello world.", start: 0, end: 4 });
    expect(out[1]).toMatchObject({ text: "Different.", start: 4, end: 6 });
  });

  it("normalizes whitespace and case when comparing", () => {
    const input: PipelineSegment[] = [
      { text: "Hello   World.", start: 0, end: 2 },
      { text: "hello world.", start: 2, end: 4 },
    ];
    const out = mergeDuplicates(input);
    expect(out).toHaveLength(1);
    expect(out[0].end).toBe(4);
  });

  it("preserves non-consecutive repetitions", () => {
    const input: PipelineSegment[] = [
      { text: "A", start: 0, end: 1 },
      { text: "B", start: 1, end: 2 },
      { text: "A", start: 2, end: 3 },
    ];
    expect(mergeDuplicates(input)).toHaveLength(3);
  });

  it("drops empty/whitespace-only segments", () => {
    const input: PipelineSegment[] = [
      { text: "   ", start: 0, end: 1 },
      { text: "Real text.", start: 1, end: 2 },
    ];
    const out = mergeDuplicates(input);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("Real text.");
  });
});
