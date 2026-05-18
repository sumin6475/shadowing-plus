import { describe, it, expect } from "vitest";
import { fixTiming } from "../fix_timing";
import type { PipelineSegment } from "@/lib/types";

describe("fixTiming", () => {
  it("caps a >60s segment to the next segment's start", () => {
    const input: PipelineSegment[] = [
      { text: "abnormal", start: 10, end: 200 },
      { text: "next", start: 80, end: 82 },
    ];
    const out = fixTiming(input, 300);
    expect(out[0].end).toBe(80);
  });

  it("caps the last >60s segment to start+15s", () => {
    const input: PipelineSegment[] = [
      { text: "tail", start: 10, end: 300 },
    ];
    const out = fixTiming(input, 500);
    expect(out[0].end).toBe(25);
  });

  it("clamps end to audioDuration", () => {
    const input: PipelineSegment[] = [
      { text: "spill", start: 100, end: 200 },
    ];
    const out = fixTiming(input, 150);
    // start=100, raw end=200 → not >60 capped (100+60=160, 200-100=100>60, so capped to start+15=115)
    // Then clamped to audioDuration=150 → still 115 (115<150).
    expect(out[0].end).toBe(115);
  });

  it("enforces a 0.5s minimum duration", () => {
    const input: PipelineSegment[] = [
      { text: "tiny", start: 10, end: 10.1 },
    ];
    const out = fixTiming(input, 100);
    expect(out[0].end).toBe(10.5);
  });

  it("reindexes segments in order", () => {
    const input: PipelineSegment[] = [
      { text: "a", start: 0, end: 1, index: 99 },
      { text: "b", start: 1, end: 2, index: 5 },
    ];
    const out = fixTiming(input, 100);
    expect(out.map((s) => s.index)).toEqual([0, 1]);
  });

  it("returns empty array unchanged", () => {
    expect(fixTiming([], 100)).toEqual([]);
  });
});
