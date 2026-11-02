# Ask history and phrase metering server rollout

- Date: 2026-11-02 (America/Detroit)
- Source commit: `fce99c0` on `codex/self-talk-used-today`
- Target: repository-linked Supabase production project
- Status: DB migration and three Edge Functions deployed; iOS TestFlight candidate built, not submitted

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

## iOS candidate build

- The first `npx eas-cli build --platform ios --profile testflight --non-interactive --wait` attempt stopped locally before upload because the worktree lacked its temporary `node_modules` link. Re-linking the existing installed dependencies fixed plugin resolution; no source change was needed.
- The retry used the `testflight` profile with EAS production environment variables and remote iOS signing credentials. It incremented the remote build number from 45 to 46 and completed successfully.
- Build ID: `ce1c718e-366a-4f9b-b6a1-3cb6e9641b35`; version: `1.0.1 (46)`; source commit: `f38e465b09e8add44848f1b55cad03b0e1663dc9`; profile: `testflight`; distribution: `STORE`.
- [EAS build](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/ce1c718e-366a-4f9b-b6a1-3cb6e9641b35) · [IPA](https://expo.dev/artifacts/eas/R6iFixINMmWskytqSJeA5XCmKKMUOKnY-zlVD2VXoRE.ipa)
- Temporary `node_modules` symlink removed after the build. No App Store Connect submission was made.

## Remaining before TestFlight completion

- Submit build `ce1c718e-366a-4f9b-b6a1-3cb6e9641b35` to App Store Connect using `npx eas-cli submit --platform ios --profile testflight --id ce1c718e-366a-4f9b-b6a1-3cb6e9641b35 --non-interactive --wait` after explicit release confirmation. Then install `1.0.1 (46)` through TestFlight and verify the Ask and Self-talk flows on the built app.
- The same-day manual-check path passed on the simulator: after checking one phrase and discarding the first session, a new session moved it behind unused cards and exposed `Used earlier today`. Verify automatic speech recognition and the day boundary on a physical device; the simulator's recognizer did not initialize during this check.
- If two dedicated test accounts become available, run `npm run verify:rls` for cross-account read, update, delete, and owner-spoofing checks.

## Rollback

- The schema is additive. Leave migration 035 tables in place if rolling the mobile app back; dropping them would discard new conversations. Older clients continue writing legacy Note turns, which the new trigger mirrors.
- Previous function versions were `phrase-capture` 8, `phrase-embed` 4, `phrase-tts` 2. If function behavior regresses, deploy their source from the parent of `fce99c0` using an isolated checkout, then verify the restored versions and JSON responses.
- The new `1.0.1 (46)` IPA is built but not submitted. If submission or built-app verification fails, keep testers on the previous TestFlight build `1.0.1 (45)` while fixing the candidate.
