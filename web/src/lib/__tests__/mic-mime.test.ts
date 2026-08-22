import { describe, expect, it } from "vitest";
import { extensionForMime, pickRecorderMime } from "../mic-mime";

describe("pickRecorderMime", () => {
  it("prefers mp4 when that is what the engine supports (Safari)", () => {
    expect(pickRecorderMime((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("falls through to webm/opus for Chromium", () => {
    expect(
      pickRecorderMime((t) => t === "audio/webm;codecs=opus" || t === "audio/webm"),
    ).toBe("audio/webm;codecs=opus");
  });

  it("returns null when nothing is supported", () => {
    expect(pickRecorderMime(() => false)).toBeNull();
  });

  it("ignores engines that throw on unknown codec strings", () => {
    expect(
      pickRecorderMime((t) => {
        if (t.includes("opus")) throw new Error("unknown");
        return t === "audio/webm";
      }),
    ).toBe("audio/webm");
  });
});

describe("extensionForMime", () => {
  it("maps container types to file extensions", () => {
    expect(extensionForMime("audio/mp4")).toBe("m4a");
    expect(extensionForMime("audio/mp4;codecs=mp4a.40.2")).toBe("m4a");
    expect(extensionForMime("audio/ogg;codecs=opus")).toBe("ogg");
    expect(extensionForMime("audio/mpeg")).toBe("mp3");
    expect(extensionForMime("audio/webm;codecs=opus")).toBe("webm");
  });
});
