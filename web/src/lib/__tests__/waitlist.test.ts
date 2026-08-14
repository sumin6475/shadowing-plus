import { describe, expect, it } from "vitest";
import { parseWaitlistPayload } from "../waitlist";

const valid = {
  email: " Person@Example.com ",
  goal: "pitch",
  platform: "ios",
  wantsBeta: true,
  privacyAccepted: true,
  locale: "en-US",
};

describe("parseWaitlistPayload", () => {
  it("normalizes a valid signup", () => {
    const result = parseWaitlistPayload(valid);
    expect(result).toEqual({ ok: true, data: { email: "person@example.com", goal: "pitch", platform: "ios", wantsBeta: true, locale: "en-US" } });
  });

  it("requires privacy acknowledgement", () => {
    expect(parseWaitlistPayload({ ...valid, privacyAccepted: false })).toMatchObject({ ok: false });
  });

  it("rejects invalid email and option values", () => {
    expect(parseWaitlistPayload({ ...valid, email: "nope" })).toMatchObject({ ok: false });
    expect(parseWaitlistPayload({ ...valid, goal: "anything" })).toMatchObject({ ok: false });
  });
});
