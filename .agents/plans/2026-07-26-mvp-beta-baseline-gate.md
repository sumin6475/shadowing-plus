# Feature: MVP web-beta production baseline gate

This plan should be complete, but validate documentation links, codebase patterns, and task sanity before executing. The goal is evidence, not a speculative code change: do not invite external users or start Island implementation until every gate below is proven in the real deployed environment.

## Feature Description

Establish a trustworthy baseline for the invite-only web beta. Reconcile the actual Supabase migration/RLS state, verify production authentication and per-user isolation, then run the existing private-upload learning loop on desktop and mobile. Record only verifiable results and update stale operational documentation without committing secrets.

## User Story

As the beta owner,
I want proof that each invitee can authenticate and access only their own learning data,
so that the first Language Island is built on a safe, working product rather than an unverified single-user prototype.

## Problem Statement

The MVP PRD makes multi-user safety a non-negotiable launch gate, but the repository cannot prove what migrations are live. `docs/ver2.0 plan/PHASE-1-APPLY-RUNBOOK.md` says migration 008 is not applied, while newer code and migrations assume RLS. The current private-ASR worktree changes are unrelated and must remain untouched.

## Solution Statement

Use the deployed app plus two separate accounts to produce a migration ledger and a concise security/baseline test record. Correct documentation only for observed facts. If any isolation or authentication check fails, stop before inviting users and open a narrowly scoped remediation plan; do not weaken RLS as an expedient workaround.

## Metadata

**Feature Type**: Beta-readiness / operational validation  
**Complexity**: Medium  
**Systems Affected**: Supabase Auth/Postgres/RLS, deployed Next.js app, R2 signed media, Vercel environment, runbook documentation  
**Dependencies**: Production Supabase and Vercel dashboard access; two test email inboxes; an owned test audio/video file  
**Source PRD**: `.agents/PRDs/speaking-memory-mvp.md`  
**PRD Phase**: 0 — Establish the production baseline

---

## CONTEXT REFERENCES

### Relevant codebase files — MUST READ BEFORE EXECUTING

- `.agents/PRDs/speaking-memory-mvp.md` — non-negotiable launch gates and Phase 0 exit criteria.
- `docs/ver2.0 plan/2026-07-24-mvp-web-beta-prelaunch-checklist.md` — exact beta checklist and ordering.
- `docs/ver2.0 plan/PHASE-1-APPLY-RUNBOOK.md:1-77` — current Auth/RLS deployment procedure and two-account checks; its claim about migration 008 must be treated as unverified.
- `supabase/migrations/008_auth_rls.sql` through `supabase/migrations/017_youtube_asr_jobs.sql` — expected database schema and policies to compare with production.
- `web/src/proxy.ts:21-120` — protected-route redirects and session refresh behavior. Proxy is convenience only; APIs and RLS remain the security boundaries.
- `web/src/lib/supabase-server.ts` and `web/src/lib/supabase-admin.ts` — server-session and service-role boundaries to inspect before testing privileged routes.
- `web/src/app/api/jobs/[id]/retry/route.ts` and `web/src/app/api/media/[videoId]/route.ts` — representative owner-scoped API and media paths.
- `web/.env.example` — required environment variable names. Never copy actual values into plans, Git, screenshots, or the journal.

### New files to create

- `docs/journal/quality/2026-07-26-mvp-beta-baseline.md` — local-only factual quality snapshot after all checks are executed.
- `docs/journal/JOURNAL.md` — one-line pointer to the quality snapshot after verification.

### Relevant documentation — READ BEFORE EXECUTING

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
  - Specific sections: Policies, `auth.uid()` for unauthenticated requests, and policy performance.
  - Why: RLS is the browser-data security boundary; a successful UI redirect alone does not demonstrate isolation.
- [Supabase Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration)
  - Specific section: Site URL and redirect URLs.
  - Why: magic-link callback URLs must be explicitly valid in the real project.
