@AGENTS.md

# Shadowing+ Mobile (Expo)

Native iOS app for Shadowing Plus. **Experimental / personal-test-first.** The
production product is the web app in `../../web`; this app must never affect it.

## Hard constraints

- **Zero coupling to `web/`.** This app imports NOTHING from `web/`. It talks to
  the deployed web API over HTTPS and copies the types it needs into
  `src/types/api.ts` (synced by hand, header notes the source commit). No path
  alias reaches outside `apps/mobile/`.
- **No secrets in the bundle.** Only `EXPO_PUBLIC_*` env vars. The app uses the
  Supabase *anon* key (RLS-scoped) and the web API (Bearer token) for anything
  needing a server secret. Never add the service key, R2, OpenAI, or ElevenLabs
  keys here.
- **The mobile app is excluded from the web deploy** via `/apps` in the repo-root
  `.vercelignore`. Don't remove that line.

## Stack

- Expo SDK 57, Expo Router (file-based, `src/app/`), React Native 0.86, TS strict.
- Auth/data: `@supabase/supabase-js` v2 + AsyncStorage (session storage). RLS is
  ON — reads are `auth.uid()`-scoped; the web API enforces ownership on service-
  key routes.
- Styling: `StyleSheet` + Cobalt Editorial tokens in `src/constants/cobalt.ts`
  (ported from `design-system/tokens.json`). iOS geometry follows
  `design-system/ios-motif-spec.md` — capsule controls, 52pt rows, cobalt
  `#3B6EE1` accent, warm-paper `#fbf9f4` bg. Never Apple blue, never terracotta.

## Architecture (the choke points)

- `src/lib/supabase.ts` — the RN Supabase client (anon key + AsyncStorage).
- `src/lib/api.ts` — the ONLY place the app calls the web API. `apiJson()`
  attaches the Bearer token and prefixes `EXPO_PUBLIC_API_BASE_URL`.
- `src/lib/auth.tsx` — session context (`useAuth`). The root `_layout.tsx` guards
  `(auth)` vs `(app)` groups off the session with `Stack.Protected`.
- `src/types/api.ts` — copied DB-row types. On ship, promote to
  `packages/shared-types` and point both apps at it (mechanical, no rewrite).

## Run

1. `cp .env.example .env` and fill in the same Supabase URL + anon key the web
   app uses, plus `EXPO_PUBLIC_API_BASE_URL`.
2. `npx expo start`, scan the QR with Expo Go on your iPhone.
3. Validate a change bundles: `npx tsc --noEmit` and `npx expo export --platform ios`.

## Expo has changed

Heed `AGENTS.md`: this is SDK 57 — read the versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before using an Expo API from memory.


---

<!-- build-journal:block v1 — installed by Code HQ/03_Build Journal. Edit freely after install. -->

## Auto-Journal (자동 기록)

> **As I build, you write evidence into `docs/journal/` automatically. I never have to say "log this."** Full folder guide: `docs/journal/README.md`.

The journal records one improvement loop (build → measure → fail → diagnose → fix) as it happens, so that later I can see where I failed and how I fixed it, which design principles I learned and applied, and which skills I used. It doubles as interview evidence.

**Triggers, and what to draft without being asked:**

| When | Draft | Where |
|---|---|---|
| A step is confirmed working, right before moving to the next | one short entry: what I built, principle learned/applied, skill used | `docs/journal/JOURNAL.md` |
| I resolve a decision that is costly to reverse | an ADR: context, options, decision, rejected alternatives, revisit trigger | `docs/journal/decisions/NNNN-*.md` |
| A failure that needed diagnosis gets fixed | a postmortem: symptom verbatim, hypotheses, root cause, fix, before/after, regression case added | `docs/journal/postmortems/YYYY-MM-DD-*.md` |
| Tests/eval run, or a quality gate passes or fails | a score snapshot; update `quality-bar.md` if the criteria changed | `docs/journal/quality/` |

Every ADR, postmortem, or score snapshot also gets a one-line pointer in `JOURNAL.md`, so the log stays the single index.

**Rules for auto-journaling (draft + notify, never decide):**
- Draft the entry, then tell me in one line (e.g. "journaled step 3 → JOURNAL.md"). Do not wait for me to ask.
- Never write or overwrite implementation code as part of journaling. Never decide a reserved decision for me: draft the ADR only after I have chosen.
- Keep entries short. Paste real error messages verbatim. Leave thin sections blank rather than padding them.
- When a bug is fixed, the same fix adds a case to the project's regression suite (tests/eval). That link between postmortem and suite is the point.
- Only journal what crossed a real bar: a step transition, a genuine decision, a diagnosed failure, a measured result. Not every message.

**How it fires:** step-transition and decision triggers are semantic, so the primary engine is this contract, and it works in any tool that reads `CLAUDE.md` (including Cursor). Claude Code sessions also get a turn-end hook (`.claude/hooks/journal_gate.py`) that notifies me if I built something this session but nothing was journaled. The hook only reminds. It never writes, blocks, or decides.

<!-- /build-journal:block v1 -->
