# Code Review: mobile Phrase speaking memory

**Scope**: uncommitted changes on `feat/mobile-skeleton`
**Requirement**: Use `phrase_items` as a captureable Phrase Bank and reuse owned phrases in Story/self-talk, with friendly recovery states and cached natural cloud TTS.
**Recommendation**: APPROVE

## Stats
- Files modified: 16 · added: 18 · deleted: 0
- Lines: +836 / -328 (tracked diff before review fixes; untracked file lines excluded)

## Findings

severity: high
status: fixed
file: apps/mobile/src/screens/world.tsx
line: 562
issue: Story and Message self-talk entry points drop their scope identifiers
detail: Story-launched self-talk omits `storyId`; the Message CTA also omits `storyId`/`messageId`, and `shell.tsx` discards the pushed `storyId`. Sessions, phrase retrieval, captured speaking phrases, and phrase events therefore become unscoped free talk.
suggestion: Thread `storyId` and `messageId` through both entry points and the shell into `TalkScreen`.
fix: Story and Message CTAs now pass their IDs; the shell forwards `storyId`, and Message beats are carried into the Talk context.

severity: high
status: fixed
file: apps/mobile/src/lib/phrases.ts
line: 215
issue: Duplicate phrase detection returns before creating the requested Story link
detail: Selecting a Story for an already-saved phrase—or retrying after the row save succeeded but linking failed—reports `already` without associating that Phrase with the Story.
suggestion: Link the existing row before returning; keep the operation idempotent.
fix: The duplicate branch now upserts the requested Story link before returning `already`.

severity: medium
status: fixed
file: apps/mobile/src/screens/capture.tsx
line: 76
issue: Capture recovery states hide Story-loading failures and expose raw database errors
detail: A Story query failure is indistinguishable from an empty list, while Phrase save failures in capture and clip capture display raw Supabase messages.
suggestion: Preserve a distinct Story error with retry and map save errors to user-safe recovery copy.
fix: Capture now distinguishes Story loading, empty, and failed states with retry; manual/OCR and clip save failures use recovery copy instead of backend messages.

severity: medium
status: fixed
file: apps/mobile/src/screens/library.tsx
line: 157
issue: Clip deletion confirmation incorrectly says saved phrases will be removed
detail: The database foreign keys use `ON DELETE SET NULL`, so the reusable Phrase remains after its source clip is deleted.
suggestion: Tell the learner that the clip is removed while saved phrases are preserved without their source link.
fix: The confirmation now states that saved Phrases remain without the deleted clip link.

## What's Good
Operational Phrase Bank queries use `phrase_items`; authenticated cached OpenAI TTS, device fallback, new-save prewarming, and detail preload are present. Bottom navigation and Profile structure remain intact. TypeScript, quiet ESLint, whitespace checks, and Edge Function syntax bundling passed in the holdout review.

## Verdict
All four findings are fixed. The holdout re-check confirmed the scoped IDs, idempotent duplicate linking, capture recovery states, and deletion copy; TypeScript, quiet ESLint, and whitespace validation pass. Approved for commit.