- [Next.js Proxy file convention](https://nextjs.org/docs/pages/api-reference/file-conventions/proxy)
  - Specific sections: matcher behavior and execution order.
  - Why: confirms the Next.js 16 `proxy.ts` convention used by this app and its limits as an authorization mechanism.

### Patterns to follow

**Redirect convenience; data security elsewhere:**
```ts
// SOURCE: web/src/proxy.ts:105-113
if (!user && isProtected(pathname)) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
```

**Direct owner RLS policy:**
```sql
-- SOURCE: supabase/migrations/016_phrase_bank.sql:29-32
ALTER TABLE phrase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_items FORCE ROW LEVEL SECURITY;
CREATE POLICY phrase_items_owner ON phrase_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Server API owner check before privileged behavior:**
```ts
// SOURCE: web/src/app/api/extension/phrases/route.ts:118-121
const segment = rawSegment as SegmentRow | null;
if (segmentError) return extensionJson(req, { error: segmentError.message }, { status: 500 });
if (!segment || segment.video?.user_id !== userId) {
  return extensionJson(req, { error: "Subtitle not found." }, { status: 404 });
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Production facts and credentials

Create no application code. With an authorized operator present, record the deployment URL, Vercel deployment commit, and migration ledger for 001–017. Compare the ledger against production metadata and SQL objects; do not infer it from the repository or a dashboard migration UI alone. Record observed redirects and configured URLs without recording tokens or keys.

### Phase 2: Two-account security gate

Use Account A and Account B in separate browser profiles. Exercise RLS, direct routes, API ownership checks, jobs, phrase data, usage, and R2-backed playback. Capture pass/fail evidence, HTTP status, and safe identifiers only. A cross-account read, mutation, or playable media URL is a launch blocker.

### Phase 3: Existing-product baseline

As a clean test account, run sign-up/login, a small owned upload through the pipeline, player, bookmark, review, quota refusal, feedback, and responsive layout. Use only owned test content. Run the repository test/lint/build gate on the intended deployment commit.

### Phase 4: Evidence and decision

Add the local journal quality snapshot only after checks run. Update `README.md` and the Phase-1 runbook solely when the verified production facts differ. If all gates pass, the next implementation plan is the protected Island data model/entry point; if not, create a remediation plan limited to the failed boundary.

---

## STEP-BY-STEP TASKS

### VERIFY production migration and Auth ledger

- **IMPLEMENT**: In the authorized Supabase project, list applied migrations and inspect RLS/policies for every exposed app table. Compare 001–017 to the repository. Verify Site URL and both localhost/production `/auth/callback` redirect URLs.
- **PATTERN**: `docs/ver2.0 plan/PHASE-1-APPLY-RUNBOOK.md:11-48`.
- **GOTCHA**: Do not replay an existing migration. Do not put SQL output containing personal data, JWTs, or credentials in Git.
- **NEEDS-HUMAN**: Supabase dashboard/project access and the deployed Vercel URL.
- **VALIDATE**: A dated migration ledger marks each migration `applied`, `not applied`, or `uncertain`; no item remains assumed.

### VERIFY authentication and protected-route behavior

- **IMPLEMENT**: In a fresh browser profile, complete magic-link login, confirm callback session creation, then visit `/app`, `/bookmarks`, `/phrases`, `/practice`, and a valid `/player/<videoId>`. Repeat while logged out and verify redirect to `/login?next=…`.
- **PATTERN**: `web/src/proxy.ts:21-120`.
- **GOTCHA**: A proxy redirect is not proof of API or database authorization; keep this result separate from the isolation gate.
- **NEEDS-HUMAN**: Two test inboxes and access to the deployed application.
- **VALIDATE**: Every protected route is accessible when signed in and redirects when signed out; callback works from the configured production origin.

### VERIFY two-account data isolation

- **IMPLEMENT**: Create owned test data as Account A: a small private upload, a bookmark, a Phrase Bank item if available, feedback, and an in-progress/completed job. As Account B, attempt each corresponding UI route, direct player/media URL, client query, and the retry endpoint using A's safe IDs. Reverse the accounts once to rule out stale client state.
- **PATTERN**: `docs/ver2.0 plan/PHASE-1-APPLY-RUNBOOK.md:52-61`; `supabase/migrations/016_phrase_bank.sql:29-32`.
- **GOTCHA**: Use distinct browser profiles; avoid the service-role key and Supabase dashboard for negative checks because both bypass the user boundary. A signed R2 URL may remain valid until expiry, so test an unshared URL requested as B, not a URL A deliberately copied to B.
- **NEEDS-HUMAN**: Two accounts and a legal-to-upload test media file.
- **VALIDATE**: B receives no A rows in library, jobs, usage, Phrase Bank, or feedback; A's player/media and retry API are blocked or return not-found; no cross-account mutation succeeds.

### VERIFY the beta learning baseline

- **IMPLEMENT**: With a clean test account, run upload → transcript → playback → bookmark → practice verdict. Confirm R2 signed playback, expected quota rejection after using a safe test limit or an existing known-limited account, feedback submission/error state, and desktop/mobile layouts.
- **PATTERN**: `README.md` feature and setup sections; `web/src/lib/srs.ts` with `web/src/lib/__tests__/srs.test.ts`.
- **GOTCHA**: Keep public YouTube ingestion, the extension, and private ASR worker out of this test: they are not public-MVP dependencies.
- **NEEDS-HUMAN**: Deployed environment, owned media, and any existing quota-test method that does not distort production usage records.
- **VALIDATE**: The whole owned-upload loop completes on desktop and mobile; failure states are understandable and do not expose secrets or transcript content.

### RUN the repository regression gate

- **IMPLEMENT**: Check out or otherwise identify the exact commit deployed for testing, then run the web validation suite without modifying the unrelated ASR worktree.
- **PATTERN**: `web/package.json:5-12`.
- **GOTCHA**: Existing uncommitted ASR changes are user-owned work. Do not reset, stash, commit, or fold them into the MVP baseline effort.
- **VALIDATE**: `cd web && npm test && npm run lint && npm run build`.

### RECORD verified evidence and choose the next work item

- **IMPLEMENT**: Create `docs/journal/quality/2026-07-26-mvp-beta-baseline.md` only after the above checks, listing deployment identifier, test date, pass/fail per gate, safe evidence references, and remaining blockers. Add a one-line pointer in `docs/journal/JOURNAL.md`. Update the stale Phase-1 runbook/README only for verified differences.
- **PATTERN**: `AGENTS.md` Build Journal rules.
- **GOTCHA**: The journal is local-only. Never record email addresses, video titles/transcripts, test passwords, access tokens, signed URLs, or secrets.
- **VALIDATE**: Snapshot contains observed outcomes only; passing all gates authorizes planning the Island foundation, while any failure produces a scoped remediation item instead of an invite.

---

## TESTING STRATEGY

### Operational tests

- Two-account isolation across database rows, UI, API mutation, signed-media access, job feed, usage, and direct URLs.
- Signed-in/signed-out route behavior and production magic-link callback.
- Owned upload/pipeline/playback/bookmark/SRS/feedback journey on desktop and mobile.

### Regression tests

- Existing Vitest unit suite.
- ESLint and production Next.js build on the intended release commit.

### Failure conditions

- Unknown migration state, broken callback, any cross-account visibility/mutation, public/private-media ambiguity, failed core learning loop, or a red regression command blocks invitations and Island work.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style

`cd web && npm run lint`

### Level 2: Unit tests

`cd web && npm test`

### Level 3: Production build

`cd web && npm run build`

### Level 4: Manual production validation

Complete the two-account and end-to-end checklists in this plan against the deployed environment, recording only safe evidence in the local quality snapshot.

---

## ACCEPTANCE CRITERIA

- [ ] Production migration/RLS/Auth configuration is a verified ledger, not an assumption.
- [ ] Two independent accounts cannot read, play, create, update, retry, or delete one another's data.
- [ ] Logged-out users are redirected from all current protected routes.
- [ ] Private upload → transcript → playback → bookmark → practice and feedback work on desktop and mobile.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass on the intended release commit.
- [ ] Local-only journal evidence exists and contains no sensitive personal or credential material.
- [ ] The next action is unambiguous: Island foundation planning if green, or a narrowly scoped blocker fix if red.

## NOTES

This is intentionally a hard gate before feature work. The current repository has enough groundwork for Phrase Bank and the eventual Island, but source code cannot establish production RLS state. The current uncommitted YouTube private-ASR fallback changes are a separate owner-only experiment and are excluded from this public-MVP plan.

**Confidence**: 9/10 that the execution is one-pass once an authorized operator can access the production dashboards and two test accounts.
