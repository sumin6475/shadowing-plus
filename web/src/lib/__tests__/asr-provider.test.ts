import { describe, expect, it } from "vitest";
import { pickAsrProvider } from "../asr/provider";

describe("pickAsrProvider", () => {
  it("sends English to Scribe so long clips keep word-level sync", () => {
    expect(pickAsrProvider("eng").name).toBe("scribe");
  });

  it("sends Chinese and Japanese to Scribe", () => {
    expect(pickAsrProvider("cmn").name).toBe("scribe");
    expect(pickAsrProvider("zho").name).toBe("scribe");
    expect(pickAsrProvider("chi").name).toBe("scribe");
    expect(pickAsrProvider("jpn").name).toBe("scribe");
  });

  it("keeps other languages on Groq", () => {
    expect(pickAsrProvider("spa").name).toBe("groq");
    expect(pickAsrProvider("fra").name).toBe("groq");
    expect(pickAsrProvider("deu").name).toBe("groq");
    expect(pickAsrProvider("kor").name).toBe("groq");
  });
});
