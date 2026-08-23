import { describe, expect, it } from "vitest";
import {
  isTranscriptLineVisible,
  matchesTranscriptQuery,
} from "../transcript-filter";

describe("matchesTranscriptQuery", () => {
  const line = { text: "I would have gone", translation: "갔을 텐데" };

  it("empty query matches everything", () => {
    expect(matchesTranscriptQuery(line, "")).toBe(true);
    expect(matchesTranscriptQuery(line, "   ")).toBe(true);
  });

  it("matches English or translation, case-insensitive", () => {
    expect(matchesTranscriptQuery(line, "WOULD")).toBe(true);
    expect(matchesTranscriptQuery(line, "텐데")).toBe(true);
    expect(matchesTranscriptQuery(line, "xyz")).toBe(false);
  });
});

describe("isTranscriptLineVisible", () => {
  const line = { id: "s1", text: "hello", translation: "안녕" };

  it("ANDs bookmarks filter with the query", () => {
    const bookmarked = new Set(["s1"]);
    expect(
      isTranscriptLineVisible(line, {
        query: "hello",
        bookmarksOnly: true,
        bookmarkedIds: bookmarked,
      }),
    ).toBe(true);
    expect(
      isTranscriptLineVisible(line, {
        query: "hello",
        bookmarksOnly: true,
        bookmarkedIds: new Set(),
      }),
    ).toBe(false);
    expect(
      isTranscriptLineVisible(line, {
        query: "nope",
        bookmarksOnly: true,
        bookmarkedIds: bookmarked,
      }),
    ).toBe(false);
  });
});
