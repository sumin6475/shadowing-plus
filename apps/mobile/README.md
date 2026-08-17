# Shadowing Plus Mobile

> **Status:** Expo SDK 57 iOS app under active development and TestFlight
> distribution work. `Shadowing+` is the current technical app identity; the public
> brand name is pending clearance.

This folder is the active native mobile product. The current product is a global,
English-first personal speaking studio for intermediate and advanced learners who
want to turn English they encounter and save into English they can retrieve in their
own speech.

## Canonical product direction

Read these before product, UX, content-model, naming, or AI-recommendation work:

1. [`docs/product/personal-speaking-studio-strategy.md`](docs/product/personal-speaking-studio-strategy.md)
2. [`docs/product/speaking-world.md`](docs/product/speaking-world.md)
3. [`docs/README.md`](docs/README.md) for the documentation map

The current core loop is:

```text
capture useful English
→ attach it to a personal Topic
→ self-talk in Mirror mode
→ receive one restrained AI analysis
→ speak again
→ preserve Retrieve / Use evidence
```

The product is not a beginner curriculum, a generic AI conversation partner, a
workplace-only coach, or a public social feed.

## Current implementation stage

- Expo SDK 57 / Expo Router / React Native 0.86
- Supabase authentication and an authenticated web-API adapter
- EAS project, production build profile, remote app versioning, and automatic build
  number increment configured
- iOS bundle identifier: `com.shadowingplus.mobile`
- Native product loop remains under active implementation; TestFlight distribution
  is a delivery milestone, not a claim that the full speaking-studio loop is complete

## Setup

```bash
cp .env.example .env
npm install
```

The mobile bundle may contain only public client configuration:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
```

Never place a Supabase service key, model-provider key, R2 secret, or other server
credential in the mobile app.

## Local development

This app uses native modules that require a custom development build rather than
Expo Go.

```bash
eas build --profile development --platform ios
npx expo start --dev-client
```

For a local web API, use the Mac's LAN address instead of `localhost` when testing
on a physical device.

## TestFlight build

The EAS production profile is configured in [`eas.json`](eas.json).

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

Confirm the current Apple Developer, App Store Connect, privacy, encryption, and
review metadata state before submitting a new build.

## Validation

```bash
npx tsc --noEmit
npx expo export --platform ios
```

## Architecture boundaries

- `src/lib/supabase.ts` — client-side Supabase session and RLS-scoped access
- `src/lib/api.ts` — authenticated calls to the deployed web API
- `src/lib/auth.tsx` — mobile authentication context and route protection
- `src/types/api.ts` — mobile-side API types
- no server secrets in `EXPO_PUBLIC_*` configuration

The existing scaffold still contains legacy `Shadowing+` and Cobalt identifiers.
Treat those as implementation migration work, not current brand guidance. Do not
expand legacy naming or colors into new product surfaces.
