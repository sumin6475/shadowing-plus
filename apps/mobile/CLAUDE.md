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
