const goals = [
  "retrieval",
  "rambling",
  "translation-shaped",
  "correction-fatigue",
  "other",
  // Keep accepting values sent by the previous public form.
  "clear-speaking",
  "networking",
  "pitch",
  "interview",
] as const;
const platforms = ["ios", "android", "either"] as const;

export type WaitlistInput = {
  email: string;
  goal: (typeof goals)[number];
  platform: (typeof platforms)[number];
  wantsBeta: boolean;
  locale: string | null;
};

type ParseResult = { ok: true; data: WaitlistInput } | { ok: false; error: string };

export function parseWaitlistPayload(payload: unknown): ParseResult {
  if (!payload || typeof payload !== "object") return { ok: false, error: "Please complete the form and try again." };
  const value = payload as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailLooksValid || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  if (!goals.includes(value.goal as (typeof goals)[number])) return { ok: false, error: "Choose what you would like to practise." };
  if (!platforms.includes(value.platform as (typeof platforms)[number])) return { ok: false, error: "Choose a phone platform." };
  if (value.privacyAccepted !== true) return { ok: false, error: "Please review and accept the privacy notice." };

  const locale = typeof value.locale === "string" ? value.locale.slice(0, 32) : null;
  return {
    ok: true,
    data: {
      email,
      goal: value.goal as WaitlistInput["goal"],
      platform: value.platform as WaitlistInput["platform"],
      wantsBeta: value.wantsBeta === true,
      locale,
    },
  };
}
