import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Turns a Supabase auth error into text a learner can read.
 *
 * On a network failure or a 5xx, auth-js throws AuthRetryableFetchError whose
 * `message` is the whole fetch Response JSON-stringified — headers, cookies and
 * all. That must never reach the screen. Anything shaped like that becomes a
 * plain "try again" line; real validation messages ("Invalid login
 * credentials", "Password should be…") pass through unchanged.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (isAuthRetryableFetchError(error)) {
    return error.status === 0
      ? "Couldn’t reach the server. Check your connection and try again."
      : "The server took too long to respond. Please try again in a moment.";
  }
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message || message.startsWith("{") || message.startsWith("<")) return fallback;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && status >= 500) return fallback;
  return message;
}
