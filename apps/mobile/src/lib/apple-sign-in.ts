/**
 * Pure helpers for native Sign in with Apple.
 *
 * iOS uses the native Apple sheet and hands Apple's identity token to
 * Supabase (signInWithIdToken). The web OAuth flow cannot work here: the
 * Supabase Apple provider's client id is the app's bundle id, and Apple's web
 * flow only accepts a Services ID ("Invalid client id or web redirect url").
 * A bundle id is exactly what a native identity token's audience is, so the
 * existing Supabase setting already fits this path.
 */

type AppleFullName = {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
} | null;

/**
 * Apple sends the learner's name only on the very first authorization, so it
 * has to be kept then or never. Returns the name to store, or null.
 */
export function appleDisplayName(fullName: AppleFullName | undefined): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.middleName, fullName.familyName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean);
  const name = parts.join(" ") || fullName.nickname?.trim() || "";
  return name || null;
}

function appleErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** expo-apple-authentication rejects with this code when the sheet is dismissed. */
export function isAppleSignInCancel(error: unknown): boolean {
  return appleErrorCode(error) === "ERR_REQUEST_CANCELED";
}

/**
 * Text for a failed Apple authorization. The native exception message names a
 * Swift file and line ("…AppleAuthenticationExceptions.swift:61"), so it must
 * never reach the screen. ERR_REQUEST_UNKNOWN is what iOS returns when the
 * device has no Apple Account and the learner closes the "sign in in
 * Settings" prompt. Returns null for errors that aren't Apple's own.
 */
export function appleSignInErrorMessage(error: unknown): string | null {
  const code = appleErrorCode(error);
  if (!code || !(code.startsWith("ERR_REQUEST") || code.startsWith("ERR_INVALID"))) return null;
  if (code === "ERR_REQUEST_UNKNOWN") {
    return "Couldn’t sign in with Apple. Make sure you’re signed in to your Apple Account in Settings, then try again.";
  }
  return "Couldn’t sign in with Apple. Please try again.";
}
