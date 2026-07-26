import { describe, it, expect } from "vitest";
import { normalizePhrase, asPhraseText, phraseInSubtitle } from "../phrases";

describe("normalizePhrase", () => {
  it("lowercases, collapses whitespace, and trims", () => {
    expect(normalizePhrase("  Take   The\nPlunge ")).toBe("take the plunge");
  });
  it("is idempotent", () => {
    const once = normalizePhrase("Stick WITH  it");
    expect(normalizePhrase(once)).toBe(once);
  });
});

describe("asPhraseText", () => {
  it("returns empty string for non-string input", () => {
    expect(asPhraseText(undefined, 240)).toBe("");
    expect(asPhraseText(42, 240)).toBe("");
    expect(asPhraseText(null, 240)).toBe("");
  });
  it("collapses whitespace and enforces the length cap", () => {
    expect(asPhraseText("  hello   world  ", 240)).toBe("hello world");
    expect(asPhraseText("abcdef", 3)).toBe("abc");
  });
});

describe("phraseInSubtitle — containment guard", () => {
  const subtitle = "So for now, I'm going to play it safe and stick with my cheap pairs.";

  it("accepts a chunk that appears in the subtitle (case/space-insensitive)", () => {
    expect(phraseInSubtitle(subtitle, "play it safe")).toBe(true);
    expect(phraseInSubtitle(subtitle, "  PLAY   IT  SAFE ")).toBe(true);
    expect(phraseInSubtitle(subtitle, "stick with my cheap pairs")).toBe(true);
  });

  it("rejects text that is not inside the subtitle", () => {
    expect(phraseInSubtitle(subtitle, "take the plunge")).toBe(false);
  });

  it("rejects an empty or whitespace-only selection", () => {
    expect(phraseInSubtitle(subtitle, "")).toBe(false);
    expect(phraseInSubtitle(subtitle, "   ")).toBe(false);
  });

  it("rejects a selection that only partly overlaps the subtitle's end", () => {
    // Words from this subtitle plus words that belong to the next one must not
    // pass as a single-subtitle chunk.
    expect(phraseInSubtitle(subtitle, "cheap pairs but maybe in the future")).toBe(false);
  });
});
