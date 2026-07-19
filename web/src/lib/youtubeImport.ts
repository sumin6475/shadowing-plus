/**
 * YouTube import is a PERSONAL-USE tool, not a public product feature.
 *
 * Why it can't ship publicly: it obtains captions via YouTube's private
 * InnerTube API + HTML scraping + the `timedtext` endpoint, which violates
 * YouTube's Terms of Service (automated access to non-public interfaces), has
 * unsettled copyright exposure (it stores/re-serves third-party transcripts),
 * and breaks from datacenter IPs (Vercel) under YouTube's bot detection. See
 * `docs/ver2.0 plan/2026-07-19-youtube-import-personal-use-decision.md`.
 *
 * So it is gated to an owner allowlist: only the Supabase user ids listed in
 * NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST (comma-separated) can see the UI or call
 * the API. Empty/unset = hidden and 404'd for everyone. The env is NEXT_PUBLIC
 * so the same check runs client-side (hide the card) and server-side (gate the
 * route); user ids aren't secret, and the API enforcement compares the
 * *authenticated* caller's id, so publishing the allowlist grants nobody access.
 */

function allowlist(): string[] {
  return (process.env.NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True only for signed-in owners on the allowlist. */
export function canImportYoutube(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return allowlist().includes(userId);
}
