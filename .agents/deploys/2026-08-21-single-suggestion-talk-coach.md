# Single-suggestion Self-talk coach deploy

- Date: 2026-08-21 (America/New_York)
- Target: Supabase Edge Function `talk-diagnose`
- Project: `hetcnrmzrksbjoeczeze`
- Status: deployed successfully

## Contract

- Return at most one genuine high-impact coaching moment.
- Never correct already-correct English or natural domain jargon.
- Advanced words avoids academic over-engineering and uses natural tech/business vocabulary.
- The same critical transcript span may be reused when a different Focus diagnoses a different issue.
- Select exactly one of ten professional-speaking pain-point tags.
- Give one action beginning with `I would suggest`.
- Give 2–3 concise evidence sentences.
- End with one improved sentence; never return a second recommendation.
- Preserve old mobile compatibility through `want`, combined `why`, and empty `example` fields.
- Malformed or incomplete model output returns 502 instead of false “Smooth run” praise.

## Validation

- Mobile TypeScript: PASS.
- Edited-file lint diagnostics: none.
- Pre-deploy source-contract review: PASS after malformed-output and Pattern-copy fixes.
- Supabase deployment bundling: PASS.
- Production route body: JSON `401 UNAUTHORIZED_NO_AUTH_HEADER`, confirming the deployed function is reachable.
- Authenticated four-focus response smoke test: requires an in-app signed-in Self-talk run.

## Command

`npx supabase functions deploy talk-diagnose --no-verify-jwt=false`

## Follow-up

- Run one signed-in Self-talk session for each focus.
- Confirm one moment maximum, an allowed diagnosis tag, `I would suggest…`, sufficient rationale, and no second recommendation.
