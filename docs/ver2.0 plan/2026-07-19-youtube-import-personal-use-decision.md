# Decision — YouTube import is a personal-use tool, hidden from the public product

**Date:** 2026-07-19
**Decision:** Keep the YouTube import feature, but **gate it to an owner allowlist** so it is invisible and unusable to everyone except Sumin. It stays available as a personal ingestion tool; it does **not** ship as a public product feature.
**Status:** Implemented (code gate + UI hide). Owner still needs to set the env var to use it — see "How to enable for yourself" below.

---

## Why it can't be a public feature

Deep research (2026-07-19) into `web/src/app/api/youtube/import/route.ts`. Full memo lives in the session; summary:

**What it actually does (important nuance):** it does **not** rip audio or video. It pulls only **captions** — via YouTube's private InnerTube API (impersonating the Android client), HTML scraping of `ytInitialPlayerResponse`, and the undocumented `timedtext` endpoint — then plays the video through YouTube's **official IFrame embed**. No media bytes are downloaded or stored; only the transcript is persisted (to R2 + Supabase).

**But it still can't ship publicly, for three independent reasons:**

1. **YouTube ToS.** The caption *acquisition* (automated access to non-public interfaces, spoofing the Android app client) violates YouTube's Terms of Service — "access the Service using any automated means (such as robots, botnets or scrapers)" is prohibited. The embed *playback* is fine; the *scraping* is not.
2. **Copyright.** It stores and re-serves third-party transcripts (a derivative work). A fair-use / educational argument exists but is unsettled — not a bet to make at public launch. (Not legal advice; a real legal check is warranted before any public transcript-ingestion path.)
3. **Technical fragility.** It runs from Vercel's datacenter IPs, which YouTube aggressively blocks ("Sign in to confirm you're not a bot" / PoToken). The scraping ecosystem is decaying (`ytdl-core` was archived Aug 2025). It will break under real users — unbounded maintenance for a solo dev.

**Public alternative:** the existing **upload-your-own-file → Scribe/Groq → translate** pipeline already delivers the same shadowing experience legitimately. That is the public "bring your own clip" story.

## Why gate-to-owner instead of delete

Sumin wants to keep using it personally (the app doubles as his own study tool). Gating is a ~1-file change and preserves the option, while removing all public risk. Delete remains the zero-risk fallback if we later decide not to carry the code at all.

---

## How it's implemented

- **`web/src/lib/youtubeImport.ts`** — `canImportYoutube(userId)` checks the id against `NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST` (comma-separated Supabase user ids). Empty/unset ⇒ hidden for everyone (the safe default).
- **API gate** — `web/src/app/api/youtube/import/route.ts` returns **404** for non-allowlisted callers (404, not 403, so the endpoint doesn't advertise itself). This is the real enforcement — it compares the *authenticated* caller's id, so publishing the allowlist grants no one access.
- **UI hide** — `web/src/app/page.tsx` renders the "Import from YouTube" card only when `canImportYoutube(userId)`.

The env var is `NEXT_PUBLIC_` on purpose: user ids aren't secret, and the same check must run client-side (hide the card) and server-side (gate the route).

## How to enable it for yourself

Set `NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST=<your-supabase-user-id>` in **both** local `.env.local` and the **Vercel** env (Production). Redeploy. Find your user id in Supabase Dashboard → Authentication → Users (or it's the `user_id` on any of your `jobs`/`videos` rows). Multiple owners: comma-separate.

To turn it off entirely again: unset the var (hidden for everyone) or delete the feature.
