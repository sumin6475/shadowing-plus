# Google OAuth returned to the web app

- Date: 2026-08-14
- Impact: Google authentication launched correctly but completed at the PWA instead of returning to the installed Saylo app.

## Cause

The mobile client requested `shadowingplus://auth/callback`, and `app.json` registered the `shadowingplus` scheme. Supabase Auth URL Configuration allowed only `http://localhost:3000/**` and `https://shadowing-plus.vercel.app/**`. Because the requested mobile redirect was absent from the allow list, Supabase used the web Site URL fallback.

## Fix

Added the exact production redirect URL `shadowingplus://auth/callback` in Supabase Auth while preserving the two existing web URLs.

## Regression coverage

See [../quality/2026-08-14-google-oauth-mobile-redirect](../quality/2026-08-14-google-oauth-mobile-redirect.md). A physical-device Google sign-in smoke test remains the final runtime check; the remote configuration applies to the existing TestFlight binary without a rebuild.
