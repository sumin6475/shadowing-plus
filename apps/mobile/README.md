# Shadowing+ Mobile

> **Status: work in progress — not runnable end-to-end yet.** Phase 0 (auth +
> authed API call) is written but unverified on device: the app depends on
> `@expo/ui` and `expo-glass-effect`, which are native modules Expo Go does not
> bundle, so it needs a custom dev build. Creating one is currently blocked on a
> free Apple ID (`eas device:create` requires a paid team). The web app in
> [`../../web`](../../web) is the product; this is an experiment.

Native iOS app (Expo) for [Shadowing Plus](../../web). Experimental, personal-test-first.
Shares no code with the web app — it calls the deployed web API with a Supabase
Bearer token and reuses a copied set of types.

## Setup (one time)

```bash
cd apps/mobile
cp .env.example .env    # then edit .env — see below
npm install             # already run by the scaffolder; safe to re-run
```

Fill `.env` with the **same** Supabase project the web app uses (the anon key,
never the service key):

```
EXPO_PUBLIC_SUPABASE_URL=…        # = web NEXT_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=…   # = web NEXT_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=https://shadowing-plus.vercel.app
```

## Run on your iPhone (blocked — see Status)

This app needs a **custom dev build**, not Expo Go: `@expo/ui` and
`expo-glass-effect` are native modules absent from the Expo Go binary, so
scanning the QR with Expo Go fails to resolve them.

```bash
eas device:create      # ← currently fails: free Apple ID has no team
eas build --profile development --platform ios
npx expo start --dev-client
```

Unblocking it needs one of: a paid Apple Developer account, an iOS Simulator
build (`--platform ios --simulator`, no device registration required), or
dropping the two native-module dependencies for Expo Go compatibility.

## Phase 0 smoke test (what to verify, once it runs)

1. The app opens on the **Sign in** screen (cobalt accent, warm-paper bg).
2. Sign in with your Shadowing Plus email + password.
3. You land on **Your clips**, which calls `GET /api/jobs` with your Bearer token
   and lists your processing jobs (or "No clips yet").
4. Pull-to-refresh re-fetches. "Sign out" returns you to the sign-in screen.

If step 3 shows an error mentioning `EXPO_PUBLIC_API_BASE_URL`, the API base URL
is wrong or unreachable (an HTML 404 body instead of JSON). For local dev against
the web app, use your Mac's LAN IP (`http://192.168.x.x:3000`), not `localhost` —
the phone can't reach the Mac's localhost.

## Validate a change

```bash
npx tsc --noEmit                    # type check
npx expo export --platform ios      # full bundle (catches resolution errors)
```

## Roadmap

Phase 0 (this): scaffold + auth + authed API call. Then: Library → native
shadowing player (full parity) → Bookmarks/Practice → upload/import → Phrase
Bank/Island/Settings. See the plan for details.
