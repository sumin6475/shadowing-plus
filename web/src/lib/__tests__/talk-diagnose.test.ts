import { describe, it, expect } from "vitest";
import { parseMoments } from "../talk-diagnose";

describe("parseMoments", () => {
  it("returns [] for non-JSON input", () => {
    expect(parseMoments("not json")).toEqual([]);
    expect(parseMoments("")).toEqual([]);
  });

  it("returns [] when `moments` is missing or not an array", () => {
    expect(parseMoments("{}")).toEqual([]);
    expect(parseMoments(JSON.stringify({ moments: "nope" }))).toEqual([]);
  });

  it("drops a moment missing `said` or `want` (must both quote and suggest)", () => {
    const raw = JSON.stringify({
      moments: [
        { label: "no want", said: "I said this", want: "" },
        { label: "no said", said: "", want: "a suggestion" },
        { label: "ok", said: "I want to solved it", want: "I wanted to solve it", example: "I wanted to solve it simply." },
      ],
    });
    const out = parseMoments(raw);
    expect(out).toHaveLength(1);
    expect(out[0].want).toBe("I wanted to solve it");
  });

  it("caps the count at 3", () => {
    const raw = JSON.stringify({
      moments: Array.from({ length: 6 }, (_, i) => ({ label: `m${i}`, said: `said ${i}`, want: `want ${i}` })),
    });
    expect(parseMoments(raw)).toHaveLength(3);
  });

  it("collapses whitespace and defaults an empty label", () => {
    const raw = JSON.stringify({
      moments: [{ label: "", said: "  I   said   this  ", want: "say it\nlike this" }],
    });
    const [m] = parseMoments(raw);
    expect(m.label).toBe("A moment");
    expect(m.said).toBe("I said this");
    expect(m.want).toBe("say it like this");
    expect(m.example).toBe("");
  });
});
