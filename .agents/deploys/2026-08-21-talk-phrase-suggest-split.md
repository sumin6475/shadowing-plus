# Self-talk Phrase Bank suggestion split

- Date: 2026-08-21 (America/New_York)
- Target: Supabase Edge Functions `talk-diagnose` and `talk-phrase-suggest`
- Project: `hetcnrmzrksbjoeczeze`
- Status: deployed successfully

## Contract

- `talk-diagnose` coaches Focus only. No Phrase Bank reads, candidate lists, or owned-phrase selection.
- Compatibility fields stay: `want`, combined `why`, empty `example`/`exampleWhy`, `phraseItemId: null`, `source: "generated"`.
- `talk-phrase-suggest` selects at most one owned Phrase Bank id. It never generates language.
- Returned text comes from the validated `phrase_items` row. Invalid ids, already-said phrases, and weak fits return `{ "suggestion": null }`.
- Story match ranking ignores links created only by a prior `suggested` event.
- Phrases rejected in the same Story/free-talk context within 30 days are excluded.
- Mobile calls both functions in parallel. Either failure still shows the other result.

## Validation

- Isolation: `talk-diagnose` has no `phrase_items` query and no Phrase Bank prompt.
- ID spoofing: model-chosen ids must exist in the server candidate list or the response is 502 / null.
- Tenant isolation: both functions use the caller JWT + anon key, so RLS owns the reads and `suggested` insert.
- Mobile TypeScript: PASS.
- iOS export: PASS — 1,919 modules bundled.
- Production route bodies: both functions return JSON `401 UNAUTHORIZED_NO_AUTH_HEADER`.
- Authenticated match / reject / retry smoke test: requires a signed-in Self-talk run.

## Command

```
npx supabase functions deploy talk-diagnose --project-ref hetcnrmzrksbjoeczeze --no-verify-jwt=false
npx supabase functions deploy talk-phrase-suggest --project-ref hetcnrmzrksbjoeczeze --no-verify-jwt=false
```

## Follow-up

- App UI is on the device only after a new TestFlight build.
- Signed-in Self-talk: confirm Focus coaching, optional Phrase Bank card, Doesn’t fit, Try this phrase, and `suggested → accepted/rejected → used`.
