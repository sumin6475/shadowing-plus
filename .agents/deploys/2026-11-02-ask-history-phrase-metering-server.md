# Ask history and phrase metering server rollout

- Date: 2026-11-02 (America/Detroit)
- Source commit: `fce99c0` on `codex/self-talk-used-today`
- Target: repository-linked Supabase production project
- Status: DB migration and three Edge Functions deployed; new TestFlight build not yet created

## Preflight

- Mobile validation: 62/62 tests and `npm run validate` passed before deployment; one pre-existing lint warning in `phrases.tsx:1025`.
- Review artifact: `.agents/code-reviews/2026-11-02-mobile-testflight-candidate.md` recommended APPROVE for the candidate commit.
- Linked remote migration history ended at 034. Full-worktree dry-run failed with `LegacyDbPushMissingRemoteError` due old local migration files missing from remote history. `--include-all` was not used.
- An isolated temporary Supabase directory held empty markers for already applied versions 020, 024, 031–034 and the actual 035 SQL. Its final dry-run reported only `035_ask_conversation_history.sql`.

## Applied commands and results

1. `supabase db push --linked --workdir <isolated temporary directory> --yes`: applied only `035_ask_conversation_history.sql` successfully.
2. `supabase migration list --linked --workdir <isolated temporary directory>`: local and remote both show 035 applied.
3. Aggregate read-only SQL: 2 existing Note conversations and 12 turns backfilled; 0 old turns missing in the new table; both new tables have RLS enabled and forced; all 3 custom triggers exist.
4. `supabase functions deploy phrase-capture phrase-embed phrase-tts --project-ref <linked project> --use-api`: succeeded. Function inventory shows ACTIVE versions `phrase-capture` 9, `phrase-embed` 5, `phrase-tts` 3, all with JWT verification enabled.
5. Authenticated-app-key requests without a user session returned JSON 401 from each function.

## Live smoke test

- The simulator displayed the two backfilled Note conversations and reopened one with its previous turns.
- A new How to say question produced an answer; its conversation appeared under Today and reopened after closing and reopening Ask.
- Save to Phrases ran the second extraction pass and opened the final editor with a shorter Phrase and the displayed sentence as context. The final save succeeded.
- Aggregate SQL after the smoke test: 3 conversations, 14 turns, 1 Phrase matching the chosen expression and example context, and one recent row each for `ask`, `phrase_capture_ask`, `phrase_embed`, and `phrase_tts_estimate`.
- RLS read control, in read-only transactions with role `authenticated`: an unrelated synthetic user ID saw 0 conversations and 0 turns; the owner claim saw 3 conversations and 14 turns. The full two-account write-isolation script was not run because its test credentials were unavailable.

## Remaining before TestFlight submission

- Make the new iOS `testflight` build, submit it, then install it and verify the flows in that built app. The most recent pre-rollout EAS build was `1.0.1 (45)`.
- Test same-day used-phrase behavior in Self-talk on device, including the day boundary.
- If two dedicated test accounts become available, run `npm run verify:rls` for cross-account read, update, delete, and owner-spoofing checks.

## Rollback

- The schema is additive. Leave migration 035 tables in place if rolling the mobile app back; dropping them would discard new conversations. Older clients continue writing legacy Note turns, which the new trigger mirrors.
- Previous function versions were `phrase-capture` 8, `phrase-embed` 4, `phrase-tts` 2. If function behavior regresses, deploy their source from the parent of `fce99c0` using an isolated checkout, then verify the restored versions and JSON responses.
- No new TestFlight build was submitted in this rollout. The last known build remains `1.0.1 (45)`.
