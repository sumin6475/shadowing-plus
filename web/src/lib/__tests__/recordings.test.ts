import { describe, expect, it } from "vitest";
import {
  isUuid,
  normalizeRecordingMime,
  recordingR2Key,
} from "../recordings";

describe("normalizeRecordingMime", () => {
  it("keeps allowlisted bases and strips codecs", () => {
    expect(normalizeRecordingMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeRecordingMime("audio/mp4")).toBe("audio/mp4");
    expect(normalizeRecordingMime("audio/ogg;codecs=opus")).toBe("audio/ogg");
  });

  it("rejects anything else", () => {
    expect(normalizeRecordingMime("video/webm")).toBeNull();
    expect(normalizeRecordingMime("application/octet-stream")).toBeNull();
  });
});

describe("recordingR2Key", () => {
  it("nests under recordings/{user}/{video}/{id}.ext", () => {
    expect(
      recordingR2Key("user-1", "vid-2", "rec-3", "audio/webm;codecs=opus"),
    ).toBe("recordings/user-1/vid-2/rec-3.webm");
    expect(recordingR2Key("u", "v", "r", "audio/mp4")).toBe(
      "recordings/u/v/r.m4a",
    );
  });
});

describe("isUuid", () => {
  it("accepts canonical uuids", () => {
    expect(isUuid("2c1a0e3a-7b4d-4f1a-9c2e-1d8b7a6c5e4f")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
