import { describe, expect, it } from "vitest";
import {
  isGroqTooLarge,
  mergeChunkWords,
} from "../asr/groq-chunks";

describe("isGroqTooLarge", () => {
  it("matches the 413 Groq returns for oversized attachments", () => {
    const err = new Error(
      'Groq 413: {"error":{"message":"Request Entity Too Large","type":"invalid_request_error","code":"request_too_large"}}',
    );
    expect(isGroqTooLarge(err)).toBe(true);
  });

  it("does not treat unrelated Groq errors as size failures", () => {
    expect(isGroqTooLarge(new Error("Groq 401: Invalid API Key"))).toBe(false);
  });
});

describe("mergeChunkWords", () => {
  it("shifts later chunks onto the source timeline and drops the overlap", () => {
    const merged = mergeChunkWords([
      {
        offsetSec: 0,
        overlapSec: 0,
        words: [
          { text: "hello", start: 0, end: 0.4 },
          { text: "there", start: 598, end: 599 },
        ],
      },
      {
        offsetSec: 590,
        overlapSec: 10,
        words: [
          { text: "there", start: 8, end: 9 },
          { text: "friend", start: 12, end: 12.5 },
        ],
      },
    ]);
    expect(merged).toEqual([
      { text: "hello", start: 0, end: 0.4 },
      { text: "there", start: 598, end: 599 },
      { text: "friend", start: 602, end: 602.5 },
    ]);
  });

  it("keeps untimed words instead of dropping them as overlap", () => {
    const merged = mergeChunkWords([
      {
        offsetSec: 0,
        overlapSec: 0,
        words: [{ text: "hi", start: null, end: null }],
      },
    ]);
    expect(merged).toEqual([{ text: "hi", start: null, end: null }]);
  });
});
